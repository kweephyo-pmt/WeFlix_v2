import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaGoogle, FaEnvelope, FaLock, FaUser, FaSpinner, FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';
import { BiMoviePlay } from 'react-icons/bi';
import { auth, googleProvider, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const FIREBASE_ERRORS = {
  'auth/invalid-email':               'That email address doesn\'t look right.',
  'auth/user-not-found':              'No account found with that email.',
  'auth/wrong-password':              'Incorrect password. Please try again.',
  'auth/invalid-credential':          'Email or password is incorrect.',
  'auth/email-already-in-use':        'An account with this email already exists.',
  'auth/weak-password':               'Password must be at least 6 characters.',
  'auth/too-many-requests':           'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed':      'Network error. Please check your connection.',
  'auth/popup-closed-by-user':        'Sign-in popup was closed. Please try again.',
  'auth/cancelled-popup-request':     'Another sign-in popup is already open.',
  'auth/popup-blocked':               'Popup was blocked by your browser. Please allow popups and try again.',
  'auth/user-disabled':               'This account has been disabled. Contact support.',
};

const getFirebaseError = (err) => {
  const code = err?.code || '';
  return FIREBASE_ERRORS[code] || 'Something went wrong. Please try again.';
};

// Upsert user profile in Firestore (merge so existing data is not overwritten)
const saveUserToFirestore = async (user) => {
  const ref = doc(db, 'users', user.uid);
  await setDoc(ref, {
    uid: user.uid,
    displayName: user.displayName || null,
    email: user.email,
    photoURL: user.photoURL || null,
    emailVerified: user.emailVerified || false,
    lastLoginAt: serverTimestamp(),
  }, { merge: true });
};

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  // Holds a pending Google OAuthCredential when account collision detected
  const [pendingGoogleCred, setPendingGoogleCred] = useState(null);

  const [verificationSent, setVerificationSent] = useState(false);

  // Clear errors when switching tabs
  const handleSwitchTab = (toLogin) => {
    setIsLogin(toLogin);
    setError('');
    setShowReset(false);
    setResetSent(false);
    setPendingGoogleCred(null);
    setVerificationSent(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      setError(getFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Sign in with email/password
        const result = await signInWithEmailAndPassword(auth, email, password);

        // Enforce email verification
        if (!result.user.emailVerified) {
          await auth.signOut();
          setError('Please verify your email address before logging in. Check your inbox or spam folder.');
          return; // Stop early
        }

        // If there is a pending Google credential from a collision, link it now
        if (pendingGoogleCred) {
          await linkWithCredential(result.user, pendingGoogleCred);
          setPendingGoogleCred(null);
          // Refresh user to get updated profile after link
          saveUserToFirestore({ ...result.user, displayName: result.user.displayName }).catch(console.error);
        } else {
          // Update Firestore on standard login to reflect verified status and last login
          saveUserToFirestore(result.user).catch(console.error);
        }
      } else {
        // Register new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });

        // Send verification email BEFORE writing to Firestore.
        // The Firestore document is intentionally NOT created here — it will be
        // written by saveUserToFirestore() on first successful verified login.
        // This prevents unverified "ghost" rows from cluttering the database.
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(userCredential.user);

        // Sign out immediately so the user cannot access protected routes
        // before they have verified their email address.
        await auth.signOut();

        setVerificationSent(true);
        return; // Stop early so we show the success screen
      }
      onClose();
    } catch (err) {
      setError(getFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Save/update user profile in Firestore
      saveUserToFirestore(result.user).catch(console.error);
      onClose();
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[400px] bg-[#0b0f19]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black overflow-hidden pointer-events-auto"
            >
              <div className="p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center">
                      <BiMoviePlay className="text-red-500 text-xl" />
                    </div>
                    <span className="text-xl font-black text-white tracking-tight">
                      We<span className="text-red-500">Flix</span>
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
                  <button
                    type="button"
                    onClick={() => handleSwitchTab(true)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      isLogin ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchTab(false)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      !isLogin ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Info Note / Error */}
                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2.5 mb-6 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3"
                    >
                      <FaExclamationCircle className="text-red-400 text-base shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm font-medium leading-snug">{error}</p>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="hint"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-gray-400 text-sm mb-6 text-center"
                    >
                      {isLogin
                        ? 'Welcome back! Sign in to access your Watchlist.'
                        : 'Create an account to save movies and sync progress.'}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Form OR Forgot Password */}
                {showReset ? (
                  <form className="space-y-4" onSubmit={handleForgotPassword}>
                    {resetSent ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-3 py-4 text-center"
                      >
                        <FaCheckCircle className="text-green-400 text-4xl" />
                        <p className="text-green-300 font-semibold text-sm">Reset email sent!</p>
                        <p className="text-gray-500 text-xs">Check your inbox for a password reset link from Firebase.</p>
                        <button
                          type="button"
                          onClick={() => { setShowReset(false); setResetSent(false); setError(''); }}
                          className="mt-2 text-sm text-red-400 hover:text-red-300 font-semibold underline underline-offset-2 transition-colors"
                        >
                          ← Back to Log In
                        </button>
                      </motion.div>
                    ) : (
                      <>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <FaEnvelope className="text-gray-500 text-sm" />
                          </div>
                          <input
                            type="email"
                            required
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="Your email address"
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3.5 flex justify-center items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all active:scale-[0.98]"
                        >
                          {loading && <FaSpinner className="animate-spin" />}
                          Send Reset Link
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowReset(false); setError(''); }}
                          className="w-full text-sm text-gray-500 hover:text-gray-300 font-semibold transition-colors py-1"
                        >
                          ← Back to Log In
                        </button>
                      </>
                    )}
                  </form>
                ) : verificationSent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 py-4 text-center"
                  >
                    <FaCheckCircle className="text-green-400 text-4xl" />
                    <h2 className="text-white font-bold text-lg mt-2">Verify your email</h2>
                    <p className="text-gray-400 text-sm">
                      We've sent a verification link to <strong className="text-white">{email}</strong>. 
                      Please check your inbox and click the link to activate your account.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSwitchTab(true)}
                      className="mt-4 w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
                    >
                      Return to Log In
                    </button>
                  </motion.div>
                ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {!isLogin && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="relative"
                    >
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <FaUser className="text-gray-500 text-sm" />
                      </div>
                      <input
                        type="text"
                        required={!isLogin}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-sm"
                      />
                    </motion.div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-500 text-sm" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-sm"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <FaLock className="text-gray-500 text-sm" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-sm"
                    />
                  </div>

                  {isLogin && (
                    <div className="flex justify-end -mt-1">
                      <button
                        type="button"
                        onClick={() => { setShowReset(true); setResetEmail(email); setError(''); }}
                        className="text-xs text-gray-500 hover:text-red-400 font-semibold underline underline-offset-2 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 mt-2 flex justify-center items-center gap-2 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-[0.98] ${
                      pendingGoogleCred
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                        : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]'
                    }`}
                  >
                    {loading && <FaSpinner className="animate-spin" />}
                    {pendingGoogleCred
                      ? <><FaGoogle /> Sign In & Link Google</>
                      : (isLogin ? 'Continue' : 'Create Account')
                    }
                  </button>
                </form>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-gray-500 uppercase font-semibold">Or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <FaGoogle className="text-red-500" />
                  Continue with Google
                </button>
              </div>
            </motion.div>
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}

import React, { useEffect, useLayoutEffect, useState, useCallback, memo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { fetchMovieDetails, fetchRelatedMovies } from "../Fetcher";
import { getIdFromDetailSlug, toDetailPath } from "../urlUtils";
import { FaRedo, FaStar, FaArrowLeft, FaFilm, FaInfoCircle } from "react-icons/fa";
import { BiCalendar, BiTime, BiGlobe } from "react-icons/bi";
import DetailPageSkeleton from "../reused/DetailPageSkeleton";
import VideoPlayer from "./VideoPlayer";
import SEO from "../SEO";
import ContentCard from "../ContentCard";

const MemoizedVideoPlayer = memo(VideoPlayer);

const BACKDROP = "https://image.tmdb.org/t/p/original";
const POSTER   = "https://image.tmdb.org/t/p/w500";

const MovieDetails = ({ movieId: movieIdProp }) => {
  const { slug } = useParams();
  const location = useLocation();
  const movieId = movieIdProp ?? getIdFromDetailSlug(slug);
  const navigate = useNavigate();
  const [movie,        setMovie]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [retrying,     setRetrying]     = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [related,      setRelated]      = useState([]);
  const [isDraggingRelated, setIsDraggingRelated] = useState(false);

  const relatedListRef = useRef(null);
  const relatedDragStateRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const suppressRelatedClickRef = useRef(false);

  // Prevent one-frame stale detail flash when navigating between related titles.
  useLayoutEffect(() => {
    setLoading(true);
    setError(null);
    setMovie(null);
    setRelated([]);
    setShowOverview(false);
    setIsDraggingRelated(false);
    suppressRelatedClickRef.current = false;
  }, [movieId]);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    navigate(-1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRetrying(true);
    try {
      const [data, relatedData] = await Promise.all([
        fetchMovieDetails(movieId),
        fetchRelatedMovies(movieId),
      ]);
      setMovie(data);
      setRelated((relatedData ?? []).filter((item) => item?.id && item.id !== data.id).slice(0, 18));
    } catch {
      setError("Failed to load movie. Please try again.");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [movieId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [movieId]);

  useEffect(() => {
    if (!movie?.id) return;
    const isLegacyRoute = location.pathname.startsWith('/movie/');
    if (!isLegacyRoute) return;
    const canonicalPath = toDetailPath('movie', movie.id, movie.title);
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true, state: location.state });
    }
  }, [movie, location.pathname, location.state, navigate]);

  const handleRelatedSelect = useCallback((item) => {
    navigate(toDetailPath('movie', item.id, item.title || item.name), {
      state: { from: '/movies' },
    });
  }, [navigate]);

  const onRelatedMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = relatedListRef.current;
    if (!el) return;
    relatedDragStateRef.current = {
      active: true,
      startX: e.pageX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    setIsDraggingRelated(true);
  }, []);

  const onRelatedMouseMove = useCallback((e) => {
    const el = relatedListRef.current;
    const drag = relatedDragStateRef.current;
    if (!el || !drag.active) return;

    const delta = e.pageX - drag.startX;
    if (Math.abs(delta) > 4) drag.moved = true;
    el.scrollLeft = drag.startScrollLeft - delta;
  }, []);

  const endRelatedDrag = useCallback(() => {
    const drag = relatedDragStateRef.current;
    if (!drag.active) return;

    drag.active = false;
    suppressRelatedClickRef.current = drag.moved;
    setIsDraggingRelated(false);

    setTimeout(() => {
      suppressRelatedClickRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', endRelatedDrag);
    return () => window.removeEventListener('mouseup', endRelatedDrag);
  }, [endRelatedDrag]);

  const formatRuntime = (m) => {
    if (!m) return null;
    const h = Math.floor(m / 60), min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  if (loading) return (
    <DetailPageSkeleton type="movie" />
  );

  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#090b10]">
      <div className="bg-red-900/10 border border-red-700/30 rounded-2xl p-8 max-w-sm w-full text-center backdrop-blur-md">
        <p className="text-red-400 mb-6 font-medium">{error}</p>
        <button
          onClick={load}
          disabled={retrying}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-red-600/20"
        >
          <FaRedo className={retrying ? "animate-spin" : ""} />
          {retrying ? "Retrying…" : "Retry"}
        </button>
      </div>
    </div>
  );

  if (!movie) return null;

  const year     = movie.release_date?.slice(0, 4);
  const runtime  = formatRuntime(movie.runtime);
  const rating   = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null;
  const genres   = (movie.genres ?? []).slice(0, 4);
  const overview = movie.overview ?? "";
  const truncated = overview.length > 280 && !showOverview
    ? overview.slice(0, 280) + "…"
    : overview;

  return (
    <div className="min-h-screen bg-[#07080a] text-gray-200 selection:bg-red-500/30">
      <SEO
        title={`${movie.title}${year ? ` (${year})` : ''} — Watch Free on WeFlix`}
        description={
          movie.overview
            ? `${movie.overview.slice(0, 150).trim()}… Watch ${movie.title} free on WeFlix.`
            : `Watch ${movie.title} free on WeFlix.`
        }
        image={
          movie.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
            : movie.poster_path
            ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
            : undefined
        }
        type="video.movie"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Movie',
          name: movie.title,
          description: movie.overview,
          image: movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : undefined,
          dateCreated: movie.release_date,
          ...(movie.vote_average > 0 && {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: movie.vote_average.toFixed(1),
              bestRating: 10,
              ratingCount: movie.vote_count,
            },
          }),
          genre: (movie.genres ?? []).map(g => g.name),
        }}
      />

      {/* ── HERO SECTION ── */}
      <div className="relative w-full min-h-[70vh] flex flex-col justify-end pt-32 pb-20">
        {/* Backdrop Image */}
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          {movie.backdrop_path ? (
            <img
              src={`${BACKDROP}${movie.backdrop_path}`}
              alt=""
              className="w-full h-full object-cover object-top"
              style={{ filter: "brightness(0.6) contrast(1.1) saturate(1.1)", transform: "scale(1.02)" }}
            />
          ) : (
            <div className="w-full h-full bg-[#111319] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 to-[#111319]" />
          )}
          {/* Gradients for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-[#07080a]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07080a]/90 via-[#07080a]/50 to-transparent" />
        </div>

        {/* Back Button */}
        <div className="absolute top-0 left-0 right-0 z-20 p-6 md:p-10 flex">
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 text-gray-200 hover:text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all duration-300"
          >
            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Back</span>
          </button>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-end gap-8 lg:gap-14">
          
          {/* Poster (Desktop) */}
          {movie.poster_path && (
            <div className="hidden md:block shrink-0 z-10">
              <img
                src={`${POSTER}${movie.poster_path}`}
                alt={movie.title}
                className="w-48 lg:w-64 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 max-w-3xl pb-2">
            {movie.tagline && (
              <p className="text-red-400 font-semibold tracking-wider text-xs md:text-sm uppercase mb-3 drop-shadow-md">
                {movie.tagline}
              </p>
            )}

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] mb-4 drop-shadow-2xl font-sans">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-300 mb-6 drop-shadow-md">
              {year && <span className="flex items-center gap-1.5"><BiCalendar className="text-gray-400 text-base" /> {year}</span>}
              {runtime && <span className="flex items-center gap-1.5"><BiTime className="text-gray-400 text-base" /> {runtime}</span>}
              {rating && <span className="flex items-center gap-1.5"><FaStar className="text-yellow-500 text-base" /> {rating}</span>}
            </div>

            {genres.length > 0 && (
               <div className="flex flex-wrap gap-2 mb-6">
                 {genres.map(g => (
                   <span key={g.id} className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-gray-200 shadow-sm">
                     {g.name}
                   </span>
                 ))}
               </div>
            )}

            {overview && (
              <div className="relative">
                <p className="text-gray-300/90 leading-relaxed md:text-lg drop-shadow-md max-w-2xl">
                  {truncated}
                </p>
                {overview.length > 280 && (
                  <button
                    onClick={() => setShowOverview(p => !p)}
                    className="mt-3 text-white font-semibold hover:text-red-400 transition-colors text-sm underline underline-offset-4"
                  >
                    {showOverview ? "Show Less" : "Read More"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PLAYER & EXTRA CONTENT ── */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 md:px-12 -mt-4 md:-mt-10 mb-20">
        
        {/* Video Player Container */}
        <div className="bg-[#0f1117]/80 backdrop-blur-xl border border-white/5 rounded-2xl md:rounded-[2rem] p-2 md:p-5 shadow-2xl mb-6 ring-1 ring-white/5">
          <div className="flex items-center gap-3 mb-4 px-3 pt-2">
             <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
               <FaFilm className="text-red-400 text-sm" />
             </div>
             <div>
               <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-red-500/80 mb-0.5">Stream Now</p>
               <h2 className="text-sm md:text-base font-semibold text-white/90 truncate">{movie.title}</h2>
             </div>
          </div>
          
          <div className="w-full aspect-video rounded-xl md:rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative">
            <MemoizedVideoPlayer movieId={movieId} title={movie.title} />
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 md:p-5 mx-2 md:mx-0">
          <FaInfoCircle className="text-blue-400 text-xl shrink-0 mt-0.5" />
          <p className="text-blue-200/70 text-sm leading-relaxed">
            For the best ad-free streaming experience, we highly recommend using {" "}
            <a
              href="https://ublockorigin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-300 transition-colors"
            >
              uBlock Origin
            </a>
            . Enjoy uninterrupted playback.
          </p>
        </div>
      </div>

      {/* ── RELATED TITLES ── */}
      {related.length > 0 && (
        <section className="px-4 sm:px-6 md:px-12 pb-16">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-6 tracking-tight flex items-center gap-3">
              <span className="w-1.5 h-6 bg-red-500 rounded-full inline-block"></span>
              More Like This
            </h3>
            
            <div
              ref={relatedListRef}
              onMouseDown={onRelatedMouseDown}
              onMouseMove={onRelatedMouseMove}
              onMouseLeave={endRelatedDrag}
              className={`grid grid-flow-col auto-cols-[140px] md:auto-cols-[180px] gap-4 md:gap-5 overflow-x-auto hide-scrollbar pb-6 select-none ${isDraggingRelated ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              {related.map((item) => (
                <div key={item.id} className="shrink-0 transition-transform duration-300 hover:-translate-y-2">
                  <ContentCard
                    title={item.title || item.name}
                    poster={item.poster_path ? `${POSTER}${item.poster_path}` : '/placeholder.svg'}
                    rating={item.vote_average}
                    releaseDate={item.release_date}
                    onClick={() => {
                      if (suppressRelatedClickRef.current) return;
                      handleRelatedSelect(item);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-[#040507] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs md:text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-base">We<span className="text-red-500">Flix</span></span>
            <span className="mx-2 opacity-50">|</span>
            <span>Developed by <span className="text-gray-300 font-medium">Phyo Min Thein</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} WeFlix</span>
            <span className="mx-2 opacity-50">|</span>
            <span>
              Data by{' '}
              <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors font-medium">
                TMDB
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

MovieDetails.propTypes = {
  movieId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default memo(MovieDetails);



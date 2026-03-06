import React, { useEffect, useLayoutEffect, useState, useCallback, memo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { fetchMovieDetails, fetchRelatedMovies } from "../Fetcher";
import { getIdFromDetailSlug, toDetailPath } from "../urlUtils";
import { FaRedo, FaStar, FaArrowLeft, FaFilm } from "react-icons/fa";
import { BiCalendar, BiTime, BiGlobe } from "react-icons/bi";
import Loadingspinner from "../resused/Loadingspinner";
import VideoPlayer from "./VideoPlayer";
import SEO from "../SEO";
import ContentCard from "../ContentCard";

const MemoizedVideoPlayer = memo(VideoPlayer);

const BACKDROP = "https://image.tmdb.org/t/p/original";
const POSTER   = "https://image.tmdb.org/t/p/w500";

const GENRE_COLORS = [
  "bg-white/[0.07] border-white/[0.14] text-gray-200",
  "bg-white/[0.07] border-white/[0.14] text-gray-200",
  "bg-white/[0.07] border-white/[0.14] text-gray-200",
  "bg-white/[0.07] border-white/[0.14] text-gray-200",
];

const GenreTag = ({ children, index }) => (
  <span className={`border text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap tracking-wide ${GENRE_COLORS[index % GENRE_COLORS.length]}`}>
    {children}
  </span>
);

const MetaBadge = ({ icon: Icon, children }) => (
  <span className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.12] text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-full">
    {Icon && <Icon className="text-gray-400 shrink-0 text-[12px]" />}
    {children}
  </span>
);

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
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loadingspinner size="large" />
    </div>
  );

  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-red-900/20 border border-red-700/50 rounded-2xl p-8 max-w-sm w-full text-center">
        <p className="text-red-300 mb-6">{error}</p>
        <button
          onClick={load}
          disabled={retrying}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
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
    <div className="min-h-screen bg-[#0b0b0f] text-white">
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

      {/* ══════ BACK BUTTON ══════ */}
      <div className="px-4 pt-5 md:px-12 max-w-7xl mx-auto w-full">
        <button
          onClick={handleBack}
          className="group inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-sm border border-white/[0.12] text-gray-300 hover:text-white text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200"
        >
          <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back</span>
        </button>
      </div>

      {/* ══════ PLAYER ══════ */}
      <div className="px-3 sm:px-5 md:px-10 lg:px-16 pt-5 pb-8 md:pb-12">
        <div className="w-full max-w-[1180px] mx-auto">
        {/* Player header */}
        <div className="flex items-center gap-3 mb-4 bg-white/[0.04] border border-white/[0.1] rounded-2xl px-4 py-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-600/25 border border-red-500/40 shrink-0">
            <FaFilm className="text-red-400 text-sm" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold mb-0.5">Now Playing</p>
            <h2 className="text-sm md:text-base font-semibold text-white truncate leading-tight">{movie.title}</h2>
          </div>
          {rating && (
            <div className="ml-auto flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-1.5 shrink-0">
              <FaStar className="text-yellow-400 text-[11px]" />
              <span className="text-yellow-300 font-bold text-sm">{rating}</span>
              <span className="text-gray-500 text-xs">/10</span>
            </div>
          )}
        </div>

        {/* Player frame */}
        <div className="w-full rounded-2xl overflow-hidden ring-1 ring-white/[0.12] shadow-[0_18px_60px_rgba(0,0,0,0.65)] bg-black relative">
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.05] pointer-events-none z-10" />
          <div className="w-full aspect-video">
            <MemoizedVideoPlayer movieId={movieId} title={movie.title} />
          </div>
        </div>

        {/* uBlock notice */}
        <div className="mt-3.5 flex items-start gap-3 bg-yellow-500/[0.06] border border-yellow-500/[0.18] rounded-xl px-4 py-3">
          <span className="text-yellow-400 text-base shrink-0 mt-0.5">🛡️</span>
          <p className="text-yellow-200/60 text-xs leading-relaxed">
            For a better experience with fewer ads, install{" "}
            <a
              href="https://ublockorigin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 font-semibold underline underline-offset-2 hover:text-yellow-300 transition-colors"
            >
              uBlock Origin
            </a>
            {" "}in your browser.
          </p>
        </div>
        </div>
      </div>

      {/* ══════ HERO / DETAILS ══════ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 460 }}>
        {/* Backdrop */}
        {movie.backdrop_path ? (
          <img
            src={`${BACKDROP}${movie.backdrop_path}`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top scale-105"
            style={{ filter: "brightness(0.55) saturate(1.2)" }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#111827] to-[#0a0c12]" />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0f] via-[#0b0b0f]/50 to-transparent" />
        {/* Top fade from player section */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#0b0b0f] to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-10 px-4 sm:px-6 md:px-12 pt-10 pb-12 md:pb-16 max-w-7xl mx-auto">

          {/* Poster */}
          {movie.poster_path && (
            <div className="shrink-0 hidden md:block self-end">
              <div className="relative">
                <img
                  src={`${POSTER}${movie.poster_path}`}
                  alt={movie.title}
                  className="relative w-44 lg:w-56 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.18]"
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex flex-col gap-4 w-full max-w-2xl pb-2">
            {/* Tagline */}
            {movie.tagline && (
              <p className="text-red-400/75 text-xs sm:text-sm font-medium italic tracking-wide border-l-2 border-red-500/40 pl-3">
                {movie.tagline}
              </p>
            )}

            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.3rem] font-black tracking-tight leading-[1.02] mb-1" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.75)' }}>
                {movie.title}
              </h1>
              {movie.original_title && movie.original_title !== movie.title && (
                <p className="text-gray-400 text-sm font-medium">{movie.original_title}</p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2">
              {year    && <MetaBadge icon={BiCalendar}>{year}</MetaBadge>}
              {runtime && <MetaBadge icon={BiTime}>{runtime}</MetaBadge>}
              {movie.original_language && (
                <MetaBadge icon={BiGlobe}>{movie.original_language.toUpperCase()}</MetaBadge>
              )}
            </div>

            {/* Genre tags */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((g, i) => <GenreTag key={g.id} index={i}>{g.name}</GenreTag>)}
              </div>
            )}

            {/* Overview */}
            {overview && (
              <div className="border-l-2 border-red-500/50 pl-4">
                <p className="text-gray-300 text-sm leading-7">{truncated}</p>
                {overview.length > 280 && (
                  <button
                    onClick={() => setShowOverview(p => !p)}
                    className="mt-2.5 text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
                  >
                    {showOverview ? "Show less ↑" : "Read more ↓"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════ PRODUCTION META ══════ */}
      {related.length > 0 && (
        <section className="px-3 sm:px-5 md:px-10 lg:px-16 pb-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg md:text-xl font-black tracking-tight">More Like This</h3>
              <span className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold">Recommended</span>
            </div>
            <div
              ref={relatedListRef}
              onMouseDown={onRelatedMouseDown}
              onMouseMove={onRelatedMouseMove}
              onMouseLeave={endRelatedDrag}
              className={`grid grid-flow-col auto-cols-[155px] md:auto-cols-[170px] gap-3 overflow-x-auto hide-scrollbar pb-2 select-none ${isDraggingRelated ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              {related.map((item) => (
                <div key={item.id} className="shrink-0">
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

      <footer className="bg-[#0a0c12] mt-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-600">
          <div className="flex items-center gap-3">
            <span className="text-white font-black text-sm">We<span className="text-red-500">Flix</span></span>
            <span>·</span>
            <span>Developed by <span className="text-gray-400 font-semibold">Phyo Min Thein</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} WeFlix</span>
            <span>·</span>
            <span>
              Data by{' '}
              <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors">
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


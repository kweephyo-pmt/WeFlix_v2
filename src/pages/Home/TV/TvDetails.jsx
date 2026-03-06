import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  memo,
  useRef,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSeriesDetails, fetchAllEpisodes, fetchRelatedSeries } from "../Fetcher";
import { getIdFromDetailSlug, toDetailPath } from "../urlUtils";
import { FaRedo, FaStar, FaArrowLeft, FaTv } from "react-icons/fa";
import { BiCalendar, BiGlobe, BiTv, BiChevronLeft, BiChevronRight, BiSearch } from "react-icons/bi";
import Loadingspinner from "../resused/Loadingspinner";
import VideoPlayer from "./VideoPlayer";
import SEO from "../SEO";
import ContentCard from "../ContentCard";

const MemoizedVideoPlayer = memo(VideoPlayer);

const BACKDROP = "https://image.tmdb.org/t/p/original";
const POSTER   = "https://image.tmdb.org/t/p/w342";
const STILL    = "https://image.tmdb.org/t/p/w300";

const GENRE_COLORS = [
  "bg-white/[0.07] border-white/[0.14] text-gray-200",
  "bg-white/[0.07] border-white/[0.14] text-gray-200",
  "bg-white/[0.07] border-white/[0.14] text-gray-200",
  "bg-white/[0.07] border-white/[0.14] text-gray-200",
];

const MetaBadge = ({ icon: Icon, children }) => (
  <span className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.12] text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-full">
    {Icon && <Icon className="text-gray-400 shrink-0 text-[12px]" />}
    {children}
  </span>
);

const TvDetails = ({ tvId: tvIdProp }) => {
  const { slug } = useParams();
  const location = useLocation();
  const tvId = tvIdProp ?? getIdFromDetailSlug(slug);
  const navigate = useNavigate();
  const [tv,             setTv]             = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [retrying,       setRetrying]       = useState(false);
  const [allSeasons,     setAllSeasons]     = useState([]);
  const [viewingSeason,  setViewingSeason]  = useState(null);
  const [playingSeason,  setPlayingSeason]  = useState(null);
  const [playingEpisode, setPlayingEpisode] = useState(null);
  const [showOverview,   setShowOverview]   = useState(false);
  const [episodeQuery,   setEpisodeQuery]   = useState('');
  const [isDraggingEpisodes, setIsDraggingEpisodes] = useState(false);
  const [isDraggingRelated, setIsDraggingRelated] = useState(false);
  const [related, setRelated] = useState([]);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    navigate(-1);
  };

  const activeEpisodeRef = useRef(null);
  const episodeListRef   = useRef(null);
  const dragStateRef     = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const suppressClickRef = useRef(false);
  const relatedListRef = useRef(null);
  const relatedDragStateRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const suppressRelatedClickRef = useRef(false);

  // Prevent one-frame stale detail flash when navigating between related titles.
  useLayoutEffect(() => {
    setLoading(true);
    setError(null);
    setTv(null);
    setAllSeasons([]);
    setViewingSeason(null);
    setPlayingSeason(null);
    setPlayingEpisode(null);
    setShowOverview(false);
    setEpisodeQuery('');
    setRelated([]);
    setIsDraggingEpisodes(false);
    setIsDraggingRelated(false);
    suppressClickRef.current = false;
    suppressRelatedClickRef.current = false;
  }, [tvId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRetrying(true);
    try {
      const [seriesData, seasonsData, relatedData] = await Promise.all([
        fetchSeriesDetails(tvId),
        fetchAllEpisodes(tvId),
        fetchRelatedSeries(tvId),
      ]);
      setTv(seriesData);
      setRelated((relatedData ?? []).filter((item) => item?.id && item.id !== seriesData.id).slice(0, 18));
      const filtered = (seasonsData ?? [])
        .filter(s => s.season_number > 0)
        .sort((a, b) => a.season_number - b.season_number);
      setAllSeasons(filtered);
      if (filtered.length > 0) {
        const first = filtered[0];
        const firstEp = first.episodes?.find(e => e.episode_number)?.episode_number ?? 1;
        setViewingSeason(first.season_number);
        setPlayingSeason(first.season_number);
        setPlayingEpisode(firstEp);
      }
    } catch {
      setError("Failed to load TV show details. Please try again.");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [tvId]);

  useEffect(() => {
    load();
    return () => {
      setTv(null); setAllSeasons([]);
      setViewingSeason(null); setPlayingSeason(null); setPlayingEpisode(null);
    };
  }, [load]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [tvId]);

  useEffect(() => {
    if (!tv?.id) return;
    const isLegacyRoute = location.pathname.startsWith('/tv/');
    if (!isLegacyRoute) return;
    const canonicalPath = toDetailPath('tv', tv.id, tv.name);
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true, state: location.state });
    }
  }, [tv, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (activeEpisodeRef.current && episodeListRef.current && viewingSeason === playingSeason) {
      const container = episodeListRef.current;
      const activeEl = activeEpisodeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      const targetLeft =
        container.scrollLeft +
        (activeRect.left - containerRect.left) -
        (containerRect.width / 2 - activeRect.width / 2);

      container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }
  }, [viewingSeason, playingSeason, playingEpisode]);

  const currentSeasonData = allSeasons.find(s => s.season_number === viewingSeason);
  const sortedEpisodes = [...(currentSeasonData?.episodes ?? [])].sort((a, b) => a.episode_number - b.episode_number);
  const filteredEpisodes = sortedEpisodes.filter((ep) => {
    const q = episodeQuery.trim().toLowerCase();
    if (!q) return true;
    const title = (ep.name || '').toLowerCase();
    return title.includes(q) || String(ep.episode_number).includes(q);
  });

  const activeEpisodeIndex = sortedEpisodes.findIndex((ep) => (
    ep.episode_number === playingEpisode && currentSeasonData?.season_number === playingSeason
  ));

  const jumpEpisode = (direction) => {
    if (!sortedEpisodes.length || activeEpisodeIndex < 0 || !currentSeasonData) return;
    const nextIndex = activeEpisodeIndex + direction;
    if (nextIndex < 0 || nextIndex >= sortedEpisodes.length) return;
    const nextEpisode = sortedEpisodes[nextIndex];
    setPlayingSeason(currentSeasonData.season_number);
    setPlayingEpisode(nextEpisode.episode_number);
  };

  const onEpisodeMouseDown = useCallback((e) => {
    const el = episodeListRef.current;
    if (!el) return;
    dragStateRef.current = {
      active: true,
      startX: e.pageX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    setIsDraggingEpisodes(true);
  }, []);

  const onEpisodeMouseMove = useCallback((e) => {
    const el = episodeListRef.current;
    const drag = dragStateRef.current;
    if (!el || !drag.active) return;

    const delta = e.pageX - drag.startX;
    if (Math.abs(delta) > 4) drag.moved = true;
    el.scrollLeft = drag.startScrollLeft - delta;
  }, []);

  const endEpisodeDrag = useCallback(() => {
    const drag = dragStateRef.current;
    if (!drag.active) return;
    drag.active = false;
    suppressClickRef.current = drag.moved;
    setIsDraggingEpisodes(false);

    // Clear click suppression after the current event loop.
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, []);

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
    window.addEventListener('mouseup', endEpisodeDrag);
    return () => window.removeEventListener('mouseup', endEpisodeDrag);
  }, [endEpisodeDrag]);

  useEffect(() => {
    window.addEventListener('mouseup', endRelatedDrag);
    return () => window.removeEventListener('mouseup', endRelatedDrag);
  }, [endRelatedDrag]);

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

  if (!tv) return null;

  const rating   = tv.vote_average > 0 ? tv.vote_average.toFixed(1) : null;
  const year     = (tv.first_air_date ?? "").slice(0, 4);
  const genres   = (tv.genres ?? []).slice(0, 3).map(g => g.name).join(" · ");
  const overview = tv.overview ?? "";
  const truncated = overview.length > 240 && !showOverview
    ? overview.slice(0, 240) + "…"
    : overview;

  const handleRelatedSelect = (item) => {
    navigate(toDetailPath('tv', item.id, item.name || item.title), {
      state: { from: '/series' },
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">      <SEO
        title={`${tv.name}${year ? ` (${year})` : ''} — Watch Free on WeFlix`}
        description={
          tv.overview
            ? `${tv.overview.slice(0, 150).trim()}… Stream ${tv.name} free on WeFlix.`
            : `Stream ${tv.name} free on WeFlix.`
        }
        image={
          tv.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}`
            : tv.poster_path
            ? `https://image.tmdb.org/t/p/w780${tv.poster_path}`
            : undefined
        }
        type="video.episode"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'TVSeries',
          name: tv.name,
          description: tv.overview,
          image: tv.poster_path ? `https://image.tmdb.org/t/p/w780${tv.poster_path}` : undefined,
          startDate: tv.first_air_date,
          numberOfSeasons: allSeasons.length || undefined,
          ...(tv.vote_average > 0 && {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: tv.vote_average.toFixed(1),
              bestRating: 10,
              ratingCount: tv.vote_count,
            },
          }),
          genre: (tv.genres ?? []).map(g => g.name),
        }}
      />
      {/* ── Back button ───────────────────────────── */}
      <div className="px-4 pt-5 md:px-12 max-w-7xl mx-auto w-full">
        <button
          onClick={handleBack}
          className="group inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-sm border border-white/[0.12] text-gray-300 hover:text-white text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200"
        >
          <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back</span>
        </button>
      </div>

      {/* ── Video Player ──────────────────────────── */}
      <div className="px-3 sm:px-5 md:px-10 lg:px-16 pt-5 mb-8 md:mb-12">
        <div className="w-full max-w-[1180px] mx-auto">
        {/* Player header */}
        <div className="flex items-center gap-3 mb-4 bg-white/[0.04] border border-white/[0.1] rounded-2xl px-4 py-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-600/25 border border-red-500/40 shrink-0">
            <FaTv className="text-red-400 text-sm" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold mb-0.5">Now Playing</p>
            <h2 className="text-sm md:text-base font-semibold text-white truncate leading-tight">
              {tv.name}
              {playingSeason !== null && playingEpisode !== null && (
                <span className="text-gray-500 font-normal"> · S{String(playingSeason).padStart(2,'0')}E{String(playingEpisode).padStart(2,'0')}</span>
              )}
            </h2>
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
          <div className="w-full aspect-video bg-black">
            {playingSeason !== null && playingEpisode !== null ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`player-${tvId}-${playingSeason}-${playingEpisode}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full"
                >
                  <MemoizedVideoPlayer
                    tvId={tvId}
                    season={playingSeason}
                    episode={playingEpisode}
                    title={tv.name}
                    key={`${tvId}-${playingSeason}-${playingEpisode}`}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                Select an episode to start watching
              </div>
            )}
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

      {/* ── Episode Selector ─────────────────────── */}
      {allSeasons.length > 0 && (
        <div className="px-3 sm:px-5 md:px-10 lg:px-16 pb-8 md:pb-12">
          <div className="max-w-7xl mx-auto">
            <section className="rounded-2xl bg-white/[0.02] p-4 sm:p-5">
              {/* Section header */}
              <div className="flex flex-wrap items-start gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40">
                  <BiTv className="text-red-400 text-sm" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-black tracking-tight">Episodes</h2>
                  <p className="text-gray-500 text-xs">{currentSeasonData?.episodes?.length ?? 0} episodes · Season {viewingSeason}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => jumpEpisode(-1)}
                    disabled={activeEpisodeIndex <= 0}
                    className="w-9 h-9 rounded-lg border border-white/12 bg-white/[0.03] text-gray-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    aria-label="Previous episode"
                  >
                    <BiChevronLeft className="text-lg" />
                  </button>
                  <button
                    onClick={() => jumpEpisode(1)}
                    disabled={activeEpisodeIndex < 0 || activeEpisodeIndex >= sortedEpisodes.length - 1}
                    className="w-9 h-9 rounded-lg border border-white/12 bg-white/[0.03] text-gray-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    aria-label="Next episode"
                  >
                    <BiChevronRight className="text-lg" />
                  </button>
                </div>
              </div>

              {/* Now playing summary */}
              {activeEpisodeIndex >= 0 && sortedEpisodes[activeEpisodeIndex] && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`episode-summary-${playingSeason}-${playingEpisode}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-4 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2.5"
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">Now Playing</p>
                    <p className="text-sm font-semibold text-white mt-0.5 line-clamp-1">
                      S{String(playingSeason).padStart(2, '0')} · E{String(playingEpisode).padStart(2, '0')} — {sortedEpisodes[activeEpisodeIndex].name || `Episode ${playingEpisode}`}
                    </p>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Episode quick filter */}
              <div className="relative mb-4 max-w-md">
                <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={episodeQuery}
                  onChange={(e) => setEpisodeQuery(e.target.value)}
                  placeholder="Find episode by title or number..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Season tabs */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-4">
                {allSeasons.map(season => (
                  <button
                    key={season.id ?? season.season_number}
                    onClick={() => {
                      const defaultEpisode =
                        season.episodes?.find((ep) => ep.episode_number === 1)?.episode_number
                        ?? season.episodes?.[0]?.episode_number
                        ?? 1;
                      setViewingSeason(season.season_number);
                      setPlayingSeason(season.season_number);
                      setPlayingEpisode(defaultEpisode);
                    }}
                    className={`
                      relative shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap overflow-hidden
                      border-2 transition-colors duration-150 focus:outline-none
                      ${viewingSeason === season.season_number
                        ? "border-red-500 bg-red-600 text-white shadow-[0_0_18px_rgba(220,38,38,0.35)]"
                        : "border-transparent bg-white/[0.04] text-gray-300 hover:text-white"
                      }
                    `}
                  >
                    {viewingSeason === season.season_number && (
                      <motion.span
                        layoutId="season-tab-underline"
                        className="absolute left-2 right-2 bottom-1 h-[2px] rounded-full bg-red-200/90"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    {playingSeason === season.season_number && viewingSeason !== season.season_number && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400" />
                    )}
                    S{String(season.season_number).padStart(2, '0')}
                  </button>
                ))}
              </div>

              {/* Episode cards */}
              {filteredEpisodes.length > 0 ? (
                <div
                  ref={episodeListRef}
                  onMouseDown={onEpisodeMouseDown}
                  onMouseMove={onEpisodeMouseMove}
                  onMouseLeave={endEpisodeDrag}
                  className={`grid grid-flow-col auto-cols-[190px] sm:auto-cols-[220px] gap-3 overflow-x-auto hide-scrollbar pb-2 px-1 select-none ${isDraggingEpisodes ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                  {filteredEpisodes.map(ep => {
                    const isPlaying = playingSeason === viewingSeason && playingEpisode === ep.episode_number;
                    return (
                      <button
                        ref={isPlaying ? activeEpisodeRef : null}
                        key={ep.id ?? ep.episode_number}
                        onClick={() => {
                          if (suppressClickRef.current) return;
                          setPlayingSeason(currentSeasonData.season_number);
                          setPlayingEpisode(ep.episode_number);
                        }}
                        className={`
                          group relative flex flex-col rounded-xl overflow-hidden text-left
                          border-2 focus:outline-none shrink-0
                          ${isPlaying
                            ? "border-red-500 bg-white/[0.03] shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.22]"
                          }
                        `}
                        aria-pressed={isPlaying}
                      >
                        <div className="relative w-full aspect-video bg-[#111827]">
                          {ep.still_path ? (
                            <img
                              src={`${STILL}${ep.still_path}`}
                              alt=""
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BiTv className="text-gray-700 text-2xl" />
                            </div>
                          )}

                          <span className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            E{ep.episode_number}
                          </span>

                          {isPlaying && (
                            <span className="absolute top-2 right-2 text-[10px] font-semibold bg-red-600/90 text-white px-2 py-0.5 rounded-full">
                              PLAYING
                            </span>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
                        </div>

                        <div className="px-3 py-2.5">
                          <p className="text-[11px] text-gray-400 font-medium">
                            Episode {ep.episode_number}
                          </p>
                          <p className={`text-sm font-semibold line-clamp-2 leading-snug mt-0.5 ${isPlaying ? "text-white" : "text-gray-200 group-hover:text-white"}`}>
                            {ep.name || `Episode ${ep.episode_number}`}
                          </p>
                          <p className={`text-[11px] mt-1 ${ep.runtime ? "text-gray-500" : "text-transparent"}`}>
                            {ep.runtime ? `${ep.runtime} min` : '–'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 text-sm italic">
                  {episodeQuery.trim() ? 'No matching episodes for this filter.' : 'No episodes available for this season.'}
                </p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ── Show details ─────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 460 }}>
        {/* Backdrop */}
        {tv.backdrop_path ? (
          <img
            src={`${BACKDROP}${tv.backdrop_path}`}
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
        {/* Top fade from episode section */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#0b0b0f] to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-10 px-4 sm:px-6 md:px-12 pt-10 pb-12 md:pb-16 max-w-7xl mx-auto">

          {/* Poster */}
          {tv.poster_path && (
            <div className="shrink-0 hidden md:block self-end">
              <div className="relative">
                <img
                  src={`${POSTER}${tv.poster_path}`}
                  alt={tv.name}
                  className="relative w-44 lg:w-56 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.18]"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full max-w-2xl pb-2">
            {/* Tagline */}
            {tv.tagline && (
              <p className="text-red-400/75 text-xs sm:text-sm font-medium italic tracking-wide border-l-2 border-red-500/40 pl-3">
                {tv.tagline}
              </p>
            )}

            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.3rem] font-black tracking-tight leading-[1.02] mb-1" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.75)' }}>
                {tv.name}
              </h1>
              {tv.original_name && tv.original_name !== tv.name && (
                <p className="text-gray-400 text-sm font-medium">{tv.original_name}</p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2">
              {year && <MetaBadge icon={BiCalendar}>{year}</MetaBadge>}
              {allSeasons.length > 0 && (
                <MetaBadge icon={BiTv}>{allSeasons.length} Season{allSeasons.length !== 1 ? "s" : ""}</MetaBadge>
              )}
              {tv.original_language && (
                <MetaBadge icon={BiGlobe}>{tv.original_language.toUpperCase()}</MetaBadge>
              )}
            </div>

            {/* Genre chips */}
            {(tv.genres ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(tv.genres ?? []).slice(0, 4).map((g, i) => (
                  <span
                    key={g.id}
                    className={`border text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap tracking-wide ${
                      ["bg-red-500/15 border-red-500/30 text-red-300",
                       "bg-violet-500/15 border-violet-500/30 text-violet-300",
                       "bg-sky-500/15 border-sky-500/30 text-sky-300",
                       "bg-amber-500/15 border-amber-500/30 text-amber-300"][i % 4]
                    }`}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {overview && (
              <div className="border-l-2 border-red-500/50 pl-4">
                <p className="text-gray-300 text-sm leading-7">{truncated}</p>
                {overview.length > 240 && (
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

      {/* ── Details cards ────────────────────────── */}
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
                    title={item.name || item.title}
                    poster={item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : '/placeholder.svg'}
                    rating={item.vote_average}
                    releaseDate={item.first_air_date}
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

TvDetails.propTypes = {
  tvId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default memo(TvDetails);

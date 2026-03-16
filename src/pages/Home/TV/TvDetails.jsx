import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  memo,
  useRef,
} from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSeriesDetails, fetchAllEpisodes, fetchRelatedSeries } from "../Fetcher";
import { getIdFromDetailSlug, toDetailPath } from "../urlUtils";
import { FaRedo, FaStar, FaArrowLeft, FaTv, FaStepBackward, FaStepForward } from "react-icons/fa";
import { BiCalendar, BiGlobe, BiTv, BiChevronLeft, BiChevronRight, BiSearch } from "react-icons/bi";
import DetailPageSkeleton from "../reused/DetailPageSkeleton";
import VideoPlayer from "./VideoPlayer";
import SEO from "../SEO";
import ContentCard from "../ContentCard";

const MemoizedVideoPlayer = memo(VideoPlayer);

const BACKDROP = "https://image.tmdb.org/t/p/original";
const POSTER = "https://image.tmdb.org/t/p/w342";
const STILL = "https://image.tmdb.org/t/p/w300";

const MetaBadge = ({ icon: Icon, children }) => (
  <span className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.12] text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-full">
    {Icon && <Icon className="text-gray-400 shrink-0 text-[12px]" />}
    {children}
  </span>
);

const getValidParamNumber = (params, key) => {
  const raw = params.get(key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const TvDetails = ({ tvId: tvIdProp }) => {
  const { slug } = useParams();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const tvId = tvIdProp ?? getIdFromDetailSlug(slug);
  const navigate = useNavigate();
  const [tv, setTv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [allSeasons, setAllSeasons] = useState([]);
  const [viewingSeason, setViewingSeason] = useState(null);
  const [playingSeason, setPlayingSeason] = useState(null);
  const [playingEpisode, setPlayingEpisode] = useState(null);
  const [showOverview, setShowOverview] = useState(false);
  const [episodeQuery, setEpisodeQuery] = useState('');
  const [isDraggingEpisodes, setIsDraggingEpisodes] = useState(false);
  const [isDraggingRelated, setIsDraggingRelated] = useState(false);
  const [related, setRelated] = useState([]);
  const numericTvId = Number(tvId);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    navigate(-1);
  };

  const activeEpisodeRef = useRef(null);
  const episodeListRef = useRef(null);
  const dragStateRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
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
        // Read URL params at fetch time so the correct season/episode is set as the
        // initial state directly — prevents S1E1 flash before URL sync can override.
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeason = getValidParamNumber(urlParams, 'season');
        const urlEpisode = getValidParamNumber(urlParams, 'episode');

        const selectedSeason =
          (urlSeason && filtered.find((s) => s.season_number === urlSeason))
          ?? filtered[0];
        const selectedEpisode =
          (urlEpisode && selectedSeason.episodes?.find((e) => e.episode_number === urlEpisode)?.episode_number)
          ?? selectedSeason.episodes?.find((e) => e.episode_number)?.episode_number
          ?? 1;

        setViewingSeason(selectedSeason.season_number);
        setPlayingSeason(selectedSeason.season_number);
        setPlayingEpisode(selectedEpisode);
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
      navigate({ pathname: canonicalPath, search: location.search }, { replace: true, state: location.state });
    }
  }, [tv, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!allSeasons.length) return;
    if (loading) return;
    if (!tv?.id || Number(tv.id) !== numericTvId) return;

    const params = new URLSearchParams(location.search);
    const urlSeason = getValidParamNumber(params, 'season');
    const urlEpisode = getValidParamNumber(params, 'episode');
    if (urlSeason === null && urlEpisode === null) return;

    const selectedSeason = allSeasons.find((s) => s.season_number === urlSeason) ?? allSeasons[0];
    const selectedEpisode =
      selectedSeason.episodes?.find((e) => e.episode_number === urlEpisode)?.episode_number
      ?? selectedSeason.episodes?.find((e) => e.episode_number)?.episode_number
      ?? 1;

    if (viewingSeason !== selectedSeason.season_number) {
      setViewingSeason(selectedSeason.season_number);
    }
    if (playingSeason !== selectedSeason.season_number) {
      setPlayingSeason(selectedSeason.season_number);
    }
    if (playingEpisode !== selectedEpisode) {
      setPlayingEpisode(selectedEpisode);
    }
  }, [allSeasons, location.search, loading, tv, numericTvId]);

  useEffect(() => {
    if (!allSeasons.length || playingSeason === null || playingEpisode === null) return;
    if (loading) return;
    if (!tv?.id || Number(tv.id) !== numericTvId) return;

    const params = new URLSearchParams(location.search);
    const currentSeason = getValidParamNumber(params, 'season');
    const currentEpisode = getValidParamNumber(params, 'episode');
    if (currentSeason === playingSeason && currentEpisode === playingEpisode) return;

    const nextParams = new URLSearchParams(location.search);
    nextParams.set('season', String(playingSeason));
    nextParams.set('episode', String(playingEpisode));
    setSearchParams(nextParams, { replace: true });
  }, [allSeasons.length, playingSeason, playingEpisode, location.search, setSearchParams, loading, tv, numericTvId]);

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
    <DetailPageSkeleton type="tv" />
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

  const rating = tv.vote_average > 0 ? tv.vote_average.toFixed(1) : null;
  const year = (tv.first_air_date ?? "").slice(0, 4);
  const genres = (tv.genres ?? []).slice(0, 3).map(g => g.name).join(" · ");
  const overview = tv.overview ?? "";
  const truncated = overview.length > 240 && !showOverview
    ? overview.slice(0, 240) + "…"
    : overview;

  const handleRelatedSelect = (item) => {
    navigate({ pathname: toDetailPath('tv', item.id, item.name || item.title), search: '' }, {
      state: { from: '/series' },
    });
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-gray-200 selection:bg-red-500/30">
      <SEO
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

      {/* ── HERO SECTION ── */}
      <div className="relative w-full min-h-[70vh] flex flex-col justify-end pt-32 pb-20">
        {/* Backdrop Image */}
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          {tv.backdrop_path ? (
            <img
              src={`${BACKDROP}${tv.backdrop_path}`}
              alt=""
              className="w-full h-full object-cover object-top"
              style={{ filter: "brightness(0.6) contrast(1.1) saturate(1.1)", transform: "scale(1.02)" }}
            />
          ) : (
            <div className="w-full h-full bg-[#111319] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 to-[#111319]" />
          )}
          {/* Gradients */}
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
          
          {/* Poster */}
          {tv.poster_path && (
            <div className="hidden md:block shrink-0 z-10">
              <img
                src={`${POSTER}${tv.poster_path}`}
                alt={tv.name}
                className="w-48 lg:w-64 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 max-w-3xl pb-2">
            {tv.tagline && (
              <p className="text-red-400 font-semibold tracking-wider text-xs md:text-sm uppercase mb-3 drop-shadow-md">
                {tv.tagline}
              </p>
            )}

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] mb-4 drop-shadow-2xl font-sans">
              {tv.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-300 mb-6 drop-shadow-md">
              {year && <span className="flex items-center gap-1.5"><BiCalendar className="text-gray-400 text-base" /> {year}</span>}
              {allSeasons.length > 0 && <span className="flex items-center gap-1.5"><BiTv className="text-gray-400 text-base" /> {allSeasons.length} Season{allSeasons.length !== 1 ? 's' : ''}</span>}
              {rating && <span className="flex items-center gap-1.5"><FaStar className="text-yellow-500 text-base" /> {rating}</span>}
            </div>

            {(tv.genres ?? []).length > 0 && (
               <div className="flex flex-wrap gap-2 mb-6">
                 {(tv.genres ?? []).map(g => (
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
                {overview.length > 240 && (
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

      {/* ── PLAYER SECTION ── */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 md:px-12 -mt-4 md:-mt-10 mb-12">
        <div className="bg-[#0f1117]/80 backdrop-blur-xl border border-white/5 rounded-2xl md:rounded-[2rem] p-2 md:p-5 shadow-2xl mb-6 ring-1 ring-white/5">
          <div className="flex items-center gap-3 mb-4 px-3 pt-2">
             <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
               <FaTv className="text-red-400 text-sm" />
             </div>
             <div>
               <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-red-500/80 mb-0.5">Stream Now</p>
               <h2 className="text-sm md:text-base font-semibold text-white/90 truncate">
                 {tv.name}
                 {playingSeason !== null && playingEpisode !== null && (
                   <span className="text-gray-400 font-normal"> · S{String(playingSeason).padStart(2, '0')}E{String(playingEpisode).padStart(2, '0')}</span>
                 )}
               </h2>
             </div>
          </div>
          
          <div className="w-full aspect-video rounded-xl md:rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative">
            {playingSeason !== null && playingEpisode !== null ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`player-${tvId}-${playingSeason}-${playingEpisode}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
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
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                Select an episode to start watching
              </div>
            )}
          </div>
          
          {/* Controls */}
          {playingSeason !== null && playingEpisode !== null && sortedEpisodes.length > 1 && (
            <div className="flex items-center justify-between mt-4 px-2 mb-2 gap-3">
              <button
                onClick={() => jumpEpisode(-1)}
                disabled={activeEpisodeIndex <= 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-gray-300 hover:text-white hover:bg-white/[0.10] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-sm font-semibold"
              >
                <FaStepBackward className="text-xs" />
                Prev
              </button>

              <span className="text-xs text-gray-400 font-semibold tracking-wide hidden sm:block truncate text-center max-w-sm">
                S{String(playingSeason).padStart(2, '0')} · E{String(playingEpisode).padStart(2, '0')}
                {activeEpisodeIndex >= 0 && sortedEpisodes[activeEpisodeIndex]?.name
                  ? ` — ${sortedEpisodes[activeEpisodeIndex].name}`
                  : ''}
              </span>

              <button
                onClick={() => jumpEpisode(1)}
                disabled={activeEpisodeIndex < 0 || activeEpisodeIndex >= sortedEpisodes.length - 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 border border-red-500/50 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-sm font-semibold shadow-[0_0_15px_rgba(220,38,38,0.2)]"
              >
                Next
                <FaStepForward className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── EPISODES SELECTOR ── */}
      {allSeasons.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-16">
          <section className="bg-[#111319]/50 backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 md:px-8 border-b border-white/[0.04]">
              <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 shrink-0">
                  <BiTv className="text-red-400 text-lg" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white mb-0.5">Episodes</h2>
                  <p className="text-gray-400 text-xs font-medium">
                    {currentSeasonData?.episodes?.length ?? 0} episodes in Season {viewingSeason}
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  value={episodeQuery}
                  onChange={(e) => setEpisodeQuery(e.target.value)}
                  placeholder="Search episodes…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {/* Seasons List */}
            {allSeasons.length > 1 && (
              <div className="px-5 md:px-8 pt-6 pb-2">
                <div className="flex gap-3 overflow-x-auto hide-scrollbar">
                  {allSeasons.map(season => {
                    const isViewing = viewingSeason === season.season_number;
                    return (
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
                        className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${isViewing ? 'bg-red-600 text-white shadow-[0_4px_14px_rgba(220,38,38,0.4)]' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/5'}`}
                      >
                        Season {season.season_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Episodes List */}
            <div className="p-5 md:px-8 pt-4 pb-8">
              {filteredEpisodes.length > 0 ? (
                <div
                  ref={episodeListRef}
                  onMouseDown={onEpisodeMouseDown}
                  onMouseMove={onEpisodeMouseMove}
                  onMouseLeave={endEpisodeDrag}
                  className={`grid grid-flow-col auto-cols-[180px] sm:auto-cols-[220px] gap-4 overflow-x-auto hide-scrollbar pb-4 select-none ${isDraggingEpisodes ? 'cursor-grabbing' : 'cursor-grab'}`}
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
                        className="group relative flex flex-col rounded-2xl overflow-hidden text-left bg-black hover:ring-2 hover:ring-white/20 transition-all duration-300 shrink-0"
                        style={isPlaying ? {
                          ringWidth: '2px',
                          ringColor: '#dc2626',
                          boxShadow: '0 10px 30px rgba(220,38,38,0.3)',
                        } : {
                           ringWidth: '1px',
                           ringColor: 'rgba(255,255,255,0.1)'
                        }}
                      >
                        <div className={`absolute inset-0 border-2 rounded-2xl pointer-events-none z-20 ${isPlaying ? 'border-red-500' : 'border-white/5 group-hover:border-white/20'} transition-colors`}></div>
                        
                        {/* Thumbnail */}
                        <div className="relative w-full aspect-video bg-[#0d1117] overflow-hidden">
                          {ep.still_path ? (
                            <img
                              src={`${STILL}${ep.still_path}`}
                              alt=""
                              className={`w-full h-full object-cover transition-transform duration-500 ${isPlaying ? 'scale-105' : 'group-hover:scale-110'}`}
                              draggable={false}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BiTv className="text-gray-700 text-2xl" />
                            </div>
                          )}

                          <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 z-10">
                            E{ep.episode_number}
                          </span>

                          {isPlaying && (
                            <span className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] font-bold bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)] text-white px-2.5 py-1 rounded-full z-10">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              PLAYING
                            </span>
                          )}

                          {!isPlaying && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                              <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-lg">
                                <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className={`px-4 py-3.5 flex-1 relative z-10 ${isPlaying ? 'bg-red-950/40' : 'bg-[#151821]'}`}>
                          <p className={`text-sm font-bold line-clamp-2 leading-snug ${isPlaying ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                            {ep.name || `Episode ${ep.episode_number}`}
                          </p>
                          {ep.runtime && (
                            <p className="text-[11px] text-gray-500 font-medium mt-1.5">{ep.runtime} min</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-500 bg-white/[0.02] rounded-2xl border border-white/5">
                  <p className="text-sm">{episodeQuery.trim() ? 'No episodes found matching your search.' : 'No episodes available for this season.'}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

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

TvDetails.propTypes = {
  tvId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default memo(TvDetails);
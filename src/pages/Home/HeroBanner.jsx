import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toDetailPath } from './urlUtils';
import { FaPlay, FaInfoCircle, FaStar } from 'react-icons/fa';
import { BiCalendar } from 'react-icons/bi';

const API_KEY  = import.meta.env.VITE_TMDB_API;
const BASE_URL = import.meta.env.VITE_BASE_URL;
const BACKDROP = 'https://image.tmdb.org/t/p/original';
const INTERVAL = 7000;

/* TMDB genre ID → label */
const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Sci-Fi', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10765: 'Sci-Fi & Fantasy',
  10768: 'War & Politics',
};

const useTrending = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(`${BASE_URL}/trending/all/week`);
        url.searchParams.append('api_key', API_KEY);
        url.searchParams.append('language', 'en-US');
        const res  = await fetch(url);
        const data = await res.json();
        if (!cancelled) {
          setItems(
            (data.results ?? [])
              .filter(i => i.backdrop_path && (i.title || i.name) && i.overview)
              .slice(0, 6)
          );
        }
      } catch { /* silently ignore */ }
      finally  { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return { items, loading };
};

export default function HeroBanner() {
  const { items, loading } = useTrending();
  const [active, setActive] = useState(0);
  const [fade,   setFade]   = useState(true);
  const [barKey, setBarKey] = useState(0);
  const navigate = useNavigate();

  const goTo = useCallback((next) => {
    setFade(false);
    setTimeout(() => {
      setActive(typeof next === 'function' ? next : () => next);
      setFade(true);
      setBarKey(k => k + 1);
    }, 300);
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => goTo(prev => (prev + 1) % items.length), INTERVAL);
    return () => clearInterval(id);
  }, [items.length, goTo]);

  if (loading) {
    return (
      <div className="relative w-full h-[72vh] md:h-screen overflow-hidden bg-[#0a0c12]">
        {/* Ambient backdrop shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c12] via-[#121826] to-[#0a0c12] opacity-70 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] via-transparent to-black/35" />

        {/* Skeleton content block */}
        <div className="relative z-10 h-full flex flex-col justify-end md:justify-center px-6 md:px-14 pb-20 md:pb-16 max-w-2xl">
          <div className="w-24 h-7 rounded-full bg-white/[0.08] mb-4 animate-pulse" />
          <div className="space-y-3 mb-5">
            <div className="h-10 md:h-12 w-[85%] rounded-lg bg-white/[0.09] animate-pulse" />
            <div className="h-10 md:h-12 w-[65%] rounded-lg bg-white/[0.08] animate-pulse" />
          </div>
          <div className="flex gap-2 mb-6">
            <div className="h-4 w-20 rounded-full bg-white/[0.08] animate-pulse" />
            <div className="h-4 w-16 rounded-full bg-white/[0.07] animate-pulse" />
            <div className="h-4 w-24 rounded-full bg-white/[0.07] animate-pulse" />
          </div>
          <div className="space-y-2 mb-7 hidden sm:block">
            <div className="h-3.5 w-full rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3.5 w-[92%] rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3.5 w-[78%] rounded bg-white/[0.06] animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-36 rounded-full bg-white/[0.12] animate-pulse" />
            <div className="h-11 w-32 rounded-full bg-white/[0.09] animate-pulse" />
          </div>
        </div>

        {/* Subtle loading label */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500 font-semibold">Loading Highlights</p>
        </div>
      </div>
    );
  }
  if (!items.length) return null;

  const item    = items[active];
  const isTV    = item.media_type === 'tv';
  const title   = item.title  || item.name;
  const year    = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating  = item.vote_average > 0 ? item.vote_average.toFixed(1) : null;
  const votes   = item.vote_count > 999
    ? `${(item.vote_count / 1000).toFixed(1)}k`
    : item.vote_count;
  const genres  = (item.genre_ids ?? []).slice(0, 3).map(id => GENRE_MAP[id]).filter(Boolean);
  const overview = (item.overview ?? '').slice(0, 220) + ((item.overview ?? '').length > 220 ? '…' : '');

  const handlePlay = () => navigate(toDetailPath(isTV ? 'tv' : 'movie', item.id, title));

  return (
    <div className="relative w-full h-[72vh] md:h-screen overflow-hidden bg-black select-none">

      {/* ── Backdrop ─────────────────────────── */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        <img
          src={`${BACKDROP}${item.backdrop_path}`}
          alt={title}
          className="w-full h-full object-cover object-center"
        />
        {/* Cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] via-transparent to-black/30" />
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black/60 to-transparent" />
      </div>

      {/* ── Content ──────────────────────────── */}
      <div className={`relative z-10 h-full flex flex-col justify-end md:justify-center px-6 md:px-14 pb-20 md:pb-16 max-w-2xl transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>

        {/* Live badge + type label */}
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-red-600/20 border border-red-500/40 text-red-400 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Trending
          </span>
          <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-widest">
            {isTV ? 'TV Series' : 'Movie'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-black text-white leading-[1.05] tracking-tight mb-3 drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
          {title}
        </h1>

        {/* Meta: rating + year + genres */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
          {rating && (
            <span className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm">
              <FaStar className="text-yellow-400 text-xs" />
              {rating}
              <span className="text-gray-500 font-normal text-xs">({votes})</span>
            </span>
          )}
          {year && (
            <span className="flex items-center gap-1.5 text-gray-400 text-sm">
              <BiCalendar className="text-gray-500 text-xs" />
              {year}
            </span>
          )}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.map(g => (
                <span key={g} className="text-[11px] font-semibold text-gray-300 bg-white/[0.09] border border-white/[0.12] px-2.5 py-0.5 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Overview */}
        {overview && (
          <p className="text-gray-300/85 text-sm leading-relaxed mb-7 max-w-lg hidden sm:block">
            {overview}
          </p>
        )}

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlay}
            className="flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white font-bold px-7 py-3 rounded-full transition-all duration-200 hover:scale-105 shadow-lg shadow-red-700/40 text-sm"
          >
            <FaPlay className="text-xs" />
            Play Now
          </button>
          <button
            onClick={handlePlay}
            className="flex items-center gap-2 bg-white/[0.1] hover:bg-white/[0.18] backdrop-blur border border-white/[0.15] text-white font-semibold px-6 py-3 rounded-full transition-all duration-200 text-sm"
          >
            <FaInfoCircle className="text-sm" />
            <span className="hidden sm:inline">More Info</span>
            <span className="sm:hidden">Details</span>
          </button>
        </div>
      </div>

      {/* ── Progress indicator pills ─────────── */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { if (i !== active) goTo(i); }}
              aria-label={`Slide ${i + 1}`}
              className="relative overflow-hidden rounded-full transition-all duration-300"
              style={{ width: i === active ? 28 : 8, height: 8 }}
            >
              <span className="absolute inset-0 rounded-full bg-gray-600/50" />
              {i === active ? (
                <span
                  key={barKey}
                  className="absolute inset-y-0 left-0 rounded-full bg-red-500"
                  style={{ animation: `fillBar ${INTERVAL}ms linear forwards` }}
                />
              ) : (
                <span className="absolute inset-0 rounded-full bg-gray-500/50 hover:bg-gray-400/60 transition-colors" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Thumbnail strip (desktop only) ───── */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 z-20 hidden lg:flex gap-2">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => { if (i !== active) goTo(i); }}
              className={`relative w-[80px] h-[50px] rounded-lg overflow-hidden ring-1 transition-all duration-200 ${
                i === active
                  ? 'ring-red-500 scale-105 opacity-100'
                  : 'ring-white/10 opacity-45 hover:opacity-75'
              }`}
            >
              <img src={`${BACKDROP}${it.backdrop_path}`} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes fillBar { from { width:0% } to { width:100% } }`}</style>
    </div>
  );
}

import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import ContentCard from './ContentCard';
import { fetchContentByGenre, fetchTrending } from './Fetcher';
import { SPECIAL_PARAMS } from './tmdb';
import { BiWifi } from 'react-icons/bi';

const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const MAX_PAGES = 500;

const ErrorWarning = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-16">
    <BiWifi className="text-red-400 w-10 h-10" />
    <p className="text-gray-400 text-sm font-medium">Connection error — check your network</p>
  </div>
);

const ContentGrid = ({ genreId, type, onSelect, sortBy = 'popularity.desc' }) => {
  // fetchParams is the single source of truth for what to fetch.
  // Keeping it in state ensures the fetch effect always sees fresh values —
  // the sync effect below updates it, causing a new render, and only then
  // does the fetch effect fire (eliminating stale-closure issues).
  const [fetchParams, setFetchParams] = useState({ genreId, type, sortBy, page: 1 });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const hasMoreRef   = useRef(true);
  const loadingRef   = useRef(false);
  const seenIdsRef   = useRef(new Set());
  const abortRef     = useRef(null);
  const observerRef  = useRef(null);
  const lastElementRef = useRef(null);

  // When genre/type/sort props change, reset fetchParams to page 1.
  // This fires in one render; the fetch effect fires in the NEXT render
  // after fetchParams state is committed — so no stale closure.
  useEffect(() => {
    setFetchParams({ genreId, type, sortBy, page: 1 });
  }, [genreId, type, sortBy]);

  // Execute a fetch whenever fetchParams changes.
  useEffect(() => {
    const { genreId: gId, type: t, sortBy: s, page } = fetchParams;
    const today = new Date().toISOString().slice(0, 10);
    const shouldTightenNewestTv = t === 'tv' && s === 'first_air_date.desc';

    // On page 1, reset all accumulated state synchronously before fetching.
    if (page === 1) {
      abortRef.current?.abort();
      loadingRef.current = false;
      seenIdsRef.current = new Set();
      hasMoreRef.current = true;
      setError(null);
    }

    if (!hasMoreRef.current || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const overrideParams = gId != null && gId < 0 ? (SPECIAL_PARAMS[`${gId}_${t}`] ?? null) : null;
    const fetchPromise = gId == null
      ? fetchTrending(t, page, 'week', signal)
      : fetchContentByGenre(t, gId, page, overrideParams, s, signal);

    fetchPromise
      .then((newContent) => {
        if (signal.aborted) return;
        const sanitized = shouldTightenNewestTv
          ? newContent.filter((item) => (
            Boolean(item.poster_path) &&
            Boolean(item.first_air_date) &&
            item.first_air_date <= today &&
            Number(item.vote_count || 0) >= 20
          ))
          : newContent;

        const unique = sanitized.filter((item) => {
          if (seenIdsRef.current.has(item.id)) return false;
          seenIdsRef.current.add(item.id);
          return true;
        });

        if (page === 1) {
          setRefreshToken((prev) => prev + 1);
        }

        setItems((prev) => (page === 1 ? unique : [...prev, ...unique]));
        hasMoreRef.current = unique.length > 0 && page < MAX_PAGES;
      })
      .catch((err) => {
        if (signal.aborted || err?.name === 'AbortError') return;
        setError(err.message);
      })
      .finally(() => {
        if (signal.aborted) return;
        setLoading(false);
        loadingRef.current = false;
      });

    return () => { controller.abort(); };
  }, [fetchParams]);

  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && !loadingRef.current && hasMoreRef.current) {
      setFetchParams((prev) => ({
        ...prev,
        page: Math.min(prev.page + 1, MAX_PAGES),
      }));
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1,
    });
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    const currentElement = lastElementRef.current;
    const currentObserver = observerRef.current;
    if (currentElement && currentObserver) {
      currentObserver.observe(currentElement);
    }
    return () => {
      if (currentElement && currentObserver) {
        currentObserver.unobserve(currentElement);
      }
    };
  }, [items]);

  const renderContent = () => {
    return items.map((item, index) => {
      const isLastElement = index === items.length - 1;
      const posterPath = item.poster_path
        ? `${POSTER_BASE_URL}${item.poster_path}`
        : '/placeholder.svg';

      return (
        <motion.div
          key={`${refreshToken}-${item.id}`}
          ref={isLastElement ? lastElementRef : null}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.26,
            ease: 'easeOut',
            delay: Math.min(index, 14) * 0.018,
          }}
        >
          <ContentCard
            title={item.title || item.name}
            poster={posterPath}
            rating={item.vote_average}
            onClick={() => onSelect(item)}
            releaseDate={item.release_date || item.first_air_date}
          />
        </motion.div>
      );
    });
  };

  const isRefreshing = loading && fetchParams.page === 1 && items.length > 0;

  return (
    <div className="px-2 sm:px-4 py-4">
      {/* Initial loading skeleton */}
      {items.length === 0 && loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className="w-full aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Soft refresh indicator when switching tabs/genres/sorts */}
      {isRefreshing && (
        <div className="mb-3 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
              Updating
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
        {renderContent()}
      </div>

      {/* Infinite-scroll spinner */}
      {items.length > 0 && loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-red-600 border-t-transparent" />
        </div>
      )}

      {error && <ErrorWarning />}
    </div>
  );
};

ContentGrid.propTypes = {
  genreId: PropTypes.number,
  type: PropTypes.oneOf(['movie', 'tv']).isRequired,
  onSelect: PropTypes.func.isRequired,
  sortBy: PropTypes.string,
};

export default ContentGrid;

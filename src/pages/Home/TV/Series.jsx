import { useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toDetailPath } from '../urlUtils';
import ContentGrid from '../ContentGrid';
import { GENRES, SPECIAL_CATEGORIES } from '../tmdb';
import { BiTv, BiSortAlt2 } from 'react-icons/bi';
import { buildBrowsePath, getCategoryBySlug, getSortByFromSlug } from '../urlFilters';
import SEO from '../SEO';

const SORT_OPTIONS = [
  { value: 'popularity.desc',    label: 'Most Popular' },
  { value: 'vote_average.desc',   label: 'Top Rated' },
  { value: 'first_air_date.desc', label: 'Newest' },
  { value: 'first_air_date.asc',  label: 'Oldest' },
];

function Series() {
  const navigate = useNavigate();
  const location = useLocation();
  const { genreSlug, sortSlug } = useParams();
  const [searchParams] = useSearchParams();

  const genreFromPath = getCategoryBySlug('tv', genreSlug);
  const queryGenreId = searchParams.get('genre') ? Number(searchParams.get('genre')) : null;
  const genreId = genreFromPath?.id ?? queryGenreId;

  const sortFromPath = getSortByFromSlug('tv', sortSlug);
  const querySortBy = searchParams.get('sort');
  const sortBy = sortSlug ? sortFromPath : (querySortBy || 'popularity.desc');

  const allCategories = [
    { id: null, name: 'Trending' },
    ...[...GENRES.tv, ...SPECIAL_CATEGORIES.tv].sort((a, b) => a.name.localeCompare(b.name)),
  ];

  const genre =
    GENRES.tv.find(g => g.id === genreId) ||
    SPECIAL_CATEGORIES.tv.find(g => g.id === genreId);

  const handleSelect = (item) => {
    navigate(toDetailPath('tv', item.id, item.title || item.name), {
      state: { from: location.pathname + location.search },
    });
  };

  useEffect(() => {
    const cleanPath = buildBrowsePath('tv', genreId, sortBy);
    const hasLegacyQuery = searchParams.has('genre') || searchParams.has('sort');
    const shouldReplace = hasLegacyQuery || location.pathname !== cleanPath;
    if (shouldReplace) {
      navigate(cleanPath, { replace: true });
    }
  }, [genreId, sortBy, searchParams, location.pathname, navigate]);

  const handleSort = (value) => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    navigate(buildBrowsePath('tv', genreId, value));
  };

  const handleGenreChip = (id) => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    navigate(buildBrowsePath('tv', id, 'popularity.desc'));
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [genreId, sortBy]);

  const activeSortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || 'Most Popular';

  return (
    <div className="flex flex-col min-h-screen">
      <SEO
        title={genre ? `${genre.name} TV Shows` : 'TV Shows'}
        description={
          genre
            ? `Stream ${genre.name} TV shows free on WeFlix. Watch the best ${genre.name.toLowerCase()} series, from binge-worthy dramas to must-watch hits.`
            : 'Stream trending TV shows and series free on WeFlix. Discover the most popular, top-rated, and newest shows across all genres.'
        }
      />
      {/* Sticky context header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-[#0b0f18]/80 border-b border-white/[0.06]">
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center">
              <BiTv className="text-red-400 text-lg" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tight">TV Shows</h1>
              {genre ? (
                <p className="text-gray-500 text-sm">
                  Browsing <span className="text-red-400 font-semibold">{genre.name}</span>
                </p>
              ) : (
                <p className="text-gray-500 text-sm">
                  <span className="text-red-400 font-semibold">Trending</span> this week
                </p>
              )}
            </div>
          </div>
          {/* Sort selector — hidden on trending (no genre selected) */}
          {genreId && (
            <div className="flex items-center gap-2">
              <BiSortAlt2 className="text-gray-500 text-lg shrink-0" />
              <select
                value={sortBy}
                onChange={e => handleSort(e.target.value)}
                className="bg-white/[0.07] border border-white/10 text-sm text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-[#0b0f18]">{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

      </div>
      </div>

      {/* Mobile genre chips — hidden on md+ (sidebar handles it there) */}
      <div className="md:hidden overflow-x-auto hide-scrollbar px-4 pb-3">
        <div className="flex gap-2 w-max">
          {allCategories.map(cat => {
            const isActive = cat.id === null ? genreId === null : genreId === cat.id;
            return (
              <button
                key={cat.id ?? 'trending'}
                onClick={() => handleGenreChip(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'bg-white/[0.07] text-gray-400 border border-white/10'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-grow">
        <ContentGrid
          genreId={genreId}
          type="tv"
          onSelect={handleSelect}
          sortBy={sortBy}
          onReset={() => navigate('/series')}
        />
      </main>
    </div>
  );
}

export default Series;

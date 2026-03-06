
const VALID_TYPES = ['movie', 'tv'];

// Static mapping of genres
export const GENRES = {
  movie: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' }
  ],
  tv: [
    { id: 10759, name: 'Action & Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 10762, name: 'Kids' },
    { id: 9648, name: 'Mystery' },
    { id: 10764, name: 'Reality' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 10766, name: 'Soap' },
    { id: 37, name: 'Talk' },
    { id: 10767, name: 'War & Politics' },
    { id: 10768, name: 'Western' }
  ]
};

export const fetchGenres = async (type) => {
  // Validate media type
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  // Return the genres from the static mapping
  return GENRES[type];
};

// Special curated categories that require custom TMDB API params (use negative IDs)
export const SPECIAL_CATEGORIES = {
  movie: [
    { id: -1, name: 'Anime' },
    { id: -2, name: 'Thai Movie' },
    { id: -3, name: 'Korean Movie' },
    { id: -4, name: 'Chinese Movie' },
  ],
  tv: [
    { id: -1, name: 'Anime' },
    { id: -2, name: 'K-Drama' },
    { id: -3, name: 'C-Drama' },
    { id: -4, name: 'Donghua' },
    { id: -5, name: 'Thai Drama' },
  ],
};

// Maps special category key "<id>_<type>" to extra TMDB discover params
export const SPECIAL_PARAMS = {
  '-1_movie': { with_genres: '16', with_keywords: '210024' },          // Anime movies
  '-1_tv':    { with_genres: '16', with_keywords: '210024' },          // Anime TV
  '-2_movie': { with_origin_country: 'TH' },                           // Thai Movie
  '-3_movie': { with_origin_country: 'KR', with_original_language: 'ko' }, // Korean Movie
  '-4_movie': { with_origin_country: 'CN', with_original_language: 'zh' }, // Chinese Movie
  '-2_tv':    { with_origin_country: 'KR', with_genres: '18' },       // K-Drama
  '-3_tv':    { with_origin_country: 'CN', without_genres: '16' }, // C-Drama (exclude donghua/animation)
  '-4_tv':    { with_genres: '16', with_original_language: 'zh' },    // Donghua (Chinese-language animation)
  '-5_tv':    { with_origin_country: 'TH', with_genres: '18' },       // Thai Drama
};
import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import {
  BiSearch,
  BiHomeAlt,
  BiMoviePlay,
  BiTv,
} from 'react-icons/bi';
import { FaPlay } from 'react-icons/fa';
import { GENRES, SPECIAL_CATEGORIES } from './tmdb';

const NAV_ITEMS = [
  { id: 'search',  icon: BiSearch,    action: 'navigate', label: 'Search'   },
  { id: 'home',    icon: BiHomeAlt,   action: 'navigate', label: 'Home'     },
  { id: 'movies',  icon: BiMoviePlay, action: 'navigate', label: 'Movies'   },
  { id: 'series',  icon: BiTv,        action: 'navigate', label: 'TV Shows' },
];

function Sidebar({ activePage, onNavigate, selectedGenreId, onGenreSelect }) {
  const activeId =
    activePage === 'search'  ? 'search'
    : activePage === 'movies'  ? 'movies'
    : activePage === 'series'  ? 'series'
    : 'home';

  const showCategories = activePage === 'movies' || activePage === 'series';
  const genreType = activePage === 'movies' ? 'movie' : 'tv';
  const allCategories = showCategories
    ? [...GENRES[genreType], ...SPECIAL_CATEGORIES[genreType]].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <aside className="
      group fixed top-0 left-0 h-full z-50
      hidden md:flex flex-col
      w-[84px] hover:w-[260px]
      bg-gray-900/95 backdrop-blur-xl
      border-r border-white/10
      shadow-2xl shadow-black/30
      overflow-hidden
      transition-[width] duration-300 ease-in-out
      select-none
    ">

      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none" />

      {/* Logo */}
      <button onClick={() => onNavigate('home')} className="relative flex items-center gap-4 px-[18px] pt-8 pb-8 shrink-0 text-left hover:opacity-90 transition-opacity">
        <div className="flex items-center justify-center w-[48px] h-[48px] rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40 ring-1 ring-white/10 shrink-0">
          <FaPlay className="text-white text-[15px] ml-0.5" />
        </div>
        <div className="flex flex-col leading-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
          <span className="text-white font-black text-[20px] tracking-tight">WeFlix</span>
          <span className="text-red-400/70 text-[10px] font-semibold tracking-[0.22em] uppercase mt-0.5">Streaming</span>
        </div>
      </button>

      {/* Nav section label */}
      <div className="px-[18px] mb-1 shrink-0">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75 text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500 whitespace-nowrap">
          Menu
        </span>
      </div>

      {/* Nav items */}
      <nav className={`flex flex-col gap-1 px-[10px] ${showCategories ? 'shrink-0 pb-3' : 'flex-1 pb-6'}`}>
        {NAV_ITEMS.map(({ id, icon: Icon, action, label }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={label}
              className={`
                relative flex items-center gap-4 px-4 py-3.5 rounded-2xl
                w-full text-[14px] font-medium whitespace-nowrap
                border-2 transition-colors duration-200 focus:outline-none
                ${isActive
                  ? 'border-red-500/35 bg-red-500/15 text-white shadow-sm shadow-red-950/30'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5 hover:border-transparent'
                }
              `}
            >
              {/* Active left-bar indicator */}
              {isActive && (
                <motion.span
                  layoutId="sidebar-nav-active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-red-500"
                  transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                />
              )}
              <Icon className={`text-[24px] shrink-0 transition-colors duration-200 ${isActive ? 'text-red-400' : ''}`} />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Categories section — only on movies / series */}
      {showCategories && (
        <>
          <div className="mx-[18px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />
          <div className="flex-1 flex flex-col min-h-0 pt-4 pb-4">
            {/* Section label */}
            <div className="px-[18px] mb-2 shrink-0">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75 text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500 whitespace-nowrap">
                Genres
              </span>
            </div>
            {/* Scrollable genre list */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-[10px] pt-1 flex flex-col gap-0.5">
              {allCategories.map((genre) => {
                const isActiveGenre = selectedGenreId === genre.id;
                return (
                  <button
                    key={genre.id}
                    onClick={() => onGenreSelect && onGenreSelect(genre.id)}
                    title={genre.name}
                    className={`
                      relative flex items-center gap-4 px-4 py-2.5 rounded-2xl
                      w-full text-[13px] font-medium whitespace-nowrap
                      border-2 transition-colors duration-200 focus:outline-none text-left
                      ${isActiveGenre
                        ? 'border-red-500/30 bg-red-500/15 text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-200 hover:bg-white/5 hover:border-transparent'
                      }
                    `}
                  >
                    {isActiveGenre && (
                      <motion.span
                        layoutId="sidebar-genre-active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-red-500"
                        transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                      />
                    )}
                    <span className={`
                      w-2 h-2 rounded-full shrink-0 transition-all duration-200
                      ${isActiveGenre ? 'bg-red-400' : 'bg-gray-700'}
                    `} />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">
                      {genre.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom spacer */}
      {!showCategories && <div className="h-6 shrink-0" />}
    </aside>
  );
}

Sidebar.propTypes = {
  activePage:     PropTypes.string.isRequired,
  onNavigate:     PropTypes.func.isRequired,
  selectedGenreId: PropTypes.number,
  onGenreSelect:  PropTypes.func,
};

export default React.memo(Sidebar);

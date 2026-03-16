import React from "react";
import PropTypes from "prop-types";

const pulse = "animate-pulse bg-white/5";

const DetailPageSkeleton = ({ type = "movie" }) => {
  const isTv = type === "tv";

  return (
    <div className="min-h-screen bg-[#07080a] overflow-hidden">
      {/* ── HERO SECTION ── */}
      <div className="relative w-full min-h-[70vh] flex flex-col justify-end pt-32 pb-20 bg-[#0f1117] animate-pulse">
        {/* Back Button Skeleton */}
        <div className="absolute top-0 left-0 right-0 z-20 p-6 md:p-10 flex">
          <div className="h-10 w-24 rounded-full bg-white/5" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-end gap-8 lg:gap-14">
          
          {/* Poster (Desktop) */}
          <div className="hidden md:block shrink-0 z-10">
            <div className={`w-48 lg:w-64 aspect-[2/3] rounded-2xl ${pulse}`} />
          </div>

          {/* Info */}
          <div className="flex-1 max-w-3xl pb-2 w-full">
            {/* Tagline */}
            <div className={`h-4 w-1/3 rounded-full ${pulse} mb-4`} />
            
            {/* Title */}
            <div className={`h-12 md:h-16 w-3/4 md:w-2/3 rounded-xl ${pulse} mb-5`} />

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className={`h-5 w-16 rounded-md ${pulse}`} />
              <div className={`h-5 w-20 rounded-md ${pulse}`} />
              <div className={`h-5 w-16 rounded-md ${pulse}`} />
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[1, 2, 3].map(n => (
                <div key={n} className={`h-6 w-16 rounded-full ${pulse}`} />
              ))}
            </div>

            {/* Overview */}
            <div className="space-y-3">
              <div className={`h-4 w-full rounded-md ${pulse}`} />
              <div className={`h-4 w-[90%] rounded-md ${pulse}`} />
              <div className={`h-4 w-[80%] rounded-md ${pulse}`} />
              <div className={`h-4 w-[85%] rounded-md ${pulse}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── PLAYER SECTION ── */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 md:px-12 -mt-4 md:-mt-10 mb-12">
        <div className="bg-[#0f1117]/80 rounded-2xl md:rounded-[2rem] p-2 md:p-5 border border-white/5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 px-3 pt-2">
            <div className={`w-10 h-10 rounded-full ${pulse} shrink-0`} />
            <div className="flex flex-col gap-2">
              <div className={`h-3 w-20 rounded-sm ${pulse}`} />
              <div className={`h-4 w-32 rounded-sm ${pulse}`} />
            </div>
          </div>
          
          {/* Frame */}
          <div className={`w-full aspect-video rounded-xl md:rounded-2xl ${pulse}`} />
        </div>
      </div>

      {/* ── EPISODES (TV ONLY) ── */}
      {isTv && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-16">
          <div className="bg-[#111319]/50 rounded-[2rem] border border-white/5 overflow-hidden p-5 md:px-8 pt-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-start sm:items-center">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl ${pulse} shrink-0`} />
                <div>
                  <div className={`h-5 w-24 rounded-md ${pulse} mb-2`} />
                  <div className={`h-3 w-32 rounded-sm ${pulse}`} />
                </div>
              </div>
              <div className={`h-10 w-full sm:w-64 rounded-xl ${pulse}`} />
            </div>

            <div className="flex gap-3 mb-6">
              {[1, 2, 3].map(n => (
                <div key={n} className={`h-10 w-24 rounded-full ${pulse}`} />
              ))}
            </div>

            <div className="grid grid-flow-col auto-cols-[180px] sm:auto-cols-[220px] gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className={`h-[180px] rounded-2xl ${pulse}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DetailPageSkeleton.propTypes = {
  type: PropTypes.oneOf(["movie", "tv"]),
};

export default DetailPageSkeleton;

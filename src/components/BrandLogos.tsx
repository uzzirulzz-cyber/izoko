import React from 'react'
import { HolographicGlobe } from './HolographicGlobe'

export const NetflixArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <div className={`relative flex items-center justify-center bg-[#070D22] overflow-hidden ${className}`}>
    {/* Blue/Cyan Electric Wave Matrix */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.18)_0%,_transparent_70%)] pointer-events-none"></div>
    <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 200 120" preserveAspectRatio="none">
      <path d="M0,60 Q50,20 100,60 T200,60" fill="none" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="3 3" />
      <path d="M0,75 Q60,35 120,75 T200,75" fill="none" stroke="#60A5FA" strokeWidth="0.6" />
      <path d="M0,45 Q40,80 110,45 T200,45" fill="none" stroke="#0284C7" strokeWidth="0.5" strokeDasharray="4 2" />
    </svg>
    {/* Netflix Red N */}
    <div className="relative z-10 drop-shadow-[0_0_20px_rgba(229,9,20,0.6)]">
      <svg className="w-16 h-20" viewBox="0 0 64 90" fill="none">
        <path d="M12 0H24V90H12V0Z" fill="#B81D24" />
        <path d="M40 0H52V90H40V0Z" fill="#B81D24" />
        <path d="M12 0H25.5L52 90H38.5L12 0Z" fill="#E50914" />
      </svg>
    </div>
  </div>
)

export const PlayStationArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <div className={`relative flex items-center justify-center bg-[#060D26] overflow-hidden ${className}`}>
    {/* Electric Blue Water Net */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.25)_0%,_transparent_70%)] pointer-events-none"></div>
    <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 200 120" preserveAspectRatio="none">
      <path d="M-20,40 Q40,90 100,30 T220,70" fill="none" stroke="#38BDF8" strokeWidth="0.9" />
      <path d="M0,80 Q70,20 140,80 T200,40" fill="none" stroke="#0070D1" strokeWidth="0.7" strokeDasharray="4 3" />
      <path d="M20,20 Q80,100 160,30" fill="none" stroke="#93C5FD" strokeWidth="0.5" />
    </svg>
    {/* White PS Logo with 3D shadow */}
    <div className="relative z-10 drop-shadow-[0_0_25px_rgba(0,112,209,0.7)]">
      <svg className="w-20 h-16" viewBox="0 0 100 80" fill="none">
        {/* P */}
        <path
          d="M38 12C38 12 37.8 28.5 37.8 45.2C41.2 46.5 45.2 47.1 49.3 47.1C58.8 47.1 66.5 43.1 66.5 33.5C66.5 24.3 60.1 19.8 49.6 19.8C46.2 19.8 41.5 20.8 38 22.3V12ZM48.6 28.8C54 28.8 57.5 30.5 57.5 34.3C57.5 38.2 53.6 40.2 48.6 40.2C45.2 40.2 40.8 39.5 38 38.2V29.8C41 29.1 45.1 28.8 48.6 28.8Z"
          fill="#F0F2F5"
        />
        {/* S */}
        <path
          d="M28 58.5C31.5 59.8 36.8 60.5 42.5 60.5C53.2 60.5 61.2 57.2 61.2 50.8C61.2 47.2 58.1 44.8 52.8 44C47.2 43.2 43.5 42.1 43.5 39.8C43.5 38.2 45.5 37.1 49 37.1C52.2 37.1 56 37.9 58.8 39.2L62.2 32.5C58.5 31 53.5 30.2 48.5 30.2C38.2 30.2 31.8 34.2 31.8 40.5C31.8 44.2 35.2 46.8 40.8 47.5C46.5 48.2 50 49.5 50 51.8C50 53.5 47.5 54.5 43.2 54.5C38.8 54.5 33.8 53.5 30.5 51.8L28 58.5Z"
          fill="#C0C6D4"
          fillOpacity="0.85"
        />
      </svg>
    </div>
  </div>
)

export const SpotifyArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <div className={`relative flex items-center justify-center bg-[#05111B] overflow-hidden ${className}`}>
    {/* Emerald Green Energy Waves */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(29,185,84,0.22)_0%,_transparent_70%)] pointer-events-none"></div>
    <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 200 120" preserveAspectRatio="none">
      <path d="M0,50 Q60,90 130,40 T200,60" fill="none" stroke="#1DB954" strokeWidth="0.8" />
      <path d="M-10,70 Q50,20 120,70 T210,50" fill="none" stroke="#10B981" strokeWidth="0.6" strokeDasharray="3 3" />
    </svg>
    {/* Spotify Green Icon */}
    <div className="relative z-10 drop-shadow-[0_0_25px_rgba(29,185,84,0.65)]">
      <svg className="w-18 h-18 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.809-.87 7.076-.503 9.722 1.113.294.18.386.563.207.857zm1.226-2.723c-.226.367-.71.482-1.077.256-2.69-1.654-6.79-2.134-9.97-1.168-.413.125-.85-.11-975-.523s.11-.85.523-.975c3.633-1.103 8.16-.57 11.243 1.332.367.227.482.711.256 1.078zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.02-.132-1.17-.626-.15-.493.132-1.02.626-1.17 3.54-1.074 9.426-.867 13.155 1.347.444.263.59.84.327 1.284-.264.444-.84.59-1.284.327z" />
      </svg>
    </div>
  </div>
)

export const DisneyArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <div className={`relative flex items-center justify-center bg-[#050C22] overflow-hidden ${className}`}>
    {/* Blue Magic Energy Arc */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.22)_0%,_transparent_70%)] pointer-events-none"></div>
    <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 200 120" preserveAspectRatio="none">
      <path d="M20,95 Q100,5 180,95" fill="none" stroke="#38BDF8" strokeWidth="1.2" />
      <path d="M10,85 Q100,15 190,85" fill="none" stroke="#60A5FA" strokeWidth="0.6" strokeDasharray="3 3" />
    </svg>
    {/* Disney+ Typography & Plus */}
    <div className="relative z-10 flex items-center gap-1 drop-shadow-[0_0_25px_rgba(56,189,248,0.7)]">
      <span className="font-serif italic font-extrabold text-2xl sm:text-3xl text-white tracking-wider">
        Disney<span className="text-sky-400 font-sans font-black text-3xl not-italic ml-0.5">+</span>
      </span>
    </div>
  </div>
)

export const XboxArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <div className={`relative flex items-center justify-center bg-[#05140C] overflow-hidden ${className}`}>
    {/* Green Xbox Glow Aura */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.25)_0%,_transparent_70%)] pointer-events-none"></div>
    <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 200 120" preserveAspectRatio="none">
      <path d="M0,60 Q70,10 140,60 T200,60" fill="none" stroke="#10B981" strokeWidth="0.8" />
      <path d="M-10,40 Q60,90 130,40 T210,40" fill="none" stroke="#34D399" strokeWidth="0.6" strokeDasharray="3 3" />
    </svg>
    {/* Xbox Sphere Green Logo */}
    <div className="relative z-10 drop-shadow-[0_0_25px_rgba(16,185,129,0.7)]">
      <svg className="w-18 h-18" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="30" fill="#107C10" />
        <path
          d="M17 18.5C21.5 24.5 27.5 32 32 37.5C36.5 32 42.5 24.5 47 18.5C40 13 24 13 17 18.5Z"
          fill="#060B1E"
        />
        <path
          d="M11 25.5C12.5 32 17 41.5 24 49C16.5 45.5 12 36.5 11 25.5ZM53 25.5C52 36.5 47.5 45.5 40 49C47 41.5 51.5 32 53 25.5Z"
          fill="#060B1E"
        />
      </svg>
    </div>
  </div>
)


export const PlayBeatHeroVisual: React.FC = () => {
  return (
    <div className="relative w-full aspect-square max-w-[480px] mx-auto flex items-center justify-center">
      <HolographicGlobe />
    </div>
  )
}

import React from 'react';

interface VideoCharacterProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
}

export const VideoCharacter: React.FC<VideoCharacterProps> = ({ src, className, autoPlay = true }) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <video
        key={src} // Force re-render on src change
        src={src}
        autoPlay={autoPlay}
        loop
        muted
        playsInline
        className="w-full h-full object-cover bg-stone-200 dark:bg-slate-800"
      />
    </div>
  );
};
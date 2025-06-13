'use client';

import React from 'react';
import { Direction } from '@/lib/game-core';

interface DPadProps {
  onDirection: (dir: Direction) => void;
}

export const DPad: React.FC<DPadProps> = ({ onDirection }) => {
  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const Key = ({
    dir,
    children,
  }: {
    dir: Direction;
    children: React.ReactNode;
  }) => (
    <button
      onTouchStart={() => { vibrate(); onDirection(dir); }}
      onMouseDown={() => onDirection(dir)}
      className="
        flex items-center justify-center
        w-16 h-12
        bg-gray-200 border border-gray-400 rounded-md
        shadow-sm active:shadow-none active:translate-y-0.5
        transition
      "
      aria-label={dir}
    >
      {children}
    </button>
  );

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 w-max mx-auto mt-8">
      {/* Row 1 */}
      <div /> {/* top-left empty */}
      <Key dir="up">▲</Key>
      <div /> {/* top-right empty */}

      {/* Row 2 */}
      <Key dir="left">◀</Key>
      <div /> {/* center empty */}
      <Key dir="right">▶</Key>

      {/* Row 3 */}
      <div /> {/* bottom-left empty */}
      <Key dir="down">▼</Key>
      <div /> {/* bottom-right empty */}
    </div>
  );
};

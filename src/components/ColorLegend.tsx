import React from 'react';

interface ColorLegendProps {
  className?: string;
  compact?: boolean;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({ className = '', compact = false }) => {
  return (
    <div
      className={`bg-[#ffffff]/95 backdrop-blur-md border border-[#e8e2d8] rounded-xl shadow-xs text-xs text-[#4a443d] ${
        compact ? 'p-2' : 'p-3'
      } ${className}`}
    >
      <div className="font-semibold text-[#2c2825] uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7a6f64]" />
        Spatial & Title Legend
      </div>
      <div className={`flex ${compact ? 'flex-wrap gap-2' : 'flex-col gap-1.5'}`}>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#3d8b57] border border-[#2e6f40] shadow-2xs" />
          <span className="font-medium text-[#2c2825]">Private Unit (Flat A / B)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#d97706] border border-[#b45309] shadow-2xs" />
          <span className="text-[#5c554e]">Shared Corridor (Common Area)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#2a7b88] border border-[#1f5c66] shadow-2xs" />
          <span className="text-[#5c554e]">Utility / Parking / Basement</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#b84a39] border border-[#963727] shadow-2xs" />
          <span className="text-[#5c554e]">Encroachment Zone</span>
        </div>
      </div>
    </div>
  );
};

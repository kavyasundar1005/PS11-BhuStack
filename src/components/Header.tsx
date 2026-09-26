import React from 'react';
import { DETAILED_BUILDINGS } from '../data/buildingsData';
import { DetailedBuilding } from '../types/property';
import { Building2, AlertTriangle, MapPin, ArrowLeft, Layers, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentView: 'map' | 'building' | 'card';
  activeBuilding?: DetailedBuilding | null;
  onNavigateHome: () => void;
  onSelectBuilding: (building: DetailedBuilding) => void;
  onOpenViolations?: () => void;
  violationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeBuilding,
  onNavigateHome,
  onSelectBuilding,
  onOpenViolations,
  violationsCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#ffffff]/90 backdrop-blur-md border-b border-[#e8e2d8] px-4 py-2.5 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        {/* Brand / Title & Navigation */}
        <div className="flex items-center gap-3">
          {currentView !== 'map' ? (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2dcce] bg-[#f9f7f2] hover:bg-[#efece4] text-xs font-medium text-[#4a443d] transition-colors cursor-pointer"
              title="Return to Global Map"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#3d8b57] text-[#ffffff] flex items-center justify-center font-bold shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm tracking-tight text-[#2c2825]">
                GeoParcel 3D
              </h1>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-sm bg-[#efece4] text-[#6b6257] border border-[#e2dcce]">
                Property ULPIN
              </span>
            </div>

            {/* When on building detail: MANDATORY base parcel ULPIN in header */}
            {activeBuilding && currentView === 'building' ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[#5c554e] font-medium">
                  {activeBuilding.name}
                </span>
                <span className="text-[#8c8275]">•</span>
                <span className="text-xs text-[#6b6257] flex items-center gap-1">
                  Base Parcel ULPIN:
                  <code className="bg-[#f4f1ea] px-1.5 py-0.2 rounded font-mono font-semibold text-[#2c2825] border border-[#e2dcce]">
                    {activeBuilding.baseUlpin}
                  </code>
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-[#7a6f64] hidden sm:block">
                Global Property & Volumetric 3D Strata Registry
              </p>
            )}
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick anchor building fly-to buttons */}
          <div className="hidden md:flex items-center gap-1 bg-[#f9f7f2] p-1 rounded-xl border border-[#e8e2d8]">
            <span className="text-[10px] font-medium text-[#7a6f64] px-2 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#3d8b57]" /> Detailed Records:
            </span>
            {DETAILED_BUILDINGS.map((b) => {
              const isSelected = activeBuilding?.id === b.id && currentView === 'building';
              return (
                <button
                  key={b.id}
                  onClick={() => onSelectBuilding(b)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#3d8b57] text-[#ffffff] shadow-2xs'
                      : 'text-[#4a443d] hover:bg-[#efece4]'
                  }`}
                  title={`${b.name} (${b.area}) - Base ULPIN: ${b.baseUlpin}`}
                >
                  <MapPin className="w-2.5 h-2.5 opacity-70" />
                  <span>{b.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Top Bar Violations Alert Icon Button (Mandated: "One alert icon in the top bar opens both violation checks") */}
          {currentView === 'building' && onOpenViolations && (
            <button
              onClick={onOpenViolations}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium text-xs transition-all cursor-pointer shadow-2xs ${
                activeBuilding?.id === 'palm-residency' || activeBuilding?.id === 'garden-view-towers'
                  ? 'bg-[#fcf3f0] border-[#eed9d4] text-[#b84a39] hover:bg-[#fae8e3]'
                  : 'bg-[#f3f9f5] border-[#d8ece0] text-[#2e6f40] hover:bg-[#eaf5ed]'
              }`}
              title="Open Sanctioned Height & Boundary Encroachment Audits"
            >
              <AlertTriangle className="w-4 h-4 text-[#b84a39]" />
              <span className="hidden sm:inline">Compliance Audit</span>
              <span className="w-5 h-5 rounded-full bg-[#b84a39] text-[#ffffff] text-[10px] flex items-center justify-center font-bold">
                {activeBuilding?.id === 'sunrise-apartments' ? '0' : '1'}
              </span>
            </button>
          )}

          {/* Status info */}
          <div className="flex items-center gap-1 text-[11px] text-[#5c554e] bg-[#f9f7f2] border border-[#e8e2d8] px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3d8b57]" />
            <span className="font-medium">Govt. Verified</span>
          </div>
        </div>
      </div>
    </header>
  );
};

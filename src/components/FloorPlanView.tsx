import React from 'react';
import { DetailedBuilding, FlatUnit } from '../types/property';
import { DoorOpen, Layers, Car, Check } from 'lucide-react';

interface FloorPlanViewProps {
  building: DetailedBuilding;
  selectedFloor: number;
  onSelectFloor: (floor: number) => void;
  units: FlatUnit[];
  selectedUnit: FlatUnit | null;
  onSelectUnit: (unit: FlatUnit) => void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({
  building,
  selectedFloor,
  onSelectFloor,
  units,
  selectedUnit,
  onSelectUnit,
}) => {
  // Available floors list: B (if hasBasement), G (floor 1), 1 (floor 2) ... N
  const floorOptions: { num: number; label: string }[] = [];
  if (building.hasBasement) {
    floorOptions.push({ num: 0, label: 'B' }); // 0 represents Basement
  }
  for (let f = 1; f <= building.floorsCount; f++) {
    floorOptions.push({
      num: f,
      label: f === 1 ? 'G' : `${f - 1}`,
    });
  }

  // Get units for current floor
  const floorUnits = units.filter((u) => u.floorNumber === selectedFloor);
  const flatA = floorUnits.find((u) => u.flatLabel === 'Flat A');
  const flatB = floorUnits.find((u) => u.flatLabel === 'Flat B');

  const isBasement = selectedFloor === 0;

  return (
    <div className="bg-[#ffffff] border border-[#e8e2d8] rounded-2xl p-5 shadow-xs space-y-4">
      {/* Floor Picker Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#f1ede6]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#3d8b57]" />
          <h3 className="font-semibold text-sm text-[#2c2825]">
            Floor Cadastral Subdivision
          </h3>
          <span className="text-xs text-[#7a6f64]">
            (Height: {selectedFloor > 0 ? (selectedFloor * 3) : 0}m elevation)
          </span>
        </div>

        {/* Floor Picker Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
          {floorOptions.map((opt) => {
            const isActive = selectedFloor === opt.num;
            return (
              <button
                key={opt.num}
                onClick={() => onSelectFloor(opt.num)}
                className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-[#2c2825] text-[#ffffff] shadow-2xs scale-105'
                    : 'bg-[#faf8f5] text-[#5c554e] hover:bg-[#efece4] border border-[#e8e2d8]'
                }`}
                title={`Floor Level ${opt.label}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floor Architectural Plan Container */}
      {isBasement ? (
        /* Basement layout */
        <div className="bg-[#f0f7f8] border-2 border-dashed border-[#2a7b88]/40 rounded-xl p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#2a7b88]/15 text-[#2a7b88] flex items-center justify-center mx-auto">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#194e57]">
              Basement Level (B) — Dedicated Parking & Utility Core
            </h4>
            <p className="text-xs text-[#427b85] mt-1 max-w-md mx-auto">
              {building.parkingSlotsDescription}. Allotted vehicular bays and infrastructure servicing the vertical parcel.
            </p>
          </div>
          <div className="inline-block px-3 py-1 rounded-md bg-[#ffffff] border border-[#2a7b88]/30 text-xs font-mono font-semibold text-[#194e57]">
            {building.parkingSlotsTotal} Marked Parking Bays (B-01 to B-0{building.parkingSlotsTotal})
          </div>
        </div>
      ) : (
        /* Standard Residential Floor: Flat A (35%) - Corridor (20%) - Flat B (45%) */
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-[#7a6f64] flex items-center justify-between">
            <span>West Wing</span>
            <span>Cadastral Corridor Strip</span>
            <span>East Wing</span>
          </div>

          <div className="w-full h-36 flex rounded-xl overflow-hidden border-2 border-[#e8e2d8] shadow-inner bg-[#fcfbfa] p-1.5 gap-1.5">
            {/* Flat A: Exactly 35% width */}
            {flatA ? (
              <button
                type="button"
                onClick={() => onSelectUnit(flatA)}
                className={`relative h-full rounded-lg transition-all text-left p-3 flex flex-col justify-between cursor-pointer border ${
                  selectedUnit?.id === flatA.id
                    ? 'ring-4 ring-[#3d8b57] ring-offset-2 bg-[#3d8b57] text-[#ffffff] border-[#2e6f40] shadow-md z-10'
                    : 'bg-[#3d8b57]/15 hover:bg-[#3d8b57]/25 text-[#1b4329] border-[#3d8b57]/30'
                }`}
                style={{ width: '35%' }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                      <DoorOpen className="w-3.5 h-3.5" /> Flat A
                    </span>
                    {selectedUnit?.id === flatA.id && (
                      <span className="w-4 h-4 rounded-full bg-[#ffffff] text-[#3d8b57] flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs font-semibold mt-0.5">
                    Unit {flatA.unitNumber}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] opacity-80">Carpet Area</div>
                  <div className="text-xs font-bold">{flatA.areaSqFt} sq ft</div>
                  <div className="text-[10px] mt-0.5 truncate opacity-75">
                    {flatA.parkingAllocated ? flatA.parkingSlot : 'No Parking'}
                  </div>
                </div>
              </button>
            ) : (
              <div style={{ width: '35%' }} className="h-full bg-gray-100 rounded-lg" />
            )}

            {/* Shared Corridor: Exactly 20% width (NOT clickable, shared color) */}
            <div
              style={{ width: '20%' }}
              className="h-full rounded-lg bg-[#d97706]/20 border border-[#d97706]/40 flex flex-col items-center justify-center p-2 text-center select-none"
              title="Shared Common Area & Corridor (Non-clickable)"
            >
              <div className="w-6 h-6 rounded-full bg-[#d97706]/30 text-[#b45309] flex items-center justify-center mb-1">
                <span className="text-[10px] font-bold">20%</span>
              </div>
              <span className="text-[10px] font-bold text-[#92400e] uppercase tracking-wider">
                Shared Corridor
              </span>
              <span className="text-[9px] text-[#b45309] mt-0.5 leading-tight">
                Common Passage
              </span>
            </div>

            {/* Flat B: Remaining width (45%) */}
            {flatB ? (
              <button
                type="button"
                onClick={() => onSelectUnit(flatB)}
                className={`relative h-full rounded-lg transition-all text-left p-3 flex flex-col justify-between cursor-pointer border ${
                  selectedUnit?.id === flatB.id
                    ? 'ring-4 ring-[#3d8b57] ring-offset-2 bg-[#3d8b57] text-[#ffffff] border-[#2e6f40] shadow-md z-10'
                    : 'bg-[#3d8b57]/15 hover:bg-[#3d8b57]/25 text-[#1b4329] border-[#3d8b57]/30'
                }`}
                style={{ width: '45%' }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                      <DoorOpen className="w-3.5 h-3.5" /> Flat B
                    </span>
                    {selectedUnit?.id === flatB.id && (
                      <span className="w-4 h-4 rounded-full bg-[#ffffff] text-[#3d8b57] flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs font-semibold mt-0.5">
                    Unit {flatB.unitNumber}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] opacity-80">Carpet Area</div>
                  <div className="text-xs font-bold">{flatB.areaSqFt} sq ft</div>
                  <div className="text-[10px] mt-0.5 truncate opacity-75">
                    {flatB.parkingAllocated ? flatB.parkingSlot : 'No Parking'}
                  </div>
                </div>
              </button>
            ) : (
              <div style={{ width: '45%' }} className="h-full bg-gray-100 rounded-lg" />
            )}
          </div>
        </div>
      )}

      {/* Helper hint */}
      <div className="text-[11px] text-[#7a6f64] flex items-center justify-between pt-1">
        <span>Click Flat A (35%) or Flat B (45%) to inspect ULPIN & Air Rights</span>
        <span className="text-[#d97706] font-medium">Corridor (20%) is common property</span>
      </div>
    </div>
  );
};

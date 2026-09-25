import React, { useState, useEffect } from 'react';
import { DetailedBuilding, FlatUnit } from '../types/property';
import { BuildingModel3D } from './BuildingModel3D';
import { FloorPlanView } from './FloorPlanView';
import { UnitDetailPanel } from './UnitDetailPanel';
import { ViolationPanel } from './ViolationPanel';
import { ColorLegend } from './ColorLegend';
import { fetchUnitsForBuilding, seedFirestoreIfEmpty } from '../services/firebase';
import {
  Building2,
  AlertTriangle,
  Layers,
  Ruler,
  Car,
  ShieldCheck,
  Compass,
  ArrowLeft,
} from 'lucide-react';

interface BuildingDetailPageProps {
  building: DetailedBuilding;
  onNavigateHome: () => void;
  onOpenCard: (ulpin: string) => void;
  isViolationsOpen: boolean;
  onSetViolationsOpen: (open: boolean) => void;
}

export const BuildingDetailPage: React.FC<BuildingDetailPageProps> = ({
  building,
  onNavigateHome,
  onOpenCard,
  isViolationsOpen,
  onSetViolationsOpen,
}) => {
  const [selectedFloor, setSelectedFloor] = useState<number>(1); // 1 = Ground Floor
  const [selectedUnit, setSelectedUnit] = useState<FlatUnit | null>(null);
  const [units, setUnits] = useState<FlatUnit[]>([]);
  const [highlightEncroachment, setHighlightEncroachment] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setSelectedUnit(null); // Reset unit selection on building change

    // Ensure database sync
    seedFirestoreIfEmpty();

    fetchUnitsForBuilding(building.id)
      .then((data) => {
        if (!isMounted) return;
        setUnits(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading units:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [building.id]);

  const handleSelectFloor = (floor: number) => {
    setSelectedFloor(floor);
    // If a unit on another floor was selected, keep or reset
    if (selectedUnit && selectedUnit.floorNumber !== floor) {
      setSelectedUnit(null);
    }
  };

  const handleSelectUnit = (unit: FlatUnit) => {
    setSelectedFloor(unit.floorNumber);
    setSelectedUnit(unit);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
      {/* Top Breadcrumb & Summary Bar */}
      <div className="bg-[#ffffff] border border-[#e8e2d8] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="p-2 rounded-xl border border-[#e2dcce] bg-[#f9f7f2] hover:bg-[#efece4] text-[#4a443d] transition-colors cursor-pointer"
              title="Back to Cesium Map"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[#2c2825] tracking-tight">
                  {building.name}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#edf7f0] text-[#1d5c2e] border border-[#d8ece0]">
                  {building.area}, Chennai
                </span>
                {building.footprintStatus === 'encroachment' && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#fcf3f0] text-[#b84a39] border border-[#eed9d4] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Encroachment Active
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7a6f64] mt-0.5">
                {building.description}
              </p>
            </div>
          </div>

          {/* Violations Trigger Button */}
          <button
            onClick={() => onSetViolationsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2c2825] hover:bg-[#413b37] text-[#ffffff] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-[#eab308]" />
            <span>Audit Sanctioned Height & Boundary</span>
          </button>
        </div>

        {/* Quick Property Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#f1ede6] text-xs">
          <div className="bg-[#faf8f5] p-2.5 rounded-xl border border-[#f1ede6]">
            <span className="text-[10px] uppercase font-bold text-[#7a6f64] block">
              Base Parcel ULPIN
            </span>
            <code className="font-mono font-bold text-[#2c2825] mt-0.5 block truncate">
              {building.baseUlpin}
            </code>
          </div>

          <div className="bg-[#faf8f5] p-2.5 rounded-xl border border-[#f1ede6]">
            <span className="text-[10px] uppercase font-bold text-[#7a6f64] block">
              Surveyed Height & Floors
            </span>
            <span className="font-bold text-[#2c2825] mt-0.5 block">
              {building.height}m ({building.floorsCount} Floors @ 3m/fl)
            </span>
          </div>

          <div className="bg-[#faf8f5] p-2.5 rounded-xl border border-[#f1ede6]">
            <span className="text-[10px] uppercase font-bold text-[#7a6f64] block">
              Parking Infrastructure
            </span>
            <span className="font-medium text-[#2c2825] mt-0.5 block truncate">
              {building.parkingType === 'basement' ? 'Basement Parking' : 'Surface Bay'} ({building.parkingSlotsTotal} slots)
            </span>
          </div>

          <div className="bg-[#faf8f5] p-2.5 rounded-xl border border-[#f1ede6]">
            <span className="text-[10px] uppercase font-bold text-[#7a6f64] block">
              Strata Subdivision
            </span>
            <span className="font-bold text-[#3d8b57] mt-0.5 block">
              Flat A (35%) • Corridor (20%) • Flat B (45%)
            </span>
          </div>
        </div>
      </div>

      {/* Main 3D Model & Floor Plan Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: 3D Rotatable Model (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <BuildingModel3D
            building={building}
            selectedFloor={selectedFloor}
            onSelectFloor={handleSelectFloor}
            selectedUnit={selectedUnit}
            onSelectUnit={handleSelectUnit}
            units={units}
            highlightEncroachment={highlightEncroachment}
          />

          {/* Color Legend below 3D model */}
          <ColorLegend />
        </div>

        {/* Right Column: Architectural Subdivision & Unit Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Architectural Floor Plan View */}
          <FloorPlanView
            building={building}
            selectedFloor={selectedFloor}
            onSelectFloor={handleSelectFloor}
            units={units}
            selectedUnit={selectedUnit}
            onSelectUnit={handleSelectUnit}
          />

          {/* Unit Detail Panel (Strict constraint: No unit details until a flat is clicked) */}
          <UnitDetailPanel
            unit={selectedUnit}
            building={building}
            onOpenCard={onOpenCard}
            onClose={() => setSelectedUnit(null)}
          />
        </div>
      </div>

      {/* Violation Panel Dialog */}
      <ViolationPanel
        building={building}
        isOpen={isViolationsOpen}
        onClose={() => {
          onSetViolationsOpen(false);
          setHighlightEncroachment(false);
        }}
        onHighlightEncroachment={(active) => setHighlightEncroachment(active)}
      />
    </div>
  );
};

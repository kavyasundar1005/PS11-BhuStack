import React, { useState } from 'react';
import { DetailedBuilding } from '../types/property';
import { X, AlertTriangle, CheckCircle2, Ruler, ShieldAlert, ArrowRight } from 'lucide-react';

interface ViolationPanelProps {
  building: DetailedBuilding;
  isOpen: boolean;
  onClose: () => void;
  onHighlightEncroachment?: (highlighted: boolean) => void;
}

export const ViolationPanel: React.FC<ViolationPanelProps> = ({
  building,
  isOpen,
  onClose,
  onHighlightEncroachment,
}) => {
  // User editable approved sanctioned height
  // Pre-filled with that building's own value (30m), but completely user-editable!
  const [sanctionedInput, setSanctionedInput] = useState<string>(
    String(building.approvedSanctionedHeight)
  );

  if (!isOpen) return null;

  const parsedSanctioned = parseFloat(sanctionedInput) || 0;
  const actualHeight = building.height;
  const heightDifference = actualHeight - parsedSanctioned;
  const isHeightViolation = heightDifference > 0;

  const isEncroachmentViolation = building.footprintStatus === 'encroachment';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#ffffff] border border-[#e8e2d8] rounded-2xl shadow-xl w-full max-w-xl overflow-hidden text-[#2c2825]">
        {/* Header */}
        <div className="bg-[#faf8f5] border-b border-[#e8e2d8] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#b84a39]/15 text-[#b84a39] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-[#2c2825]">
                Cadastral Violation & Compliance Audit
              </h2>
              <p className="text-xs text-[#6b6257]">
                {building.name} • Base ULPIN: <span className="font-mono font-medium">{building.baseUlpin}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (onHighlightEncroachment) onHighlightEncroachment(false);
              onClose();
            }}
            className="w-8 h-8 rounded-lg text-[#7a6f64] hover:bg-[#efece4] hover:text-[#2c2825] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Check A: Height Check */}
          <section className="bg-[#fcfbfa] border border-[#e8e2d8] rounded-xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#7a6f64]" />
                <h3 className="font-semibold text-sm text-[#2c2825]">
                  Check A: Vertical Height Compliance
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#6b6257]">
                Actual Height: <strong className="text-[#2c2825]">{actualHeight} m</strong> ({building.floorsCount} Floors)
              </span>
            </div>

            <p className="text-xs text-[#6b6257]">
              Enter the approved sanctioned height from the municipal building permit records. The live audit compares your entered value directly with the 3D surveyed structure height.
            </p>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-[#4a443d] whitespace-nowrap">
                Sanctioned Height:
              </label>
              <div className="relative flex-1 max-w-[200px]">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={sanctionedInput}
                  onChange={(e) => setSanctionedInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#d4ccbf] bg-[#ffffff] text-sm font-semibold text-[#2c2825] focus:outline-hidden focus:border-[#3d8b57] focus:ring-1 focus:ring-[#3d8b57]"
                  placeholder="e.g. 30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7a6f64] font-medium">
                  meters
                </span>
              </div>
            </div>

            {/* Live Result Box */}
            <div
              className={`p-3.5 rounded-lg border flex items-start gap-3 transition-colors ${
                isHeightViolation
                  ? 'bg-[#fcf3f0] border-[#eed9d4] text-[#852c1e]'
                  : 'bg-[#f3f9f5] border-[#d8ece0] text-[#1d5c2e]'
              }`}
            >
              {isHeightViolation ? (
                <AlertTriangle className="w-5 h-5 text-[#b84a39] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#3d8b57] shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-semibold text-xs tracking-wide uppercase">
                  {isHeightViolation
                    ? `Exceeds approved height by ${heightDifference} m`
                    : 'Within limit'}
                </div>
                <div className="text-xs opacity-90">
                  {isHeightViolation ? (
                    <span>
                      Surveyed height is {actualHeight}m against sanctioned permit of {parsedSanctioned}m. Unauthorized vertical deviation of +{heightDifference}m detected.
                    </span>
                  ) : (
                    <span>
                      Surveyed height of {actualHeight}m is compliant with the permit ceiling of {parsedSanctioned}m.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Check B: Encroachment Check */}
          <section className="bg-[#fcfbfa] border border-[#e8e2d8] rounded-xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#7a6f64]" />
                <h3 className="font-semibold text-sm text-[#2c2825]">
                  Check B: Cadastral Footprint & Boundary Alignment
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#6b6257]">
                Spatial Parcel: <strong className="text-[#2c2825]">{building.baseUlpin}</strong>
              </span>
            </div>

            <p className="text-xs text-[#6b6257]">
              Compares the building's physical modeled 3D footprint against the registered revenue plot boundary survey coordinates on file.
            </p>

            {/* Encroachment Result */}
            <div
              className={`p-3.5 rounded-lg border flex items-start gap-3 ${
                isEncroachmentViolation
                  ? 'bg-[#fcf3f0] border-[#eed9d4] text-[#852c1e]'
                  : 'bg-[#f3f9f5] border-[#d8ece0] text-[#1d5c2e]'
              }`}
            >
              {isEncroachmentViolation ? (
                <AlertTriangle className="w-5 h-5 text-[#b84a39] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#3d8b57] shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-semibold text-xs tracking-wide uppercase">
                  {isEncroachmentViolation
                    ? 'Encroachment beyond registered property line'
                    : 'Within boundary'}
                </div>
                <div className="text-xs opacity-90">
                  {isEncroachmentViolation ? (
                    <span>
                      Footprint extends <strong>{building.encroachmentMeters} meters</strong> past its registered plot boundary on the {building.encroachedSide || 'East'} boundary frontage.
                    </span>
                  ) : (
                    <span>
                      Physical building footprint conforms strictly to registered cadastral boundaries. Zero spatial deviation observed.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3D Visualizer Trigger */}
            {isEncroachmentViolation && (
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (onHighlightEncroachment) {
                      onHighlightEncroachment(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#b84a39] hover:bg-[#a13e2e] text-[#ffffff] text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                >
                  <span>Highlight 2m Protrusion in 3D Model</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-[#7a6f64] italic">
                  Shown in Terracotta in 3D Viewer
                </span>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="bg-[#faf8f5] border-t border-[#e8e2d8] px-6 py-3.5 flex justify-end">
          <button
            onClick={() => {
              if (onHighlightEncroachment) onHighlightEncroachment(false);
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-[#2c2825] hover:bg-[#433e3a] text-[#ffffff] text-xs font-medium shadow-2xs transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

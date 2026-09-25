import React, { useEffect, useState } from 'react';
import { FlatUnit, DetailedBuilding } from '../types/property';
import { QrCode, Copy, Check, Car, Wind, Maximize2, Shield, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { saveFlatUnitToFirestore } from '../services/firebase';

interface UnitDetailPanelProps {
  unit: FlatUnit | null;
  building: DetailedBuilding;
  onOpenCard: (ulpin: string) => void;
  onClose?: () => void;
}

export const UnitDetailPanel: React.FC<UnitDetailPanelProps> = ({
  unit,
  building,
  onOpenCard,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!unit) {
      setQrDataUrl('');
      return;
    }

    // Persist to Firestore on click / live generation
    saveFlatUnitToFirestore(unit);

    // Compute live card URL
    const baseUrl = window.location.origin + window.location.pathname;
    const cardUrl = `${baseUrl}#/card/${encodeURIComponent(unit.ulpin)}`;

    QRCode.toDataURL(cardUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#2c2825',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [unit]);

  // MANDATORY CONSTRAINT: "No unit details until a flat is clicked."
  if (!unit) {
    return (
      <div className="bg-[#ffffff] border border-[#e8e2d8] rounded-2xl p-6 text-center space-y-3 shadow-2xs">
        <div className="w-10 h-10 rounded-full bg-[#f4f1ea] text-[#7a6f64] flex items-center justify-center mx-auto">
          <Maximize2 className="w-5 h-5 opacity-70" />
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-sm text-[#2c2825]">
            Select a Unit to Inspect
          </h4>
          <p className="text-xs text-[#7a6f64] max-w-xs mx-auto">
            Click on <strong>Flat A</strong> or <strong>Flat B</strong> in the 3D model or architectural floor plan below to inspect cadastral title, volumetric ULPIN, and parking.
          </p>
        </div>
      </div>
    );
  }

  const handleCopyUlpin = () => {
    navigator.clipboard.writeText(unit.ulpin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#ffffff] border-2 border-[#3d8b57]/40 rounded-2xl shadow-md p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-3 border-b border-[#f1ede6] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3d8b57] animate-pulse" />
            <h3 className="font-bold text-base text-[#2c2825]">
              {unit.flatLabel} • Level {unit.floorLabel} (Unit {unit.unitNumber})
            </h3>
          </div>
          <p className="text-xs text-[#6b6257] mt-0.5">
            {building.name} • {building.area}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-[#7a6f64] hover:text-[#2c2825] px-2 py-1 rounded-md hover:bg-[#f4f1ea] transition-colors cursor-pointer"
          >
            Deselect
          </button>
        )}
      </div>

      {/* Full ULPIN section */}
      <div className="bg-[#fcfbfa] border border-[#e8e2d8] rounded-xl p-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#7a6f64] uppercase tracking-wider">
          <span>Volumetric 3D ULPIN</span>
          <span className="text-[10px] text-[#3d8b57] bg-[#edf7f0] px-1.5 py-0.5 rounded font-mono font-medium">
            Live Generated
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <code className="text-xs sm:text-sm font-mono font-bold text-[#2c2825] break-all select-all">
            {unit.ulpin}
          </code>
          <button
            onClick={handleCopyUlpin}
            className="shrink-0 p-1.5 rounded-md hover:bg-[#efece4] text-[#6b6257] hover:text-[#2c2825] transition-colors cursor-pointer"
            title="Copy ULPIN identifier"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#3d8b57]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Grid of Attributes */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        {/* Floor Area */}
        <div className="bg-[#faf8f5] border border-[#f1ede6] p-2.5 rounded-xl space-y-1">
          <span className="text-[10px] font-semibold text-[#7a6f64] uppercase tracking-wider block">
            Carpet Area
          </span>
          <div className="font-bold text-sm text-[#2c2825]">
            {unit.areaSqFt.toLocaleString()} <span className="text-xs font-normal text-[#6b6257]">sq ft</span>
          </div>
          <span className="text-[10px] text-[#7a6f64] block">
            ≈ {Math.round(unit.areaSqFt * 0.092903)} m² surveyed
          </span>
        </div>

        {/* Air Rights Status */}
        <div className="bg-[#faf8f5] border border-[#f1ede6] p-2.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#7a6f64] uppercase tracking-wider">
            <Wind className="w-3 h-3 text-[#2a7b88]" />
            <span>Air Rights</span>
          </div>
          <div className="font-bold text-sm">
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${
                unit.airRightsStatus === 'Unutilized'
                  ? 'bg-[#edf7f0] text-[#1d5c2e] border border-[#d8ece0]'
                  : 'bg-[#fbf4ea] text-[#92400e] border border-[#f7e6cd]'
              }`}
            >
              {unit.airRightsStatus}
            </span>
          </div>
          <span className="text-[10px] text-[#7a6f64] block">
            Vertical development credit
          </span>
        </div>

        {/* Parking Status */}
        <div className="col-span-2 bg-[#faf8f5] border border-[#f1ede6] p-2.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#7a6f64] uppercase tracking-wider">
            <Car className="w-3 h-3 text-[#7a6f64]" />
            <span>Parking Allotment</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-semibold text-xs sm:text-sm text-[#2c2825]">
              {unit.parkingSlot}
            </div>
            {unit.parkingAllocated ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-[#edf7f0] text-[#1d5c2e]">
                Allocated
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-[#fcf3f0] text-[#b84a39] flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" /> None
              </span>
            )}
          </div>
        </div>

        {/* Title Encumbrance Status */}
        <div className="col-span-2 bg-[#faf8f5] border border-[#f1ede6] p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#3d8b57]" />
            <span className="text-xs font-medium text-[#4a443d]">Title Encumbrance</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
              unit.encumbranceStatus === 'Unencumbered'
                ? 'bg-[#edf7f0] text-[#1d5c2e] border border-[#d8ece0]'
                : 'bg-[#fcf3f0] text-[#b84a39] border border-[#eed9d4]'
            }`}
          >
            {unit.encumbranceStatus}
          </span>
        </div>
      </div>

      {/* QR Card Action Banner */}
      <div className="pt-2 border-t border-[#f1ede6] flex items-center justify-between gap-3">
        {qrDataUrl && (
          <div className="w-14 h-14 bg-[#ffffff] p-1 rounded-lg border border-[#e8e2d8] shadow-2xs shrink-0 flex items-center justify-center">
            <img src={qrDataUrl} alt="Unit ULPIN QR Code" className="w-full h-full object-contain" />
          </div>
        )}
        <button
          onClick={() => onOpenCard(unit.ulpin)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3d8b57] hover:bg-[#327247] text-[#ffffff] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>View Official QR Card</span>
        </button>
      </div>
    </div>
  );
};

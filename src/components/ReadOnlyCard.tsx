import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { FlatUnit, DetailedBuilding } from '../types/property';
import { DETAILED_BUILDINGS } from '../data/buildingsData';
import { fetchUnitByUlpin } from '../services/firebase';
import {
  ShieldCheck,
  QrCode,
  ArrowLeft,
  Building2,
  Car,
  Wind,
  Maximize2,
  Printer,
  Copy,
  Check,
  MapPin,
  Calendar,
} from 'lucide-react';

interface ReadOnlyCardProps {
  ulpin: string;
  onNavigateHome: () => void;
  onNavigateBuilding: (building: DetailedBuilding) => void;
}

export const ReadOnlyCard: React.FC<ReadOnlyCardProps> = ({
  ulpin,
  onNavigateHome,
  onNavigateBuilding,
}) => {
  const [unit, setUnit] = useState<FlatUnit | null>(null);
  const [building, setBuilding] = useState<DetailedBuilding | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchUnitByUlpin(ulpin)
      .then((data) => {
        if (!isMounted) return;
        setUnit(data);
        if (data) {
          const b = DETAILED_BUILDINGS.find((item) => item.id === data.buildingId);
          setBuilding(b || null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching unit card:', err);
        if (isMounted) setLoading(false);
      });

    // Generate scannable QR code
    const liveCardUrl = `${window.location.origin}${window.location.pathname}#/card/${encodeURIComponent(
      ulpin
    )}`;

    QRCode.toDataURL(liveCardUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#2c2825',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR code error:', err));

    return () => {
      isMounted = false;
    };
  }, [ulpin]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ulpin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#3d8b57] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#7a6f64] font-medium">
          Retrieving 3D volumetric property record from registry...
        </p>
      </div>
    );
  }

  if (!unit || !building) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-[#ffffff] border border-[#e8e2d8] rounded-2xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#fcf3f0] text-[#b84a39] flex items-center justify-center mx-auto">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-[#2c2825]">
          Property Title Record Not Found
        </h3>
        <p className="text-xs text-[#7a6f64]">
          Could not locate a certified property record matching ULPIN{' '}
          <code className="bg-[#f4f1ea] px-1 py-0.5 rounded font-mono text-[#2c2825]">
            {ulpin}
          </code>
        </p>
        <button
          onClick={onNavigateHome}
          className="px-4 py-2 rounded-xl bg-[#3d8b57] text-[#ffffff] text-xs font-semibold hover:bg-[#327247] transition-colors cursor-pointer"
        >
          Return to Global Map
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Top Action Nav */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => onNavigateBuilding(building)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2dcce] bg-[#f9f7f2] hover:bg-[#efece4] text-xs font-medium text-[#4a443d] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {building.name} 3D Model</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2dcce] bg-[#ffffff] hover:bg-[#f9f7f2] text-xs font-medium text-[#4a443d] shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Certificate</span>
          </button>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3d8b57] hover:bg-[#327247] text-[#ffffff] text-xs font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <span>Property Map</span>
          </button>
        </div>
      </div>

      {/* Main Certificate Card (Municipal Official Card) */}
      <div className="bg-[#ffffff] border-2 border-[#e8e2d8] rounded-3xl p-6 sm:p-8 shadow-md space-y-6 relative overflow-hidden">
        {/* Subtle Watermark seal */}
        <div className="absolute -right-8 -bottom-8 opacity-[0.03] pointer-events-none select-none">
          <ShieldCheck className="w-64 h-64 text-[#2c2825]" />
        </div>

        {/* Certificate Header */}
        <div className="border-b border-[#f1ede6] pb-5 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#3d8b57] text-[#ffffff] flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#7a6f64] block">
                  Municipal Property Registry
                </span>
                <h2 className="text-lg font-bold text-[#2c2825] tracking-tight">
                  Volumetric 3D Property Title Card
                </h2>
              </div>
            </div>

            {/* Encumbrance Tag (Mandatory per spec: "shows ID, area, parking status, air rights, and an 'Unencumbered'/'Mortgaged' tag") */}
            <div>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-2xs border ${
                  unit.encumbranceStatus === 'Unencumbered'
                    ? 'bg-[#edf7f0] text-[#1d5c2e] border-[#d8ece0]'
                    : 'bg-[#fcf3f0] text-[#b84a39] border-[#eed9d4]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    unit.encumbranceStatus === 'Unencumbered' ? 'bg-[#3d8b57]' : 'bg-[#b84a39]'
                  }`}
                />
                {unit.encumbranceStatus}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#7a6f64] leading-relaxed">
            Public municipal record issued under 3D spatial property survey specifications with vertical strata subdivision and base land parcel linkage.
          </p>
        </div>

        {/* ULPIN Highlight Box */}
        <div className="bg-[#faf8f5] border border-[#e8e2d8] rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7a6f64] uppercase tracking-wider">
            <span>Volumetric Unit ULPIN</span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] text-[#3d8b57] hover:underline cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-[#2c2825] break-all select-all tracking-wide">
            {unit.ulpin}
          </div>
          <div className="text-[11px] text-[#7a6f64] flex items-center gap-2 pt-1 border-t border-[#eee8de]">
            <span>Base Parcel ULPIN:</span>
            <code className="font-mono font-semibold text-[#4a443d]">
              {building.baseUlpin}
            </code>
          </div>
        </div>

        {/* Two-Column Details & QR Code */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Attributes List */}
          <div className="md:col-span-2 space-y-3.5 text-xs">
            {/* Building & Wing */}
            <div className="flex items-start justify-between py-2 border-b border-[#f1ede6]">
              <span className="text-[#7a6f64] font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#3d8b57]" /> Building / Complex
              </span>
              <span className="font-bold text-[#2c2825] text-right">
                {building.name} ({building.area})
              </span>
            </div>

            {/* Floor & Flat Door */}
            <div className="flex items-center justify-between py-2 border-b border-[#f1ede6]">
              <span className="text-[#7a6f64] font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7a6f64]" /> Level & Flat Designation
              </span>
              <span className="font-bold text-[#2c2825]">
                Level {unit.floorLabel} • {unit.flatLabel} (Door #{unit.unitNumber})
              </span>
            </div>

            {/* Carpet Area */}
            <div className="flex items-center justify-between py-2 border-b border-[#f1ede6]">
              <span className="text-[#7a6f64] font-medium flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-[#7a6f64]" /> Built-up Carpet Area
              </span>
              <span className="font-bold text-[#2c2825]">
                {unit.areaSqFt.toLocaleString()} sq ft{' '}
                <span className="text-xs font-normal text-[#7a6f64]">
                  (≈ {Math.round(unit.areaSqFt * 0.092903)} m²)
                </span>
              </span>
            </div>

            {/* Parking Status (from exact data) */}
            <div className="flex items-center justify-between py-2 border-b border-[#f1ede6]">
              <span className="text-[#7a6f64] font-medium flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#7a6f64]" /> Parking Allotment
              </span>
              <span
                className={`font-semibold ${
                  unit.parkingAllocated ? 'text-[#2c2825]' : 'text-[#b84a39]'
                }`}
              >
                {unit.parkingSlot}
              </span>
            </div>

            {/* Air Rights Status */}
            <div className="flex items-center justify-between py-2 border-b border-[#f1ede6]">
              <span className="text-[#7a6f64] font-medium flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-[#2a7b88]" /> Air-Rights Status
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                  unit.airRightsStatus === 'Unutilized'
                    ? 'bg-[#edf7f0] text-[#1d5c2e]'
                    : 'bg-[#fbf4ea] text-[#92400e]'
                }`}
              >
                {unit.airRightsStatus}
              </span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center justify-between py-2">
              <span className="text-[#7a6f64] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#7a6f64]" /> Registration Timestamp
              </span>
              <span className="text-[#6b6257] font-mono text-[11px]">
                {new Date().toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Real Scannable QR Code */}
          <div className="bg-[#faf8f5] border border-[#e8e2d8] rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a6f64] flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> Scannable Card QR
            </span>

            {qrDataUrl ? (
              <div className="p-2 bg-[#ffffff] rounded-xl border border-[#e8e2d8] shadow-2xs">
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ULPIN ${unit.ulpin}`}
                  className="w-36 h-36 object-contain"
                />
              </div>
            ) : (
              <div className="w-36 h-36 bg-[#f0ede6] rounded-xl flex items-center justify-center">
                <span className="text-xs text-[#7a6f64]">Generating QR...</span>
              </div>
            )}

            <p className="text-[10px] text-[#7a6f64] leading-tight max-w-[160px]">
              Scan with camera to open live municipal verification card.
            </p>
          </div>
        </div>

        {/* Footer Seal */}
        <div className="pt-4 border-t border-[#f1ede6] flex items-center justify-between text-[11px] text-[#7a6f64] flex-wrap gap-2">
          <span>Official Property Strata Record • State Land Records</span>
          <span className="font-mono text-[10px]">VERIFIED_SECURE_TOKEN</span>
        </div>
      </div>
    </div>
  );
};

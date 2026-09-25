export interface DetailedBuilding {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  baseUlpin: string;
  height: number; // in meters
  floorsCount: number;
  floorHeight: number; // default 3m
  footprintStatus: 'matches' | 'encroachment';
  encroachmentMeters: number; // 0 or 2
  encroachedSide?: 'East' | 'North' | 'South' | 'West';
  approvedSanctionedHeight: number; // on file (30m)
  parkingType: 'basement' | 'surface';
  parkingSlotsTotal: number;
  parkingSlotsDescription: string;
  unitsTotal: number;
  hasBasement: boolean;
  description: string;
}

export interface FlatUnit {
  id: string;
  buildingId: string;
  floorNumber: number; // 0 for G, 1..N, -1 for B
  floorLabel: string; // 'G', '1', '2' ... 'B'
  flatLabel: 'Flat A' | 'Flat B' | 'Basement Utility' | 'Corridor';
  unitNumber: string; // 'G01', '101', '402', etc.
  ulpin: string; // e.g. 14A7B9C23D45E1-V-F04-U402
  areaSqFt: number;
  airRightsStatus: 'Unutilized' | 'Transferred';
  parkingSlot: string;
  parkingAllocated: boolean;
  encumbranceStatus: 'Unencumbered' | 'Mortgaged';
  isGenerated?: boolean;
}

export interface MapHoverInfo {
  name: string;
  height: number;
  type?: string;
  address?: string;
  isDetailed: boolean;
  buildingId?: string;
  baseUlpin?: string;
  position?: { x: number; y: number };
  coordinates?: { lat: number; lng: number };
}

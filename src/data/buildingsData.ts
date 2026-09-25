import { DetailedBuilding, FlatUnit } from '../types/property';

export const DETAILED_BUILDINGS: DetailedBuilding[] = [
  {
    id: 'sunrise-apartments',
    name: 'Sunrise Apartments',
    area: 'T Nagar',
    lat: 13.0604,
    lng: 80.2496,
    baseUlpin: '14A7B9C23D45E1',
    height: 30, // 30m
    floorsCount: 10, // 10 floors
    floorHeight: 3, // 3m each
    footprintStatus: 'matches',
    encroachmentMeters: 0,
    approvedSanctionedHeight: 30,
    parkingType: 'basement',
    parkingSlotsTotal: 6,
    parkingSlotsDescription: 'Basement, slots B-01 to B-06 for flats (Floors 8, 9, 10 both A and B have no parking)',
    unitsTotal: 20,
    hasBasement: true,
    description: '10-storey residential community in T Nagar with basement parking and compliant spatial perimeter.',
  },
  {
    id: 'palm-residency',
    name: 'Palm Residency',
    area: 'Alwarpet',
    lat: 13.0387,
    lng: 80.2377,
    baseUlpin: '21B4F7D89K12L3',
    height: 36, // 36m
    floorsCount: 12, // 12 floors
    floorHeight: 3,
    footprintStatus: 'matches',
    encroachmentMeters: 0,
    approvedSanctionedHeight: 30, // On file: 30m -> Exceeds by 6m!
    parkingType: 'surface',
    parkingSlotsTotal: 8,
    parkingSlotsDescription: 'Surface lot, 8 slots for 24 flats (Half the flats have none)',
    unitsTotal: 24,
    hasBasement: false,
    description: '12-storey development in Alwarpet exceeding sanctioned master plan height by 6m.',
  },
  {
    id: 'garden-view-towers',
    name: 'Garden View Towers',
    area: 'Adyar',
    lat: 13.0067,
    lng: 80.2206,
    baseUlpin: '33C9E2A56M78N4',
    height: 27, // 27m
    floorsCount: 9, // 9 floors
    floorHeight: 3,
    footprintStatus: 'encroachment',
    encroachmentMeters: 2, // 2m past boundary
    encroachedSide: 'East',
    approvedSanctionedHeight: 30, // Compliant height
    parkingType: 'basement',
    parkingSlotsTotal: 10,
    parkingSlotsDescription: 'Basement, 10 slots for 18 flats (Only 2 flats have none)',
    unitsTotal: 18,
    hasBasement: true,
    description: '9-storey residential complex in Adyar protruding 2 meters past registered cadastral property boundary.',
  },
];

export function generateUnitsForBuilding(building: DetailedBuilding): FlatUnit[] {
  const units: FlatUnit[] = [];

  // Generate for each floor:
  // Floor index 1 to building.floorsCount (or 0 for G up to count - 1)
  // Let's use floors: Floor 1 to Floor N (or Ground, Floor 1...)
  // Let's use 1 to building.floorsCount for floor numbers (1..10, 1..12, 1..9)
  for (let f = 1; f <= building.floorsCount; f++) {
    const floorLabel = f === 1 ? 'G' : `${f - 1}`;
    const floorPad = String(f).padStart(2, '0');

    // Unit A (35% width, left side)
    const unitNumA = f === 1 ? 'G01' : `${f - 1}01`;
    const ulpinA = `${building.baseUlpin}-V-F${floorPad}-U${unitNumA}`;

    // Parking logic based on exact specifications:
    let parkingSlotA = 'None Allotted';
    let parkingAllocatedA = false;

    if (building.id === 'sunrise-apartments') {
      // Flats on floors 8, 9, 10 (both A and B) have NO parking allotted
      if (f <= 7) {
        const slotIdx = ((f - 1) % 6) + 1;
        parkingSlotA = `Basement Slot B-0${slotIdx}`;
        parkingAllocatedA = true;
      } else {
        parkingSlotA = 'None Allotted';
        parkingAllocatedA = false;
      }
    } else if (building.id === 'palm-residency') {
      // Surface lot, 8 slots for 24 flats -> half the flats have none
      // e.g. Odd floors have parking, even floors have none
      if (f % 2 !== 0) {
        const slotIdx = (((f - 1) / 2) % 8) + 1;
        parkingSlotA = `Surface Bay P-0${slotIdx}`;
        parkingAllocatedA = true;
      } else {
        parkingSlotA = 'None Allotted';
        parkingAllocatedA = false;
      }
    } else if (building.id === 'garden-view-towers') {
      // 10 slots for 18 flats -> only 2 flats have none (Flats on top floor 9 have none)
      if (f < 9) {
        const slotIdx = ((f - 1) % 10) + 1;
        parkingSlotA = `Basement Slot B-${String(slotIdx).padStart(2, '0')}`;
        parkingAllocatedA = true;
      } else {
        parkingSlotA = 'None Allotted';
        parkingAllocatedA = false;
      }
    }

    // Varied air rights & encumbrance
    const airRightsA: 'Unutilized' | 'Transferred' = (f % 2 === 0) ? 'Transferred' : 'Unutilized';
    const encumbranceA: 'Unencumbered' | 'Mortgaged' = (f % 3 === 0) ? 'Mortgaged' : 'Unencumbered';

    units.push({
      id: ulpinA,
      buildingId: building.id,
      floorNumber: f,
      floorLabel,
      flatLabel: 'Flat A',
      unitNumber: unitNumA,
      ulpin: ulpinA,
      areaSqFt: 1180 + (f * 15),
      airRightsStatus: airRightsA,
      parkingSlot: parkingSlotA,
      parkingAllocated: parkingAllocatedA,
      encumbranceStatus: encumbranceA,
      isGenerated: true,
    });

    // Unit B (45% width, right side)
    const unitNumB = f === 1 ? 'G02' : `${f - 1}02`;
    const ulpinB = `${building.baseUlpin}-V-F${floorPad}-U${unitNumB}`;

    let parkingSlotB = 'None Allotted';
    let parkingAllocatedB = false;

    if (building.id === 'sunrise-apartments') {
      // Flats on floors 8, 9, 10 have NO parking allotted
      if (f <= 7) {
        const slotIdx = (((f - 1) + 3) % 6) + 1;
        parkingSlotB = `Basement Slot B-0${slotIdx}`;
        parkingAllocatedB = true;
      } else {
        parkingSlotB = 'None Allotted';
        parkingAllocatedB = false;
      }
    } else if (building.id === 'palm-residency') {
      // Half have none
      if (f % 2 !== 0 && f <= 8) {
        const slotIdx = (((f - 1) / 2 + 4) % 8) + 1;
        parkingSlotB = `Surface Bay P-0${slotIdx}`;
        parkingAllocatedB = true;
      } else {
        parkingSlotB = 'None Allotted';
        parkingAllocatedB = false;
      }
    } else if (building.id === 'garden-view-towers') {
      // Only 2 flats have none (Floor 9 A and B)
      if (f < 9) {
        const slotIdx = (((f - 1) + 4) % 10) + 1;
        parkingSlotB = `Basement Slot B-${String(slotIdx).padStart(2, '0')}`;
        parkingAllocatedB = true;
      } else {
        parkingSlotB = 'None Allotted';
        parkingAllocatedB = false;
      }
    }

    const airRightsB: 'Unutilized' | 'Transferred' = (f % 3 === 0) ? 'Transferred' : 'Unutilized';
    const encumbranceB: 'Unencumbered' | 'Mortgaged' = (f % 2 === 0) ? 'Mortgaged' : 'Unencumbered';

    units.push({
      id: ulpinB,
      buildingId: building.id,
      floorNumber: f,
      floorLabel,
      flatLabel: 'Flat B',
      unitNumber: unitNumB,
      ulpin: ulpinB,
      areaSqFt: 1420 + (f * 20),
      airRightsStatus: airRightsB,
      parkingSlot: parkingSlotB,
      parkingAllocated: parkingAllocatedB,
      encumbranceStatus: encumbranceB,
      isGenerated: true,
    });
  }

  return units;
}

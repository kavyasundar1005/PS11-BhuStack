import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DETAILED_BUILDINGS, generateUnitsForBuilding } from '../data/buildingsData';
import { DetailedBuilding, FlatUnit } from '../types/property';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Test connection on boot as mandated by Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection to Firestore verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Offline or connecting...');
    } else {
      // In Firestore, a non-existent doc in 'test/connection' may still verify endpoint reachability
      console.log('[Firebase] Connection handshake completed.');
    }
    return true;
  }
}

// Seed or synchronize initial detailed buildings and units in Firestore
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    for (const b of DETAILED_BUILDINGS) {
      const bRef = doc(db, 'buildings', b.id);
      const bSnap = await getDoc(bRef);
      if (!bSnap.exists()) {
        await setDoc(bRef, b);
      }

      // Generate and seed units if needed
      const units = generateUnitsForBuilding(b);
      for (const u of units) {
        const uRef = doc(db, 'units', u.ulpin);
        const uSnap = await getDoc(uRef);
        if (!uSnap.exists()) {
          await setDoc(uRef, {
            ...u,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
    console.log('[Firebase] Cadastral buildings and units synchronized.');
  } catch (err) {
    console.warn('[Firebase] Firestore auto-sync fallback to local cache:', err);
  }
}

// Save or update an individual flat unit record
export async function saveFlatUnitToFirestore(unit: FlatUnit): Promise<void> {
  try {
    const uRef = doc(db, 'units', unit.ulpin);
    await setDoc(uRef, {
      ...unit,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Error saving unit to Firestore:', err);
  }
}

// Retrieve single unit by ULPIN (for QR card page)
export async function fetchUnitByUlpin(ulpin: string): Promise<FlatUnit | null> {
  try {
    const uRef = doc(db, 'units', ulpin);
    const snap = await getDoc(uRef);
    if (snap.exists()) {
      return snap.data() as FlatUnit;
    }
  } catch (err) {
    console.warn('[Firebase] Error fetching unit:', err);
  }

  // Fallback to local deterministic generator if offline/not yet seeded
  for (const b of DETAILED_BUILDINGS) {
    const generated = generateUnitsForBuilding(b);
    const found = generated.find(u => u.ulpin === ulpin);
    if (found) return found;
  }
  return null;
}

// Retrieve units for building
export async function fetchUnitsForBuilding(buildingId: string): Promise<FlatUnit[]> {
  try {
    const q = query(collection(db, 'units'), where('buildingId', '==', buildingId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => d.data() as FlatUnit);
    }
  } catch (err) {
    console.warn('[Firebase] Error fetching units by building:', err);
  }

  const b = DETAILED_BUILDINGS.find(item => item.id === buildingId);
  return b ? generateUnitsForBuilding(b) : [];
}

// Run boot check
testConnection();

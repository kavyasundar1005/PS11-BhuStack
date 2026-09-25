import React, { useState, useEffect } from 'react';
import { DETAILED_BUILDINGS } from './data/buildingsData';
import { DetailedBuilding } from './types/property';
import { Header } from './components/Header';
import { CesiumMap } from './components/CesiumMap';
import { BuildingDetailPage } from './components/BuildingDetailPage';
import { ReadOnlyCard } from './components/ReadOnlyCard';
import { seedFirestoreIfEmpty } from './services/firebase';

export default function App() {
  const [currentView, setCurrentView] = useState<'map' | 'building' | 'card'>('map');
  const [activeBuilding, setActiveBuilding] = useState<DetailedBuilding | null>(null);
  const [activeCardUlpin, setActiveCardUlpin] = useState<string>('');
  const [isViolationsOpen, setIsViolationsOpen] = useState<boolean>(false);
  const [flyToBuildingId, setFlyToBuildingId] = useState<string | null>(null);

  // Parse URL hash on mount and hash changes (Supports live QR code scan URLs e.g. #/card/{ulpin})
  useEffect(() => {
    // Seed Firestore on initial load
    seedFirestoreIfEmpty();

    const parseRoute = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      // Check card route: #/card/{ulpin} or /card/{ulpin}
      const cardMatch = hash.match(/^#\/card\/([^/?]+)/) || pathname.match(/^\/card\/([^/?]+)/);
      if (cardMatch) {
        const ulpin = decodeURIComponent(cardMatch[1]);
        setActiveCardUlpin(ulpin);
        setCurrentView('card');
        return;
      }

      // Check building route: #/building/{id}
      const buildingMatch = hash.match(/^#\/building\/([^/?]+)/);
      if (buildingMatch) {
        const bId = buildingMatch[1];
        const b = DETAILED_BUILDINGS.find((item) => item.id === bId);
        if (b) {
          setActiveBuilding(b);
          setCurrentView('building');
          return;
        }
      }

      // Default to Map
      setCurrentView('map');
    };

    parseRoute();
    window.addEventListener('hashchange', parseRoute);
    window.addEventListener('popstate', parseRoute);

    return () => {
      window.removeEventListener('hashchange', parseRoute);
      window.removeEventListener('popstate', parseRoute);
    };
  }, []);

  const handleNavigateHome = () => {
    window.location.hash = '#/';
    setCurrentView('map');
  };

  const handleSelectBuilding = (building: DetailedBuilding) => {
    setActiveBuilding(building);
    window.location.hash = `#/building/${building.id}`;
    setCurrentView('building');
  };

  const handleOpenCard = (ulpin: string) => {
    setActiveCardUlpin(ulpin);
    window.location.hash = `#/card/${encodeURIComponent(ulpin)}`;
    setCurrentView('card');
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2825] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        activeBuilding={activeBuilding}
        onNavigateHome={handleNavigateHome}
        onSelectBuilding={(b) => {
          if (currentView === 'map') {
            setFlyToBuildingId(b.id);
          } else {
            handleSelectBuilding(b);
          }
        }}
        onOpenViolations={() => setIsViolationsOpen(true)}
      />

      {/* Main View Switcher */}
      <main className="flex-1">
        {currentView === 'map' && (
          <CesiumMap
            onSelectBuilding={handleSelectBuilding}
            flyToBuildingId={flyToBuildingId}
          />
        )}

        {currentView === 'building' && activeBuilding && (
          <BuildingDetailPage
            building={activeBuilding}
            onNavigateHome={handleNavigateHome}
            onOpenCard={handleOpenCard}
            isViolationsOpen={isViolationsOpen}
            onSetViolationsOpen={setIsViolationsOpen}
          />
        )}

        {currentView === 'card' && activeCardUlpin && (
          <ReadOnlyCard
            ulpin={activeCardUlpin}
            onNavigateHome={handleNavigateHome}
            onNavigateBuilding={(b) => handleSelectBuilding(b)}
          />
        )}
      </main>
    </div>
  );
}

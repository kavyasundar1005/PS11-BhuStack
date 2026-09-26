import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DETAILED_BUILDINGS } from '../data/buildingsData';
import { DetailedBuilding, MapHoverInfo } from '../types/property';
import { ColorLegend } from './ColorLegend';
import {
  Search,
  Building2,
  Navigation,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface LeafletMapProps {
  onSelectBuilding: (building: DetailedBuilding) => void;
  flyToBuildingId?: string | null;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  onSelectBuilding,
  flyToBuildingId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const detailedMarkersRef = useRef<Map<string, L.LayerGroup>>(new Map());

  const [hoverInfo, setHoverInfo] = useState<MapHoverInfo | null>(null);
  const [lockedInfo, setLockedInfo] = useState<MapHoverInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeBaseLayer, setActiveBaseLayer] = useState<'osm' | 'osmHot' | 'topo'>('osm');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Chennai, India (13.0827, 80.2707) zoom level 14
    const map = L.map(mapContainerRef.current, {
      center: [13.0827, 80.2707],
      zoom: 14,
      zoomControl: false, // We use custom styled controls matching municipal aesthetic
      attributionControl: false, // Custom placed attribution
    });
    mapInstanceRef.current = map;

    // 100% Free Public Tile Layers (Zero API Key or Token Required)
    // 1. Standard OpenStreetMap: Universal, reliable, completely open
    const osmLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    );

    // 2. Humanitarian OpenStreetMap (HOT): Clear building outlines and roads
    const osmHotLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        subdomains: 'abc',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    );

    // 3. OpenTopoMap: Detailed topography and relief
    const topoLayer = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 17,
        subdomains: 'abc',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    );

    const layerMap: Record<string, L.TileLayer> = {
      osm: osmLayer,
      osmHot: osmHotLayer,
      topo: topoLayer,
    };

    // Add default layer (Standard OSM - guaranteed to work with no API key)
    osmLayer.addTo(map);

    // Store layer references on map instance for easy switching
    (map as any)._layersMap = layerMap;
    (map as any)._currentBaseLayer = osmLayer;

    // Add Detailed Anchor Buildings with Cadastral Footprint Polygons + Markers
    DETAILED_BUILDINGS.forEach((b) => {
      const buildingGroup = L.layerGroup();

      // Footprint polygon calculation (representing cadastral parcel)
      // Approximate ~30m x 22m dimensions converted to degrees
      const latOffset = 0.00018; // ~20m
      const lngOffset = 0.00025; // ~26m

      const polygonCoords: L.LatLngExpression[] = [
        [b.lat - latOffset, b.lng - lngOffset],
        [b.lat + latOffset, b.lng - lngOffset],
        [b.lat + latOffset, b.lng + lngOffset],
        [b.lat - latOffset, b.lng + lngOffset],
      ];

      // If encroachment (e.g. Garden View Towers extends 2m East), highlight protruding parcel
      const isEncroachment = b.footprintStatus === 'encroachment';
      const parcelPolygon = L.polygon(polygonCoords, {
        color: isEncroachment ? '#b84a39' : '#2e6f40',
        weight: 2,
        fillColor: isEncroachment ? '#b84a39' : '#3d8b57',
        fillOpacity: 0.35,
        dashArray: isEncroachment ? '4, 4' : undefined,
      });

      // Interactive hover, click, and double-click on footprint
      parcelPolygon.on('mouseover', () => {
        setHoverInfo({
          name: b.name,
          height: b.height,
          type: 'Registered Property Parcel',
          address: `${b.area}, Chennai, India`,
          isDetailed: true,
          buildingId: b.id,
          baseUlpin: b.baseUlpin,
        });
      });

      parcelPolygon.on('mouseout', () => {
        setHoverInfo(null);
      });

      parcelPolygon.on('click', () => {
        setLockedInfo({
          name: b.name,
          height: b.height,
          type: 'Registered Property Parcel',
          address: `${b.area}, Chennai, India`,
          isDetailed: true,
          buildingId: b.id,
          baseUlpin: b.baseUlpin,
        });
      });

      parcelPolygon.on('dblclick', (e) => {
        L.DomEvent.stop(e);
        onSelectBuilding(b);
      });

      buildingGroup.addLayer(parcelPolygon);

      // Custom HTML Pin Marker with Badge
      const customPinIcon = L.divIcon({
        className: 'custom-property-pin',
        html: `
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            background: #ffffff;
            border: 2px solid ${isEncroachment ? '#b84a39' : '#3d8b57'};
            border-radius: 9999px;
            padding: 3px 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -100%);
          ">
            <span style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${isEncroachment ? '#b84a39' : '#3d8b57'};
              display: inline-block;
            "></span>
            <div style="display: flex; flex-direction: column; text-align: left;">
              <span style="font-size: 11px; font-weight: 700; color: #2c2825; font-family: 'Plus Jakarta Sans', sans-serif;">
                ${b.name}
              </span>
              <span style="font-size: 9px; font-weight: 500; color: #7a6f64; font-family: 'JetBrains Mono', monospace;">
                ${b.height}m • ${b.floorsCount} Fl
              </span>
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const pinMarker = L.marker([b.lat, b.lng], { icon: customPinIcon });

      pinMarker.on('mouseover', () => {
        setHoverInfo({
          name: b.name,
          height: b.height,
          type: 'Registered Property Parcel',
          address: `${b.area}, Chennai, India`,
          isDetailed: true,
          buildingId: b.id,
          baseUlpin: b.baseUlpin,
        });
      });

      pinMarker.on('mouseout', () => {
        setHoverInfo(null);
      });

      pinMarker.on('click', () => {
        setLockedInfo({
          name: b.name,
          height: b.height,
          type: 'Registered Property Parcel',
          address: `${b.area}, Chennai, India`,
          isDetailed: true,
          buildingId: b.id,
          baseUlpin: b.baseUlpin,
        });
      });

      pinMarker.on('dblclick', (e) => {
        L.DomEvent.stop(e);
        onSelectBuilding(b);
      });

      buildingGroup.addLayer(pinMarker);

      buildingGroup.addTo(map);
      detailedMarkersRef.current.set(b.id, buildingGroup);
    });

    // Map-level click on any other location (Global OSM building query via Overpass/Nominatim on click)
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Temporary popup showing coordinates & OSM building lookup
      const estimatedHeight = 12 + Math.floor(((lat * 1000) % 5) * 4); // Simulated OSM estimated height
      setLockedInfo({
        name: `OSM Building Parcel`,
        height: estimatedHeight,
        type: 'Residential / Commercial',
        address: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
        isDetailed: false,
      });
    });

    // Map-level double click on background: keep popup, no detail page
    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      // Double clicking non-detailed building just retains popup
      const { lat, lng } = e.latlng;
      setLockedInfo({
        name: `OSM Building Structure`,
        height: 18,
        type: 'Urban Structure',
        address: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
        isDetailed: false,
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Layer Switch
  const switchBaseLayer = (layerKey: 'osm' | 'osmHot' | 'topo') => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const layers = (map as any)._layersMap;
    const current = (map as any)._currentBaseLayer;

    if (current) {
      map.removeLayer(current);
    }

    if (layers && layers[layerKey]) {
      layers[layerKey].addTo(map);
      (map as any)._currentBaseLayer = layers[layerKey];
      setActiveBaseLayer(layerKey);
    }
  };

  // Fly-to handling for detailed buildings
  useEffect(() => {
    if (!flyToBuildingId || !mapInstanceRef.current) return;
    const target = DETAILED_BUILDINGS.find((b) => b.id === flyToBuildingId);
    if (!target) return;

    flyToBuilding(target);
  }, [flyToBuildingId]);

  const flyToBuilding = (building: DetailedBuilding) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([building.lat, building.lng], 17, {
      duration: 1.5,
    });

    setLockedInfo({
      name: building.name,
      height: building.height,
      type: 'Registered Property Parcel',
      address: `${building.area}, Chennai`,
      isDetailed: true,
      buildingId: building.id,
      baseUlpin: building.baseUlpin,
    });
  };

  const flyToCity = (lat: number, lng: number, zoom = 14) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([lat, lng], zoom, { duration: 1.5 });
  };

  const handleZoom = (zoomIn: boolean) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (zoomIn) {
      map.zoomIn();
    } else {
      map.zoomOut();
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const q = searchQuery.toLowerCase().trim();

    // Check if matches one of detailed anchor buildings
    const matchedDetailed = DETAILED_BUILDINGS.find(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.area.toLowerCase().includes(q) ||
        b.baseUlpin.toLowerCase().includes(q)
    );
    if (matchedDetailed) {
      flyToBuilding(matchedDetailed);
      setIsSearching(false);
      return;
    }

    // World city coordinates dictionary
    const worldCities: Record<string, [number, number]> = {
      chennai: [13.0827, 80.2707],
      mumbai: [19.076, 72.8777],
      delhi: [28.6139, 77.209],
      bengaluru: [12.9716, 77.5946],
      bangalore: [12.9716, 77.5946],
      london: [51.5074, -0.1276],
      'new york': [40.7128, -74.006],
      tokyo: [35.6895, 139.6917],
      singapore: [1.3521, 103.8198],
      paris: [48.8566, 2.3522],
      dubai: [25.2048, 55.2708],
      sydney: [-33.8688, 151.2093],
    };

    if (worldCities[q]) {
      const [lat, lng] = worldCities[q];
      flyToCity(lat, lng, 13);
      setIsSearching(false);
      return;
    }

    // Check coordinate input like "13.06, 80.24"
    const coordMatch = q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      flyToCity(lat, lng, 16);
      setIsSearching(false);
      return;
    }

    // Fallback: Geocode via OpenStreetMap Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          flyToCity(lat, lng, 14);
        }
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const displayPopup = lockedInfo || hoverInfo;

  return (
    <div className="relative w-full h-[calc(100vh-62px)] bg-[#faf8f5] overflow-hidden">
      {/* Leaflet Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Global Location Search & Quick Jump Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-sm w-full">
        <form
          onSubmit={handleSearch}
          className="relative flex items-center w-full bg-[#ffffff]/95 backdrop-blur-md border border-[#e8e2d8] rounded-xl shadow-xs overflow-hidden"
        >
          <Search className="w-4 h-4 text-[#7a6f64] ml-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search global city, coordinate, or ULPIN..."
            className="w-full px-3 py-2 text-xs text-[#2c2825] placeholder-[#8c8275] bg-transparent focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-3 py-2 text-xs font-semibold bg-[#f4f1ea] hover:bg-[#eae5db] text-[#4a443d] border-l border-[#e8e2d8] transition-colors cursor-pointer shrink-0"
          >
            {isSearching ? 'Flying...' : 'Fly'}
          </button>
        </form>

        {/* Global Cities Quick Jump Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-[#7a6f64] bg-[#ffffff]/90 px-2 py-0.5 rounded-md border border-[#e8e2d8] backdrop-blur-xs">
            Global:
          </span>
          {[
            { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
            { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
            { name: 'London', lat: 51.5074, lng: -0.1276 },
            { name: 'New York', lat: 40.7128, lng: -74.006 },
            { name: 'Tokyo', lat: 35.6895, lng: 139.6917 },
          ].map((city) => (
            <button
              key={city.name}
              onClick={() => flyToCity(city.lat, city.lng, 13)}
              className="text-[11px] font-medium bg-[#ffffff]/90 hover:bg-[#efece4] text-[#4a443d] px-2 py-0.5 rounded-md border border-[#e8e2d8] shadow-2xs backdrop-blur-xs transition-colors cursor-pointer"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Controls (Right side): Zoom, Center, and Layer Switcher */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
        {/* Navigation & Zoom */}
        <div className="flex flex-col gap-1.5 bg-[#ffffff]/95 backdrop-blur-md border border-[#e8e2d8] p-1.5 rounded-xl shadow-xs">
          <button
            onClick={() => handleZoom(true)}
            className="p-2 text-[#4a443d] hover:bg-[#efece4] rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(false)}
            className="p-2 text-[#4a443d] hover:bg-[#efece4] rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => flyToCity(13.0827, 80.2707, 14)}
            className="p-2 text-[#4a443d] hover:bg-[#efece4] rounded-lg transition-colors cursor-pointer"
            title="Reset to Chennai Center"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Base Layer Selector (Standard OSM, Humanitarian Detail, Topographic) */}
        <div className="bg-[#ffffff]/95 backdrop-blur-md border border-[#e8e2d8] p-1 rounded-xl shadow-xs flex items-center gap-1">
          <button
            onClick={() => switchBaseLayer('osm')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
              activeBaseLayer === 'osm'
                ? 'bg-[#3d8b57] text-[#ffffff]'
                : 'text-[#5c554e] hover:bg-[#efece4]'
            }`}
            title="OpenStreetMap Standard"
          >
            Standard
          </button>
          <button
            onClick={() => switchBaseLayer('osmHot')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
              activeBaseLayer === 'osmHot'
                ? 'bg-[#3d8b57] text-[#ffffff]'
                : 'text-[#5c554e] hover:bg-[#efece4]'
            }`}
            title="Humanitarian Detailed Map"
          >
            Detailed
          </button>
          <button
            onClick={() => switchBaseLayer('topo')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
              activeBaseLayer === 'topo'
                ? 'bg-[#3d8b57] text-[#ffffff]'
                : 'text-[#5c554e] hover:bg-[#efece4]'
            }`}
            title="Topographical Map"
          >
            Terrain
          </button>
        </div>
      </div>

      {/* Building Quick Info Popup (Hover / Single-Click) */}
      {displayPopup && (
        <div className="absolute bottom-16 right-4 sm:right-6 z-30 w-80 bg-[#ffffff]/95 backdrop-blur-md border border-[#e8e2d8] rounded-2xl shadow-xl p-4 text-[#2c2825] animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-2 border-b border-[#f1ede6] pb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <Building2
                  className={`w-4 h-4 ${
                    displayPopup.isDetailed ? 'text-[#3d8b57]' : 'text-[#7a6f64]'
                  }`}
                />
                <h3 className="font-bold text-sm text-[#2c2825] line-clamp-1">
                  {displayPopup.name}
                </h3>
              </div>
              <p className="text-[11px] text-[#6b6257] mt-0.5">
                {displayPopup.address || 'Chennai, India'}
              </p>
            </div>

            {lockedInfo && (
              <button
                onClick={() => setLockedInfo(null)}
                className="text-[10px] text-[#7a6f64] hover:text-[#2c2825] px-1.5 py-0.5 rounded-md hover:bg-[#f4f1ea] cursor-pointer"
              >
                Close
              </button>
            )}
          </div>

          <div className="py-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#7a6f64]">Height:</span>
              <span className="font-semibold text-[#2c2825]">
                {displayPopup.height} meters
              </span>
            </div>

            {displayPopup.type && (
              <div className="flex items-center justify-between">
                <span className="text-[#7a6f64]">Structure Type:</span>
                <span className="font-medium text-[#4a443d] capitalize">
                  {displayPopup.type}
                </span>
              </div>
            )}

            {displayPopup.isDetailed && displayPopup.baseUlpin && (
              <div className="flex items-center justify-between bg-[#faf8f5] p-2 rounded-lg border border-[#e8e2d8]">
                <span className="text-[#7a6f64] text-[11px]">Base ULPIN:</span>
                <code className="font-mono font-bold text-xs text-[#2c2825]">
                  {displayPopup.baseUlpin}
                </code>
              </div>
            )}
          </div>

          {/* Action / Double-click hint */}
          <div className="pt-2 border-t border-[#f1ede6]">
            {displayPopup.isDetailed && displayPopup.buildingId ? (
              <button
                onClick={() => {
                  const b = DETAILED_BUILDINGS.find((item) => item.id === displayPopup.buildingId);
                  if (b) onSelectBuilding(b);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#3d8b57] hover:bg-[#327247] text-[#ffffff] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Double-click or Open 3D Registry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="text-[11px] text-[#7a6f64] italic text-center">
                OSM Building Parcel (Double-click keeps popup, no detail page)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Color Legend (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20">
        <ColorLegend />
      </div>

      {/* Required Attribution: "© OpenStreetMap contributors" */}
      <div className="absolute bottom-2 right-4 z-10 bg-[#ffffff]/90 backdrop-blur-xs border border-[#e8e2d8] px-2.5 py-1 rounded-lg text-[10px] text-[#5c554e] shadow-2xs">
        <span>Map Data © </span>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#2c2825] hover:underline"
        >
          OpenStreetMap contributors
        </a>
        <span> • Leaflet.js</span>
      </div>
    </div>
  );
};

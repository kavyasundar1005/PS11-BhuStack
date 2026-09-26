import React, { useEffect, useRef, useState } from 'react';
import { DETAILED_BUILDINGS } from '../data/buildingsData';
import { DetailedBuilding, MapHoverInfo } from '../types/property';
import { getCesiumIonToken } from '../services/cesiumToken';
import { ColorLegend } from './ColorLegend';
import {
  Search,
  MapPin,
  Building2,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Layers,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface CesiumMapProps {
  onSelectBuilding: (building: DetailedBuilding) => void;
  flyToBuildingId?: string | null;
}

export const CesiumMap: React.FC<CesiumMapProps> = ({
  onSelectBuilding,
  flyToBuildingId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const osmTilesetRef = useRef<any>(null);

  const [hoverInfo, setHoverInfo] = useState<MapHoverInfo | null>(null);
  const [lockedInfo, setLockedInfo] = useState<MapHoverInfo | null>(null);
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Initialize Cesium
  useEffect(() => {
    let isCancelled = false;

    async function initCesium() {
      if (typeof window === 'undefined' || !window.Cesium) {
        console.warn('Cesium library not loaded yet');
        return;
      }

      const Cesium = window.Cesium;

      // 1. Get token
      const token = await getCesiumIonToken();
      if (token) {
        Cesium.Ion.defaultAccessToken = token;
        if (!isCancelled) setTokenStatus('ready');
      } else {
        if (!isCancelled) setTokenStatus('missing');
      }

      if (!mapContainerRef.current || viewerRef.current) return;

      // 2. Initialize Viewer
      try {
        const viewer = new Cesium.Viewer(mapContainerRef.current, {
          terrainProvider: undefined,
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          scene3DOnly: true,
          requestRenderMode: false,
        });

        viewerRef.current = viewer;

        // Visual tweaks for warm municipal aesthetics
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#f4f1ea');
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#faf8f5');
        viewer.scene.sun.show = true;
        viewer.scene.moon.show = false;
        viewer.scene.skyAtmosphere.show = true;

        // Center on Chennai, India (13.0827 N, 80.2707 E)
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(80.2707, 13.0827, 2800),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-40),
            roll: 0.0,
          },
        });

        // 3. Load Real Global Cesium OSM Buildings layer if token is provided
        try {
          if (token) {
            const osmBuildingsTileset = await Cesium.createOsmBuildingsAsync();
            if (!isCancelled) {
              viewer.scene.primitives.add(osmBuildingsTileset);
              osmTilesetRef.current = osmBuildingsTileset;
            }
          }
        } catch (tilesetErr) {
          console.warn('[Cesium] OSM Buildings load note:', tilesetErr);
        }

        // 4. Add the 3 Detailed Anchor Buildings
        DETAILED_BUILDINGS.forEach((b) => {
          // Add 3D Volumetric Extruded Footprint Box
          viewer.entities.add({
            name: b.name,
            properties: {
              isDetailed: true,
              buildingId: b.id,
              baseUlpin: b.baseUlpin,
              height: b.height,
              floorsCount: b.floorsCount,
              area: b.area,
              footprintStatus: b.footprintStatus,
            },
            position: Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.height / 2),
            box: {
              dimensions: new Cesium.Cartesian3(28, 22, b.height),
              material: Cesium.Color.fromCssColorString('#3d8b57').withAlpha(0.65),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString('#2e6f40'),
              outlineWidth: 2,
            },
          });

          // Add Cadastral Pin Point & Marker Billboard
          viewer.entities.add({
            name: b.name,
            properties: {
              isDetailed: true,
              buildingId: b.id,
              baseUlpin: b.baseUlpin,
              height: b.height,
              floorsCount: b.floorsCount,
              area: b.area,
              footprintStatus: b.footprintStatus,
            },
            position: Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.height + 6),
            point: {
              pixelSize: 14,
              color: Cesium.Color.fromCssColorString('#3d8b57'),
              outlineColor: Cesium.Color.fromCssColorString('#ffffff'),
              outlineWidth: 3,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: `${b.name} (${b.height}m)`,
              font: 'bold 12px "Plus Jakarta Sans", sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#2c2825'),
              outlineColor: Cesium.Color.fromCssColorString('#ffffff'),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -12),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });

        // 5. Screen Space Event Handler for Hover, Click, Double-Click
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        // Helper to extract building info
        const extractInfo = (movementPosition: any): MapHoverInfo | null => {
          const picked = viewer.scene.pick(movementPosition);
          if (!picked) return null;

          // Check if picked is one of our 3 detailed entity records
          if (picked.id && picked.id.properties) {
            const props = picked.id.properties;
            const bId = props.buildingId?.getValue();
            const detailed = DETAILED_BUILDINGS.find((item) => item.id === bId);
            if (detailed) {
              return {
                name: detailed.name,
                height: detailed.height,
                type: 'Cadastral Registered 3D Parcel',
                address: `${detailed.area}, Chennai, India`,
                isDetailed: true,
                buildingId: detailed.id,
                baseUlpin: detailed.baseUlpin,
                position: { x: movementPosition.x, y: movementPosition.y },
              };
            }
          }

          // Check if picked is a Cesium3DTileFeature (Real OSM building)
          if (picked instanceof Cesium.Cesium3DTileFeature || (picked.getProperty && typeof picked.getProperty === 'function')) {
            const feature = picked;
            const name = feature.getProperty('name') || feature.getProperty('element_name') || 'OSM Building Structure';
            const heightVal = feature.getProperty('cesium#estimatedHeight') || feature.getProperty('height') || 15;
            const bType = feature.getProperty('building') || 'Building';
            const street = feature.getProperty('addr:street') || feature.getProperty('addr:city') || 'Global Survey Grid';

            return {
              name: String(name),
              height: Math.round(Number(heightVal) || 18),
              type: String(bType),
              address: String(street),
              isDetailed: false,
              position: { x: movementPosition.x, y: movementPosition.y },
            };
          }

          return null;
        };

        // Hover: show info popup
        handler.setInputAction((movement: any) => {
          const info = extractInfo(movement.endPosition);
          setHoverInfo(info);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Single Click: lock / pin popup info
        handler.setInputAction((click: any) => {
          const info = extractInfo(click.position);
          setLockedInfo(info);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Double Click:
        // "Three specific real-world locations are tagged as 'detailed' buildings —
        // double-clicking one of these opens a full page with floors, flats, ULPINs,
        // parking, and two violation checks. Double-clicking any other building in
        // the world just keeps the popup, no detail page."
        handler.setInputAction((dblClick: any) => {
          const info = extractInfo(dblClick.position);
          if (info && info.isDetailed && info.buildingId) {
            const matched = DETAILED_BUILDINGS.find((b) => b.id === info.buildingId);
            if (matched) {
              onSelectBuilding(matched);
            }
          } else if (info) {
            // Any other building: keeps popup, does NOT open detail page
            setLockedInfo(info);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

      } catch (err) {
        console.error('Cesium initialization error:', err);
      }
    }

    initCesium();

    return () => {
      isCancelled = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Handle fly-to requests from props or buttons
  useEffect(() => {
    if (!flyToBuildingId || !viewerRef.current) return;
    const target = DETAILED_BUILDINGS.find((b) => b.id === flyToBuildingId);
    if (!target) return;

    flyToBuilding(target);
  }, [flyToBuildingId]);

  const flyToBuilding = (building: DetailedBuilding) => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium) return;
    const Cesium = window.Cesium;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(building.lng, building.lat - 0.002, building.height + 140),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0.0,
      },
      duration: 1.8,
    });

    setLockedInfo({
      name: building.name,
      height: building.height,
      type: 'Cadastral Registered 3D Parcel',
      address: `${building.area}, Chennai`,
      isDetailed: true,
      buildingId: building.id,
      baseUlpin: building.baseUlpin,
    });
  };

  const flyToCity = (lng: number, lat: number, height = 3000) => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium) return;
    const Cesium = window.Cesium;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0,
      },
      duration: 2.0,
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const q = searchQuery.toLowerCase().trim();

    // Check if matches one of detailed buildings
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

    // World city coordinate dictionary
    const worldCities: Record<string, [number, number]> = {
      chennai: [80.2707, 13.0827],
      mumbai: [72.8777, 19.076],
      delhi: [77.209, 28.6139],
      bengaluru: [77.5946, 12.9716],
      bangalore: [77.5946, 12.9716],
      london: [-0.1276, 51.5074],
      'new york': [-74.006, 40.7128],
      tokyo: [139.6917, 35.6895],
      singapore: [103.8198, 1.3521],
      paris: [2.3522, 48.8566],
      dubai: [55.2708, 25.2048],
      sydney: [151.2093, -33.8688],
    };

    if (worldCities[q]) {
      const [lng, lat] = worldCities[q];
      flyToCity(lng, lat, 2500);
      setIsSearching(false);
      return;
    }

    // Check coordinate input like "13.06, 80.24"
    const coordMatch = q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      flyToCity(lng, lat, 2000);
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
          flyToCity(lng, lat, 2000);
        }
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleZoom = (zoomIn: boolean) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const camera = viewer.camera;
    if (zoomIn) {
      camera.zoomIn(camera.positionCartographic.height * 0.4);
    } else {
      camera.zoomOut(camera.positionCartographic.height * 0.4);
    }
  };

  const displayPopup = lockedInfo || hoverInfo;

  return (
    <div className="relative w-full h-[calc(100vh-62px)] bg-[#faf8f5] overflow-hidden">
      {/* Cesium 3D Canvas Container */}
      <div id="cesiumContainer" ref={mapContainerRef} className="w-full h-full" />

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
            { name: 'Chennai', lng: 80.2707, lat: 13.0827 },
            { name: 'Mumbai', lng: 72.8777, lat: 19.076 },
            { name: 'London', lng: -0.1276, lat: 51.5074 },
            { name: 'New York', lng: -74.006, lat: 40.7128 },
            { name: 'Tokyo', lng: 139.6917, lat: 35.6895 },
          ].map((city) => (
            <button
              key={city.name}
              onClick={() => flyToCity(city.lng, city.lat, 2500)}
              className="text-[11px] font-medium bg-[#ffffff]/90 hover:bg-[#efece4] text-[#4a443d] px-2 py-0.5 rounded-md border border-[#e8e2d8] shadow-2xs backdrop-blur-xs transition-colors cursor-pointer"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Camera Controls (Right side) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-[#ffffff]/95 backdrop-blur-md border border-[#e8e2d8] p-1.5 rounded-xl shadow-xs">
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
          onClick={() => flyToCity(80.2707, 13.0827, 2800)}
          className="p-2 text-[#4a443d] hover:bg-[#efece4] rounded-lg transition-colors cursor-pointer"
          title="Reset to Chennai Cadastral Center"
        >
          <Navigation className="w-4 h-4" />
        </button>
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
                {displayPopup.address || 'Chennai Cadastral Region'}
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
                Real global OSM building (Double-click keeps popup, no detail page)
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
        <span> • Cesium OSM Buildings 3D</span>
      </div>
    </div>
  );
};

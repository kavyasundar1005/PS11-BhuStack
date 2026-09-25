import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DetailedBuilding, FlatUnit } from '../types/property';
import { RotateCw, ZoomIn, ZoomOut, Compass, Eye, ShieldAlert } from 'lucide-react';

interface BuildingModel3DProps {
  building: DetailedBuilding;
  selectedFloor: number;
  onSelectFloor: (floor: number) => void;
  selectedUnit: FlatUnit | null;
  onSelectUnit: (unit: FlatUnit) => void;
  units: FlatUnit[];
  highlightEncroachment?: boolean;
}

export const BuildingModel3D: React.FC<BuildingModel3DProps> = ({
  building,
  selectedFloor,
  onSelectFloor,
  selectedUnit,
  onSelectUnit,
  units,
  highlightEncroachment = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const isRotatingRef = useRef<boolean>(false);
  isRotatingRef.current = isRotating;

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshesRef = useRef<{
    flatAMeshes: Map<number, THREE.Mesh>;
    flatBMeshes: Map<number, THREE.Mesh>;
    corridorMeshes: Map<number, THREE.Mesh>;
    encroachmentMesh?: THREE.Mesh;
    highlightOutline?: THREE.BoxHelper;
  }>({
    flatAMeshes: new Map(),
    flatBMeshes: new Map(),
    corridorMeshes: new Map(),
  });

  const controlsRef = useRef<{
    isDragging: boolean;
    previousMousePosition: { x: number; y: number };
    rotation: { x: number; y: number };
    distance: number;
    target: THREE.Vector3;
  }>({
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    rotation: { x: 0.45, y: -0.6 },
    distance: Math.max(35, building.floorsCount * 4),
    target: new THREE.Vector3(0, (building.floorsCount * 3) / 2, 0),
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 460;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfbf9f5);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff6ea, 1.2);
    dirLight.position.set(40, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe8f0ee, 0.5);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);

    // 5. Ground Cadastral Plot Grid
    const plotWidth = 24;
    const plotDepth = 18;
    const gridHelper = new THREE.GridHelper(60, 30, 0xd4ccbf, 0xebe6dc);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Cadastral Registered Boundary line
    const boundaryPoints = [
      new THREE.Vector3(-plotWidth / 2, 0.05, -plotDepth / 2),
      new THREE.Vector3(plotWidth / 2, 0.05, -plotDepth / 2),
      new THREE.Vector3(plotWidth / 2, 0.05, plotDepth / 2),
      new THREE.Vector3(-plotWidth / 2, 0.05, plotDepth / 2),
      new THREE.Vector3(-plotWidth / 2, 0.05, -plotDepth / 2),
    ];
    const boundaryGeo = new THREE.BufferGeometry().setFromPoints(boundaryPoints);
    const boundaryMat = new THREE.LineDashedMaterial({
      color: 0x3d8b57,
      dashSize: 1,
      gapSize: 0.5,
      linewidth: 2,
    });
    const boundaryLine = new THREE.Line(boundaryGeo, boundaryMat);
    boundaryLine.computeLineDistances();
    scene.add(boundaryLine);

    // 6. Build Floors
    // Total building width = 20, depth = 14, floorHeight = 3
    const bWidth = 20;
    const bDepth = 14;
    const fHeight = 2.8;
    const slabGap = 0.2;

    // Floor widths based on exact specification:
    // Flat A = 35% of 20 = 7.0
    // Corridor = 20% of 20 = 4.0
    // Flat B = 45% of 20 = 9.0
    const wFlatA = bWidth * 0.35; // 7.0
    const wCorridor = bWidth * 0.2; // 4.0
    const wFlatB = bWidth * 0.45; // 9.0

    const xFlatA = -bWidth / 2 + wFlatA / 2; // -10 + 3.5 = -6.5
    const xCorridor = -bWidth / 2 + wFlatA + wCorridor / 2; // -10 + 7 + 2 = -1.0
    const xFlatB = -bWidth / 2 + wFlatA + wCorridor + wFlatB / 2; // -10 + 11 + 4.5 = 5.5

    // Basement representation if applicable
    if (building.hasBasement) {
      const bGeo = new THREE.BoxGeometry(bWidth + 0.5, 2.5, bDepth + 0.5);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x2a7b88,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      });
      const basementMesh = new THREE.Mesh(bGeo, bMat);
      basementMesh.position.set(0, -1.3, 0);
      basementMesh.userData = { isBasement: true, floorNumber: 0 };
      scene.add(basementMesh);
    }

    // Materials
    const matFlatA = new THREE.MeshStandardMaterial({
      color: 0x3d8b57,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const matCorridor = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
    });
    const matFlatB = new THREE.MeshStandardMaterial({
      color: 0x3d8b57,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });

    const flatAMap = new Map<number, THREE.Mesh>();
    const flatBMap = new Map<number, THREE.Mesh>();
    const corridorMap = new Map<number, THREE.Mesh>();

    for (let f = 1; f <= building.floorsCount; f++) {
      const yCenter = (f - 1) * (fHeight + slabGap) + fHeight / 2;

      // Concrete floor slab
      const slabGeo = new THREE.BoxGeometry(bWidth + 0.2, slabGap, bDepth + 0.2);
      const slabMat = new THREE.MeshStandardMaterial({ color: 0xdad3c7, roughness: 0.8 });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(0, (f - 1) * (fHeight + slabGap) - slabGap / 2, 0);
      scene.add(slab);

      // Flat A Mesh
      const geoA = new THREE.BoxGeometry(wFlatA - 0.2, fHeight, bDepth - 0.2);
      const meshA = new THREE.Mesh(geoA, matFlatA.clone());
      meshA.position.set(xFlatA, yCenter, 0);
      meshA.userData = { floorNumber: f, flatLabel: 'Flat A' };
      scene.add(meshA);
      flatAMap.set(f, meshA);

      // Corridor Mesh (not clickable, shared color)
      const geoCorr = new THREE.BoxGeometry(wCorridor - 0.2, fHeight, bDepth - 0.2);
      const meshCorr = new THREE.Mesh(geoCorr, matCorridor.clone());
      meshCorr.position.set(xCorridor, yCenter, 0);
      meshCorr.userData = { floorNumber: f, isCorridor: true };
      scene.add(meshCorr);
      corridorMap.set(f, meshCorr);

      // Flat B Mesh
      const geoB = new THREE.BoxGeometry(wFlatB - 0.2, fHeight, bDepth - 0.2);
      const meshB = new THREE.Mesh(geoB, matFlatB.clone());
      meshB.position.set(xFlatB, yCenter, 0);
      meshB.userData = { floorNumber: f, flatLabel: 'Flat B' };
      scene.add(meshB);
      flatBMap.set(f, meshB);
    }

    // 7. Encroachment Protrusion for Garden View Towers
    // Protrudes 2 meters past registered plot boundary on East side
    let encMesh: THREE.Mesh | undefined;
    if (building.id === 'garden-view-towers') {
      const totalBHeight = building.floorsCount * (fHeight + slabGap);
      const encGeo = new THREE.BoxGeometry(2.0, totalBHeight, bDepth);
      const encMat = new THREE.MeshStandardMaterial({
        color: 0xb84a39,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: highlightEncroachment ? 0.95 : 0.45,
        wireframe: false,
      });
      encMesh = new THREE.Mesh(encGeo, encMat);
      // Positioned exactly 2m outside eastern edge (bWidth / 2 = 10 -> 10 + 1 = 11)
      encMesh.position.set(bWidth / 2 + 1.0, totalBHeight / 2, 0);
      encMesh.userData = { isEncroachment: true };
      scene.add(encMesh);

      // Add dashed edge wireframe around protrusion
      const encEdges = new THREE.EdgesGeometry(encGeo);
      const encLine = new THREE.LineSegments(
        encEdges,
        new THREE.LineBasicMaterial({ color: 0x963727, linewidth: 2 })
      );
      encMesh.add(encLine);
    }

    meshesRef.current = {
      flatAMeshes: flatAMap,
      flatBMeshes: flatBMap,
      corridorMeshes: corridorMap,
      encroachmentMesh: encMesh,
    };

    // Camera initial position
    const updateCamera = () => {
      const { rotation, distance, target } = controlsRef.current;
      const x = target.x + distance * Math.cos(rotation.x) * Math.sin(rotation.y);
      const y = target.y + distance * Math.sin(rotation.x);
      const z = target.z + distance * Math.cos(rotation.x) * Math.cos(rotation.y);
      camera.position.set(x, y, z);
      camera.lookAt(target);
    };
    updateCamera();

    // Mouse Interaction Handlers for Orbit Rotation & Picking
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        controlsRef.current.isDragging = true;
        controlsRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!controlsRef.current.isDragging) return;
      const deltaX = e.clientX - controlsRef.current.previousMousePosition.x;
      const deltaY = e.clientY - controlsRef.current.previousMousePosition.y;

      controlsRef.current.rotation.y -= deltaX * 0.01;
      controlsRef.current.rotation.x = Math.max(
        0.1,
        Math.min(Math.PI / 2.2, controlsRef.current.rotation.x + deltaY * 0.01)
      );

      controlsRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onMouseUp = (e: MouseEvent) => {
      // If minimal mouse movement, treat as Click / Pick
      const deltaX = Math.abs(e.clientX - controlsRef.current.previousMousePosition.x);
      const deltaY = Math.abs(e.clientY - controlsRef.current.previousMousePosition.y);
      controlsRef.current.isDragging = false;

      if (deltaX < 3 && deltaY < 3) {
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const allClickable: THREE.Mesh[] = [
          ...Array.from(flatAMap.values()),
          ...Array.from(flatBMap.values()),
        ];
        const intersects = raycaster.intersectObjects(allClickable);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const { floorNumber, flatLabel } = hit.userData;

          if (floorNumber && flatLabel) {
            onSelectFloor(floorNumber);
            const matched = units.find(
              (u) => u.floorNumber === floorNumber && u.flatLabel === flatLabel
            );
            if (matched) {
              onSelectUnit(matched);
            }
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      controlsRef.current.distance = Math.max(
        15,
        Math.min(120, controlsRef.current.distance + e.deltaY * 0.05)
      );
      updateCamera();
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isRotatingRef.current) {
        controlsRef.current.rotation.y += 0.005;
        updateCamera();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [building.id]);

  // Update Visual Highlights when selectedUnit, selectedFloor, or highlightEncroachment change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const { flatAMeshes, flatBMeshes, corridorMeshes, encroachmentMesh } = meshesRef.current;

    // Remove prior highlight outline if any
    if (meshesRef.current.highlightOutline) {
      scene.remove(meshesRef.current.highlightOutline);
      meshesRef.current.highlightOutline = undefined;
    }

    // Update Encroachment protrusion styling
    if (encroachmentMesh) {
      const mat = encroachmentMesh.material as THREE.MeshStandardMaterial;
      if (highlightEncroachment) {
        mat.color.setHex(0xb84a39);
        mat.opacity = 0.95;
        mat.emissive.setHex(0x5a1810);
      } else {
        mat.color.setHex(0xb84a39);
        mat.opacity = 0.45;
        mat.emissive.setHex(0x000000);
      }
    }

    // Update floor / unit meshes
    for (let f = 1; f <= building.floorsCount; f++) {
      const meshA = flatAMeshes.get(f);
      const meshB = flatBMeshes.get(f);
      const meshCorr = corridorMeshes.get(f);

      const isCurrentFloor = f === selectedFloor;

      if (meshA) {
        const isSelectedA = selectedUnit?.floorNumber === f && selectedUnit?.flatLabel === 'Flat A';
        const mat = meshA.material as THREE.MeshStandardMaterial;

        if (isSelectedA) {
          mat.color.setHex(0x27743d);
          mat.emissive.setHex(0x194e27);
          mat.opacity = 1.0;

          // Add glowing outline around selected unit
          const boxHelper = new THREE.BoxHelper(meshA, 0x1b4329);
          scene.add(boxHelper);
          meshesRef.current.highlightOutline = boxHelper;
        } else if (isCurrentFloor) {
          mat.color.setHex(0x3d8b57);
          mat.emissive.setHex(0x0a2412);
          mat.opacity = 0.95;
        } else {
          mat.color.setHex(0x3d8b57);
          mat.emissive.setHex(0x000000);
          mat.opacity = 0.75;
        }
      }

      if (meshB) {
        const isSelectedB = selectedUnit?.floorNumber === f && selectedUnit?.flatLabel === 'Flat B';
        const mat = meshB.material as THREE.MeshStandardMaterial;

        if (isSelectedB) {
          mat.color.setHex(0x27743d);
          mat.emissive.setHex(0x194e27);
          mat.opacity = 1.0;

          const boxHelper = new THREE.BoxHelper(meshB, 0x1b4329);
          scene.add(boxHelper);
          meshesRef.current.highlightOutline = boxHelper;
        } else if (isCurrentFloor) {
          mat.color.setHex(0x3d8b57);
          mat.emissive.setHex(0x0a2412);
          mat.opacity = 0.95;
        } else {
          mat.color.setHex(0x3d8b57);
          mat.emissive.setHex(0x000000);
          mat.opacity = 0.75;
        }
      }

      if (meshCorr) {
        const mat = meshCorr.material as THREE.MeshStandardMaterial;
        if (isCurrentFloor) {
          mat.color.setHex(0xd97706);
          mat.emissive.setHex(0x451a03);
          mat.opacity = 0.95;
        } else {
          mat.color.setHex(0xd97706);
          mat.emissive.setHex(0x000000);
          mat.opacity = 0.7;
        }
      }
    }
  }, [selectedUnit, selectedFloor, highlightEncroachment, building.floorsCount]);

  const resetView = () => {
    controlsRef.current.rotation = { x: 0.45, y: -0.6 };
    controlsRef.current.distance = Math.max(35, building.floorsCount * 4);
    if (cameraRef.current) {
      const { rotation, distance, target } = controlsRef.current;
      const x = target.x + distance * Math.cos(rotation.x) * Math.sin(rotation.y);
      const y = target.y + distance * Math.sin(rotation.x);
      const z = target.z + distance * Math.cos(rotation.x) * Math.cos(rotation.y);
      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(target);
    }
  };

  return (
    <div className="relative w-full h-[460px] bg-[#fbf9f5] border border-[#e8e2d8] rounded-2xl overflow-hidden shadow-xs">
      {/* 3D Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-[#ffffff]/90 backdrop-blur-md border border-[#e8e2d8] rounded-xl px-3 py-1.5 shadow-2xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3d8b57]" />
          <span className="text-xs font-semibold text-[#2c2825]">
            Rotatable 3D Volumetric Model
          </span>
          <span className="text-[10px] text-[#7a6f64] hidden sm:inline">
            (Drag to rotate • Wheel to zoom)
          </span>
        </div>

        {/* Action icons */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#ffffff]/90 backdrop-blur-md border border-[#e8e2d8] rounded-xl p-1 shadow-2xs">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isRotating
                ? 'bg-[#3d8b57] text-[#ffffff]'
                : 'text-[#5c554e] hover:bg-[#efece4]'
            }`}
            title="Toggle automatic rotation"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 rounded-lg text-[#5c554e] hover:bg-[#efece4] transition-colors cursor-pointer"
            title="Reset 3D camera"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Encroachment Alert Pill when active */}
      {building.id === 'garden-view-towers' && (
        <div
          className={`absolute bottom-3 right-3 pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm transition-all ${
            highlightEncroachment
              ? 'bg-[#b84a39] text-[#ffffff] border-[#963727] scale-105'
              : 'bg-[#ffffff]/90 text-[#b84a39] border-[#eed9d4]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span className="text-xs font-semibold">
            2m East Frontage Protrusion Highlighted
          </span>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-3 pointer-events-none">
        <span className="bg-[#ffffff]/85 backdrop-blur-xs border border-[#e8e2d8] rounded-lg px-2.5 py-1 text-[10px] font-medium text-[#7a6f64] shadow-2xs">
          Click any flat mesh in 3D to inspect
        </span>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  computeCameraQuaternion,
  getCameraLookDirection,
} from "../math/deviceOrientation";
import type {
  OrientationTelemetry,
  DeviceOrientationEuler,
} from "../math/deviceOrientation";
import {
  loadBinaryStarCatalog,
  loadConstellations,
  buildCelestialGeometry,
} from "../services/starCatalog";
import type { StarRecord, ConstellationLine } from "../services/starCatalog";
import { cameraService } from "../services/camera";
import { sensorService } from "../services/sensors";
import type { LocationState } from "../services/sensors";

interface ARViewProps {
  onTelemetryUpdate: (telemetry: OrientationTelemetry) => void;
  onLocationUpdate?: (loc: LocationState) => void;
  showStars: boolean;
  showConstellations: boolean;
  isNightVision: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement, video: HTMLVideoElement) => void;
}

// Generate circular soft star texture for WebGL points
function createStarTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  gradient.addColorStop(0.2, "rgba(230, 245, 255, 0.9)");
  gradient.addColorStop(0.5, "rgba(150, 200, 255, 0.4)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Generate cardinal label textures
function createCardinalSprite(text: string, color = "#38BDF8"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  ctx.font = 'bold 36px "JetBrains Mono", monospace';
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillText(text, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(60, 30, 1);
  return sprite;
}

export const ARView: React.FC<ARViewProps> = ({
  onTelemetryUpdate,
  onLocationUpdate,
  showStars,
  showConstellations,
  isNightVision,
  onCanvasReady,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    onTelemetryUpdate,
    onLocationUpdate,
    showStars,
    showConstellations,
    isNightVision,
    onCanvasReady,
  });

  useEffect(() => {
    propsRef.current = {
      onTelemetryUpdate,
      onLocationUpdate,
      showStars,
      showConstellations,
      isNightVision,
      onCanvasReady,
    };
  });

  // Three.js object refs for reactive prop changes
  const starMeshRef = useRef<THREE.Points | null>(null);
  const constellationMeshRef = useRef<THREE.LineSegments | null>(null);
  const constellationMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const horizonLineRef = useRef<THREE.Line | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Fallback drag controls state for desktop
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const manualEulerRef = useRef({ yaw: 0, pitch: 0 });
  const hasReceivedHardwareSensorRef = useRef(false);
  const pinchDistRef = useRef<number | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    // Notify ready for recording
    if (propsRef.current.onCanvasReady) {
      propsRef.current.onCanvasReady(canvas, video);
    }

    // 1. Initialize Camera
    cameraService.startCamera(video).catch((err) => {
      console.warn(
        "Camera initialization fallback to simulation:",
        err.message,
      );
    });

    // 2. Initialize Three.js Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      2500,
    );

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Star texture and materials
    const starTexture = createStarTexture();
    const starMaterial = new THREE.PointsMaterial({
      size: 6,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const constellationMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(
        propsRef.current.isNightVision ? 0xff0000 : 0x38bdf8,
      ),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    // Horizon Guide Ring (Radius 1000, Alt = 0)
    const horizonGeo = new THREE.BufferGeometry();
    const horizonPoints: number[] = [];
    for (let i = 0; i <= 72; i++) {
      const theta = (i / 72) * Math.PI * 2;
      horizonPoints.push(1000 * Math.sin(theta), 0, -1000 * Math.cos(theta));
    }
    horizonGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(horizonPoints, 3),
    );
    const horizonLine = new THREE.Line(
      horizonGeo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(
          propsRef.current.isNightVision ? 0x7f0000 : 0x38bdf8,
        ),
        transparent: true,
        opacity: 0.3,
      }),
    );
    scene.add(horizonLine);

    // Cardinal Sprites
    const cardinalGroup = new THREE.Group();
    const cardinals = [
      { text: "N", az: 0 },
      { text: "NE", az: 45 },
      { text: "E", az: 90 },
      { text: "SE", az: 135 },
      { text: "S", az: 180 },
      { text: "SW", az: 225 },
      { text: "W", az: 270 },
      { text: "NW", az: 315 },
    ];
    cardinals.forEach(({ text, az }) => {
      const sprite = createCardinalSprite(
        text,
        propsRef.current.isNightVision ? "#FF0000" : "#38BDF8",
      );
      const rad = (az * Math.PI) / 180.0;
      sprite.position.set(950 * Math.sin(rad), 0, -950 * Math.cos(rad));
      cardinalGroup.add(sprite);
    });
    scene.add(cardinalGroup);

    let starMesh: THREE.Points | null = null;
    let constellationMesh: THREE.LineSegments | null = null;
    let loadedStars: StarRecord[] = [];
    let loadedConstellations: ConstellationLine[] = [];

    // Load Star Catalog & Constellations
    Promise.all([loadBinaryStarCatalog(), loadConstellations()])
      .then(([stars, constellations]) => {
        loadedStars = stars;
        loadedConstellations = constellations;
        rebuildGeometry();
      })
      .catch((err) => console.error("Failed to load star data:", err));

    function rebuildGeometry() {
      if (loadedStars.length === 0) return;

      const { latitude, longitude } = sensorService.currentLocation;
      const { starGeometry, constellationGeometry } = buildCelestialGeometry(
        loadedStars,
        loadedConstellations,
        latitude,
        longitude,
        new Date(),
      );

      if (starMesh) scene.remove(starMesh);
      if (constellationMesh) scene.remove(constellationMesh);

      starMesh = new THREE.Points(starGeometry, starMaterial);
      starMesh.visible = propsRef.current.showStars;
      scene.add(starMesh);

      constellationMesh = new THREE.LineSegments(
        constellationGeometry,
        constellationMaterial,
      );
      constellationMesh.visible = propsRef.current.showConstellations;
      scene.add(constellationMesh);

      // Save into refs for instant prop toggling
      starMeshRef.current = starMesh;
      constellationMeshRef.current = constellationMesh;
      constellationMaterialRef.current = constellationMaterial;
      horizonLineRef.current = horizonLine;
      cameraRef.current = camera;
    }

    // 3. Sensor Tracking
    sensorService.startGeolocationTracking();
    const unsubLocation = sensorService.onLocation((loc) => {
      if (propsRef.current.onLocationUpdate)
        propsRef.current.onLocationUpdate(loc);
      rebuildGeometry();
    });

    let currentOrientationEuler: DeviceOrientationEuler =
      sensorService.currentOrientation;
    let currentScreenAngle = 0;

    const unsubOrientation = sensorService.onOrientation((euler, angle) => {
      hasReceivedHardwareSensorRef.current = true;
      currentOrientationEuler = euler;
      currentScreenAngle = angle;
    });

    // Auto-rebuild geometry every 30s as Earth rotates
    const starRefreshInterval = window.setInterval(
      () => rebuildGeometry(),
      30000,
    );

    // 4. Render Loop at 60fps
    const targetQuaternion = new THREE.Quaternion();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (hasReceivedHardwareSensorRef.current) {
        // Sensor fusion hardware quaternion
        const q = computeCameraQuaternion(
          currentOrientationEuler,
          currentScreenAngle,
        );
        targetQuaternion.copy(q);
      } else {
        // Desktop manual fallback orientation via drag
        const euler = new THREE.Euler(
          manualEulerRef.current.pitch,
          manualEulerRef.current.yaw,
          0,
          "YXZ",
        );
        targetQuaternion.setFromEuler(euler);
      }

      // Smooth camera interpolation
      camera.quaternion.slerp(targetQuaternion, 0.2);

      // Extract telemetry & report to HUD
      const telemetry = getCameraLookDirection(camera.quaternion);
      propsRef.current.onTelemetryUpdate(telemetry);

      renderer.render(scene, camera);
    };

    animate();

    // 5. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(starRefreshInterval);
      window.removeEventListener("resize", handleResize);
      unsubLocation();
      unsubOrientation();
      sensorService.stopGeolocationTracking();
      cameraService.stopCamera();
      renderer.dispose();
      starTexture.dispose();
      starMaterial.dispose();
      constellationMaterial.dispose();
    };
  }, []);

  // Sync visibility props reactively to Three.js scene
  useEffect(() => {
    if (starMeshRef.current) {
      starMeshRef.current.visible = showStars;
    }
    if (constellationMeshRef.current) {
      constellationMeshRef.current.visible = showConstellations;
    }
    if (constellationMaterialRef.current) {
      constellationMaterialRef.current.color.set(
        isNightVision ? 0xff0000 : 0x38bdf8,
      );
    }
    if (horizonLineRef.current) {
      (horizonLineRef.current.material as THREE.LineBasicMaterial).color.set(
        isNightVision ? 0x7f0000 : 0x38bdf8,
      );
    }
  }, [showStars, showConstellations, isNightVision]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    const newFov = Math.max(
      25,
      Math.min(85, cameraRef.current.fov + e.deltaY * 0.05),
    );
    cameraRef.current.fov = newFov;
    cameraRef.current.updateProjectionMatrix();
  };

  // Desktop drag & mobile touch controls
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.003;
    manualEulerRef.current.yaw += dx * sensitivity;
    manualEulerRef.current.pitch = Math.max(
      -Math.PI / 2 + 0.01,
      Math.min(
        Math.PI / 2 - 0.01,
        manualEulerRef.current.pitch + dy * sensitivity,
      ),
    );
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    pinchDistRef.current = null;
  };

  // Touch pinch to zoom handler
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && cameraRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (pinchDistRef.current !== null) {
        const delta = pinchDistRef.current - dist;
        const newFov = Math.max(
          25,
          Math.min(85, cameraRef.current.fov + delta * 0.1),
        );
        cameraRef.current.fov = newFov;
        cameraRef.current.updateProjectionMatrix();
      }
      pinchDistRef.current = dist;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-astro-dark cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchMove={handleTouchMove}
      onWheel={handleWheel}
      data-testid="ar-view-container"
    >
      {/* Background Camera Layer */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-[filter] duration-300"
        autoPlay
        playsInline
        muted
        data-testid="camera-video"
      />

      {/* WebGL Celestial Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        data-testid="webgl-canvas"
      />
    </div>
  );
};

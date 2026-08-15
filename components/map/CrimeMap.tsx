"use client";

import { useEffect, useRef, useState } from "react";
import { Map, NavigationControl, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CRIME_GROUPS,
  crimeGroupForCategory,
  type CrimeGroup,
} from "@/lib/crime-groups";
import { buildIncidentPopupHtml } from "@/lib/incident-popup";
import type { Incident } from "@/lib/types";

/**
 * Memphis incident map with category-colored hotspots + heatmap mode.
 * Basemap: MapLibre. Overlays: canvas (reliable under Next.js).
 */

const MEMPHIS: [number, number] = [-90.049, 35.1495];

export type MapDisplayMode = "incidents" | "heatmap";

type Props = {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  /** Controlled map display mode (sidebar owns this in the app shell). */
  mode?: MapDisplayMode;
  onModeChange?: (mode: MapDisplayMode) => void;
  showViewToggle?: boolean;
};

type Point = {
  id: string;
  category: string;
  crimeType: string;
  reportedAt: string;
  lng: number;
  lat: number;
  group: CrimeGroup;
};

function toPoints(incidents: Incident[]): Point[] {
  const points: Point[] = [];
  for (const incident of incidents) {
    const lat = Number(incident.lat);
    const lng = Number(incident.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;
    if (lat < 34.8 || lat > 35.5 || lng < -90.5 || lng > -89.5) continue;
    points.push({
      id: incident.id,
      category: incident.category ?? "Unknown",
      crimeType: incident.crimeType ?? "",
      reportedAt: incident.reportedAt,
      lng,
      lat,
      group: crimeGroupForCategory(incident.category),
    });
  }
  return points;
}

function rgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function CrimeMap({
  incidents,
  loading,
  error,
  mode: modeProp,
  onModeChange,
  showViewToggle = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const [internalMode, setInternalMode] = useState<MapDisplayMode>("incidents");
  const mode = modeProp ?? internalMode;
  const modeRef = useRef<MapDisplayMode>(mode);

  pointsRef.current = toPoints(incidents);
  modeRef.current = mode;

  const setMode = (next: MapDisplayMode) => {
    if (onModeChange) onModeChange(next);
    if (modeProp === undefined) setInternalMode(next);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap &copy; CARTO",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: MEMPHIS,
      zoom: 10.4,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    // Keep hotspots under MapLibre popups/controls (same stacking context).
    const hotspot = canvasRef.current;
    if (hotspot) {
      const canvasContainer = map.getCanvasContainer();
      canvasContainer.appendChild(hotspot);
    }

    const drawIncidents = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) => {
      const zoom = map.getZoom();
      const glowR = Math.max(10, Math.min(28, 4 + zoom * 1.6));
      const coreR = Math.max(3, glowR * 0.28);

      for (const point of pointsRef.current) {
        const { x, y } = map.project([point.lng, point.lat]);
        if (x < -40 || y < -40 || x > width + 40 || y > height + 40) continue;

        const [r, g, b] = point.group.rgb;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glow.addColorStop(0, rgba([r, g, b], 0.55));
        glow.addColorStop(0.45, rgba([r, g, b], 0.22));
        glow.addColorStop(1, rgba([r, g, b], 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, coreR, 0, Math.PI * 2);
        ctx.fillStyle = rgba([r, g, b], 0.95);
        ctx.fill();
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.stroke();
      }
    };

    const drawHeatmap = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) => {
      const zoom = map.getZoom();
      const cell = Math.max(18, Math.min(36, 42 - zoom * 1.5));
      const cols = Math.ceil(width / cell) + 1;
      const rows = Math.ceil(height / cell) + 1;
      const grid = new Float32Array(cols * rows);

      for (const point of pointsRef.current) {
        const { x, y } = map.project([point.lng, point.lat]);
        if (x < -cell || y < -cell || x > width + cell || y > height + cell) {
          continue;
        }
        const cx = Math.floor(x / cell);
        const cy = Math.floor(y / cell);
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
        grid[cy * cols + cx] += 1;
      }

      let max = 0;
      for (let i = 0; i < grid.length; i += 1) max = Math.max(max, grid[i]);
      if (max <= 0) return;

      for (let cy = 0; cy < rows; cy += 1) {
        for (let cx = 0; cx < cols; cx += 1) {
          const value = grid[cy * cols + cx];
          if (value <= 0) continue;
          const t = Math.min(1, value / max);
          const x = cx * cell + cell / 2;
          const y = cy * cell + cell / 2;
          const radius = cell * (0.55 + t * 0.7);

          // Heat ramp: cool blue -> yellow -> hot red
          const r = Math.round(40 + t * 215);
          const g = Math.round(80 + (1 - Math.abs(t - 0.55) * 1.4) * 140);
          const b = Math.round(220 * (1 - t));

          const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.2 + t * 0.55})`);
          glow.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${0.08 + t * 0.2})`);
          glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (modeRef.current === "heatmap") {
        drawHeatmap(ctx, rect.width, rect.height);
      } else {
        drawIncidents(ctx, rect.width, rect.height);
      }
    };

    const onClick = (e: { point: { x: number; y: number } }) => {
      if (modeRef.current === "heatmap") {
        popupRef.current?.remove();
        return;
      }

      const { x, y } = e.point;
      let best: Point | null = null;
      let bestDist = 18;
      for (const point of pointsRef.current) {
        const p = map.project([point.lng, point.lat]);
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < bestDist) {
          bestDist = dist;
          best = point;
        }
      }
      if (!best) {
        popupRef.current?.remove();
        return;
      }

      popupRef.current?.remove();
      popupRef.current = new Popup({
        offset: 16,
        maxWidth: "300px",
        className: "incident-map-popup",
        closeButton: true,
      })
        .setLngLat([best.lng, best.lat])
        .setHTML(
          buildIncidentPopupHtml({
            id: best.id,
            category: best.category,
            crimeType: best.crimeType,
            reportedAt: best.reportedAt,
            lat: best.lat,
            lng: best.lng,
          }),
        )
        .addTo(map);
    };

    map.on("load", () => {
      map.resize();
      draw();
    });
    map.on("render", draw);
    map.on("click", onClick);

    const ro = new ResizeObserver(() => {
      map.resize();
      draw();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      popupRef.current?.remove();
      const hotspotCanvas = canvasRef.current;
      const shell = containerRef.current?.parentElement;
      if (hotspotCanvas && shell && hotspotCanvas.parentElement !== shell) {
        shell.appendChild(hotspotCanvas);
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.triggerRepaint();
  }, [incidents, mode]);

  let overlay: string | null = null;
  if (loading) overlay = "Loading incidents…";
  else if (error) overlay = error;
  else if (incidents.length === 0) overlay = "No incidents for these filters.";

  return (
    <section className="map-shell" aria-label="Crime map">
      <div ref={containerRef} className="maplibre-map" />
      <canvas ref={canvasRef} className="map-hotspot-canvas" aria-hidden />

      {!overlay && mode === "incidents" ? (
        <div className="map-legend" aria-label="Crime category legend">
          {CRIME_GROUPS.map((group) => (
            <div key={group.id} className="map-legend-item">
              <span
                className="map-legend-swatch"
                style={{ background: group.color }}
              />
              <span>{group.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {!overlay && showViewToggle ? (
        <div className="map-view-toggle" role="group" aria-label="Map display">
          <button
            type="button"
            className={mode === "incidents" ? "is-active" : undefined}
            onClick={() => setMode("incidents")}
          >
            <span className="map-toggle-dot" aria-hidden />
            Incidents
          </button>
          <button
            type="button"
            className={mode === "heatmap" ? "is-active" : undefined}
            onClick={() => setMode("heatmap")}
          >
            <span className="map-toggle-heat" aria-hidden />
            Heatmap
          </button>
        </div>
      ) : null}

      {overlay ? <div className="map-overlay-msg">{overlay}</div> : null}
    </section>
  );
}

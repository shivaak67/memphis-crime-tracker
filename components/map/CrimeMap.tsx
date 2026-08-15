"use client";

import { useEffect, useRef } from "react";
import { Map, NavigationControl, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Incident } from "@/lib/types";

/**
 * Memphis incident map.
 * Basemap: MapLibre + CARTO. Hotspots: canvas overlay (avoids MapLibre
 * GeoJSON worker issues under Next.js that left the map empty).
 */

const MEMPHIS: [number, number] = [-90.049, 35.1495];

type Props = {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
};

type Point = {
  id: string;
  category: string;
  crimeType: string;
  reportedAt: string;
  lng: number;
  lat: number;
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
    });
  }
  return points;
}

export function CrimeMap({ incidents, loading, error }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const pointsRef = useRef<Point[]>([]);
  pointsRef.current = toPoints(incidents);

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

      const zoom = map.getZoom();
      const glowR = Math.max(10, Math.min(28, 4 + zoom * 1.6));
      const coreR = Math.max(3, glowR * 0.28);

      for (const point of pointsRef.current) {
        const { x, y } = map.project([point.lng, point.lat]);
        if (x < -40 || y < -40 || x > rect.width + 40 || y > rect.height + 40) {
          continue;
        }

        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glow.addColorStop(0, "rgba(255, 59, 59, 0.55)");
        glow.addColorStop(0.45, "rgba(255, 59, 59, 0.22)");
        glow.addColorStop(1, "rgba(255, 59, 59, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, coreR, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 120, 120, 0.95)";
        ctx.fill();
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.stroke();
      }
    };

    const onClick = (e: { point: { x: number; y: number } }) => {
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

      const reportedAt = best.reportedAt
        ? new Date(best.reportedAt).toLocaleString()
        : "";
      popupRef.current?.remove();
      popupRef.current = new Popup({ offset: 12 })
        .setLngLat([best.lng, best.lat])
        .setHTML(
          `<strong>${best.category}</strong><br/>${best.crimeType}<br/><span>${reportedAt}</span>`,
        )
        .addTo(map);
    };

    map.on("load", () => {
      map.resize();
      draw();
    });
    map.on("render", draw);
    map.on("click", onClick);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = "pointer";
    }

    const ro = new ResizeObserver(() => {
      map.resize();
      draw();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Trigger a redraw when incident data changes.
    const map = mapRef.current;
    if (!map) return;
    map.triggerRepaint();
  }, [incidents]);

  let overlay: string | null = null;
  if (loading) overlay = "Loading incidents…";
  else if (error) overlay = error;
  else if (incidents.length === 0) overlay = "No incidents for these filters.";

  return (
    <section className="map-shell" aria-label="Crime map">
      <div ref={containerRef} className="maplibre-map" />
      <canvas ref={canvasRef} className="map-hotspot-canvas" aria-hidden />
      {overlay ? <div className="map-overlay-msg">{overlay}</div> : null}
    </section>
  );
}

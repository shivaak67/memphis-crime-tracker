"use client";

import { useEffect, useRef } from "react";
import {
  Map,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Incident } from "@/lib/types";

/**
 * Interactive Memphis incident map (MapLibre GL).
 */

const MEMPHIS: [number, number] = [-90.049, 35.1495];

type Props = {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
};

function toGeoJson(incidents: Incident[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: incidents.map((incident) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [incident.lng, incident.lat],
      },
      properties: {
        id: incident.id,
        category: incident.category ?? "Unknown",
        crimeType: incident.crimeType ?? "",
        reportedAt: incident.reportedAt,
      },
    })),
  };
}

export function CrimeMap({ incidents, loading, error }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

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
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: MEMPHIS,
      zoom: 10.4,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const ensureSource = () => {
      if (map.getSource("incidents")) return;

      map.addSource("incidents", {
        type: "geojson",
        data: toGeoJson(incidentsRef.current),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 42,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "incidents",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#e0a045",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            25,
            22,
            100,
            30,
          ],
          "circle-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "incidents",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
        },
        paint: {
          "text-color": "#0c1218",
        },
      });

      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: "incidents",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#7eb6ff",
          "circle-radius": 5,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#0c1218",
        },
      });
    };

    map.on("load", () => {
      ensureSource();
      const source = map.getSource("incidents") as GeoJSONSource;
      source.setData(toGeoJson(incidentsRef.current));
    });

    map.on("click", "clusters", async (e: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["clusters"],
      });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource("incidents") as GeoJSONSource;
      if (clusterId == null) return;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      const coordinates = (features[0].geometry as GeoJSON.Point)
        .coordinates as [number, number];
      map.easeTo({ center: coordinates, zoom });
    });

    map.on("click", "unclustered", (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
      if (!feature || feature.geometry.type !== "Point") return;
      const coordinates = [...feature.geometry.coordinates] as [
        number,
        number,
      ];
      const category = String(feature.properties?.category ?? "Unknown");
      const crimeType = String(feature.properties?.crimeType ?? "");
      const reportedAt = feature.properties?.reportedAt
        ? new Date(String(feature.properties.reportedAt)).toLocaleString()
        : "";

      popupRef.current?.remove();
      popupRef.current = new Popup({ offset: 12 })
        .setLngLat(coordinates)
        .setHTML(
          `<strong>${category}</strong><br/>${crimeType}<br/><span>${reportedAt}</span>`,
        )
        .addTo(map);
    });

    map.on("mouseenter", "clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "unclustered", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "unclustered", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (!map.getSource("incidents")) {
        // Style/source not ready yet; load handler will apply incidentsRef.
        return;
      }
      const source = map.getSource("incidents") as GeoJSONSource;
      source.setData(toGeoJson(incidents));
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [incidents]);

  let overlay: string | null = null;
  if (loading) overlay = "Loading incidents?";
  else if (error) overlay = error;
  else if (incidents.length === 0) overlay = "No incidents for these filters.";

  return (
    <section className="map-shell" aria-label="Crime map">
      <div ref={containerRef} className="maplibre-map" />
      {overlay ? <div className="map-overlay-msg">{overlay}</div> : null}
    </section>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

interface Point {
  unique_key: string;
  latitude: number;
  longitude: number;
  borough: string;
  descriptor: string;
  status: string;
  created_date: string;
  risk_band?: string;
  risk_percentile?: number;
  raw_model_score?: number;
}

interface MapProps {
  points: Point[];
  onSelectPoint: (uniqueKey: string) => void;
  viewMode: "risk" | "volume";
}

export function MapComponent({ points, onSelectPoint, viewMode }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [40.7128, -74.006], // NYC Center
        zoom: 11,
        minZoom: 10,
        maxZoom: 18,
      });

      // OpenStreetMap tiles with attribution
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when points or viewMode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    points.forEach((pt) => {
      if (!pt.latitude || !pt.longitude) return;

      let color = "#4F46E5"; // Default primary indigo
      let fillColor = "#4F46E5";
      let radius = 5;

      if (viewMode === "risk") {
        if (pt.risk_band?.includes("High")) {
          color = "#EF4444"; // Red
          fillColor = "#EF4444";
          radius = 7;
        } else if (pt.risk_band?.includes("Elevated")) {
          color = "#F59E0B"; // Amber
          fillColor = "#F59E0B";
          radius = 6;
        } else {
          color = "#0D9488"; // Teal
          fillColor = "#0D9488";
          radius = 4;
        }
      } else {
        color = pt.status === "Closed" ? "#64748B" : "#4F46E5";
        fillColor = color;
      }

      const marker = L.circleMarker([pt.latitude, pt.longitude], {
        radius,
        color,
        fillColor,
        fillOpacity: 0.75,
        weight: 1.5,
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 180px; padding: 2px;">
          <div style="font-weight: 700; color: #0F172A; font-family: monospace;">#${pt.unique_key}</div>
          <div style="color: #475569; font-size: 11px; margin-top: 2px;">${pt.descriptor || "Pothole"}</div>
          <div style="color: #64748B; font-size: 10px;">${pt.borough} · Status: <b>${pt.status}</b></div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #E2E8F0; font-size: 11px;">
            <b>${pt.risk_band || "Unscored"}</b>
            ${pt.risk_percentile ? `(${Math.round(pt.risk_percentile * 100)}th %ile)` : ""}
          </div>
          <button id="btn-inspect-${pt.unique_key}" style="margin-top: 6px; width: 100%; background: #4F46E5; color: white; border: none; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
            Inspect Record →
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-inspect-${pt.unique_key}`);
        if (btn) {
          btn.onclick = () => {
            onSelectPoint(pt.unique_key);
          };
        }
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [points, viewMode, onSelectPoint]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[520px] rounded-2xl shadow-inner" />;
}

"use client";

import React from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import * as HeatmapLayer from 'react-leaflet-heatmap-layer-v3';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface ReactLeafletHeatmapProps {
  incidents?: any[];
  height?: string;
}

// Component to fit bounds to points
function FitBoundsToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  
  React.useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, points]);

  return null;
}

export function ReactLeafletHeatmap({ incidents = [], height = '600px' }: ReactLeafletHeatmapProps) {
  // Prepare points data
  const points = incidents
    .filter(inc => inc.latitude && inc.longitude)
    .map(inc => ({
      lat: inc.latitude,
      lng: inc.longitude,
      count: inc.severity === 'critical' ? 3 : 
             inc.severity === 'high' ? 2 : 
             inc.severity === 'medium' ? 1 : 0.5
    }));

  const center: [number, number] = points.length > 0 
    ? [points[0].lat, points[0].lng] 
    : [9.0820, 8.6753]; // Default to Nigeria center

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incident Heatmap</CardTitle>
        <CardDescription>
          {points.length} incidents with coordinates • Heatmap intensity based on severity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <MapContainer
            center={center}
            zoom={6}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {points.length > 0 && (
              <>
                <HeatmapLayer
                  fitBoundsOnLoad
                  fitBoundsOnUpdate
                  points={points}
                  longitudeExtractor={(p: any) => p.lng}
                  latitudeExtractor={(p: any) => p.lat}
                  intensityExtractor={(p: any) => p.count}
                  radius={20}
                  blur={15}
                  max={3.0}
                  gradient={{
                    0.2: 'blue',
                    0.4: 'cyan',
                    0.6: 'lime',
                    0.8: 'yellow',
                    1.0: 'red'
                  }}
                />
                <FitBoundsToPoints points={points.map(p => [p.lat, p.lng])} />
              </>
            )}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
// components/admin/shared/PollingUnitsMap.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
// @ts-ignore: side-effect import for Mapbox GL CSS without type declarations
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Map as MapIcon, Satellite, Layers, Loader2, RefreshCw, Users, MapPin } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const MAP_STYLES = {
  street: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  terrain: 'mapbox://styles/mapbox/outdoors-v12'
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

export interface MapPollingUnit {
  id: string;
  name: string;
  code?: string;
  registeredVoters?: number;
  agentName?: string;
  agentStatus?: 'Online' | 'Offline' | 'Unassigned';
  location?: { latitude: number; longitude: number } | null;
  wardName?: string;
  zoneName?: string;
  resultStatus?: string;
}

export interface MapAgent {
  id: string;
  name: string;
  pollingUnitName?: string;
  wardName?: string;
  zoneName?: string;
  status?: string;
  lastActive?: string;
  lastKnownLocation?: { latitude: number; longitude: number } | null;
}

interface PollingUnitsMapProps {
  pollingUnits: MapPollingUnit[];
  agents?: MapAgent[];
  height?: string;
  role?: 'ward' | 'zone' | 'state' | 'lga' | 'situation' | 'system';
  showAgents?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function hasCoords(
  loc?: { latitude: number; longitude: number } | null
): loc is { latitude: number; longitude: number } {
  return !!loc && !isNaN(loc.latitude) && !isNaN(loc.longitude) && (loc.latitude !== 0 || loc.longitude !== 0);
}

export function PollingUnitsMap({
  pollingUnits,
  agents = [],
  height = '600px',
  role = 'ward',
  showAgents = true,
  onRefresh,
  refreshing = false,
}: PollingUnitsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>('satellite');
  const [showUnits, setShowUnits] = useState(true);
  const [showAgentLayer, setShowAgentLayer] = useState(showAgents);
  const [onlineOnly, setOnlineOnly] = useState(false);

  const unitsWithCoords = pollingUnits.filter(u => hasCoords(u.location));
  const agentsWithCoords = agents.filter(a => hasCoords(a.lastKnownLocation));

  const visibleAgents = onlineOnly
    ? agentsWithCoords.filter(a => (a.status || '').toLowerCase() === 'online')
    : agentsWithCoords;

  const clearMarkers = useCallback(() => {
    markers.current.forEach(m => m.remove());
    markers.current = [];
  }, []);

  const addMarkers = useCallback(() => {
    if (!map.current) return;
    clearMarkers();

    if (showUnits) {
      unitsWithCoords.forEach(unit => {
        const { latitude: lat, longitude: lng } = unit.location!;
        const online = unit.agentStatus === 'Online';
        const agentColor = online ? '#16a34a' : unit.agentStatus === 'Unassigned' ? '#9ca3af' : '#6b7280';

        const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(`
          <div style="padding:10px; min-width:220px; max-width:300px;">
            <h3 style="font-weight:bold; margin-bottom:6px; color:#111;">${unit.name}</h3>
            <div style="font-size:12px; color:#555; border-top:1px solid #e5e7eb; padding-top:6px;">
              ${unit.code ? `<div><strong>Code:</strong> ${unit.code}</div>` : ''}
              ${unit.wardName ? `<div><strong>Ward:</strong> ${unit.wardName}</div>` : ''}
              ${unit.zoneName ? `<div><strong>Zone:</strong> ${unit.zoneName}</div>` : ''}
              ${typeof unit.registeredVoters === 'number' ? `<div><strong>Registered voters:</strong> ${unit.registeredVoters.toLocaleString()}</div>` : ''}
              <div><strong>Agent:</strong> ${unit.agentName || 'Unassigned'}</div>
              <div><strong>Agent status:</strong> <span style="color:${agentColor}">${unit.agentStatus || 'Offline'}</span></div>
              ${unit.resultStatus ? `<div><strong>Result:</strong> ${unit.resultStatus}</div>` : ''}
            </div>
          </div>
        `);

        const el = document.createElement('div');
        el.style.backgroundColor = '#2563eb';
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);
        markers.current.push(marker);
      });
    }

    if (showAgentLayer) {
      visibleAgents.forEach(agent => {
        const { latitude: lat, longitude: lng } = agent.lastKnownLocation!;
        const online = (agent.status || '').toLowerCase() === 'online';
        const color = online ? '#16a34a' : '#f97316';

        const popup = new mapboxgl.Popup({ offset: 22 }).setHTML(`
          <div style="padding:10px; min-width:200px; max-width:280px;">
            <h3 style="font-weight:bold; margin-bottom:6px; color:#111;">${agent.name}</h3>
            <div style="font-size:12px; color:#555; border-top:1px solid #e5e7eb; padding-top:6px;">
              <div><strong>Status:</strong> <span style="color:${color}">${agent.status || 'Offline'}</span></div>
              ${agent.pollingUnitName ? `<div><strong>Polling Unit:</strong> ${agent.pollingUnitName}</div>` : ''}
              ${agent.wardName ? `<div><strong>Ward:</strong> ${agent.wardName}</div>` : ''}
              ${agent.lastActive ? `<div><strong>Last active:</strong> ${agent.lastActive}</div>` : ''}
            </div>
          </div>
        `);

        const el = document.createElement('div');
        el.style.backgroundColor = color;
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50% 50% 50% 0';
        el.style.transform = 'rotate(-45deg)';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 3px 6px rgba(0,0,0,0.35)';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker(el, { anchor: 'bottom' })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);
        markers.current.push(marker);
      });
    }

    const allPoints: [number, number][] = [
      ...(showUnits ? unitsWithCoords.map(u => [u.location!.longitude, u.location!.latitude] as [number, number]) : []),
      ...(showAgentLayer ? visibleAgents.map(a => [a.lastKnownLocation!.longitude, a.lastKnownLocation!.latitude] as [number, number]) : []),
    ];

    if (allPoints.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      allPoints.forEach(p => bounds.extend(p));
      map.current.fitBounds(bounds, { padding: 70, maxZoom: 15 });
    } else if (allPoints.length === 1) {
      map.current.flyTo({ center: allPoints[0], zoom: 15, essential: true });
    }
  }, [showUnits, showAgentLayer, visibleAgents, unitsWithCoords, clearMarkers]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !MAPBOX_TOKEN) {
      if (!MAPBOX_TOKEN) {
        console.warn('Mapbox token is missing (NEXT_PUBLIC_MAPBOX_TOKEN)');
      }
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[currentStyle],
      center: [7.0304, 5.4833],
      zoom: 11,
    });

    map.current = mapInstance;

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapInstance.on('load', () => {
      setMapReady(true);
    });

    return () => {
      clearMarkers();
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  // Draw markers once the map is ready and whenever the visible set changes
  useEffect(() => {
    if (!map.current || !mapReady) return;
    addMarkers();
  }, [mapReady, addMarkers]);

  const handleStyleChange = (style: MapStyleKey) => {
    if (!map.current) return;
    setCurrentStyle(style);
    map.current.setStyle(MAP_STYLES[style]);
    map.current.once('idle', addMarkers);
  };

  const totalOnMap = (showUnits ? unitsWithCoords.length : 0) + (showAgentLayer ? visibleAgents.length : 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Polling Unit &amp; Agent Map</CardTitle>
            <CardDescription>
              {`${unitsWithCoords.length} polling units · ${agentsWithCoords.length} agents with location`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{totalOnMap} on map</Badge>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing} className="gap-1">
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="sr-only md:not-sr-only md:inline-block">Refresh</span>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(['street', 'satellite', 'terrain', 'dark'] as MapStyleKey[]).map(s => (
              <Button
                key={s}
                variant={currentStyle === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStyleChange(s)}
              >
                {s === 'street' && <MapIcon className="mr-1 h-4 w-4" />}
                {s === 'satellite' && <Satellite className="mr-1 h-4 w-4" />}
                {s === 'terrain' && <Layers className="mr-1 h-4 w-4" />}
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Layers:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnits(v => !v)}
              className={showUnits ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
            >
              <span className="w-2 h-2 rounded-full mr-1.5 inline-block bg-blue-600" />
              Polling Units ({unitsWithCoords.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAgentLayer(v => !v)}
              className={showAgentLayer ? 'ring-2 ring-orange-500 bg-orange-50' : ''}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Agents ({agentsWithCoords.length})
            </Button>
            {showAgentLayer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOnlineOnly(v => !v)}
                className={onlineOnly ? 'ring-2 ring-green-500 bg-green-50' : ''}
              >
                <span className="w-2 h-2 rounded-full mr-1.5 inline-block bg-green-600" />
                Online only
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative" style={{ height }}>
        {!MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-center p-4 max-w-md">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">Map unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">
                Mapbox token is not configured. Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
              </p>
            </div>
          </div>
        )}
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        {MAPBOX_TOKEN && totalOnMap === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 pointer-events-none">
            <div className="text-center p-4">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {pollingUnits.length === 0
                  ? 'No polling units to display'
                  : 'No polling units or agents with coordinates to display'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PollingUnitsMap;

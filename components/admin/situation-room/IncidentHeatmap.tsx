"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
// @ts-ignore: side-effect import for Mapbox GL CSS without type declarations
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Map as MapIcon, Satellite, Layers, Loader2, RefreshCw } from 'lucide-react';
import { incidentsApi, Incident, extractCoordinates, hasValidCoordinates, filterIncidentsWithCoordinates } from '@/lib/api/incidents';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

console.log('Mapbox token exists:', !!MAPBOX_TOKEN);

const MAP_STYLES = {
  street: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  terrain: 'mapbox://styles/mapbox/outdoors-v12'
};

interface IncidentHeatmapProps {
  incidents?: Incident[];
  height?: string;
  showControls?: boolean;
  wardId?: string;
  zoneId?: string;
  role?: string;
  autoFetch?: boolean;
  center?: [number, number];
  zoom?: number;
  useMapEndpoint?: boolean; // New prop to use the map-specific endpoint
  onError?: (error: string) => void;
}

export function IncidentHeatmap({
  incidents: initialIncidents,
  height = '600px',
  showControls = true,
  wardId,
  zoneId,
  role,
  autoFetch = true,
  center = [7.0304, 5.4833],
  zoom = 13,
  useMapEndpoint = true, // Default to using the map endpoint
  onError
}: IncidentHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<keyof typeof MAP_STYLES>('satellite');
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalIncidents, setTotalIncidents] = useState(0);

  // Initialize with provided incidents if available
  useEffect(() => {
    if (initialIncidents && initialIncidents.length > 0) {
      setIncidents(initialIncidents);
      setTotalIncidents(initialIncidents.length);
    }
  }, [initialIncidents]);

  // Fetch incidents from API
  const fetchIncidents = useCallback(async () => {
    if (!autoFetch) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      // Use the appropriate endpoint based on props
      if (wardId) {
        console.log('📡 Fetching incidents for ward:', wardId);
        // Use the ward-specific endpoint with coordinates
        response = await incidentsApi.getWardIncidents(wardId);
      } else if (zoneId) {
        console.log('📡 Fetching incidents for zone:', zoneId);
        // Use the zone-specific endpoint with coordinates
        response = await incidentsApi.getZoneIncidents(zoneId);
      } else if (role) {
        console.log('📡 Fetching incidents for role:', role);
        response = await incidentsApi.getIncidents(role);
      } else if (useMapEndpoint) {
        // ✅ Use the dedicated map endpoint that returns incidents with coordinates
        console.log('📡 Fetching incidents with coordinates for map...');
        response = await incidentsApi.getIncidentsForMap();
      } else {
        // Fallback to legacy endpoint
        console.log('📡 Fetching all incidents (legacy)...');
        try {
          response = await incidentsApi.getAllIncidents();
        } catch (err) {
          console.warn('getAllIncidents failed, trying getIncidents without role...');
          response = await incidentsApi.getIncidents();
        }
      }
      
      if (response && response.success && response.incidents) {
        setIncidents(response.incidents);
        setTotalIncidents(response.total || response.incidents.length);
        setError(null);
        
        // Log coordinate statistics
        const withCoords = response.incidents.filter(hasValidCoordinates).length;
        console.log(`📍 ${withCoords}/${response.incidents.length} incidents have coordinates`);
        
        if (response.incidents.length === 0) {
          setError('No incidents found');
        } else if (withCoords === 0) {
          setError('No incidents with coordinates found');
        }
      } else if (response && !response.success && response.error) {
        // Handle API error response
        setError(response.error);
        onError?.(response.error);
      } else {
        setError('Unable to load incident data');
      }
    } catch (err: any) {
      console.error('❌ API fetch failed:', err);
      
      // Handle specific error messages from the API
      let errorMessage = 'Failed to load incidents';
      if (err?.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in.';
      } else if (err?.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view incidents.';
      } else if (err?.response?.status === 404) {
        errorMessage = 'Incident endpoint not found. Please check your API configuration.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [wardId, zoneId, role, autoFetch, useMapEndpoint, onError]);

  // Fetch on mount
  useEffect(() => {
    if (autoFetch && incidents.length === 0) {
      fetchIncidents();
    }
  }, [autoFetch, fetchIncidents, incidents.length]);

  // Filter incidents by severity
  const filteredIncidents = selectedSeverity.length === 0
    ? incidents
    : incidents.filter(inc => 
        inc?.severity && selectedSeverity.includes(inc.severity.toLowerCase())
      );

  // Get incidents with valid coordinates using the extractCoordinates helper
  const incidentsWithCoordinates = filteredIncidents.filter(inc => {
    const { lat, lng } = extractCoordinates(inc);
    return lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
  });

  // Get severity color
  const getSeverityColor = (severity: string) => {
    const s = severity?.toLowerCase() || '';
    return s === 'critical' ? '#ef4444' : 
           s === 'high' ? '#f97316' : 
           s === 'medium' ? '#eab308' : 
           s === 'low' ? '#3b82f6' : '#6b7280';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    return s === 'resolved' ? '#22c55e' :
           s === 'investigating' ? '#eab308' :
           s === 'pending' ? '#ef4444' : '#6b7280';
  };

  // Add markers to map
  const addMarkers = useCallback(() => {
    if (!map.current) return;

    // Remove existing markers and popups
    document.querySelectorAll('.mapboxgl-marker').forEach(m => m.remove());
    document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove());

    if (incidentsWithCoordinates.length === 0) {
      return;
    }

    incidentsWithCoordinates.forEach(inc => {
      const { lat, lng } = extractCoordinates(inc);
      if (lat === null || lng === null) return;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding:10px; min-width:220px; max-width:300px;">
          <h3 style="font-weight:bold; margin-bottom:6px; color:#111;">${inc.type || 'Incident'}</h3>
          <p style="font-size:13px; margin-bottom:8px; color:#333;">${inc.description || inc.pollingUnitName || 'No description'}</p>
          <div style="font-size:12px; color:#555; border-top:1px solid #e5e7eb; padding-top:6px;">
            <div><strong>Severity:</strong> <span style="color:${getSeverityColor(inc.severity)}">${inc.severity || 'Unknown'}</span></div>
            <div><strong>Status:</strong> <span style="color:${getStatusColor(inc.status)}">${inc.status || 'Unknown'}</span></div>
            ${inc.pollingUnitName ? `<div><strong>Polling Unit:</strong> ${inc.pollingUnitName}</div>` : ''}
            ${inc.wardName ? `<div><strong>Ward:</strong> ${inc.wardName}</div>` : ''}
            ${inc.zoneName ? `<div><strong>Zone:</strong> ${inc.zoneName}</div>` : ''}
            ${inc.reporterName ? `<div><strong>Reported by:</strong> ${inc.reporterName}</div>` : ''}
            ${inc.time ? `<div><strong>Time:</strong> ${new Date(inc.time).toLocaleString()}</div>` : ''}
          </div>
        </div>
      `);

      const color = getSeverityColor(inc.severity);

      const el = document.createElement('div');
      el.style.backgroundColor = color;
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      
      // Add status indicator ring
      if (inc.status?.toLowerCase() === 'resolved') {
        el.style.outline = '2px solid #22c55e';
        el.style.outlineOffset = '2px';
      }

      new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Fit bounds to show all markers
    if (incidentsWithCoordinates.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      incidentsWithCoordinates.forEach(inc => {
        const { lat, lng } = extractCoordinates(inc);
        if (lat !== null && lng !== null) {
          bounds.extend([lng, lat]);
        }
      });
      map.current.fitBounds(bounds, { padding: 70, maxZoom: 15 });
    } else if (incidentsWithCoordinates.length === 1) {
      const inc = incidentsWithCoordinates[0];
      const { lat, lng } = extractCoordinates(inc);
      if (lat !== null && lng !== null) {
        map.current.flyTo({
          center: [lng, lat],
          zoom: 14,
          essential: true
        });
      }
    }
  }, [incidentsWithCoordinates]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !MAPBOX_TOKEN) {
      if (!MAPBOX_TOKEN) {
        console.warn('Mapbox token is missing');
      }
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[currentStyle],
      center: center,
      zoom: zoom,
    });

    map.current = mapInstance;

    mapInstance.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    mapInstance.on("load", () => {
      setMapReady(true);
      addMarkers();
    });

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current || !mapReady) return;
    addMarkers();
  }, [incidentsWithCoordinates, mapReady, addMarkers]);

  // Handle style change
  const handleStyleChange = (style: keyof typeof MAP_STYLES) => {
    if (!map.current) return;

    setCurrentStyle(style);
    setLoading(true);

    map.current.setStyle(MAP_STYLES[style]);

    map.current.once("idle", () => {
      addMarkers();
      setLoading(false);
    });
  };

  // Toggle severity filter
  const toggleSeverityFilter = (severity: string) => {
    setSelectedSeverity(prev => 
      prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
    );
  };

  // Refresh data
  const handleRefresh = () => {
    // Clear incidents to trigger refetch
    setIncidents([]);
    fetchIncidents();
  };

  // Get unique severity levels from data
  const severityLevels = Array.from(
    new Set(incidents.map(i => i.severity?.toLowerCase()).filter(Boolean))
  );

  // Count incidents by severity
  const getSeverityCount = (severity: string) => {
    return incidents.filter(i => i.severity?.toLowerCase() === severity).length;
  };

  // Get error type for display
  const getErrorType = (errorMessage: string) => {
    if (errorMessage.includes('Authentication') || errorMessage.includes('login')) {
      return 'auth';
    }
    if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
      return 'forbidden';
    }
    if (errorMessage.includes('endpoint') || errorMessage.includes('404')) {
      return 'notfound';
    }
    return 'generic';
  };

  const errorType = error ? getErrorType(error) : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Incident Map</CardTitle>
            <CardDescription>
              {loading ? 'Loading incidents...' : 
               `${totalIncidents || incidents.length} incidents from ${wardId ? 'Ward' : zoneId ? 'Zone' : 'all locations'}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <Badge variant="secondary">
                {incidentsWithCoordinates.length} {incidentsWithCoordinates.length === 1 ? 'incident' : 'incidents'} on map
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="gap-1"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only md:not-sr-only md:inline-block">
                {loading ? 'Loading...' : 'Refresh'}
              </span>
            </Button>
          </div>
        </div>

        {error && (
          <div className={`mt-2 p-3 rounded-md flex items-start gap-2 text-sm ${
            errorType === 'auth' ? 'bg-red-50 border border-red-200 text-red-700' :
            errorType === 'forbidden' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
            errorType === 'notfound' ? 'bg-orange-50 border border-orange-200 text-orange-700' :
            'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
              {errorType === 'auth' && (
                <p className="text-xs mt-1 opacity-75">Please log in to view incidents</p>
              )}
              {errorType === 'forbidden' && (
                <p className="text-xs mt-1 opacity-75">Contact your administrator for access</p>
              )}
              {errorType === 'notfound' && (
                <p className="text-xs mt-1 opacity-75">Please check your API configuration</p>
              )}
            </div>
          </div>
        )}

        {incidentsWithCoordinates.length === 0 && !loading && incidents.length > 0 && !error && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2 text-blue-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Incidents found but no coordinates available to display on map</span>
          </div>
        )}

        {showControls && (
          <div className="mt-4 space-y-3">
            {/* Style Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {['street', 'satellite', 'terrain', 'dark'].map(s => (
                <Button
                  key={s}
                  variant={currentStyle === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange(s as keyof typeof MAP_STYLES)}
                >
                  {s === 'street' && <MapIcon className="mr-1 h-4 w-4" />}
                  {s === 'satellite' && <Satellite className="mr-1 h-4 w-4" />}
                  {s === 'terrain' && <Layers className="mr-1 h-4 w-4" />}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>

            {/* Severity Filters */}
            {severityLevels.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Filter by severity:</span>
                {severityLevels.map(sev => {
                  const count = getSeverityCount(sev);
                  if (count === 0) return null;
                  return (
                    <Button
                      key={sev}
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSeverityFilter(sev)}
                      className={selectedSeverity.includes(sev) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                    >
                      <span 
                        className="w-2 h-2 rounded-full mr-1.5 inline-block"
                        style={{ backgroundColor: getSeverityColor(sev) }}
                      />
                      {sev.charAt(0).toUpperCase() + sev.slice(1)} ({count})
                    </Button>
                  );
                })}
                {selectedSeverity.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedSeverity([])}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-sm text-muted-foreground">Loading incidents...</span>
            </div>
          </div>
        )}
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        {!loading && incidentsWithCoordinates.length === 0 && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 pointer-events-none">
            <div className="text-center p-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {incidents.length === 0 ? 'No incidents to display' : 'No incidents with coordinates to display'}
              </p>
              {selectedSeverity.length > 0 && (
                <p className="text-sm text-muted-foreground">Try clearing the severity filters</p>
              )}
            </div>
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 pointer-events-none">
            <div className="text-center p-4 max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">Unable to load map data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
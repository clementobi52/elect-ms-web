"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Map as MapIcon, 
  Satellite, 
  Layers, 
  Crosshair, 
  Maximize2, 
  Minimize2,
  ZoomIn,
  ZoomOut,
  Home,
  Filter
} from 'lucide-react';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SimpleLeafletHeatmapProps {
  incidents?: any[];
  height?: string;
  showControls?: boolean;
  showLegend?: boolean;
  center?: [number, number];
  zoom?: number;
}

export function SimpleLeafletHeatmap({ 
  incidents = [], 
  height = '600px',
  showControls = true,
  showLegend = true,
  center = [9.0820, 8.6753],
  zoom = 6
}: SimpleLeafletHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentBaseMap, setCurrentBaseMap] = useState<string>('street');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<any[]>([]);

  // Filter incidents based on selected severity
  useEffect(() => {
    if (selectedSeverity.length === 0) {
      setFilteredIncidents(incidents);
    } else {
      setFilteredIncidents(
        incidents.filter(inc => 
          inc?.severity && selectedSeverity.includes(inc.severity.toLowerCase())
        )
      );
    }
  }, [incidents, selectedSeverity]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    try {
      // Initialize map
      const map = L.map(mapContainer.current, {
        center,
        zoom,
        zoomControl: false
      });
      mapRef.current = map;

      // Add street layer by default (most reliable)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Add scale control
      L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

      // Create a layer group for markers
      const markerLayer = L.layerGroup().addTo(map);
      markerLayerRef.current = markerLayer;

      // Mark map as ready
      setMapReady(true);

      // Handle map load
      map.whenReady(() => {
        console.log('Map is ready');
      });

      // Handle fullscreen change
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);

      // Cleanup on unmount
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        map.remove();
        mapRef.current = null;
        markerLayerRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [center, zoom]);

  // Handle base map change
  const handleBaseMapChange = (mapType: string) => {
    if (!mapRef.current) return;

    // Remove all tile layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add the selected tile layer
    switch (mapType) {
      case 'street':
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(mapRef.current);
        break;
      case 'satellite':
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri',
          maxZoom: 19
        }).addTo(mapRef.current);
        break;
      case 'terrain':
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap contributors',
          maxZoom: 17
        }).addTo(mapRef.current);
        break;
      case 'dark':
        L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
          attribution: '© Stadia Maps',
          maxZoom: 20
        }).addTo(mapRef.current);
        break;
    }

    setCurrentBaseMap(mapType);
  };

  // Update markers when filtered incidents change or map becomes ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || !markerLayerRef.current) return;

    try {
      // Clear existing markers
      markerLayerRef.current.clearLayers();

      // Filter incidents with valid coordinates
      const incidentsWithCoords = filteredIncidents.filter(
        inc => inc && 
        typeof inc.latitude === 'number' && 
        typeof inc.longitude === 'number' &&
        !isNaN(inc.latitude) && 
        !isNaN(inc.longitude) &&
        inc.latitude >= -90 && inc.latitude <= 90 &&
        inc.longitude >= -180 && inc.longitude <= 180
      );

      if (incidentsWithCoords.length === 0) return;

      // Add markers for each incident
      incidentsWithCoords.forEach(inc => {
        const severity = (inc.severity || 'medium').toLowerCase();
        
        // Determine marker color based on severity
        const markerColor = 
          severity === 'critical' ? '#ef4444' :
          severity === 'high' ? '#f97316' :
          severity === 'medium' ? '#eab308' : '#3b82f6';

        // Determine marker size based on severity
        const markerSize = 
          severity === 'critical' ? 10 :
          severity === 'high' ? 8 :
          severity === 'medium' ? 6 : 4;

        // Create circle marker
        const marker = L.circleMarker([inc.latitude, inc.longitude], {
          radius: markerSize,
          fillColor: markerColor,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        // Add popup with incident details
        marker.bindPopup(`
          <div style="padding: 12px; min-width: 250px; max-width: 300px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h3 style="font-weight: bold; font-size: 16px; margin: 0;">
                ${inc.type || 'Incident'}
              </h3>
              <span style="background: ${markerColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
                ${inc.severity || 'Unknown'}
              </span>
            </div>
            
            <p style="font-size: 13px; margin: 8px 0; color: #374151; line-height: 1.5;">
              ${inc.description || 'No description provided'}
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; background: #f9fafb; padding: 8px; border-radius: 6px;">
              <div>
                <span style="font-size: 11px; color: #6b7280; display: block;">Status</span>
                <span style="font-size: 13px; font-weight: 500; text-transform: capitalize;">${inc.status || 'pending'}</span>
              </div>
              <div>
                <span style="font-size: 11px; color: #6b7280; display: block;">Reported</span>
                <span style="font-size: 13px; font-weight: 500;">${inc.time || 'Unknown'}</span>
              </div>
            </div>

            <div style="margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 11px; color: #6b7280; min-width: 40px;">Zone:</span>
                <span style="font-size: 12px; font-weight: 500;">${inc.zone || 'Unknown'}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 11px; color: #6b7280; min-width: 40px;">Ward:</span>
                <span style="font-size: 12px; font-weight: 500;">${inc.ward || 'Unknown'}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; color: #6b7280; min-width: 40px;">PU:</span>
                <span style="font-size: 12px; font-weight: 500;">${inc.pollingUnit || 'Unknown'}</span>
              </div>
            </div>

            ${inc.images && inc.images.length > 0 ? `
              <div style="margin-top: 12px;">
                <img src="${inc.images[0]}" alt="Incident" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;" />
                ${inc.images.length > 1 ? `<span style="font-size: 11px; color: #6b7280; display: block; margin-top: 4px;">+${inc.images.length - 1} more images</span>` : ''}
              </div>
            ` : ''}

            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button 
                onclick="window.open('/admin/incidents/${inc.id}', '_blank')"
                style="flex: 1; background: #3b82f6; color: white; border: none; padding: 6px; border-radius: 4px; font-size: 12px; cursor: pointer;"
              >
                View Details
              </button>
              <button 
                onclick="navigator.clipboard.writeText('${inc.latitude},${inc.longitude}')"
                style="background: #e5e7eb; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;"
              >
                📋 Copy
              </button>
            </div>
          </div>
        `);

        marker.addTo(markerLayerRef.current!);
      });

      // Fit bounds to show all markers
      setTimeout(() => {
        if (!mapRef.current || incidentsWithCoords.length === 0) return;
        
        try {
          if (incidentsWithCoords.length > 1) {
            const bounds = L.latLngBounds(
              incidentsWithCoords.map(inc => [inc.latitude, inc.longitude])
            );
            mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          } else if (incidentsWithCoords.length === 1) {
            mapRef.current.setView(
              [incidentsWithCoords[0].latitude, incidentsWithCoords[0].longitude], 
              12
            );
          }
        } catch (error) {
          console.error('Error fitting bounds:', error);
        }
      }, 200);

    } catch (error) {
      console.error('Error updating markers:', error);
    }
  }, [filteredIncidents, mapReady]);

  // Handle zoom controls
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  };

  const handleFullscreen = () => {
    if (!mapContainer.current) return;
    
    if (!document.fullscreenElement) {
      mapContainer.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleLocate = () => {
    if (!mapRef.current) return;
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Remove previous user marker if exists
          if (userMarkerRef.current) {
            mapRef.current?.removeLayer(userMarkerRef.current);
          }

          // Add new user location marker
          const userMarker = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#3b82f6',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(mapRef.current!);
          
          userMarker.bindPopup('Your location').openPopup();
          userMarkerRef.current = userMarker;

          // Center map on user location
          mapRef.current?.setView([latitude, longitude], 15);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Toggle severity filter
  const toggleSeverityFilter = (severity: string) => {
    setSelectedSeverity(prev => 
      prev.includes(severity)
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
  };

  // Count incidents with coordinates
  const incidentsWithCoords = incidents.filter(
    inc => inc && 
    typeof inc.latitude === 'number' && 
    typeof inc.longitude === 'number' &&
    !isNaN(inc.latitude) && 
    !isNaN(inc.longitude) &&
    inc.latitude >= -90 && inc.latitude <= 90 &&
    inc.longitude >= -180 && inc.longitude <= 180
  ).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Incident Map</CardTitle>
            <CardDescription>
              Geographic distribution of reported incidents
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {incidentsWithCoords > 0 ? (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                {incidentsWithCoords} incidents mapped
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                No location data
              </Badge>
            )}
          </div>
        </div>

        {/* Map Controls */}
        {showControls && mapReady && (
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
            <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
              <Button
                variant={currentBaseMap === 'street' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBaseMapChange('street')}
                className="h-8"
              >
                <MapIcon className="h-4 w-4 mr-1" />
                Street
              </Button>
              <Button
                variant={currentBaseMap === 'satellite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBaseMapChange('satellite')}
                className="h-8"
              >
                <Satellite className="h-4 w-4 mr-1" />
                Satellite
              </Button>
              <Button
                variant={currentBaseMap === 'terrain' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBaseMapChange('terrain')}
                className="h-8"
              >
                <Layers className="h-4 w-4 mr-1" />
                Terrain
              </Button>
              <Button
                variant={currentBaseMap === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBaseMapChange('dark')}
                className="h-8"
              >
                <Layers className="h-4 w-4 mr-1" />
                Dark
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetView} className="h-8 w-8 p-0">
                <Home className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLocate} className="h-8 w-8 p-0">
                <Crosshair className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleFullscreen} className="h-8 w-8 p-0">
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Severity Filters */}
        {showControls && mapReady && incidentsWithCoords > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filter:
            </span>
            {['critical', 'high', 'medium', 'low'].map(severity => {
              const count = incidents.filter(
                inc => inc?.severity?.toLowerCase() === severity
              ).length;
              
              if (count === 0) return null;

              const colorClass = 
                severity === 'critical' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                severity === 'high' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                severity === 'medium' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                'bg-blue-100 text-blue-800 hover:bg-blue-200';

              return (
                <Button
                  key={severity}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSeverityFilter(severity)}
                  className={`h-7 px-2 text-xs ${colorClass} ${
                    selectedSeverity.includes(severity) ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                  }`}
                >
                  {severity} ({count})
                </Button>
              );
            })}
            {selectedSeverity.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSeverity([])}
                className="h-7 px-2 text-xs bg-gray-100 hover:bg-gray-200"
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 relative">
        {incidentsWithCoords > 0 ? (
          <>
            <div 
              ref={mapContainer} 
              style={{ width: '100%', height }}
              className="rounded-b-lg"
            />
            
            {/* Loading Overlay */}
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div 
            style={{ height }} 
            className="flex items-center justify-center bg-muted rounded-b-lg"
          >
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-lg font-medium">No location data available</p>
              <p className="text-sm mt-1">Incidents need latitude and longitude coordinates to display on map</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {showLegend && incidentsWithCoords > 0 && mapReady && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg border shadow-sm">
            <h4 className="text-xs font-medium mb-2">Severity Legend</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Low</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overlay */}
        {mapReady && incidentsWithCoords > 0 && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-lg border shadow-sm">
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{incidentsWithCoords}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-red-600">Critical:</span>
                <span className="font-medium">
                  {incidents.filter(i => i?.severity === 'critical').length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-orange-600">High:</span>
                <span className="font-medium">
                  {incidents.filter(i => i?.severity === 'high').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
"use client";

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Map as MapIcon, Satellite, Layers, Crosshair, Maximize2, Minimize2, ZoomIn, ZoomOut, Home, Filter, Eye, Thermometer } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Map styles
const MAP_STYLES = {
  street: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  terrain: 'mapbox://styles/mapbox/outdoors-v12'
};

// Test data for Nigerian cities
const TEST_INCIDENTS = [
  {
    id: 'test-1',
    type: 'Violence',
    severity: 'critical',
    status: 'pending',
    description: 'Physical altercation at polling unit',
    zone: 'FCT',
    ward: 'Ward 1',
    pollingUnit: 'PU-001',
    time: '5 min ago',
    latitude: 9.0820,
    longitude: 8.6753
  },
  {
    id: 'test-2',
    type: 'Disruption',
    severity: 'high',
    status: 'investigating',
    description: 'Crowd disruption at polling unit',
    zone: 'Plateau',
    ward: 'Ward 2',
    pollingUnit: 'PU-002',
    time: '10 min ago',
    latitude: 9.8965,
    longitude: 8.8583
  },
  {
    id: 'test-3',
    type: 'Fraud',
    severity: 'medium',
    status: 'pending',
    description: 'Suspected ballot stuffing',
    zone: 'Kano',
    ward: 'Ward 3',
    pollingUnit: 'PU-003',
    time: '15 min ago',
    latitude: 12.0022,
    longitude: 8.5920
  },
  {
    id: 'test-4',
    type: 'Intimidation',
    severity: 'high',
    status: 'investigating',
    description: 'Voter intimidation reported',
    zone: 'Lagos',
    ward: 'Ward 4',
    pollingUnit: 'PU-004',
    time: '20 min ago',
    latitude: 6.5244,
    longitude: 3.3792
  },
  {
    id: 'test-5',
    type: 'Equipment Failure',
    severity: 'low',
    status: 'resolved',
    description: 'Biometric machine malfunction',
    zone: 'Rivers',
    ward: 'Ward 5',
    pollingUnit: 'PU-005',
    time: '25 min ago',
    latitude: 4.8156,
    longitude: 7.0498
  }
];

interface IncidentHeatmapProps {
  incidents?: any[];
  height?: string;
  showControls?: boolean;
}

export function IncidentHeatmap({ 
  incidents = [], 
  height = '600px',
  showControls = true
}: IncidentHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<string>('light');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([]);

  // Use test data if no incidents
  const dataToUse = incidents.length === 0 ? TEST_INCIDENTS : incidents;

  // Filter incidents based on selected severity
  const filteredIncidents = selectedSeverity.length === 0
    ? dataToUse
    : dataToUse.filter(inc => 
        inc?.severity && selectedSeverity.includes(inc.severity.toLowerCase())
      );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox token not provided');
      return;
    }

    console.log('Initializing map...');
    console.log('Map container:', mapContainer.current);
    console.log('Mapbox token:', MAPBOX_TOKEN.substring(0, 20) + '...');

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    // Create map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES.light,
      center: [8.6753, 9.0820], // Center of Nigeria
      zoom: 5,
      pitch: 0,
      bearing: 0
    });

    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Wait for map to load
    map.current.on('load', () => {
      console.log('Map loaded successfully');
      if (!map.current) return;
      
      setMapReady(true);

      // Add markers for each incident
      filteredIncidents.forEach(inc => {
        if (!inc.latitude || !inc.longitude) return;

        // Create popup HTML
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${inc.type || 'Incident'}</h3>
            <p style="font-size: 12px; margin: 4px 0;">${inc.description || ''}</p>
            <p style="font-size: 11px; color: #666;">
              Severity: ${inc.severity}<br/>
              Status: ${inc.status}<br/>
              ${inc.zone} / ${inc.ward}
            </p>
          </div>
        `);

        // Determine marker color
        const color = inc.severity === 'critical' ? '#ef4444' :
                     inc.severity === 'high' ? '#f97316' :
                     inc.severity === 'medium' ? '#eab308' : '#3b82f6';

        // Create marker element
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundColor = color;
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        // Add marker to map
        new mapboxgl.Marker(el)
          .setLngLat([inc.longitude, inc.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      });
    });

    // Handle errors
    map.current.on('error', (e) => {
      console.error('Mapbox error:', e);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array - run once

  // Update markers when filters change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    console.log('Updating markers with filtered incidents:', filteredIncidents.length);

    // Clear existing markers
    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach(marker => marker.remove());

    // Add new markers
    filteredIncidents.forEach(inc => {
      if (!inc.latitude || !inc.longitude) return;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 4px;">${inc.type || 'Incident'}</h3>
          <p style="font-size: 12px; margin: 4px 0;">${inc.description || ''}</p>
          <p style="font-size: 11px; color: #666;">
            Severity: ${inc.severity}<br/>
            Status: ${inc.status}<br/>
            ${inc.zone} / ${inc.ward}
          </p>
        </div>
      `);

      const color = inc.severity === 'critical' ? '#ef4444' :
                   inc.severity === 'high' ? '#f97316' :
                   inc.severity === 'medium' ? '#eab308' : '#3b82f6';

      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = color;
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      new mapboxgl.Marker(el)
        .setLngLat([inc.longitude, inc.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Fit bounds to show all markers
    if (filteredIncidents.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredIncidents.forEach(inc => {
        if (inc.latitude && inc.longitude) {
          bounds.extend([inc.longitude, inc.latitude]);
        }
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 });
    }

  }, [filteredIncidents, mapReady]);

  // Change map style
  const handleStyleChange = (style: string) => {
    if (!map.current) return;
    map.current.setStyle(MAP_STYLES[style as keyof typeof MAP_STYLES]);
    setCurrentStyle(style);
  };

  // Fit map to show all markers
  const handleFitBounds = () => {
    if (!map.current || !filteredIncidents.length) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    filteredIncidents.forEach(inc => {
      if (inc.latitude && inc.longitude) {
        bounds.extend([inc.longitude, inc.latitude]);
      }
    });
    map.current.fitBounds(bounds, { padding: 50 });
  };

  // Reset view to Nigeria
  const handleResetView = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: [8.6753, 9.0820],
      zoom: 5,
      essential: true
    });
  };

  // Toggle severity filter
  const toggleSeverityFilter = (severity: string) => {
    setSelectedSeverity(prev => 
      prev.includes(severity)
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
  };

  if (!MAPBOX_TOKEN) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-medium mb-2">Mapbox Token Required</h3>
            <p className="text-sm">Please add your Mapbox token to the environment variables.</p>
            <p className="text-xs mt-2">NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              {dataToUse.length} incidents mapped
            </Badge>
          </div>
        </div>

        {/* Map Controls */}
        {showControls && (
          <div className="space-y-3 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
                <Button
                  variant={currentStyle === 'street' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange('street')}
                  className="h-8"
                >
                  <MapIcon className="h-4 w-4 mr-1" />
                  Street
                </Button>
                <Button
                  variant={currentStyle === 'satellite' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange('satellite')}
                  className="h-8"
                >
                  <Satellite className="h-4 w-4 mr-1" />
                  Satellite
                </Button>
                <Button
                  variant={currentStyle === 'terrain' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange('terrain')}
                  className="h-8"
                >
                  <Layers className="h-4 w-4 mr-1" />
                  Terrain
                </Button>
                <Button
                  variant={currentStyle === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange('dark')}
                  className="h-8"
                >
                  <Layers className="h-4 w-4 mr-1" />
                  Dark
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handleFitBounds} className="h-8">
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetView} className="h-8">
                  <Home className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Severity Filters */}
            {dataToUse.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Filter:
                </span>
                {['critical', 'high', 'medium', 'low'].map(severity => {
                  const count = dataToUse.filter(
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
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 relative" style={{ minHeight: height }}>
        <div 
          ref={mapContainer} 
          style={{ width: '100%', height }}
          className="rounded-b-lg"
        />

        {/* Legend */}
        {mapReady && (
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
      </CardContent>
    </Card>
  );
}
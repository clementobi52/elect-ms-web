// app/admin/situation/live/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { IncidentHeatmap } from '@/components/admin/situation-room/IncidentHeatmap';
import { incidentsApi, Incident, hasValidCoordinates } from '@/lib/api/incidents';
import { getSocket, onSocketMessage, onConnectionChange } from '@/lib/socket-service';
import { Loader2, Wifi, WifiOff, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SituationRoomLivePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [incidentCount, setIncidentCount] = useState(0);

  // Fetch initial data
  const fetchIncidents = useCallback(async () => {
    try {
      const response = await incidentsApi.getIncidentsForMap();
      
      if (response.success && response.incidents) {
        setIncidents(response.incidents);
        setIncidentCount(response.incidents.length);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle new incident from WebSocket
  const handleNewIncident = useCallback((data: any) => {
    console.log('📨 New incident received:', data);
    
    // Add new incident to the list
    const newIncident: Incident = {
        id: data.id || `inc-${Date.now()}`,
        type: data.type || 'Unknown',
        description: data.description || 'No description',
        severity: data.severity || 'medium',
        status: data.status || 'pending',
        pollingUnitName: data.pollingUnitName || data.pollingUnit?.name || 'Unknown',
        reporterName: data.reporterName || data.reporter?.name || 'Unknown',
        latitude: data.latitude || data.pollingUnit?.latitude,
        longitude: data.longitude || data.pollingUnit?.longitude,
        time: data.time || data.createdAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        zoneName: data.zoneName || data.pollingUnit?.ward?.zone?.name,
        wardName: data.wardName || data.pollingUnit?.ward?.name,
        ward: undefined,
        zone: undefined
    };

    setIncidents(prev => {
      // Check if incident already exists
      const exists = prev.some(i => i.id === newIncident.id);
      if (exists) return prev;
      
      // Add to beginning of list
      const updated = [newIncident, ...prev];
      setIncidentCount(updated.length);
      return updated;
    });
    
    setLastUpdated(new Date());
  }, []);

  // Handle incident update from WebSocket
  const handleIncidentUpdate = useCallback((data: any) => {
    console.log('📨 Incident update received:', data);
    
    setIncidents(prev => {
      const index = prev.findIndex(i => i.id === data.id);
      if (index === -1) return prev;
      
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ...data,
        status: data.status || updated[index].status,
        severity: data.severity || updated[index].severity,
      };
      
      return updated;
    });
    
    setLastUpdated(new Date());
  }, []);

  // Handle incident removal from WebSocket
  const handleIncidentRemoved = useCallback((data: any) => {
    console.log('📨 Incident removed:', data);
    
    setIncidents(prev => {
      const filtered = prev.filter(i => i.id !== data.id);
      setIncidentCount(filtered.length);
      return filtered;
    });
    
    setLastUpdated(new Date());
  }, []);

  // Setup WebSocket listeners
  useEffect(() => {
    // Initial fetch
    fetchIncidents();

    // Get socket instance
    const socket = getSocket();

    // Connection status listener
    const unsubscribeConnection = onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        console.log('✅ WebSocket connected to situation room');
        // Re-fetch data on reconnect
        fetchIncidents();
      } else {
        console.log('🔌 WebSocket disconnected');
      }
    });

    // Message listener for incident events
    const unsubscribeMessages = onSocketMessage((event, data) => {
      switch (event) {
        case 'incident:new':
          handleNewIncident(data);
          break;
        case 'incident:update':
          handleIncidentUpdate(data);
          break;
        case 'incident:remove':
          handleIncidentRemoved(data);
          break;
        case 'incident:bulk':
          // Bulk update - refresh all
          fetchIncidents();
          break;
        default:
          // Ignore other events
          break;
      }
    });

    // Cleanup
    return () => {
      unsubscribeConnection();
      unsubscribeMessages();
    };
  }, [fetchIncidents, handleNewIncident, handleIncidentUpdate, handleIncidentRemoved]);

  // Get incidents with valid coordinates for the map
  const incidentsWithCoords = incidents.filter(hasValidCoordinates);

  // Get live status color
  const getStatusColor = () => {
    if (loading) return 'text-yellow-500';
    if (isConnected) return 'text-green-500';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (loading) return 'Connecting...';
    if (isConnected) return 'Live';
    return 'Disconnected';
  };

  return (
    <div className="relative h-screen w-full bg-gray-900">
      {/* Live Status Overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/10">
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
          ) : isConnected ? (
            <Wifi className={`h-4 w-4 ${getStatusColor()} animate-pulse`} />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        <div className="w-px h-6 bg-white/20" />
        
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">
            {incidentCount} incidents
          </span>
        </div>
        
        <div className="w-px h-6 bg-white/20" />
        
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-white/60">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Incident Count Badge - Bottom Left */}
      <div className="absolute bottom-6 left-4 z-20 flex items-center gap-3 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/10">
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          {incidentsWithCoords.length} on map
        </Badge>
        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
          {isConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {/* Full Screen Map */}
      <div className="absolute inset-0 z-10">
        {loading ? (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-white/60 text-sm">Loading incidents...</p>
            </div>
          </div>
        ) : (
          <IncidentHeatmap
            incidents={incidents}
            height="100vh"
            autoFetch={false}
            showControls={true}
            onError={(err) => console.error('Map error:', err)}
          />
        )}
      </div>

      {/* Help overlay - bottom right */}
      <div className="absolute bottom-6 right-4 z-20 text-right">
        <div className="bg-black/70 backdrop-blur-sm text-white/60 text-xs px-3 py-2 rounded-lg border border-white/10">
          <p>🔄 Real-time updates via WebSocket</p>
          <p>📊 {incidentCount} total incidents</p>
        </div>
      </div>
    </div>
  );
}
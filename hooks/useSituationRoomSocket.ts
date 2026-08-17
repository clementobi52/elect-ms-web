// hooks/useSituationRoomSocket.ts

import { useEffect, useState, useCallback } from 'react';
import { useSocketEvents } from './useSocketEvents';

interface IncidentData {
  id: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  pollingUnitName?: string;
  wardName?: string;
  zoneName?: string;
  latitude?: number;
  longitude?: number;
  reportedBy?: string;
  createdAt?: string;
}

export function useSituationRoomSocket() {
  const { isConnected, lastEvent, sendMessage } = useSocketEvents();
  const [newIncidents, setNewIncidents] = useState<IncidentData[]>([]);
  const [newResults, setNewResults] = useState<any[]>([]);
  const [agentUpdates, setAgentUpdates] = useState<any[]>([]);
  const [statsUpdate, setStatsUpdate] = useState<any>(null);

  // Process incoming events
  useEffect(() => {
    if (!lastEvent) return;

    const { event, data } = lastEvent;

    switch (event) {
      case 'incident':
        // New incident reported
        setNewIncidents(prev => [data, ...prev]);
        break;

      case 'result':
        // New result submitted
        setNewResults(prev => [data, ...prev]);
        break;

      case 'agent':
        // Agent status changed
        setAgentUpdates(prev => [data, ...prev]);
        break;

      case 'stats':
        // Statistics updated
        setStatsUpdate(data);
        break;

      default:
        // Ignore other events
        break;
    }
  }, [lastEvent]);

  // Clear events after they've been processed
  const clearNewIncidents = useCallback(() => setNewIncidents([]), []);
  const clearNewResults = useCallback(() => setNewResults([]), []);
  const clearAgentUpdates = useCallback(() => setAgentUpdates([]), []);
  const clearStatsUpdate = useCallback(() => setStatsUpdate(null), []);

  // Subscribe to specific channels
  const subscribeToChannel = useCallback((channel: string) => {
    sendMessage('join', { channel });
  }, [sendMessage]);

  const unsubscribeFromChannel = useCallback((channel: string) => {
    sendMessage('leave', { channel });
  }, [sendMessage]);

  return {
    isConnected,
    newIncidents,
    newResults,
    agentUpdates,
    statsUpdate,
    clearNewIncidents,
    clearNewResults,
    clearAgentUpdates,
    clearStatsUpdate,
    subscribeToChannel,
    unsubscribeFromChannel,
    sendMessage
  };
}
// components/admin/ward/WardAgentsMap.tsx
"use client";

import { PollingUnitsMap } from '@/components/admin/shared/PollingUnitsMap';
import { usePollingUnits } from '@/hooks/usePollingUnits';
import { useAgents } from '@/hooks/useAgents';

interface WardAgentsMapProps {
  height?: string;
}

export function WardAgentsMap({ height = 'calc(100vh - 340px)' }: WardAgentsMapProps) {
  const {
    pollingUnits,
    refreshing: unitsRefreshing,
    refreshPollingUnits,
  } = usePollingUnits({ autoRefresh: true, refreshInterval: 30000 });
  const {
    agents,
    refreshing: agentsRefreshing,
    refreshAgents,
  } = useAgents({ autoRefresh: true, refreshInterval: 30000 });

  return (
    <PollingUnitsMap
      pollingUnits={pollingUnits}
      agents={agents}
      role="ward"
      height={height}
      refreshing={unitsRefreshing || agentsRefreshing}
      onRefresh={() => {
        refreshPollingUnits(true);
        refreshAgents(true);
      }}
    />
  );
}

export default WardAgentsMap;

// app/admin/ward/polling-units/page.tsx
"use client";

import { usePollingUnits } from '@/hooks/usePollingUnits';
import { useAgents } from '@/hooks/useAgents';
import { PollingUnitsTable } from '@/components/admin/shared/PollingUnitsTable';
import { PollingUnitsMap } from '@/components/admin/shared/PollingUnitsMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminHeader from '@/components/admin/AdminHeader';
import { AlertCircle, List, MapPin } from 'lucide-react';

export default function WardPollingUnitsPage() {
  const { pollingUnits, loading, refreshing, error, refreshPollingUnits } = usePollingUnits({
    autoRefresh: true,
    refreshInterval: 30000
  });

  const { agents, refreshing: agentsRefreshing, refreshAgents } = useAgents({
    autoRefresh: true,
    refreshInterval: 30000
  });

  const handleRefresh = () => {
    refreshPollingUnits(true);
    refreshAgents(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Polling Units" 
        subtitle="Managing polling units in your ward"
      />
      <div className="flex-1 p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5">
              <MapPin className="h-4 w-4" />
              Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <PollingUnitsTable 
              pollingUnits={pollingUnits}
              loading={loading}
              onRefresh={() => refreshPollingUnits(true)}
              showWard={false}
              showZone={false}
              role="ward"
            />
          </TabsContent>

          <TabsContent value="map">
            <PollingUnitsMap
              pollingUnits={pollingUnits}
              agents={agents}
              role="ward"
              height="calc(100vh - 320px)"
              refreshing={refreshing || agentsRefreshing}
              onRefresh={handleRefresh}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

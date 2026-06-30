// app/admin/situation/polling-units/page.tsx
"use client";

import { usePollingUnits } from '@/hooks/usePollingUnits';
import { PollingUnitsTable } from '@/components/admin/shared/PollingUnitsTable';
import AdminHeader from '@/components/admin/AdminHeader';
import { AlertCircle } from 'lucide-react';

export default function SituationPollingUnitsPage() {
  const { pollingUnits, loading, refreshing, usingDemoData, error, refreshPollingUnits } = usePollingUnits({
    autoRefresh: true,
    refreshInterval: 30000
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Polling Units" 
        subtitle="Situation Room View - All Polling Units"
      />
      <div className="flex-1 p-6">
        {error && !usingDemoData && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}
        <PollingUnitsTable 
          pollingUnits={pollingUnits}
          loading={loading}
          onRefresh={() => refreshPollingUnits(true)}
          showWard={true}
          showZone={true}
          role="situation"
          description={usingDemoData ? "Using demo data - Backend connection not available" : undefined}
        />
      </div>
    </div>
  );
}
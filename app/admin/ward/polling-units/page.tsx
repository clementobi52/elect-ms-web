// app/admin/ward/polling-units/page.tsx
"use client";

import { usePollingUnits } from '@/hooks/usePollingUnits';
import { PollingUnitsTable } from '@/components/admin/shared/PollingUnitsTable';
import AdminHeader from '@/components/admin/AdminHeader';
import { AlertCircle } from 'lucide-react';

export default function WardPollingUnitsPage() {
  const { pollingUnits, loading, refreshing, usingDemoData, error, refreshPollingUnits } = usePollingUnits({
    autoRefresh: true,
    refreshInterval: 30000
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Polling Units" 
        subtitle="Managing polling units in your ward"
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
          showWard={false}
          showZone={false}
          role="ward"
          description={usingDemoData ? "Using demo data - Backend connection not available" : undefined}
        />
      </div>
    </div>
  );
}
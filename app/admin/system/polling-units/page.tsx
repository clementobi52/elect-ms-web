// app/admin/system/polling-units/page.tsx
"use client";

import { usePollingUnits } from '@/hooks/usePollingUnits';
import { PollingUnitsTable } from '@/components/admin/shared/PollingUnitsTable';
import AdminHeader from '@/components/admin/AdminHeader';

export default function SystemPollingUnitsPage() {
  const { pollingUnits, loading, refreshing, usingDemoData, refreshPollingUnits } = usePollingUnits({
    autoRefresh: false
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Polling Units" 
        subtitle="System Admin View - All Polling Units"
      />
      <div className="flex-1 p-6">
        <PollingUnitsTable 
          pollingUnits={pollingUnits}
          loading={loading}
          onRefresh={() => refreshPollingUnits(true)}
          showWard={true}
          showZone={true}
          role="system"
          description={usingDemoData ? "Using demo data - Backend connection not available" : undefined}
        />
      </div>
    </div>
  );
}
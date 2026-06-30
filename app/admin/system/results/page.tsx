// app/admin/system/results/page.tsx
"use client";

import { useResults } from '@/hooks/useResults';
import { ResultsTable } from '@/components/admin/shared/ResultsTable';
import AdminHeader from '@/components/admin/AdminHeader';

export default function SystemResultsPage() {
  const { 
    results, 
    loading, 
    refreshing, 
    usingDemoData, 
    refreshResults,
    approveResult,
    rejectResult 
  } = useResults({
    autoRefresh: false
  });

  // Log the results to see the structure
  console.log('Results data:', results);

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Election Results" 
        subtitle="System Admin View - All Results"
      />
      <div className="flex-1 p-6">
        <ResultsTable 
          results={results}
          loading={loading}
          onRefresh={() => refreshResults(true)}
          onApprove={approveResult}
          onReject={rejectResult}
          showWard={true}
          showZone={true}
          role="system"
          description={usingDemoData ? "Using demo data - Backend connection not available" : undefined}
        />
      </div>
    </div>
  );
}
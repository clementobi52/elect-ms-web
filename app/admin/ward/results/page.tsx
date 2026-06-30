// app/admin/ward/results/page.tsx
"use client";

import { useResults } from '@/hooks/useResults';
import { ResultsTable } from '@/components/admin/shared/ResultsTable';
import AdminHeader from '@/components/admin/AdminHeader';
import { AlertCircle } from 'lucide-react';

export default function WardResultsPage() {
  const { 
    results, 
    loading, 
    refreshing, 
    usingDemoData, 
    error, 
    refreshResults,
    approveResult,
    rejectResult 
  } = useResults({
    autoRefresh: true,
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Election Results" 
        subtitle="Managing results in your ward"
      />
      
      <div className="flex-1 p-6">
        {/* Error Message */}
        {error && !usingDemoData && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Main Results Table */}
        <ResultsTable 
          results={results}
          loading={loading}
          onRefresh={() => refreshResults(true)}
          onApprove={approveResult}
          onReject={rejectResult}
          showWard={false}
          showZone={false}
          role="ward"
          title="Ward Election Results"
          description={usingDemoData 
            ? "Using demo data - Backend connection not available. Showing sample results for preview." 
            : "Review and manage election results from polling units in your ward"
          }
        />

        {/* Auto-refresh indicator */}
        {!usingDemoData && !loading && (
          <div className="mt-4 text-xs text-muted-foreground text-right">
            {refreshing ? (
              <span className="inline-flex items-center">
                <span className="animate-spin mr-2 h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></span>
                Refreshing...
              </span>
            ) : (
              <span>Auto-refreshes every 30 seconds</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
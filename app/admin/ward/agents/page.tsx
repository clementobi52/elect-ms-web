"use client";

import { useAgents } from '@/hooks/useAgents';
import { AgentsTable } from '@/components/admin/shared/AgentsTable';
import AdminHeader from '@/components/admin/AdminHeader';

export default function WardAgentsPage() {
  const { agents, loading, refreshing, usingDemoData, error, refreshAgents } = useAgents({
    autoRefresh: true,
    refreshInterval: 30000
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Polling Agents" 
        subtitle="Managing agents in your ward"
      />
      <div className="flex-1 p-6">
        {error && !usingDemoData && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}
        <AgentsTable 
          agents={agents}
          loading={loading}
          onRefresh={() => refreshAgents(true)}
          showWard={false}
          showZone={false}
          role="ward"
        />
      </div>
    </div>
  );
}
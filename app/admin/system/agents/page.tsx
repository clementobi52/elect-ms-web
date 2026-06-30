"use client";

import { useAgents } from '@/hooks/useAgents';
import { AgentsTable } from '@/components/admin/shared/AgentsTable';
import AdminHeader from '@/components/admin/AdminHeader';

export default function SystemAgentsPage() {
  const { agents, loading, refreshing, usingDemoData, refreshAgents } = useAgents({
    autoRefresh: false
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Polling Agents" 
        subtitle="System Admin View - All Agents"
      />
      <div className="flex-1 p-6">
        <AgentsTable 
          agents={agents}
          loading={loading}
          onRefresh={() => refreshAgents(true)}
          showWard={true}
          showZone={true}
          role="system"
          description={usingDemoData ? "Using demo data - Backend connection not available" : undefined}
        />
      </div>
    </div>
  );
}
// components/admin/shared/AgentsTable.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Search, RefreshCw, Mail, Shield, Eye, AlertCircle, MapPin } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  pollingUnitName: string;
  pollingUnitId?: string;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  updatedAt?: string;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  };
  resultsSubmitted?: number;
  status?: 'Online' | 'Offline';
  lastActive?: string;
}

interface AgentsTableProps {
  agents: Agent[];
  loading?: boolean;
  onRefresh?: () => void;
  showWard?: boolean;
  showZone?: boolean;
  role: 'ward' | 'zone' | 'situation' | 'system';
  title?: string;
  description?: string;
}

export function AgentsTable({ 
  agents, 
  loading = false, 
  onRefresh, 
  showWard = false, 
  showZone = false,
  role,
  title = "Polling Agents",
  description
}: AgentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.pollingUnitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agent.wardName && agent.wardName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const onlineCount = agents.filter(a => a.status === 'Online').length;
  const offlineCount = agents.filter(a => a.status === 'Offline').length;

  const getRoleBadge = () => {
    switch(role) {
      case 'system': return { bg: 'bg-purple-50', text: 'text-purple-700', icon: Shield };
      case 'situation': return { bg: 'bg-orange-50', text: 'text-orange-700', icon: Eye };
      case 'zone': return { bg: 'bg-blue-50', text: 'text-blue-700', icon: MapPin };
      default: return { bg: 'bg-green-50', text: 'text-green-700', icon: Users };
    }
  };

  const roleBadge = getRoleBadge();
  const RoleIcon = roleBadge.icon;

  return (
    <div className="space-y-6">
      {/* Role-specific header */}
      <div className={`${roleBadge.bg} border rounded-lg p-4 flex items-center gap-3`}>
        <RoleIcon className={`h-5 w-5 ${roleBadge.text}`} />
        <div>
          <p className={`font-medium ${roleBadge.text}`}>
            {role === 'system' && 'System Admin View'}
            {role === 'situation' && 'Situation Room View'}
            {role === 'zone' && 'Zone Admin View'}
            {role === 'ward' && 'Ward Admin View'}
          </p>
          <p className="text-sm opacity-90">
            {description || `Viewing agents ${role === 'ward' ? 'in your ward' : 
              role === 'zone' ? 'in your zone' : 
              role === 'situation' ? 'across all zones' : 
              'across all wards and zones'}`}
          </p>
        </div>
      </div>

      {/* Header with stats and search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Users className="h-3 w-3 mr-1" /> Total: {agents.length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-50">
              <span className="mr-1 h-2 w-2 rounded-full bg-green-600 inline-block" />
              Online: {onlineCount}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-gray-50">
              <span className="mr-1 h-2 w-2 rounded-full bg-gray-400 inline-block" />
              Offline: {offlineCount}
            </Badge>
          </div>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {agents.length === 0 ? 'No agents found' : `Showing ${filteredAgents.length} of ${agents.length} agents`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading agents...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No agents found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Polling Unit</TableHead>
                  {showWard && <TableHead>Ward</TableHead>}
                  {showZone && <TableHead>Zone</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Results</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {agent.email}
                      </div>
                    </TableCell>
                    <TableCell>{agent.pollingUnitName}</TableCell>
                    {showWard && <TableCell>{agent.wardName || agent.wardId || 'Unknown'}</TableCell>}
                    {showZone && <TableCell>{agent.zoneName || agent.zoneId || 'Unknown'}</TableCell>}
                    <TableCell>
                      <Badge 
                        variant={agent.status === 'Online' ? 'default' : 'secondary'}
                        className={agent.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        <span className={`mr-1 h-2 w-2 rounded-full inline-block ${agent.status === 'Online' ? 'bg-green-600 animate-pulse' : 'bg-gray-500'}`} />
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {agent.lastActive}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.resultsSubmitted || 0} submitted</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
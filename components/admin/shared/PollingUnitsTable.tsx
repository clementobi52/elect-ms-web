// components/admin/shared/PollingUnitsTable.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Search, RefreshCw, Download, Filter, Users, Eye, Shield, AlertCircle } from 'lucide-react';

interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  agentName: string;
  agentId?: string;
  agentStatus: 'Online' | 'Offline';
  location: {
    latitude: number;
    longitude: number;
  };
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  resultStatus?: string;
}

interface PollingUnitsTableProps {
  pollingUnits: PollingUnit[];
  loading?: boolean;
  onRefresh?: () => void;
  showWard?: boolean;
  showZone?: boolean;
  role: 'ward' | 'zone' | 'situation' | 'system';
  title?: string;
  description?: string;
}

export function PollingUnitsTable({ 
  pollingUnits, 
  loading = false, 
  onRefresh, 
  showWard = false, 
  showZone = false,
  role,
  title = "Polling Units",
  description
}: PollingUnitsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredUnits = pollingUnits.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (unit.wardName && unit.wardName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalVoters = pollingUnits.reduce((sum, unit) => sum + unit.registeredVoters, 0);
  const onlineAgents = pollingUnits.filter(u => u.agentStatus === 'Online').length;
  const offlineAgents = pollingUnits.filter(u => u.agentStatus === 'Offline').length;

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

  const getResultStatusBadge = (status?: string) => {
    switch(status) {
      case 'Verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'Submitted':
        return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

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
            {description || `Viewing polling units ${role === 'ward' ? 'in your ward' : 
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
              placeholder="Search polling units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="px-3 py-1">
              <MapPin className="h-3 w-3 mr-1" /> Total: {pollingUnits.length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <Users className="h-3 w-3 mr-1" /> Voters: {totalVoters.toLocaleString()}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-50">
              <span className="mr-1 h-2 w-2 rounded-full bg-green-600 inline-block" />
              Online: {onlineAgents}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-gray-50">
              <span className="mr-1 h-2 w-2 rounded-full bg-gray-400 inline-block" />
              Offline: {offlineAgents}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {pollingUnits.length === 0 ? 'No polling units found' : `Showing ${filteredUnits.length} of ${pollingUnits.length} polling units`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading polling units...</div>
          ) : pollingUnits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No polling units found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Polling Unit</TableHead>
                  <TableHead>Code</TableHead>
                  {showWard && <TableHead>Ward</TableHead>}
                  {showZone && <TableHead>Zone</TableHead>}
                  <TableHead>Registered Voters</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell>{unit.code}</TableCell>
                    {showWard && <TableCell>{unit.wardName || unit.wardId || 'Unknown'}</TableCell>}
                    {showZone && <TableCell>{unit.zoneName || unit.zoneId || 'Unknown'}</TableCell>}
                    <TableCell>{unit.registeredVoters.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {unit.agentName !== 'Unassigned' ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(unit.agentName)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{unit.agentName}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={unit.agentStatus === 'Online' ? 'default' : 'secondary'}
                        className={unit.agentStatus === 'Online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        <span className={`mr-1 h-2 w-2 rounded-full inline-block ${unit.agentStatus === 'Online' ? 'bg-green-600 animate-pulse' : 'bg-gray-500'}`} />
                        {unit.agentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getResultStatusBadge(unit.resultStatus)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {unit.location.latitude.toFixed(4)}, {unit.location.longitude.toFixed(4)}
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
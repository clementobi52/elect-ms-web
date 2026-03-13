"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Search, Download, Filter, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  agentName: string;
  agentStatus: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

// Demo data constant
const DEMO_POLLING_UNITS: PollingUnit[] = [
  {
    id: '1',
    name: 'Polling Unit 1',
    code: 'PU-001',
    registeredVoters: 450,
    agentName: 'John Doe',
    agentStatus: 'Online',
    location: { latitude: 6.5244, longitude: 3.3792 }
  },
  {
    id: '2',
    name: 'Polling Unit 2',
    code: 'PU-002',
    registeredVoters: 380,
    agentName: 'Jane Smith',
    agentStatus: 'Online',
    location: { latitude: 6.5245, longitude: 3.3793 }
  },
  {
    id: '3',
    name: 'Polling Unit 3',
    code: 'PU-003',
    registeredVoters: 520,
    agentName: 'Mike Johnson',
    agentStatus: 'Offline',
    location: { latitude: 6.5246, longitude: 3.3794 }
  },
  {
    id: '4',
    name: 'Polling Unit 4',
    code: 'PU-004',
    registeredVoters: 290,
    agentName: 'Sarah Brown',
    agentStatus: 'Online',
    location: { latitude: 6.5247, longitude: 3.3795 }
  }
];

export default function PollingUnitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchPollingUnits();
  }, [user]);

  const fetchPollingUnits = async () => {
    if (!user?.wardId) {
      setError('No ward ID found');
      setPollingUnits(DEMO_POLLING_UNITS);
      setUsingDemoData(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      console.log('Fetching polling units for ward:', user.wardId);
      console.log('API URL:', `${API_BASE_URL}/admin/ward/${user.wardId}/polling-units`);
      
      const response = await fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/polling-units`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Data received:', data);
        
        if (data && data.length > 0) {
          setPollingUnits(data);
          setUsingDemoData(false);
          toast({
            title: "Success",
            description: `Loaded ${data.length} polling units`,
          });
        } else {
          console.log('No data from backend, using demo data');
          setPollingUnits(DEMO_POLLING_UNITS);
          setUsingDemoData(true);
          toast({
            title: "Demo Mode",
            description: "Showing sample polling units",
          });
        }
      } else {
        console.log('Response not OK:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
        
        setPollingUnits(DEMO_POLLING_UNITS);
        setUsingDemoData(true);
        toast({
          title: "Demo Mode",
          description: "Showing sample polling units",
        });
      }
    } catch (error) {
      console.error('Error fetching polling units:', error);
      setError('Failed to load polling units');
      setPollingUnits(DEMO_POLLING_UNITS);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredUnits = pollingUnits.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.agentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader title="Polling Units" subtitle="Loading polling units..." />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Polling Units" 
        subtitle={`Managing polling units in your ward`}
      />
      
      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {usingDemoData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-600">Using demo data - Backend connection not available</p>
          </div>
        )}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Polling Units</CardTitle>
                <CardDescription>View and manage polling units in your ward</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search polling units..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
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
          </CardHeader>
          <CardContent>
            {filteredUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No polling units found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Polling Unit</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Registered Voters</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{unit.code}</TableCell>
                      <TableCell>{unit.registeredVoters.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(unit.agentName)}
                            </AvatarFallback>
                          </Avatar>
                          {unit.agentName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={unit.agentStatus === 'Online' ? 'default' : 'secondary'}>
                          {unit.agentStatus}
                        </Badge>
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
    </div>
  );
}
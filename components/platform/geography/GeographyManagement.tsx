"use client";

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ZonesTab from './ZonesTab';
import WardsTab from './WardsTab';
import PollingUnitsTab from './PollingUnitsTab';
import { Building2, MapPin, Vote, Users, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getPlatformToken } from '@/lib/platform/session';
import { API_BASE_URL } from '@/lib/config';

export default function GeographyManagement() {
  const [stats, setStats] = useState({
    zones: 0,
    wards: 0,
    pollingUnits: 0,
    withResults: 0,
    verified: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = getPlatformToken();
      const [zonesRes, wardsRes, pusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/platform/zones?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/platform/wards?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/platform/polling-units?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const zonesData = await zonesRes.json();
      const wardsData = await wardsRes.json();
      const pusData = await pusRes.json();

      setStats({
        zones: zonesData.total || zonesData.zones?.length || zonesData.data?.length || zonesData.count || 0,
        wards: wardsData.total || wardsData.pagination?.total || wardsData.wards?.length || wardsData.data?.length || wardsData.count || 0,
        pollingUnits: pusData.total || pusData.pagination?.total || pusData.stats?.total || pusData.count || 0,
        withResults: pusData.stats?.withResults || 0,
        verified: pusData.stats?.verifiedResults || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zones</p>
                <p className="text-2xl font-bold">{loading ? '-' : stats.zones}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wards</p>
                <p className="text-2xl font-bold">{loading ? '-' : stats.wards}</p>
              </div>
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Polling Units</p>
                <p className="text-2xl font-bold">{loading ? '-' : stats.pollingUnits}</p>
              </div>
              <Vote className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Results</p>
                <p className="text-2xl font-bold">{loading ? '-' : stats.withResults}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{loading ? '-' : stats.verified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="zones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Zones
          </TabsTrigger>
          <TabsTrigger value="wards" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Wards
          </TabsTrigger>
          <TabsTrigger value="polling-units" className="flex items-center gap-2">
            <Vote className="h-4 w-4" />
            Polling Units
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zones">
          <ZonesTab />
        </TabsContent>

        <TabsContent value="wards">
          <WardsTab />
        </TabsContent>

        <TabsContent value="polling-units">
          <PollingUnitsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

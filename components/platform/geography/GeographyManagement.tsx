"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ZonesTab from './ZonesTab';
import WardsTab from './WardsTab';
import PollingUnitsTab from './PollingUnitsTab';
import { Building2, MapPin, Vote } from 'lucide-react';

export default function GeographyManagement() {
  return (
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
  );
}

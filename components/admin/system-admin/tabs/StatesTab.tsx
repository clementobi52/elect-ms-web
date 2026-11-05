// components/admin/system-admin/tabs/StatesTab.tsx

import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Map, Search, X } from 'lucide-react';
import { State, Zone } from '../types';
import type { LgaRecord } from '@/lib/system-admin/api';

interface StatesTabProps {
  states: State[];
  lgas: LgaRecord[];
  zones: Zone[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const StatesTab: React.FC<StatesTabProps> = ({
  states,
  lgas,
  zones,
  searchQuery,
  setSearchQuery,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    setSearchQuery(value);
  };

  const lgaCountByState = useMemo(() => {
    const counts: Record<string, number> = {};
    lgas.forEach((lga) => {
      const stateId = lga.state_id || lga.stateId;
      if (stateId) counts[stateId] = (counts[stateId] || 0) + 1;
    });
    return counts;
  }, [lgas]);

  const zoneByState = useMemo(() => {
    const map: Record<string, Zone> = {};
    zones.forEach((zone) => {
      if (zone.stateId) map[zone.stateId] = zone;
    });
    return map;
  }, [zones]);

  const filteredStates = states.filter((state) => {
    const query = localSearch.toLowerCase();
    return (
      state.name.toLowerCase().includes(query) ||
      (state.code || '').toLowerCase().includes(query)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-blue-500" />
              State Management
            </CardTitle>
            <CardDescription>
              View all states and their LGA, ward and polling unit coverage
              {states.length > 0 && (
                <span className="ml-2 font-medium text-foreground">
                  ({states.length} total)
                </span>
              )}
            </CardDescription>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search states..."
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
            {localSearch && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-center">LGAs</TableHead>
              <TableHead className="text-center">Wards</TableHead>
              <TableHead className="text-center">Polling Units</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredStates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Map className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-lg font-medium">No states found</p>
                  <p className="text-sm">
                    {localSearch ? 'Try adjusting your search' : 'No states available'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredStates.map((state) => {
                const zone = zoneByState[state.id];
                return (
                  <TableRow key={state.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Map className="h-4 w-4 text-muted-foreground" />
                        {state.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {state.code || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono">
                        {lgaCountByState[state.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono">
                        {zone?.wardCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 font-mono">
                        {zone?.pollingUnitCount || 0}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

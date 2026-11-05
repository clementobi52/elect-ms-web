// components/admin/system-admin/tabs/LgaTab.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Landmark,
  Map,
  Search,
  X,
} from 'lucide-react';
import { State } from '../types';
import type { LgaRecord } from '@/lib/system-admin/api';

interface LgaTabProps {
  lgas: LgaRecord[];
  states: State[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const PAGE_SIZE = 50;

export const LgaTab: React.FC<LgaTabProps> = ({
  lgas,
  states,
  searchQuery,
  setSearchQuery,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedState, setSelectedState] = useState('all');
  const [page, setPage] = useState(1);

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    setSearchQuery(value);
  };

  useEffect(() => {
    setPage(1);
  }, [localSearch, selectedState]);

  const stateById = useMemo(() => {
    const map: Record<string, State> = {};
    states.forEach((state) => {
      map[state.id] = state;
    });
    return map;
  }, [states]);

  const getStateId = (lga: LgaRecord) =>
    lga.state_id || lga.stateId || lga.state?.id || '';

  const getStateName = (lga: LgaRecord) => {
    const stateId = getStateId(lga);
    return lga.state_name || lga.stateName || lga.state?.name || (stateId ? stateById[stateId]?.name : '') || '-';
  };

  const filteredLgas = useMemo(() => {
    const query = localSearch.toLowerCase();
    return lgas.filter((lga) => {
      const matchesSearch = lga.name.toLowerCase().includes(query);
      const matchesState = selectedState === 'all' || getStateId(lga) === selectedState;
      return matchesSearch && matchesState;
    });
  }, [lgas, localSearch, selectedState, stateById]);

  const totalPages = Math.max(1, Math.ceil(filteredLgas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageLgas = filteredLgas.slice(startIndex, startIndex + PAGE_SIZE);
  const startItem = filteredLgas.length === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + PAGE_SIZE, filteredLgas.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-500" />
              LGA Management
            </CardTitle>
            <CardDescription>
              View all Local Government Areas and their ward and polling unit coverage
              {lgas.length > 0 && (
                <span className="ml-2 font-medium text-foreground">
                  ({lgas.length} total)
                </span>
              )}
            </CardDescription>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search LGAs..."
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

            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <Map className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(localSearch || selectedState !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleSearch('');
                  setSelectedState('all');
                }}
                className="h-10 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>LGA Name</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-center">Wards</TableHead>
              <TableHead className="text-center">Polling Units</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {pageLgas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Landmark className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-lg font-medium">No LGAs found</p>
                  <p className="text-sm">
                    {localSearch || selectedState !== 'all'
                      ? 'Try adjusting your filters'
                      : 'No LGAs available'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              pageLgas.map((lga) => (
                <TableRow key={lga.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      {lga.name}
                    </div>
                  </TableCell>
                  <TableCell>{getStateName(lga)}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {lga.code || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {lga.wardCount || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 font-mono">
                      {lga.pollingUnitCount || 0}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {filteredLgas.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {startItem} - {endItem} of {filteredLgas.length} LGAs
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={safePage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-medium">
                  Page {safePage} of {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

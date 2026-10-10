// components/admin/system-admin/tabs/WardsTab.tsx

import React, { useState, useEffect, useRef } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Search,
  X,
  MapPin,
  Building2,
  Filter,
} from 'lucide-react';
import { CreateWardDialog } from '../dialogs/CreateWardDialog';
import { EditWardDialog } from '../dialogs/EditWardDialog';
import { ViewWardDialog } from '../dialogs/ViewWardDialog';
import { Ward, Zone, Pagination } from '../types';
import { Badge } from '@/components/ui/badge';

interface WardsTabProps {
  wards: Ward[];
  zones: Zone[];
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  onRefresh: () => void;
  onDelete: (type: string, id: string, name: string) => void;
  onFetchWards?: (page: number, filters?: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedZone: string;
  setSelectedZone: (zone: string) => void;
}

export const WardsTab: React.FC<WardsTabProps> = ({
  wards,
  zones,
  pagination,
  onRefresh,
  onDelete,
  onFetchWards,
  searchQuery,
  setSearchQuery,
  selectedZone,
  setSelectedZone,
}) => {
  const [viewingWard, setViewingWard] = useState<Ward | null>(null);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [isCreateWardOpen, setIsCreateWardOpen] = useState(false);
  const [isViewWardOpen, setIsViewWardOpen] = useState(false);
  const [isEditWardOpen, setIsEditWardOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const firstLoad = useRef(true);
  const fetchWardsRef = useRef(onFetchWards);
  fetchWardsRef.current = onFetchWards;

  const buildFilters = (search: string, zone: string) => ({
    search: search || undefined,
    zoneId: zone && zone !== 'all' ? zone : undefined,
  });

  // Single, debounced fetch that runs once on mount and whenever the search or
  // zone filter changes. The callback is held in a ref so parent re-renders do
  // not re-trigger the effect (which previously caused duplicate/racing fetches).
  useEffect(() => {
    const fetch = fetchWardsRef.current;
    if (!fetch) return;

    const zoneId = selectedZone !== 'all' ? selectedZone : undefined;

    if (firstLoad.current) {
      firstLoad.current = false;
      fetch(1, { search: localSearch || undefined, zoneId });
      return;
    }

    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
      fetch(1, { search: localSearch || undefined, zoneId });
    }, 400);

    return () => clearTimeout(timer);
  }, [localSearch, selectedZone, setSearchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    fetchWardsRef.current?.(1, buildFilters(localSearch, selectedZone));
  };

  const clearFilters = () => {
    setLocalSearch('');
    setSearchQuery('');
    setSelectedZone('all');
  };

  const handleZoneFilter = (value: string) => {
    setSelectedZone(value);
  };

  // Refresh the table with the currently active filters after a create/edit.
  const handleDialogSuccess = () => {
    onRefresh();
    fetchWardsRef.current?.(1, buildFilters(localSearch, selectedZone));
  };

  // Page through results without dropping the active filters.
  const goToPage = (page: number) => {
    if (!pagination) return;
    if (page < 1 || page > pagination.totalPages) return;
    fetchWardsRef.current?.(page, buildFilters(localSearch, selectedZone));
  };

  const hasActiveFilters = searchQuery || (selectedZone && selectedZone !== 'all');

  // Get polling unit count from ward data
  const getPollingUnitCount = (ward: any): number => {
    if (ward.pollingUnitCount !== undefined) return ward.pollingUnitCount;
    if (ward.pollingUnits) return ward.pollingUnits.length;
    return 0;
  };

  // Get zone name
  const getZoneName = (ward: any): string => {
    if (ward.zone_name) return ward.zone_name;
    if (ward.zone?.name) return ward.zone.name;
    return '-';
  };

  const startItem = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : wards.length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-500" />
                  Ward Management
                </CardTitle>
                <CardDescription>
                  Manage all electoral wards
                  {pagination?.total && pagination.total > 0 && (
                    <span className="ml-2 font-medium text-foreground">
                      ({pagination.total} total)
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateWardOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Ward
              </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  placeholder="Search wards..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </form>

              <Select
                value={selectedZone}
                onValueChange={handleZoneFilter}
              >
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
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
          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ward Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-center">Polling Units</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {wards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-lg font-medium">No wards found</p>
                      <p className="text-sm">
                        {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by creating your first ward'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  wards.map((ward) => {
                    // ✅ Get values from the API response
                    const wardName = ward.name || '-';
                    const zoneName = ward.zone_name || ward.zone?.name || '-';
                    const stateName = ward.state_name || ward.state?.name || '-';
                    const puCount = ward.pollingUnitCount || ward.pollingUnits?.length || 0;

                    return (
                      <TableRow key={ward.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {wardName}
                          </div>
                        </TableCell>
                        <TableCell>{zoneName}</TableCell>
                        <TableCell>{stateName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 font-mono">
                            {puCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {ward.createdAt ? new Date(ward.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setViewingWard(ward);
                                  setIsViewWardOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingWard(ward);
                                  setIsEditWardOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Ward
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete('ward', ward.id, ward.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Ward
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {startItem} - {endItem} of {pagination.total} wards
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateWardDialog
        open={isCreateWardOpen}
        onOpenChange={setIsCreateWardOpen}
        zones={zones}
        onSuccess={handleDialogSuccess}
      />

      <EditWardDialog
        open={isEditWardOpen}
        onOpenChange={setIsEditWardOpen}
        ward={editingWard}
        onSuccess={handleDialogSuccess}
      />

      <ViewWardDialog
        open={isViewWardOpen}
        onOpenChange={setIsViewWardOpen}
        ward={viewingWard}
      />
    </>
  );
};
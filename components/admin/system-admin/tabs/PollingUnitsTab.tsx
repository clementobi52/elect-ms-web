// components/admin/system-admin/tabs/PollingUnitsTab.tsx
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Loader2,
  RefreshCw,
  Filter,
  X,
  MapPin,
  Users,
  Building2,
} from 'lucide-react';
import { CreatePollingUnitDialog } from '../dialogs/CreatePollingUnitDialog';
import { EditPollingUnitDialog } from '../dialogs/EditPollingUnitDialog';
import { ViewPollingUnitDialog } from '../dialogs/ViewPollingUnitDialog';
import { PollingUnit, Zone, Ward, Pagination } from '../types';
import { fetchWardsInZone } from '@/lib/system-admin/api';
import { API_BASE_URL } from '@/lib/config';

interface PollingUnitsTabProps {
  pollingUnits: PollingUnit[];
  wards: Ward[];
  zones: Zone[];
  pagination: Pagination;
  onPageChange?: (page: number, filters?: any) => void;
  onRefresh: () => void;
  onDelete: (type: string, id: string, name: string) => void;
  onFetchPollingUnits?: (page: number, filters?: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getInitials: (name: string) => string;
}

export const PollingUnitsTab: React.FC<PollingUnitsTabProps> = ({
  pollingUnits,
  wards,
  zones,
  pagination,
  onPageChange,
  onRefresh,
  onDelete,
  onFetchPollingUnits,
  searchQuery,
  setSearchQuery,
  getInitials,
}) => {
  const [viewingPU, setViewingPU] = useState<PollingUnit | null>(null);
  const [editingPU, setEditingPU] = useState<PollingUnit | null>(null);
  const [isCreatePUOpen, setIsCreatePUOpen] = useState(false);
  const [isViewPUOpen, setIsViewPUOpen] = useState(false);
  const [isEditPUOpen, setIsEditPUOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [limit, setLimit] = useState(50);

  // This tab owns its own filter state so that filtering polling units never
  // mutates (or is mutated by) the other tabs.
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedWard, setSelectedWard] = useState('all');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [zoneWards, setZoneWards] = useState<Ward[]>([]);

  const firstLoad = useRef(true);
  const fetchRef = useRef(onFetchPollingUnits);
  fetchRef.current = onFetchPollingUnits;

  const buildFilters = (overrides: any = {}) => ({
    search: localSearch || undefined,
    zoneId: selectedZone !== 'all' ? selectedZone : undefined,
    wardId: selectedWard !== 'all' ? selectedWard : undefined,
    unassigned: showUnassigned || undefined,
    limit,
    ...overrides,
  });

  // Single, debounced fetch that runs once on mount and whenever any filter
  // changes. The callback is held in a ref so parent re-renders do not
  // re-trigger the effect.
  useEffect(() => {
    const fetch = fetchRef.current;
    if (!fetch) return;

    const filters = {
      search: localSearch || undefined,
      zoneId: selectedZone !== 'all' ? selectedZone : undefined,
      wardId: selectedWard !== 'all' ? selectedWard : undefined,
      unassigned: showUnassigned || undefined,
      limit,
    };

    if (firstLoad.current) {
      firstLoad.current = false;
      fetch(1, filters);
      return;
    }

    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
      fetch(1, filters);
    }, 400);

    return () => clearTimeout(timer);
  }, [localSearch, selectedZone, selectedWard, showUnassigned, limit, setSearchQuery]);

  // Load the wards for the selected zone so the ward dropdown is complete.
  useEffect(() => {
    let cancelled = false;
    if (!selectedZone || selectedZone === 'all') {
      setZoneWards([]);
      return;
    }
    fetchWardsInZone(API_BASE_URL, selectedZone)
      .then((res) => {
        if (!cancelled) setZoneWards(res.wards || []);
      })
      .catch(() => {
        if (!cancelled) setZoneWards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedZone]);

  const handlePageChange = (newPage: number) => {
    if (!pagination || newPage < 1 || newPage > pagination.totalPages) return;
    onPageChange?.(newPage, buildFilters());
  };

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    fetchRef.current?.(1, buildFilters());
  };

  const clearFilters = () => {
    setLocalSearch('');
    setSearchQuery('');
    setSelectedZone('all');
    setSelectedWard('all');
    setShowUnassigned(false);
  };

  // Refresh the table with the currently active filters after a create/edit.
  const handleDialogSuccess = () => {
    onRefresh();
    fetchRef.current?.(1, buildFilters());
  };

  const hasActiveFilters = !!searchQuery ||
    (selectedZone && selectedZone !== 'all') ||
    (selectedWard && selectedWard !== 'all') ||
    showUnassigned;

  // Get active filter count
  const activeFilterCount = [
    searchQuery ? 1 : 0,
    selectedZone !== 'all' ? 1 : 0,
    selectedWard !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const startItem = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : pollingUnits.length;

  // Helper function to get zone name
  const getZoneName = (pu: PollingUnit): string => {
    if (pu.zone?.name) return pu.zone.name;
    if (pu.ward?.zone?.name) return pu.ward.zone.name;
    if (pu.zoneName) return pu.zoneName;
    return '-';
  };

  // Helper function to get ward name
  const getWardName = (pu: PollingUnit): string => {
    if (pu.ward?.name) return pu.ward.name;
    if (pu.wardName) return pu.wardName;
    return '-';
  };

  // Helper function to get status badge
  const getStatusBadge = (pu: PollingUnit) => {
    const hasAgent = !!(pu.agent || pu.agentId || pu.agentName);
    const hasResults = pu.resultStatus === 'Submitted' || pu.hasResults;
    
    if (hasAgent && hasResults) {
      return <Badge variant="success" className="bg-green-100 text-green-800">Active</Badge>;
    } else if (hasAgent && !hasResults) {
      return <Badge variant="warning" className="bg-yellow-100 text-yellow-800">No Results</Badge>;
    } else if (!hasAgent && hasResults) {
      return <Badge variant="warning" className="bg-orange-100 text-orange-800">No Agent</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  Polling Unit Management
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount} filters
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Manage all polling units in the system
                  {pagination.total > 0 && (
                    <span className="ml-2 font-medium text-foreground">
                      ({pagination.total} total)
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={showUnassigned ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowUnassigned((v) => !v)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {showUnassigned ? 'Show All' : 'Unassigned'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={() => setIsCreatePUOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Polling Unit
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  placeholder="Search by name or code..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </form>

              <Select
                value={selectedZone}
                onValueChange={(value) => {
                  setSelectedZone(value);
                  setSelectedWard('all');
                }}
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

              <Select
                value={selectedWard}
                onValueChange={(value) => {
                  setSelectedWard(value);
                }}
                disabled={!selectedZone || selectedZone === 'all'}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={selectedZone && selectedZone !== 'all' ? "Filter by ward" : "Select zone first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {zoneWards.map((ward) => (
                    <SelectItem key={ward.id} value={ward.id}>
                      {ward.name}
                      {ward.zone?.name && ` (${ward.zone.name})`}
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

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {searchQuery}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => {
                        setLocalSearch('');
                        setSearchQuery('');
                      }}
                    />
                  </Badge>
                )}
                {selectedZone !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Zone: {zones.find(z => z.id === selectedZone)?.name}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => {
                        setSelectedZone('all');
                        setSelectedWard('all');
                      }}
                    />
                  </Badge>
                )}
                {selectedWard !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Ward: {zoneWards.find(w => w.id === selectedWard)?.name}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => setSelectedWard('all')}
                    />
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-6 px-2 text-muted-foreground hover:text-foreground text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Polling Unit</TableHead>
                  <TableHead className="hidden md:table-cell">Code</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead className="hidden lg:table-cell">Zone</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading polling units...</p>
                    </TableCell>
                  </TableRow>
                ) : pollingUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-lg font-medium">No polling units found</p>
                      <p className="text-sm text-muted-foreground">
                        {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first polling unit'}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">
                          Clear Filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  pollingUnits.map((pu) => {
                    const zoneName = getZoneName(pu);
                    const wardName = getWardName(pu);
                    const hasAgent = !!(pu.agent || pu.agentId || pu.agentName);
                    
                    return (
                      <TableRow key={pu.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {pu.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">
                          {pu.code || '-'}
                        </TableCell>
                        <TableCell>{wardName}</TableCell>
                        <TableCell className="hidden lg:table-cell">{zoneName}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {pu.latitude && pu.longitude ? (
                            <span className="font-mono text-xs">
                              {pu.latitude?.toFixed(4)}, {pu.longitude?.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No coordinates</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasAgent ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(pu.agent?.name || pu.agentName || '')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm hidden sm:inline">
                                {pu.agent?.name || pu.agentName || 'Assigned'}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(pu)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                          {pu.createdAt ? new Date(pu.createdAt).toLocaleDateString() : '-'}
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
                                  setViewingPU(pu);
                                  setIsViewPUOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingPU(pu);
                                  setIsEditPUOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete('pollingUnit', pu.id, pu.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select
                  value={String(pagination.limit || 50)} 
                  onValueChange={handleLimitChange}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 50, 100].map((limit) => (
                      <SelectItem key={limit} value={String(limit)}>
                        {limit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="hidden sm:inline">
                  {startItem} - {endItem} of {pagination.total}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(pagination.page - 1)}
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
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePollingUnitDialog
        open={isCreatePUOpen}
        onOpenChange={setIsCreatePUOpen}
        wards={wards}
        onSuccess={() => {
          handleDialogSuccess();
          setIsCreatePUOpen(false);
        }}
      />

      <EditPollingUnitDialog
        open={isEditPUOpen}
        onOpenChange={setIsEditPUOpen}
        pollingUnit={editingPU}
        onSuccess={() => {
          handleDialogSuccess();
          setIsEditPUOpen(false);
        }}
      />

      <ViewPollingUnitDialog
        open={isViewPUOpen}
        onOpenChange={setIsViewPUOpen}
        pollingUnit={viewingPU}
      />
    </>
  );
};
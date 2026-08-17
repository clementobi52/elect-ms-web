// components/admin/system-admin/tabs/PollingUnitsTab.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

interface PollingUnitsTabProps {
  pollingUnits: PollingUnit[];
  wards: Ward[];
  zones: Zone[];
  pagination: Pagination;
  showUnassigned: boolean;
  onToggleUnassigned: () => void;
  onPageChange: (page: number, filters?: any) => void;
  onRefresh: () => void;
  onDelete: (type: string, id: string, name: string) => void;
  onFetchPollingUnits: (page: number, filters?: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedZone: string;
  setSelectedZone: (zone: string) => void;
  selectedWard: string;
  setSelectedWard: (ward: string) => void;
  getInitials: (name: string) => string;
}

export const PollingUnitsTab: React.FC<PollingUnitsTabProps> = ({
  pollingUnits,
  wards,
  zones,
  pagination,
  showUnassigned,
  onToggleUnassigned,
  onPageChange,
  onRefresh,
  onDelete,
  onFetchPollingUnits,
  searchQuery,
  setSearchQuery,
  selectedZone,
  setSelectedZone,
  selectedWard,
  setSelectedWard,
  getInitials,
}) => {
  const [viewingPU, setViewingPU] = useState<PollingUnit | null>(null);
  const [editingPU, setEditingPU] = useState<PollingUnit | null>(null);
  const [isCreatePUOpen, setIsCreatePUOpen] = useState(false);
  const [isViewPUOpen, setIsViewPUOpen] = useState(false);
  const [isEditPUOpen, setIsEditPUOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  
  // Use ref to prevent infinite loops
  const initialFetchDone = useRef(false);
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get filtered wards based on selected zone
  const filteredWards = useMemo(() => {
    if (selectedZone && selectedZone !== 'all') {
      return wards.filter(w => w.zoneId === selectedZone || w.zone?.id === selectedZone);
    }
    return wards;
  }, [wards, selectedZone]);

  // Initial fetch - only once
  useEffect(() => {
    if (!initialFetchDone.current && onFetchPollingUnits) {
      initialFetchDone.current = true;
      // Only fetch if no filters are applied
      if (!searchQuery && selectedZone === 'all' && selectedWard === 'all' && !showUnassigned) {
        onFetchPollingUnits(1, {});
      }
    }
  }, [onFetchPollingUnits, searchQuery, selectedZone, selectedWard, showUnassigned]);

  // Debounced search - only when localSearch changes
  useEffect(() => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
        onFetchPollingUnits(1, { 
          search: localSearch,
          zoneId: selectedZone !== 'all' ? selectedZone : undefined,
          wardId: selectedWard !== 'all' ? selectedWard : undefined,
        });
      }
    }, 500);

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [localSearch, selectedZone, selectedWard, onFetchPollingUnits, setSearchQuery]);

  // Handle filter changes - only when specific filters change
  const handleFilterChange = useCallback(() => {
    const filters: any = {
      search: searchQuery || localSearch,
      zoneId: selectedZone !== 'all' ? selectedZone : undefined,
      wardId: selectedWard !== 'all' ? selectedWard : undefined,
      unassigned: showUnassigned,
    };
    console.log('🔍 Applying filters:', filters);
    onFetchPollingUnits(1, filters);
  }, [searchQuery, localSearch, selectedZone, selectedWard, showUnassigned, onFetchPollingUnits]);

  // Only call handleFilterChange when specific dependencies change
  useEffect(() => {
    // Skip initial render
    if (!initialFetchDone.current) return;
    handleFilterChange();
  }, [selectedZone, selectedWard, showUnassigned]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    const filters = {
      search: searchQuery || localSearch,
      zoneId: selectedZone !== 'all' ? selectedZone : undefined,
      wardId: selectedWard !== 'all' ? selectedWard : undefined,
      unassigned: showUnassigned,
    };
    onPageChange(newPage, filters);
  };

  const handleLimitChange = (limit: string) => {
    const newLimit = parseInt(limit);
    const filters = {
      search: searchQuery || localSearch,
      zoneId: selectedZone !== 'all' ? selectedZone : undefined,
      wardId: selectedWard !== 'all' ? selectedWard : undefined,
      unassigned: showUnassigned,
      limit: newLimit,
    };
    onFetchPollingUnits(1, filters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    onFetchPollingUnits(1, { 
      search: localSearch,
      zoneId: selectedZone !== 'all' ? selectedZone : undefined,
      wardId: selectedWard !== 'all' ? selectedWard : undefined,
    });
  };

  const clearFilters = () => {
    setLocalSearch('');
    setSearchQuery('');
    setSelectedZone('all');
    setSelectedWard('all');
    onFetchPollingUnits(1, {});
  };

  const hasActiveFilters = searchQuery || 
    (selectedZone && selectedZone !== 'all') || 
    (selectedWard && selectedWard !== 'all');

  // Get active filter count
  const activeFilterCount = [
    searchQuery ? 1 : 0,
    selectedZone !== 'all' ? 1 : 0,
    selectedWard !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const startItem = (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

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
                  onClick={onToggleUnassigned}
                  className={showUnassigned ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' : ''}
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
                  // When ward changes, fetch polling units with ward filter
                  onFetchPollingUnits(1, { 
                    wardId: value !== 'all' ? value : undefined,
                    zoneId: selectedZone !== 'all' ? selectedZone : undefined,
                    search: searchQuery || localSearch,
                  });
                }}
                disabled={!selectedZone || selectedZone === 'all'}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={selectedZone && selectedZone !== 'all' ? "Filter by ward" : "Select zone first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {filteredWards.map((ward) => (
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
                        handleFilterChange();
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
                    Ward: {wards.find(w => w.id === selectedWard)?.name}
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
          onRefresh();
          setIsCreatePUOpen(false);
        }}
      />

      <EditPollingUnitDialog
        open={isEditPUOpen}
        onOpenChange={setIsEditPUOpen}
        pollingUnit={editingPU}
        onSuccess={() => {
          onRefresh();
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
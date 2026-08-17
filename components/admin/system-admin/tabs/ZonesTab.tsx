// components/admin/system-admin/tabs/ZonesTab.tsx

import React, { useState } from 'react';
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
} from 'lucide-react';
import { CreateZoneDialog } from '../dialogs/CreateZoneDialog';
import { EditZoneDialog } from '../dialogs/EditZoneDialog';
import { ViewZoneDialog } from '../dialogs/ViewZoneDialog';
import { Zone, Pagination } from '../types';
import { Badge } from '@/components/ui/badge';

interface ZonesTabProps {
  zones: Zone[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onDelete: (type: string, id: string, name: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const ZonesTab: React.FC<ZonesTabProps> = ({
  zones,
  pagination,
  onPageChange,
  onRefresh,
  onDelete,
  searchQuery,
  setSearchQuery,
}) => {
  const [viewingZone, setViewingZone] = useState<Zone | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isViewZoneOpen, setIsViewZoneOpen] = useState(false);
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setLocalSearch(value);
    setSearchQuery(value);
  };

  const filteredZones = zones.filter((zone) =>
    zone.name.toLowerCase().includes(localSearch.toLowerCase())
  );

  // Calculate polling unit count for a zone
  const getPollingUnitCount = (zone: Zone): number => {
    if (zone.pollingUnits) {
      return zone.pollingUnits.length;
    }
    
    // If pollingUnits is not directly available, calculate from wards
    if (zone.wards) {
      return zone.wards.reduce((total, ward) => {
        return total + (ward.pollingUnits?.length || 0);
      }, 0);
    }
    
    return 0;
  };

  // Calculate ward count for a zone
  const getWardCount = (zone: Zone): number => {
    return zone.wards?.length || 0;
  };

  const startItem = (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Zone Management
                </CardTitle>
                <CardDescription>
                  Manage all electoral zones
                  {pagination.total > 0 && (
                    <span className="ml-2 font-medium text-foreground">
                      ({pagination.total} total)
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateZoneOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search zones..."
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
                <TableHead>Zone Name</TableHead>
                <TableHead className="text-center">Wards</TableHead>
                <TableHead className="text-center">Polling Units</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

<TableBody>
  {filteredZones.length === 0 ? (
    <TableRow>
      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-lg font-medium">No zones found</p>
        <p className="text-sm">
          {localSearch ? 'Try adjusting your search' : 'Get started by creating your first zone'}
        </p>
      </TableCell>
    </TableRow>
  ) : (
    filteredZones.map((zone) => {
      // ✅ Use the new field names from the backend
      const wardCount = zone.wardCount || zone.wards?.length || 0;
      const puCount = zone.pollingUnitCount || 0;
      
      return (
        <TableRow key={zone.id} className="hover:bg-muted/50 transition-colors">
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {zone.name}
            </div>
          </TableCell>
          <TableCell className="text-center">
            <Badge variant="secondary" className="font-mono">
              {wardCount}
            </Badge>
          </TableCell>
          <TableCell className="text-center">
            <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 font-mono">
              {puCount}
            </Badge>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {zone.createdAt ? new Date(zone.createdAt).toLocaleDateString() : '-'}
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
                    setViewingZone(zone);
                    setIsViewZoneOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditingZone(zone);
                    setIsEditZoneOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Zone
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete('zone', zone.id, zone.name)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Zone
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

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {startItem} - {endItem} of {pagination.total} zones
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(pagination.page - 1)}
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
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateZoneDialog
        open={isCreateZoneOpen}
        onOpenChange={setIsCreateZoneOpen}
        onSuccess={onRefresh}
      />

      <EditZoneDialog
        open={isEditZoneOpen}
        onOpenChange={setIsEditZoneOpen}
        zone={editingZone}
        onSuccess={onRefresh}
      />

      <ViewZoneDialog
        open={isViewZoneOpen}
        onOpenChange={setIsViewZoneOpen}
        zone={viewingZone}
      />
    </>
  );
};
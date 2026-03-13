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
import { Plus, MoreVertical, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CreateZoneDialog } from '../dialogs/CreateZoneDialog';
import { EditZoneDialog } from '../dialogs/EditZoneDialog';
import { ViewZoneDialog } from '../dialogs/ViewZoneDialog';
import { Zone, Pagination } from '../types';

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

  const filteredZones = zones.filter((zone) =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zone Management</CardTitle>
              <CardDescription>Manage all electoral zones</CardDescription>
            </div>
            <Button onClick={() => setIsCreateZoneOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Wards</TableHead>
                <TableHead>Polling Units</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredZones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell>{zone.wards?.length || 0}</TableCell>
                  <TableCell>
                    {zone.wards?.reduce((acc, ward) => acc + (ward.pollingUnits?.length || 0), 0) ||
                      0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {zone.createdAt ? new Date(zone.createdAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
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
                          className="text-destructive"
                          onClick={() => onDelete('zone', zone.id, zone.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Zone
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
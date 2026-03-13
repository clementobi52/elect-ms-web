// components/admin/system-admin/tabs/PollingUnitsTab.tsx
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

  const handlePageChange = (newPage: number) => {
    const filters = showUnassigned
      ? {}
      : {
          zoneId: selectedZone !== 'all' && selectedZone ? selectedZone : undefined,
          wardId: selectedWard !== 'all' && selectedWard ? selectedWard : undefined,
          search: searchQuery,
        };
    onPageChange(newPage, filters);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Polling Unit Management</CardTitle>
              <CardDescription>Manage all polling units</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant={showUnassigned ? 'default' : 'outline'} size="sm" onClick={onToggleUnassigned}>
                {showUnassigned ? 'Show All' : 'Show Unassigned'}
              </Button>
              <Button onClick={() => setIsCreatePUOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Polling Unit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <Input
              placeholder="Search polling units..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onFetchPollingUnits(1, { search: e.target.value });
              }}
              className="max-w-sm"
            />
            <Select
              value={selectedZone}
              onValueChange={(value) => {
                setSelectedZone(value);
                onFetchPollingUnits(1, { zoneId: value });
              }}
            >
              <SelectTrigger className="w-[200px]">
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
                onFetchPollingUnits(1, { wardId: value });
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by ward" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {wards.map((ward) => (
                  <SelectItem key={ward.id} value={ward.id}>
                    {ward.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Polling Unit</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pollingUnits.map((pu) => (
                <TableRow key={pu.id}>
                  <TableCell className="font-medium">{pu.name}</TableCell>
                  <TableCell>{pu.code || '-'}</TableCell>
                  <TableCell>{pu.ward?.name || '-'}</TableCell>
                  <TableCell>{pu.ward?.zone?.name || '-'}</TableCell>
                  <TableCell>
                    {pu.latitude?.toFixed(4)}, {pu.longitude?.toFixed(4)}
                  </TableCell>
                  <TableCell>
                    {pu.agent ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(pu.agent.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{pu.agent.name}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Unassigned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pu.createdAt ? new Date(pu.createdAt).toLocaleDateString() : '-'}
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
                          Edit Polling Unit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete('pollingUnit', pu.id, pu.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
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
                onClick={() => handlePageChange(pagination.page - 1)}
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
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePollingUnitDialog
        open={isCreatePUOpen}
        onOpenChange={setIsCreatePUOpen}
        wards={wards}
        onSuccess={onRefresh}
      />

      <EditPollingUnitDialog
        open={isEditPUOpen}
        onOpenChange={setIsEditPUOpen}
        pollingUnit={editingPU}
        onSuccess={onRefresh}
      />

      <ViewPollingUnitDialog
        open={isViewPUOpen}
        onOpenChange={setIsViewPUOpen}
        pollingUnit={viewingPU}
      />
    </>
  );
};
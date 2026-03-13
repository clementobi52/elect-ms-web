// components/admin/system-admin/tabs/WardsTab.tsx
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import { CreateWardDialog } from '../dialogs/CreateWardDialog';
import { EditWardDialog } from '../dialogs/EditWardDialog';
import { ViewWardDialog } from '../dialogs/ViewWardDialog';
import { Ward, Zone } from '../types';

interface WardsTabProps {
  wards: Ward[];
  zones: Zone[];
  onRefresh: () => void;
  onDelete: (type: string, id: string, name: string) => void;
  onFetchWardsInZone: (zoneId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedZone: string;
  setSelectedZone: (zone: string) => void;
}

export const WardsTab: React.FC<WardsTabProps> = ({
  wards,
  zones,
  onRefresh,
  onDelete,
  onFetchWardsInZone,
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

  const filteredWards = wards.filter(
    (ward) =>
      ward.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedZone === 'all' || selectedZone === '' || ward.zoneId === selectedZone)
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ward Management</CardTitle>
              <CardDescription>Manage all electoral wards</CardDescription>
            </div>
            <Button onClick={() => setIsCreateWardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ward
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <Input
              placeholder="Search wards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select
              value={selectedZone}
              onValueChange={(value) => {
                setSelectedZone(value);
                if (value && value !== 'all') onFetchWardsInZone(value);
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
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ward</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Polling Units</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWards.map((ward) => (
                <TableRow key={ward.id}>
                  <TableCell className="font-medium">{ward.name}</TableCell>
                  <TableCell>{ward.zone?.name || '-'}</TableCell>
                  <TableCell>{ward.pollingUnits?.length || 0}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ward.createdAt ? new Date(ward.createdAt).toLocaleDateString() : '-'}
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
                          className="text-destructive"
                          onClick={() => onDelete('ward', ward.id, ward.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Ward
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateWardDialog
        open={isCreateWardOpen}
        onOpenChange={setIsCreateWardOpen}
        zones={zones}
        onSuccess={onRefresh}
      />

      <EditWardDialog
        open={isEditWardOpen}
        onOpenChange={setIsEditWardOpen}
        ward={editingWard}
        onSuccess={onRefresh}
      />

      <ViewWardDialog
        open={isViewWardOpen}
        onOpenChange={setIsViewWardOpen}
        ward={viewingWard}
      />
    </>
  );
};
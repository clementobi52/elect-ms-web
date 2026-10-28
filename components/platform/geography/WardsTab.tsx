"use client";

import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MoreVertical, Edit, Trash2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getPlatformToken } from '@/lib/platform/session';
import { API_BASE_URL } from '@/lib/config';

interface Ward {
  id: string;
  name: string;
  code?: string;
  zoneId?: string;
  lgaId?: string;
  Zone?: { name: string };
  LGA?: { name: string };
}

interface Zone {
  id: string;
  name: string;
}

export default function WardsTab() {
  const { toast } = useToast();
  const [wards, setWards] = useState<Ward[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', zoneId: '' });

  const fetchWards = async () => {
    try {
      const token = getPlatformToken();
      const response = await fetch(`${API_BASE_URL}/platform/wards`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setWards(data.wards || data.data || []);
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const token = getPlatformToken();
      const response = await fetch(`${API_BASE_URL}/platform/zones`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  useEffect(() => {
    fetchWards();
    fetchZones();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const token = getPlatformToken();
      const response = await fetch(`${API_BASE_URL}/platform/wards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Ward created successfully' });
        setIsCreateOpen(false);
        setFormData({ name: '', code: '', zoneId: '' });
        fetchWards();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create ward');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create ward',
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWard) return;
    setFormLoading(true);

    try {
      const token = getPlatformToken();
      const response = await fetch(`${API_BASE_URL}/platform/wards/${selectedWard.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Ward updated successfully' });
        setIsEditOpen(false);
        setSelectedWard(null);
        setFormData({ name: '', code: '', zoneId: '' });
        fetchWards();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update ward');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update ward',
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (ward: Ward) => {
    if (!confirm(`Are you sure you want to delete ${ward.name}?`)) return;

    try {
      const token = getPlatformToken();
      const response = await fetch(`${API_BASE_URL}/platform/wards/${ward.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Ward deleted successfully' });
        fetchWards();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete ward',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (ward: Ward) => {
    setSelectedWard(ward);
    setFormData({ name: ward.name, code: ward.code || '', zoneId: ward.zoneId || '' });
    setIsEditOpen(true);
  };

  const filteredWards = wards.filter(ward =>
    ward.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Wards</CardTitle>
              <CardDescription>Manage all wards globally</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ward
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ward Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>LGA</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWards.map((ward) => (
                <TableRow key={ward.id}>
                  <TableCell className="font-medium">{ward.name}</TableCell>
                  <TableCell>{ward.code || '-'}</TableCell>
                  <TableCell>{ward.Zone?.name || '-'}</TableCell>
                  <TableCell>{ward.LGA?.name || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(ward)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(ward)}
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ward</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ward Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Select value={formData.zoneId} onValueChange={(value) => setFormData({ ...formData, zoneId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ward</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Ward Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zone">Zone</Label>
                <Select value={formData.zoneId} onValueChange={(value) => setFormData({ ...formData, zoneId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { getPlatformToken } from '@/lib/platform/session';
import { API_BASE_URL } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function ZonesTab() {
  const { toast } = useToast();
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  useEffect(() => {
    fetchZones();
  }, [page, search]);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const token = getPlatformToken();
      const res = await fetch(`${API_BASE_URL}/platform/zones/paginated?search=${search}&page=${page}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setZones(Array.isArray(data.zones) ? data.zones : Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
      setTotal(data.total || (Array.isArray(data.zones) ? data.zones.length : Array.isArray(data.wards) ? data.wards.length : Array.isArray(data) ? data.length : 0));
      setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast({ title: 'Error', description: 'Failed to fetch zones', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getPlatformToken();
      const url = editingZone
        ? `${API_BASE_URL}/platform/zones/${editingZone.id}`
        : `${API_BASE_URL}/platform/zones`;
      const method = editingZone ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast({ title: 'Success', description: `Zone ${editingZone ? 'updated' : 'created'} successfully` });
        setDialogOpen(false);
        setEditingZone(null);
        setFormData({ name: '', code: '' });
        fetchZones();
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Operation failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;
    try {
      const token = getPlatformToken();
      const res = await fetch(`${API_BASE_URL}/platform/zones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Zone deleted successfully' });
        fetchZones();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete zone', variant: 'destructive' });
    }
  };

  const openEdit = (zone: any) => {
    setEditingZone(zone);
    setFormData({ name: zone.name, code: zone.code || '' });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Zones ({total})</CardTitle>
          <Button onClick={() => { setEditingZone(null); setFormData({ name: '', code: '' }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search zones..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : zones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No zones found</TableCell>
              </TableRow>
            ) : (
              zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell>{zone.code || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(zone)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(zone.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPage(p => Math.max(1, p-1))} />
                </PaginationItem>
                {[...Array(Math.min(5, totalPages))].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink onClick={() => setPage(i+1)} isActive={page === i+1}>
                      {i+1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p+1))} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingZone ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

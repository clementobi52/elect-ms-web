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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function WardsTab() {
  const { toast } = useToast();
  const [wards, setWards] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWard, setEditingWard] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '', zoneId: '' });

  useEffect(() => {
    fetchWards();
    fetchZones();
  }, [page, search]);

  const fetchWards = async () => {
    try {
      setLoading(true);
      const token = getPlatformToken();
      const res = await fetch(`${API_BASE_URL}/platform/wards?search=${search}&page=${page}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWards(Array.isArray(data.wards) ? data.wards : Array.isArray(data.data) ? data.data : []);
      setTotal(data.total || data.pagination?.total || (Array.isArray(data.wards) ? data.wards.length : Array.isArray(data.data) ? data.data.length : 0));
      setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching wards:', error);
      toast({ title: 'Error', description: 'Failed to fetch wards', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const token = getPlatformToken();
      const res = await fetch(`${API_BASE_URL}/platform/zones?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setZones(Array.isArray(data.zones) ? data.zones : Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []));
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getPlatformToken();
      const url = editingWard
        ? `${API_BASE_URL}/platform/wards/${editingWard.id}`
        : `${API_BASE_URL}/platform/wards`;
      const method = editingWard ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast({ title: 'Success', description: `Ward ${editingWard ? 'updated' : 'created'} successfully` });
        setDialogOpen(false);
        setEditingWard(null);
        setFormData({ name: '', code: '', zoneId: '' });
        fetchWards();
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Operation failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ward?')) return;
    try {
      const token = getPlatformToken();
      const res = await fetch(`${API_BASE_URL}/platform/wards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Ward deleted successfully' });
        fetchWards();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete ward', variant: 'destructive' });
    }
  };

  const openEdit = (ward: any) => {
    setEditingWard(ward);
    setFormData({ name: ward.name, code: ward.code || '', zoneId: ward.zoneId || '' });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Wards ({total})</CardTitle>
          <Button onClick={() => { setEditingWard(null); setFormData({ name: '', code: '', zoneId: '' }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Ward
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search wards..."
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
              <TableHead>Zone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : wards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No wards found</TableCell>
              </TableRow>
            ) : (
              wards.map((ward) => (
                <TableRow key={ward.id}>
                  <TableCell className="font-medium">{ward.name}</TableCell>
                  <TableCell>{ward.code || '-'}</TableCell>
                  <TableCell>{ward.zone?.name || zones.find(z => z.id === ward.zoneId)?.name || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(ward)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(ward.id)}>
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
            <DialogTitle>{editingWard ? 'Edit Ward' : 'Add Ward'}</DialogTitle>
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
              <div>
                <Label htmlFor="zoneId">Zone</Label>
                <Select value={formData.zoneId} onValueChange={(value) => setFormData({ ...formData, zoneId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingWard ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

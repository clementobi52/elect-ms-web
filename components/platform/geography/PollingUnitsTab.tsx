"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export default function PollingUnitsTab() {
  const { toast } = useToast();
  const [pollingUnits, setPollingUnits] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPU, setEditingPU] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '', wardId: '', address: '' });

  useEffect(() => {
    fetchPollingUnits();
    fetchWards();
  }, [page, search]);

  const fetchPollingUnits = async () => {
    try {
      setLoading(true);
      const token = getPlatformToken();
      const res = await fetch(`${API_BASE_URL}/platform/polling-units?search=${search}&page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPollingUnits(Array.isArray(data.pollingUnits) ? data.pollingUnits : Array.isArray(data.data) ? data.data : []);
      setTotal(data.total || data.pagination?.total || 0);
      setTotalPages(data.totalPages || data.pagination?.totalPages || Math.ceil((data.total || data.pagination?.total || 0) / limit));
    } catch (error) {
      console.error('Error fetching polling units:', error);
      toast({ title: 'Error', description: 'Failed to fetch polling units', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWards = async () => {
    try {
      const token = getPlatformToken();
      const res = await fetch(`${API_BASE_URL}/platform/wards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWards(Array.isArray(data.wards) ? data.wards : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getPlatformToken();
      const url = editingPU
        ? `${API_BASE_URL}/platform/polling-units/${editingPU.id}`
        : `${API_BASE_URL}/platform/polling-units`;
      const method = editingPU ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast({ title: 'Success', description: `Polling Unit ${editingPU ? 'updated' : 'created'} successfully` });
        setDialogOpen(false);
        setEditingPU(null);
        setFormData({ name: '', code: '', wardId: '', address: '' });
        fetchPollingUnits();
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Operation failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this polling unit?')) return;
    try {
      const token = getPlatformToken();
      const res = await fetch(`${API_BASE_URL}/platform/polling-units/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Polling Unit deleted successfully' });
        fetchPollingUnits();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete polling unit', variant: 'destructive' });
    }
  };

  const openEdit = (pu: any) => {
    setEditingPU(pu);
    setFormData({ name: pu.name, code: pu.code || '', wardId: pu.wardId || '', address: pu.address || '' });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Polling Units ({total})</CardTitle>
          <Button onClick={() => { setEditingPU(null); setFormData({ name: '', code: '', wardId: '', address: '' }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Polling Unit
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search polling units..."
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
              <TableHead>Ward</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : pollingUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No polling units found</TableCell>
              </TableRow>
            ) : (
              pollingUnits.map((pu) => (
                <TableRow key={pu.id}>
                  <TableCell className="font-medium">{pu.name}</TableCell>
                  <TableCell>{pu.code || '-'}</TableCell>
                  <TableCell>{pu.ward?.name || '-'}</TableCell>
                  <TableCell>{pu.ward?.zone?.name || '-'}</TableCell>
                  <TableCell>
                    {pu.electionResult || pu.latestResult ? (
                      <Badge variant="default">Has Result</Badge>
                    ) : (
                      <Badge variant="secondary">No Result</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(pu)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(pu.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPage(p => Math.max(1, p-1))} />
                </PaginationItem>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink onClick={() => setPage(pageNum)} isActive={page === pageNum}>
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
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
            <DialogTitle>{editingPU ? 'Edit Polling Unit' : 'Add Polling Unit'}</DialogTitle>
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
                <Label htmlFor="wardId">Ward</Label>
                <Select value={formData.wardId} onValueChange={(value) => setFormData({ ...formData, wardId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingPU ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

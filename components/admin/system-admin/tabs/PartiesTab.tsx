// components/admin/system-admin/tabs/PartiesTab.tsx
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MoreVertical, Eye, Edit, Trash2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Party } from '../types';

interface PartiesTabProps {
  parties: Party[];
  onRefresh: () => void;
  onDelete: (type: string, id: string, name: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const PartiesTab: React.FC<PartiesTabProps> = ({
  parties,
  onRefresh,
  onDelete,
  searchQuery,
  setSearchQuery,
}) => {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    slogan: '',
    registrationNumber: '',
  });

  const filteredParties = parties.filter(party =>
    party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.slogan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      
      // Log for debugging
      console.log('Creating party with data:', formData);
      console.log('Auth token:', token ? 'Present' : 'Missing');

      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/parties/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      // Log response status
      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create party (Status: ${response.status})`);
      }

      const data = await response.json();
      console.log('Party created successfully:', data);

      toast({ 
        title: 'Success', 
        description: 'Party created successfully' 
      });
      
      setIsCreateOpen(false);
      setFormData({ name: '', logoUrl: '', slogan: '', registrationNumber: '' });
      onRefresh();
    } catch (error) {
      console.error('Error creating party:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create party',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/parties/${selectedParty.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update party');
      }

      toast({ title: 'Success', description: 'Party updated successfully' });
      setIsEditOpen(false);
      setSelectedParty(null);
      setFormData({ name: '', logoUrl: '', slogan: '', registrationNumber: '' });
      onRefresh();
    } catch (error) {
      console.error('Error updating party:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update party',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (party: Party) => {
    setSelectedParty(party);
    setIsViewOpen(true);
  };

  const handleEdit = (party: Party) => {
    setSelectedParty(party);
    setFormData({
      name: party.name,
      logoUrl: party.logoUrl || '',
      slogan: party.slogan || '',
      registrationNumber: party.registrationNumber || '',
    });
    setIsEditOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Party Management</CardTitle>
              <CardDescription>Manage all political parties</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Slogan</TableHead>
                <TableHead>Registration #</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No parties found
                  </TableCell>
                </TableRow>
              ) : (
                filteredParties.map((party) => (
                  <TableRow key={party.id}>
                    <TableCell>
                      {party.logoUrl ? (
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                          <img
                            src={party.logoUrl}
                            alt={party.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">
                            {party.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>{party.slogan || '-'}</TableCell>
                    <TableCell>{party.registrationNumber || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {party.createdAt ? new Date(party.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(party)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(party)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Party
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete('party', party.id, party.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Party
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Party Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Party</DialogTitle>
            <DialogDescription>Add a new political party to the system</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Party Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter party name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slogan">Slogan</Label>
                <Textarea
                  id="slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  placeholder="Enter party slogan"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input
                  id="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  placeholder="Enter registration number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Party'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Party Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Party</DialogTitle>
            <DialogDescription>Update party information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Party Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-logoUrl">Logo URL</Label>
                <Input
                  id="edit-logoUrl"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slogan">Slogan</Label>
                <Textarea
                  id="edit-slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-registrationNumber">Registration Number</Label>
                <Input
                  id="edit-registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Party'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Party Dialog */}
<Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Party Details</DialogTitle>
      <DialogDescription className="sr-only">
        View detailed information about {selectedParty?.name || 'the party'}
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      {selectedParty?.logoUrl && (
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-2 border-primary/20">
            <img
              src={selectedParty.logoUrl}
              alt={selectedParty.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div className="font-medium">Name:</div>
        <div className="col-span-2">{selectedParty?.name}</div>

        <div className="font-medium">Slogan:</div>
        <div className="col-span-2">{selectedParty?.slogan || '-'}</div>

        <div className="font-medium">Registration #:</div>
        <div className="col-span-2">{selectedParty?.registrationNumber || '-'}</div>

        <div className="font-medium">ID:</div>
        <div className="col-span-2 text-xs break-all">{selectedParty?.id}</div>

        <div className="font-medium">Created:</div>
        <div className="col-span-2">
          {selectedParty?.createdAt ? new Date(selectedParty.createdAt).toLocaleString() : '-'}
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button onClick={() => setIsViewOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </>
  );
};
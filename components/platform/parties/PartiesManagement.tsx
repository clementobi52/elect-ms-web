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
import { Textarea } from '@/components/ui/textarea';
import { Plus, MoreVertical, Edit, Trash2, Search, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getPlatformToken } from '@/lib/platform/session';
import { API_BASE_URL } from '@/lib/config';

interface Party {
  id: string;
  name: string;
  logoUrl?: string;
  slogan?: string;
  registrationNumber?: string;
  createdAt?: string;
}

export default function PartiesManagement() {
  const { toast } = useToast();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    slogan: '',
    registrationNumber: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const fetchParties = async () => {
    try {
      const token = getPlatformToken();
      const response = await fetch(`${API_BASE_URL}/platform/parties`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setParties(data.parties || []);
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setFormData({ ...formData, logoUrl: '' });
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setFormData({ ...formData, logoUrl: '' });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const token = getPlatformToken();
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('slogan', formData.slogan || '');
      formDataToSend.append('registrationNumber', formData.registrationNumber || '');
      if (formData.logoUrl) {
        formDataToSend.append('logoUrl', formData.logoUrl);
      }
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }

      const response = await fetch(`${API_BASE_URL}/platform/parties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Party created successfully' });
        setIsCreateOpen(false);
        setFormData({ name: '', logoUrl: '', slogan: '', registrationNumber: '' });
        setLogoFile(null);
        setLogoPreview('');
        fetchParties();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create party');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create party',
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    setFormLoading(true);

    try {
      const token = getPlatformToken();
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('slogan', formData.slogan || '');
      formDataToSend.append('registrationNumber', formData.registrationNumber || '');
      if (formData.logoUrl) {
        formDataToSend.append('logoUrl', formData.logoUrl);
      }
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }

      const response = await fetch(`${API_BASE_URL}/platform/parties/${selectedParty.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Party updated successfully' });
        setIsEditOpen(false);
        setSelectedParty(null);
        setFormData({ name: '', logoUrl: '', slogan: '', registrationNumber: '' });
        setLogoFile(null);
        setLogoPreview('');
        fetchParties();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update party');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update party',
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (party: Party) => {
    if (!confirm(`Are you sure you want to delete ${party.name}?`)) return;

    try {
      const token = getPlatformToken();
      const response = await fetch(`${API_BASE_URL}/platform/parties/${party.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Party deleted successfully' });
        fetchParties();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete party',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (party: Party) => {
    setSelectedParty(party);
    setFormData({
      name: party.name,
      logoUrl: party.logoUrl || '',
      slogan: party.slogan || '',
      registrationNumber: party.registrationNumber || '',
    });
    setLogoFile(null);
    setLogoPreview(party.logoUrl || '');
    setIsEditOpen(true);
  };

  const filteredParties = parties.filter(party =>
    party.name.toLowerCase().includes(searchQuery.toLowerCase())
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
              <CardTitle>Political Parties</CardTitle>
              <CardDescription>Manage all political parties globally</CardDescription>
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParties.map((party) => (
                <TableRow key={party.id}>
                  <TableCell>
                    {party.logoUrl ? (
                      <img
                        src={party.logoUrl}
                        alt={party.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(party)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(party)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Party</DialogTitle>
            <DialogDescription>Add a new political party</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Party Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                {logoPreview ? (
                  <div className="relative w-24 h-24 mx-auto">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <Input
                      id="logoFile"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="logoFile" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm">Upload logo</span>
                    </Label>
                  </div>
                )}
                <Input
                  value={formData.logoUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, logoUrl: e.target.value });
                    if (e.target.value) {
                      setLogoFile(null);
                      setLogoPreview(e.target.value);
                    }
                  }}
                  placeholder="Or enter logo URL"
                  disabled={!!logoFile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slogan">Slogan</Label>
                <Textarea
                  id="slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg">Registration Number</Label>
                <Input
                  id="reg"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Party</DialogTitle>
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
                <Label>Logo</Label>
                {logoPreview ? (
                  <div className="relative w-24 h-24 mx-auto">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <Input
                      id="edit-logoFile"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="edit-logoFile" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm">Upload logo</span>
                    </Label>
                  </div>
                )}
                <Input
                  value={formData.logoUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, logoUrl: e.target.value });
                    if (e.target.value) {
                      setLogoFile(null);
                      setLogoPreview(e.target.value);
                    }
                  }}
                  placeholder="Or enter logo URL"
                  disabled={!!logoFile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slogan">Slogan</Label>
                <Textarea
                  id="edit-slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reg">Registration Number</Label>
                <Input
                  id="edit-reg"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                />
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

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
import { Plus, MoreVertical, Eye, Edit, Trash2, Search, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { withTenantHeaders } from '@/lib/tenant';
import { Party } from '../types';
import { API_BASE_URL, API_ORIGIN } from '@/lib/config';

interface PartiesTabProps {
  parties: Party[];
  onRefresh: () => void;
  onDelete: (type: string, id: string, name: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}


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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const filteredParties = parties.filter(party =>
    party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.slogan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAuthHeaders = (includeContentType: boolean = true) => {
    const token = localStorage.getItem('authToken');
    const headers: any = {
      'Authorization': `Bearer ${token}`,
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return withTenantHeaders(headers);
  };

  const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_ORIGIN}${url.startsWith('/') ? url : '/' + url}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

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

      const response = await fetch(`${API_BASE_URL}/parties/add`, {
        method: 'POST',
        headers: getAuthHeaders(false),
        body: formDataToSend,
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
      setLogoFile(null);
      setLogoPreview('');
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

      const response = await fetch(`${API_BASE_URL}/parties/${selectedParty.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(false),
        body: formDataToSend,
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
      setLogoFile(null);
      setLogoPreview('');
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
    setLogoFile(null);
    setLogoPreview(party.logoUrl || '');
    setIsEditOpen(true);
  };

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
                            src={getImageUrl(party.logoUrl)}
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
                <Label>Party Logo</Label>
                {logoPreview ? (
                  <div className="relative w-24 h-24 mx-auto">
                    <img
                      src={getImageUrl(logoPreview)}
                      alt="Logo preview"
                      className="w-full h-full object-cover rounded-full border-2 border-primary/20"
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Input
                      id="logoFile"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="logoFile" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload logo image</span>
                      <span className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</span>
                    </Label>
                  </div>
                )}
                <div className="text-center text-xs text-gray-500">or</div>
                <Input
                  value={formData.logoUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, logoUrl: e.target.value });
                    if (e.target.value) {
                      setLogoFile(null);
                      setLogoPreview(e.target.value);
                    }
                  }}
                  placeholder="Enter logo URL"
                  disabled={!!logoFile}
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
                <Label>Party Logo</Label>
                {logoPreview ? (
                  <div className="relative w-24 h-24 mx-auto">
                    <img
                      src={getImageUrl(logoPreview)}
                      alt="Logo preview"
                      className="w-full h-full object-cover rounded-full border-2 border-primary/20"
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Input
                      id="edit-logoFile"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="edit-logoFile" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload logo image</span>
                      <span className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</span>
                    </Label>
                  </div>
                )}
                <div className="text-center text-xs text-gray-500">or</div>
                <Input
                  value={formData.logoUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, logoUrl: e.target.value });
                    if (e.target.value) {
                      setLogoFile(null);
                      setLogoPreview(e.target.value);
                    }
                  }}
                  placeholder="Enter logo URL"
                  disabled={!!logoFile}
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
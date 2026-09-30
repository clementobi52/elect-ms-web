// components/admin/system-admin/dialogs/CreatePollingUnitDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelectServer } from '@/components/ui/searchable-select-server';
import { useToast } from '@/components/ui/use-toast';
import { searchWards } from '@/lib/api/pollingUnits';
import { Ward } from '../types';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';

interface CreatePollingUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wards: Ward[];
  onSuccess: () => void;
}


export const CreatePollingUnitDialog: React.FC<CreatePollingUnitDialogProps> = ({
  open,
  onOpenChange,
  wards,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    wardId: '',
    latitude: '',
    longitude: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/polling-units`, {
        method: 'POST',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          name: formData.name,
          wardId: formData.wardId,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create polling unit');
      }

      toast({
        title: '✅ Success',
        description: 'Polling unit created successfully',
      });

      onOpenChange(false);
      setFormData({ name: '', wardId: '', latitude: '', longitude: '' });
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create polling unit',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Polling Unit</DialogTitle>
          <DialogDescription>Add a new polling unit to the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Polling Unit Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Polling Unit Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter polling unit name"
                required
              />
            </div>

            {/* Ward Selection with Search */}
            <div className="space-y-2">
              <Label>Ward *</Label>
              <SearchableSelectServer
                value={formData.wardId}
                onChange={(value) => setFormData({ ...formData, wardId: value })}
                fetchOptions={searchWards}
                placeholder="Search and select ward..."
                searchPlaceholder="Search by ward name..."
                emptyMessage="No wards found"
                initialOptions={wards.slice(0, 20)}
              />
              <p className="text-xs text-muted-foreground">
                Type at least 2 characters to search among {wards.length.toLocaleString()} wards
              </p>
            </div>

            {/* Latitude */}
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="e.g., 6.5244"
                required
              />
            </div>

            {/* Longitude */}
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="e.g., 3.3792"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Polling Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
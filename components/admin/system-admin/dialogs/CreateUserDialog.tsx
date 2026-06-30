// components/admin/system-admin/dialogs/CreateUserDialog.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ROLES } from '@/lib/types';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: any[];
  wards: any[];
  pollingUnits: any[];
  onSuccess: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper function to get database role value
const getDatabaseRole = (roleKey: string): string => {
  switch (roleKey) {
    case ROLES.POLLING_AGENT:
      return 'Polling Agent';
    case ROLES.WARD_ADMIN:
      return 'Ward Admin';
    case ROLES.ZONE_ADMIN:
      return 'Zone Admin';
    case ROLES.SITUATION_ROOM:
      return 'Situation Room Admin';
    case ROLES.SYSTEM_ADMIN:
      return 'System Admin';
    default:
      return roleKey;
  }
};

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  zones,
  wards,
  pollingUnits,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    zoneId: '',
    wardId: '',
    pollingUnitId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate based on role
      if (formData.role === ROLES.ZONE_ADMIN && !formData.zoneId) {
        toast({
          title: 'Validation Error',
          description: 'Please select a zone for the Zone Admin',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (formData.role === ROLES.WARD_ADMIN && !formData.wardId) {
        toast({
          title: 'Validation Error',
          description: 'Please select a ward for the Ward Admin',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (formData.role === ROLES.POLLING_AGENT && !formData.pollingUnitId) {
        toast({
          title: 'Validation Error',
          description: 'Please select a polling unit for the Polling Agent',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('authToken');
      
      // Debug: Check if token exists
      console.log('Token exists:', !!token);
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'You are not logged in. Please log in again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const userData = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        password: formData.password,
        role: getDatabaseRole(formData.role),
        pollingUnitId: formData.pollingUnitId || null,
        wardId: formData.wardId || null,
        zoneId: formData.zoneId || null,
      };

      // Debug: Log the request details
      const url = `${API_BASE_URL}/admin/system/create-user`;
      console.log('Request URL:', url);
      console.log('Request data:', userData);
      console.log('Token (first 20 chars):', token.substring(0, 20) + '...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      // Debug: Log response status
      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);

      // Try to get the response text first for debugging
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Try to parse as JSON if possible
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // If not JSON, use the text as error message
        responseData = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || `Server error: ${response.status}`);
      }

      toast({
        title: 'Success',
        description: 'User created successfully',
      });

      onOpenChange(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        zoneId: '',
        wardId: '',
        pollingUnitId: '',
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new user to the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    role: value,
                    zoneId: '',
                    wardId: '',
                    pollingUnitId: '',
                  });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.POLLING_AGENT}>Polling Agent</SelectItem>
                  <SelectItem value={ROLES.WARD_ADMIN}>Ward Admin</SelectItem>
                  <SelectItem value={ROLES.ZONE_ADMIN}>Zone Admin</SelectItem>
                  <SelectItem value={ROLES.SITUATION_ROOM}>Situation Room</SelectItem>
                  <SelectItem value={ROLES.SYSTEM_ADMIN}>System Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Zone Admin Assignment */}
            {formData.role === ROLES.ZONE_ADMIN && (
              <div className="space-y-2">
                <Label>Assign Zone <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.zoneId}
                  onValueChange={(value) => setFormData({ ...formData, zoneId: value })}
                  required
                >
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
            )}

            {/* Ward Admin Assignment */}
            {formData.role === ROLES.WARD_ADMIN && (
              <div className="space-y-2">
                <Label>Assign Ward <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.wardId}
                  onValueChange={(value) => setFormData({ ...formData, wardId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>
                        {ward.name} {ward.zone ? `(${ward.zone.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Polling Agent Assignment */}
            {formData.role === ROLES.POLLING_AGENT && (
              <div className="space-y-2">
                <Label>Assign Polling Unit <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.pollingUnitId}
                  onValueChange={(value) => setFormData({ ...formData, pollingUnitId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select polling unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {pollingUnits.map((pu) => (
                      <SelectItem key={pu.id} value={pu.id}>
                        {pu.name} {pu.ward ? `(${pu.ward.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
// components/admin/system-admin/dialogs/EditUserDialog.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { ROLES } from '@/lib/types';
import { Loader2, MapPin, UserCog, Users, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
  zones?: any[];
  wards?: any[];
  pollingUnits?: any[];
  onRefresh?: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

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

// Helper function to get display role from database role
const getDisplayRole = (dbRole: string): string => {
  switch (dbRole) {
    case 'Polling Agent':
      return ROLES.POLLING_AGENT;
    case 'Ward Admin':
      return ROLES.WARD_ADMIN;
    case 'Zone Admin':
      return ROLES.ZONE_ADMIN;
    case 'Situation Room Admin':
      return ROLES.SITUATION_ROOM;
    case 'System Admin':
      return ROLES.SYSTEM_ADMIN;
    default:
      return dbRole;
  }
};

// Helper to get role color
const getRoleColor = (role: string): string => {
  switch (role) {
    case ROLES.SYSTEM_ADMIN:
      return 'bg-red-500';
    case ROLES.SITUATION_ROOM:
      return 'bg-purple-500';
    case ROLES.ZONE_ADMIN:
      return 'bg-blue-500';
    case ROLES.WARD_ADMIN:
      return 'bg-green-500';
    case ROLES.POLLING_AGENT:
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

// Helper to get zone ID from ward (handles multiple data structures)
const getWardZoneId = (ward: any): string | null => {
  if (!ward) return null;
  return ward.zoneId || 
         ward.zone?.id || 
         ward.zone?.zoneId || 
         ward.zone_id || 
         null;
};

// Helper to get ward ID from polling unit
const getPollingUnitWardId = (pu: any): string | null => {
  if (!pu) return null;
  return pu.wardId || 
         pu.ward?.id || 
         pu.ward?.wardId || 
         pu.ward_id || 
         null;
};

// Helper to get zone ID from polling unit (through ward)
const getPollingUnitZoneId = (pu: any): string | null => {
  if (!pu) return null;
  // Try to get zone from polling unit's ward
  if (pu.ward) {
    return getWardZoneId(pu.ward);
  }
  // If polling unit has zone directly
  return pu.zoneId || 
         pu.zone?.id || 
         pu.zone?.zoneId || 
         pu.zone_id || 
         null;
};

// Helper to get ward display name
const getWardDisplayName = (ward: any): string => {
  if (!ward) return 'Unknown';
  const zoneName = ward.zone?.name || ward.zone_name || '';
  return zoneName ? `${ward.name} (${zoneName})` : ward.name;
};

// Helper to get polling unit display name with ward and zone info
const getPollingUnitDisplayName = (pu: any): string => {
  if (!pu) return 'Unknown';
  const wardName = pu.ward?.name || pu.wardName || '';
  const zoneName = pu.ward?.zone?.name || pu.zone?.name || pu.zoneName || '';
  let display = pu.name;
  if (wardName) {
    display += ` (${wardName}`;
    if (zoneName) {
      display += `, ${zoneName}`;
    }
    display += ')';
  }
  return display;
};

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess,
  zones = [],
  wards = [],
  pollingUnits = [],
  onRefresh,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isFetchingWards, setIsFetchingWards] = useState(false);
  const [isFetchingPollingUnits, setIsFetchingPollingUnits] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    status: 'active',
    zoneId: '',
    wardId: '',
    pollingUnitId: '',
  });

  // Track if assignment has been changed
  const [assignmentChanged, setAssignmentChanged] = useState(false);
  
  // Local state for filtered data
  const [filteredWardsByZone, setFilteredWardsByZone] = useState<any[]>([]);
  const [filteredPollingUnitsByZoneAndWard, setFilteredPollingUnitsByZoneAndWard] = useState<any[]>([]);

  // Debug: Log the props
  useEffect(() => {
    console.log('🔍 EditUserDialog Props:', {
      zonesCount: zones?.length || 0,
      wardsCount: wards?.length || 0,
      pollingUnitsCount: pollingUnits?.length || 0,
      user: user?.name,
      userRole: user?.role,
    });
  }, [zones, wards, pollingUnits, user]);

  // Use useMemo to stabilize arrays
  const safeZones = useMemo(() => (Array.isArray(zones) ? zones : []), [zones]);
  const safeWards = useMemo(() => (Array.isArray(wards) ? wards : []), [wards]);
  const safePollingUnits = useMemo(() => (Array.isArray(pollingUnits) ? pollingUnits : []), [pollingUnits]);

  // Fetch wards by zone from API
  const fetchWardsByZone = useCallback(async (zoneId: string) => {
    if (!zoneId) {
      setFilteredWardsByZone(safeWards);
      return;
    }
    
    setIsFetchingWards(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/zone/${zoneId}/wards`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Wards fetched for zone:', zoneId, data);
        const wardsData = Array.isArray(data) ? data : data.wards || data.data || [];
        setFilteredWardsByZone(wardsData);
        setIsFetchingWards(false);
        return;
      }
    } catch (error) {
      console.error('Error fetching wards by zone:', error);
    }
    
    // Fallback: filter from existing wards
    const filtered = safeWards.filter((w: any) => getWardZoneId(w) === zoneId);
    setFilteredWardsByZone(filtered);
    setIsFetchingWards(false);
  }, [safeWards]);

  // Fetch polling units by ward from API
  const fetchPollingUnitsByWard = useCallback(async (wardId: string) => {
    if (!wardId) {
      setFilteredPollingUnitsByZoneAndWard(safePollingUnits);
      return;
    }
    
    setIsFetchingPollingUnits(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/ward/${wardId}/polling-units`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Polling units fetched for ward:', wardId, data);
        const puData = Array.isArray(data) ? data : data.pollingUnits || data.data || [];
        setFilteredPollingUnitsByZoneAndWard(puData);
        setIsFetchingPollingUnits(false);
        return;
      }
    } catch (error) {
      console.error('Error fetching polling units by ward:', error);
    }
    
    // Fallback: filter from existing polling units
    const filtered = safePollingUnits.filter((pu: any) => getPollingUnitWardId(pu) === wardId);
    setFilteredPollingUnitsByZoneAndWard(filtered);
    setIsFetchingPollingUnits(false);
  }, [safePollingUnits]);

  // Effect: Update filtered wards when zone changes
  useEffect(() => {
    if (formData.zoneId) {
      const filtered = safeWards.filter((w: any) => getWardZoneId(w) === formData.zoneId);
      
      if (filtered.length > 0) {
        console.log('📋 Found wards from existing data:', filtered.length);
        setFilteredWardsByZone(filtered);
      } else {
        console.log('📋 No wards found locally, fetching from API for zone:', formData.zoneId);
        fetchWardsByZone(formData.zoneId);
      }
    } else {
      setFilteredWardsByZone(safeWards);
    }
    
    // Clear polling units when zone changes
    setFilteredPollingUnitsByZoneAndWard([]);
  }, [formData.zoneId, safeWards, fetchWardsByZone]);

  // Effect: Update filtered polling units when ward changes
  useEffect(() => {
    if (formData.wardId) {
      // First, filter by the selected ward
      const filteredByWard = safePollingUnits.filter((pu: any) => getPollingUnitWardId(pu) === formData.wardId);
      
      // If we have a zone selected, further filter to ensure polling units belong to that zone
      let finalFiltered = filteredByWard;
      if (formData.zoneId) {
        finalFiltered = filteredByWard.filter((pu: any) => {
          const puZoneId = getPollingUnitZoneId(pu);
          return puZoneId === formData.zoneId;
        });
        console.log('📋 Further filtered by zone:', formData.zoneId, 'remaining:', finalFiltered.length);
      }
      
      if (finalFiltered.length > 0) {
        console.log('📋 Found polling units from existing data:', finalFiltered.length);
        setFilteredPollingUnitsByZoneAndWard(finalFiltered);
      } else {
        console.log('📋 No polling units found locally, fetching from API for ward:', formData.wardId);
        fetchPollingUnitsByWard(formData.wardId);
      }
    } else {
      // If no ward selected, clear polling units or show all
      setFilteredPollingUnitsByZoneAndWard([]);
    }
  }, [formData.wardId, formData.zoneId, safePollingUnits, fetchPollingUnitsByWard]);

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      const displayRole = getDisplayRole(user.role);
      
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: displayRole || '',
        status: user.status || 'active',
        zoneId: user.zoneId || '',
        wardId: user.wardId || '',
        pollingUnitId: user.pollingUnitId || '',
      });
      setAssignmentChanged(false);
    }
  }, [user]);

  // Get current assignment display
  const getCurrentAssignment = useCallback(() => {
    if (!user) return { type: 'None', name: 'Not Assigned', id: null };
    
    switch (user.role) {
      case 'Polling Agent':
        return {
          type: 'Polling Unit',
          name: user.pollingUnitName || 'Not Assigned',
          id: user.pollingUnitId,
        };
      case 'Ward Admin':
        return {
          type: 'Ward',
          name: user.wardName || 'Not Assigned',
          id: user.wardId,
        };
      case 'Zone Admin':
        return {
          type: 'Zone',
          name: user.zoneName || 'Not Assigned',
          id: user.zoneId,
        };
      case 'Situation Room Admin':
        return {
          type: 'System',
          name: 'Situation Room Access',
          id: null,
        };
      case 'System Admin':
        return {
          type: 'System',
          name: 'Full System Access',
          id: null,
        };
      default:
        return {
          type: 'None',
          name: 'Not Assigned',
          id: null,
        };
    }
  }, [user]);

  // Get new assignment display based on form data
  const getNewAssignment = useCallback(() => {
    switch (formData.role) {
      case ROLES.POLLING_AGENT:
        if (formData.pollingUnitId) {
          const pu = safePollingUnits.find((p: any) => p.id === formData.pollingUnitId);
          return {
            type: 'Polling Unit',
            name: pu?.name || 'Selected',
            id: formData.pollingUnitId,
          };
        }
        return { type: 'Polling Unit', name: 'Not Assigned', id: null };
      case ROLES.WARD_ADMIN:
        if (formData.wardId) {
          const ward = safeWards.find((w: any) => w.id === formData.wardId);
          return {
            type: 'Ward',
            name: ward?.name || 'Selected',
            id: formData.wardId,
          };
        }
        return { type: 'Ward', name: 'Not Assigned', id: null };
      case ROLES.ZONE_ADMIN:
        if (formData.zoneId) {
          const zone = safeZones.find((z: any) => z.id === formData.zoneId);
          return {
            type: 'Zone',
            name: zone?.name || 'Selected',
            id: formData.zoneId,
          };
        }
        return { type: 'Zone', name: 'Not Assigned', id: null };
      case ROLES.SITUATION_ROOM:
        return { type: 'System', name: 'Situation Room Access', id: null };
      case ROLES.SYSTEM_ADMIN:
        return { type: 'System', name: 'Full System Access', id: null };
      default:
        return { type: 'None', name: 'Not Assigned', id: null };
    }
  }, [formData, safePollingUnits, safeWards, safeZones]);

  // Check if assignment has changed
  const hasAssignmentChanged = useCallback(() => {
    const current = getCurrentAssignment();
    const newAssignment = getNewAssignment();
    
    if (formData.role === ROLES.SYSTEM_ADMIN || formData.role === ROLES.SITUATION_ROOM) {
      return false;
    }
    
    return current.id !== newAssignment.id || current.name !== newAssignment.name;
  }, [getCurrentAssignment, getNewAssignment, formData.role]);

  // Handle role change
  const handleRoleChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value,
      zoneId: '',
      wardId: '',
      pollingUnitId: '',
    }));
    setAssignmentChanged(true);
  }, []);

  // Handle zone change - clear ward and polling unit
  const handleZoneChange = useCallback((value: string) => {
    const newZoneId = value === 'none' ? '' : value;
    console.log('🔄 Zone changed to:', newZoneId);
    setFormData(prev => ({
      ...prev,
      zoneId: newZoneId,
      wardId: '',
      pollingUnitId: '',
    }));
    setAssignmentChanged(true);
  }, []);

  // Handle ward change - clear polling unit
  const handleWardChange = useCallback((value: string) => {
    const newWardId = value === 'none' ? '' : value;
    console.log('🔄 Ward changed to:', newWardId);
    setFormData(prev => ({
      ...prev,
      wardId: newWardId,
      pollingUnitId: '',
    }));
    setAssignmentChanged(true);
  }, []);

  // Handle polling unit change
  const handlePollingUnitChange = useCallback((value: string) => {
    const newPollingUnitId = value === 'none' ? '' : value;
    console.log('🔄 Polling Unit changed to:', newPollingUnitId);
    setFormData(prev => ({
      ...prev,
      pollingUnitId: newPollingUnitId,
    }));
    setAssignmentChanged(true);
  }, []);

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
      
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'You are not logged in. Please log in again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const updateData: any = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        role: getDatabaseRole(formData.role),
        status: formData.status,
      };

      if (formData.role === ROLES.ZONE_ADMIN) {
        updateData.zoneId = formData.zoneId || null;
        updateData.wardId = null;
        updateData.pollingUnitId = null;
      } else if (formData.role === ROLES.WARD_ADMIN) {
        updateData.wardId = formData.wardId || null;
        updateData.zoneId = null;
        updateData.pollingUnitId = null;
      } else if (formData.role === ROLES.POLLING_AGENT) {
        updateData.pollingUnitId = formData.pollingUnitId || null;
        updateData.wardId = null;
        updateData.zoneId = null;
      } else {
        updateData.pollingUnitId = null;
        updateData.wardId = null;
        updateData.zoneId = null;
      }

      console.log('📤 Updating user with data:', updateData);

      const response = await fetch(`${API_BASE_URL}/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to update user');
      }

      const result = await response.json();
      console.log('✅ User updated successfully:', result);

      toast({
        title: 'Success',
        description: `User ${formData.name} updated successfully${assignmentChanged ? ' with new assignment' : ''}`,
      });

      onOpenChange(false);
      onSuccess();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('❌ Error updating user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const currentAssignment = getCurrentAssignment();
  const newAssignment = getNewAssignment();
  const isAssignmentRequired = formData.role === ROLES.POLLING_AGENT || 
                               formData.role === ROLES.WARD_ADMIN || 
                               formData.role === ROLES.ZONE_ADMIN;
  const showAssignmentChange = hasAssignmentChanged();

  const selectedZoneName = formData.zoneId ? safeZones.find((z: any) => z.id === formData.zoneId)?.name : 'All Zones';
  const selectedWardName = formData.wardId ? safeWards.find((w: any) => w.id === formData.wardId)?.name : '';

  // Use filtered wards and polling units
  const displayWards = filteredWardsByZone.length > 0 ? filteredWardsByZone : safeWards;
  const displayPollingUnits = filteredPollingUnitsByZoneAndWard.length > 0 ? filteredPollingUnitsByZoneAndWard : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user information, role, and assignments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* User Information Section */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">User Information</CardTitle>
              <CardDescription>Basic user details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg">
                    {formData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{formData.name}</p>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                  <Badge className={`mt-1 ${getRoleColor(formData.role)} text-white`}>
                    {formData.role || 'No Role'}
                  </Badge>
                </div>
                <Badge variant={formData.status === 'active' ? 'default' : 'secondary'}>
                  {formData.status || 'Active'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={handleRoleChange}
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
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current vs New Assignment Comparison */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Assignment Change
              </CardTitle>
              <CardDescription>
                {isAssignmentRequired 
                  ? `Current assignment vs new assignment for ${formData.role}`
                  : 'System-level users have system-wide access'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Current</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{currentAssignment.type}</Badge>
                    <span className="text-sm font-medium">{currentAssignment.name}</span>
                  </div>
                  {currentAssignment.id && (
                    <p className="text-xs text-muted-foreground mt-1">ID: {currentAssignment.id}</p>
                  )}
                </div>

                <div className={`p-3 rounded-lg ${showAssignmentChange ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}>
                  <p className="text-xs text-muted-foreground mb-1">
                    New {showAssignmentChange && <span className="text-primary">✨</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={showAssignmentChange ? 'default' : 'outline'}>
                      {newAssignment.type}
                    </Badge>
                    <span className={`text-sm font-medium ${showAssignmentChange ? 'text-primary' : ''}`}>
                      {newAssignment.name}
                    </span>
                  </div>
                  {newAssignment.id && (
                    <p className="text-xs text-muted-foreground mt-1">ID: {newAssignment.id}</p>
                  )}
                  {showAssignmentChange && (
                    <Badge variant="default" className="mt-2 text-success-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Assignment will be updated
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Management Section */}
          {isAssignmentRequired && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Change Assignment
                </CardTitle>
                <CardDescription>
                  Select a new {formData.role === ROLES.POLLING_AGENT ? 'polling unit' : formData.role === ROLES.WARD_ADMIN ? 'ward' : 'zone'} for this user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />

                {/* Zone Admin Assignment */}
                {formData.role === ROLES.ZONE_ADMIN && (
                  <div className="space-y-2">
                    <Label>Assign to Zone <span className="text-red-500">*</span></Label>
                    {safeZones.length === 0 ? (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <p className="text-sm text-yellow-700">No zones available. Please create a zone first.</p>
                      </div>
                    ) : (
                      <Select
                        value={formData.zoneId || 'none'}
                        onValueChange={handleZoneChange}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select a zone (${safeZones.length} available)`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {safeZones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {formData.zoneId && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {safeZones.find((z: any) => z.id === formData.zoneId)?.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Ward Admin Assignment */}
                {formData.role === ROLES.WARD_ADMIN && (
                  <>
                    <div className="space-y-2">
                      <Label>Filter by Zone (Optional)</Label>
                      {safeZones.length === 0 ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm text-yellow-700">No zones available to filter.</p>
                        </div>
                      ) : (
                        <Select
                          value={formData.zoneId || 'none'}
                          onValueChange={handleZoneChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by zone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Zones</SelectItem>
                            {safeZones.map((zone) => (
                              <SelectItem key={zone.id} value={zone.id}>
                                {zone.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {formData.zoneId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Showing wards in zone: {selectedZoneName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to Ward <span className="text-red-500">*</span></Label>
                      {displayWards.length === 0 ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <div>
                            <p className="text-sm text-yellow-700">
                              {formData.zoneId 
                                ? `No wards found in the selected zone. Please select a different zone or create wards first.`
                                : 'No wards available. Please create a ward first.'}
                            </p>
                            {isFetchingWards && (
                              <p className="text-xs text-yellow-600 mt-1">Loading wards...</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={formData.wardId || 'none'}
                          onValueChange={handleWardChange}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select a ward (${displayWards.length} available)`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {displayWards.map((ward: any) => (
                              <SelectItem key={ward.id} value={ward.id}>
                                {getWardDisplayName(ward)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {formData.wardId && (
                        <p className="text-xs text-muted-foreground">
                          Selected: {selectedWardName}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Polling Agent Assignment */}
                {formData.role === ROLES.POLLING_AGENT && (
                  <>
                    <div className="space-y-2">
                      <Label>Filter by Zone (Optional)</Label>
                      {safeZones.length === 0 ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm text-yellow-700">No zones available to filter.</p>
                        </div>
                      ) : (
                        <Select
                          value={formData.zoneId || 'none'}
                          onValueChange={handleZoneChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by zone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Zones</SelectItem>
                            {safeZones.map((zone) => (
                              <SelectItem key={zone.id} value={zone.id}>
                                {zone.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {formData.zoneId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected zone: {selectedZoneName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Filter by Ward (Optional)</Label>
                      {displayWards.length === 0 ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <div>
                            <p className="text-sm text-yellow-700">
                              {formData.zoneId 
                                ? `No wards found in the selected zone. Please select a different zone or create wards first.`
                                : 'No wards available. Please create a ward first.'}
                            </p>
                            {isFetchingWards && (
                              <p className="text-xs text-yellow-600 mt-1">Loading wards...</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={formData.wardId || 'none'}
                          onValueChange={handleWardChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by ward" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Wards</SelectItem>
                            {displayWards.map((ward: any) => (
                              <SelectItem key={ward.id} value={ward.id}>
                                {getWardDisplayName(ward)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {formData.wardId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected ward: {selectedWardName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to Polling Unit <span className="text-red-500">*</span></Label>
                      {displayPollingUnits.length === 0 ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <div>
                            <p className="text-sm text-yellow-700">
                              {formData.wardId 
                                ? `No polling units found in the selected ward.`
                                : formData.zoneId
                                ? `Please select a ward first to see polling units in ${selectedZoneName} zone.`
                                : 'Please select a zone and ward first to see polling units.'}
                            </p>
                            {isFetchingPollingUnits && (
                              <p className="text-xs text-yellow-600 mt-1">Loading polling units...</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={formData.pollingUnitId || 'none'}
                          onValueChange={handlePollingUnitChange}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select a polling unit (${displayPollingUnits.length} available)`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {displayPollingUnits.map((pu: any) => (
                              <SelectItem key={pu.id} value={pu.id}>
                                {getPollingUnitDisplayName(pu)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {formData.pollingUnitId && (
                        <p className="text-xs text-muted-foreground">
                          Selected: {safePollingUnits.find((pu: any) => pu.id === formData.pollingUnitId)?.name}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* System Admin / Situation Room Info */}
          {!isAssignmentRequired && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="p-3 bg-muted/30 rounded-lg flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">System-Wide Access</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.role === ROLES.SYSTEM_ADMIN 
                        ? 'System Administrators have full system-wide access and can manage all users, zones, wards, and polling units.'
                        : 'Situation Room administrators have monitoring access across all regions and can view real-time data.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
// components/admin/system-admin/dialogs/CreateUserDialog.tsx

"use client";

import React, { useState, useEffect } from 'react';
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
import { 
  Loader2, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  User, 
  Mail, 
  Lock, 
  Shield,
  MapPin,
  Building2,
  Users,
  UserPlus,
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { searchPollingUnits, searchWards, searchZones } from '@/lib/api/pollingUnits';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: Array<{ id: string; name: string }>;
  wards: Array<{ id: string; name: string; zoneId?: string }>;
  pollingUnits: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

const roleOptions = [
  { value: 'Polling Agent', label: 'Polling Agent', icon: MapPin, color: 'blue' },
  { value: 'Ward Admin', label: 'Ward Admin', icon: Building2, color: 'green' },
  { value: 'Zone Admin', label: 'Zone Admin', icon: Users, color: 'purple' },
  { value: 'Situation Room Admin', label: 'Situation Room Admin', icon: Shield, color: 'orange' },
  { value: 'System Admin', label: 'System Admin', icon: Shield, color: 'red' },
];

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
  const [error, setError] = useState<string | null>(null);
  const [autoDetectedWard, setAutoDetectedWard] = useState<{ id: string; name: string; zoneId?: string } | null>(null);
  const [autoDetectedZone, setAutoDetectedZone] = useState<{ id: string; name: string } | null>(null);
  const [isFetchingPollingUnit, setIsFetchingPollingUnit] = useState(false);
  const [selectedPollingUnitName, setSelectedPollingUnitName] = useState<string>('');
  const [selectedWardName, setSelectedWardName] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    pollingUnitId: '',
    wardId: '',
    zoneId: '',
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        pollingUnitId: '',
        wardId: '',
        zoneId: '',
      });
      setError(null);
      setAutoDetectedWard(null);
      setAutoDetectedZone(null);
      setSelectedPollingUnitName('');
      setSelectedWardName('');
    }
  }, [open]);

  const fetchPollingUnitDetails = async (pollingUnitId: string) => {
    if (!pollingUnitId) {
      setAutoDetectedWard(null);
      setAutoDetectedZone(null);
      setSelectedPollingUnitName('');
      return;
    }

    setIsFetchingPollingUnit(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/admin/system/polling-units/${pollingUnitId}`,
        {
          headers: withTenantHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const pollingUnit = data.data || data;

        if (pollingUnit.name) {
          setSelectedPollingUnitName(pollingUnit.name);
        }

        if (pollingUnit.ward) {
          const ward = pollingUnit.ward;
          setAutoDetectedWard({
            id: ward.id,
            name: ward.name,
            zoneId: ward.zoneId || null
          });
          setFormData(prev => ({ ...prev, wardId: ward.id }));
        } else {
          setAutoDetectedWard(null);
          setFormData(prev => ({ ...prev, wardId: '' }));
        }

        let zone = pollingUnit.zone || pollingUnit.ward?.zone;
        if (zone) {
          setAutoDetectedZone({
            id: zone.id,
            name: zone.name
          });
          setFormData(prev => ({ ...prev, zoneId: zone.id }));
        } else {
          setAutoDetectedZone(null);
          setFormData(prev => ({ ...prev, zoneId: '' }));
        }

        if (pollingUnit.ward && (pollingUnit.zone || pollingUnit.ward?.zone)) {
          const zoneName = pollingUnit.zone?.name || pollingUnit.ward?.zone?.name || 'Unknown Zone';
          toast({
            title: "✅ Auto-detected",
            description: `Ward: ${pollingUnit.ward.name}, Zone: ${zoneName}`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching polling unit details:', error);
    } finally {
      setIsFetchingPollingUnit(false);
    }
  };

  // ✅ NEW: Handle ward selection for Ward Admin - auto-detect zone
  const handleWardChange = (wardId: string) => {
    setFormData(prev => ({ ...prev, wardId }));
    setSelectedWardName('');
    
    if (wardId) {
      // Find the selected ward
      const selectedWard = wards.find(w => w.id === wardId);
      if (selectedWard) {
        setSelectedWardName(selectedWard.name);
        
        // Auto-detect zone from ward
        if (selectedWard.zoneId) {
          const zone = zones.find(z => z.id === selectedWard.zoneId);
          if (zone) {
            setAutoDetectedZone({
              id: zone.id,
              name: zone.name
            });
            setFormData(prev => ({ ...prev, zoneId: zone.id }));
            toast({
              title: "✅ Zone Auto-detected",
              description: `Zone: ${zone.name}`,
            });
          }
        } else {
          setAutoDetectedZone(null);
          setFormData(prev => ({ ...prev, zoneId: '' }));
          toast({
            title: "⚠️ No Zone Found",
            description: "This ward is not assigned to any zone",
            variant: "default",
          });
        }
      }
    } else {
      setAutoDetectedZone(null);
      setFormData(prev => ({ ...prev, zoneId: '' }));
    }
  };

  const handlePollingUnitChange = (value: string) => {
    setFormData(prev => ({ ...prev, pollingUnitId: value }));
    if (value) {
      fetchPollingUnitDetails(value);
    } else {
      setAutoDetectedWard(null);
      setAutoDetectedZone(null);
      setSelectedPollingUnitName('');
    }
  };

  const clearPollingUnit = () => {
    setFormData(prev => ({ ...prev, pollingUnitId: '' }));
    setSelectedPollingUnitName('');
    setAutoDetectedWard(null);
    setAutoDetectedZone(null);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setLoading(true);

      // Validation
      if (!formData.name.trim()) {
        setError('Name is required');
        return;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (!formData.role) {
        setError('Please select a role');
        return;
      }

      if (formData.role === 'Polling Agent' && !formData.pollingUnitId) {
        setError('Please select a polling unit');
        return;
      }
      if (formData.role === 'Ward Admin' && !formData.wardId) {
        setError('Please select a ward');
        return;
      }
      if (formData.role === 'Zone Admin' && !formData.zoneId) {
        setError('Please select a zone');
        return;
      }

      const token = localStorage.getItem('authToken');
      
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === 'Polling Agent') {
        payload.pollingUnitId = formData.pollingUnitId;
      } else if (formData.role === 'Ward Admin') {
        payload.wardId = formData.wardId;
        // ✅ Include zoneId if auto-detected
        if (formData.zoneId) {
          payload.zoneId = formData.zoneId;
        }
      } else if (formData.role === 'Zone Admin') {
        payload.zoneId = formData.zoneId;
      }

      console.log('📤 Creating user with payload:', payload);

      const response = await fetch(
        `${API_BASE_URL}/admin/system/create-user`,
        {
          method: 'POST',
          headers: withTenantHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "✅ User Created",
          description: `User "${formData.name}" has been created successfully.`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data.message || 'Failed to create user');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create user');
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value,
      pollingUnitId: '',
      wardId: '',
      zoneId: '',
    });
    setAutoDetectedWard(null);
    setAutoDetectedZone(null);
    setSelectedPollingUnitName('');
    setSelectedWardName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl w-full p-0 overflow-hidden sm:max-w-4xl max-h-[90vh] flex flex-col [&>button]:hidden"
        showCloseButton={false}
      >
        {/* Custom Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white hover:text-gray-200"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
          <span className="sr-only">Close</span>
        </button>

        {/* Header - Fixed */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <span>Create New User</span>
                <DialogDescription className="text-blue-100 text-sm mt-0.5">
                  Add a new user with role-based assignments and permissions
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-blue-500 rounded-full" />
                <h3 className="font-semibold text-sm text-gray-700">Personal Information</h3>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="userName" className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userName"
                  placeholder="e.g., John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="userEmail" className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="e.g., john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="userPassword" className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userPassword"
                  type="password"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Right Column - Role & Assignment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-indigo-500 rounded-full" />
                <h3 className="font-semibold text-sm text-gray-700">Role & Assignment</h3>
              </div>

              {/* Role Selection */}
              <div>
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-2">
                  <Shield className="h-3.5 w-3.5" />
                  Select Role <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    const isSelected = formData.role === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => handleRoleChange(role.value)}
                        className={cn(
                          "p-2 rounded-lg border-2 text-left transition-all duration-200",
                          isSelected
                            ? `border-${role.color}-500 bg-${role.color}-50 ring-2 ring-${role.color}-200`
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                          "flex items-center gap-2"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-md",
                          isSelected ? `bg-${role.color}-100 text-${role.color}-600` : "bg-gray-100 text-gray-500"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          isSelected ? `text-${role.color}-700` : "text-gray-700"
                        )}>
                          {role.label}
                        </span>
                        {isSelected && (
                          <CheckCircle className={cn(
                            "h-3.5 w-3.5 ml-auto",
                            `text-${role.color}-500`
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role-specific assignment */}
              {formData.role === 'Polling Agent' && (
                <div className="mt-2">
                  <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Polling Unit <span className="text-red-500">*</span>
                  </Label>
                  
                  {selectedPollingUnitName ? (
                    <div className="mt-1 flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-blue-700 flex-1 truncate">
                        {selectedPollingUnitName}
                      </span>
                      <button
                        type="button"
                        onClick={clearPollingUnit}
                        className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-blue-500" />
                      </button>
                    </div>
                  ) : (
                    <SearchableSelectServer
                      value={formData.pollingUnitId}
                      onChange={handlePollingUnitChange}
                      fetchOptions={searchPollingUnits}
                      placeholder="Search polling unit..."
                      searchPlaceholder="Type to search..."
                      emptyMessage="No polling units found"
                      className="mt-1"
                      initialOptions={pollingUnits.slice(0, 20)}
                      portal={true}
                    />
                  )}
                  
                  <p className="text-xs text-gray-400 mt-1">
                    {pollingUnits.length.toLocaleString()} polling units available
                  </p>
                </div>
              )}

              {formData.role === 'Ward Admin' && (
                <div className="mt-2">
                  <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Ward <span className="text-red-500">*</span>
                  </Label>
                  <SearchableSelectServer
                    value={formData.wardId}
                    onChange={handleWardChange}
                    fetchOptions={searchWards}
                    placeholder="Search ward..."
                    searchPlaceholder="Type to search..."
                    emptyMessage="No wards found"
                    className="mt-1"
                    initialOptions={wards.slice(0, 20)}
                    portal={true}
                  />
                  
                  {/* ✅ Show auto-detected zone for Ward Admin */}
                  {formData.wardId && autoDetectedZone && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700">
                        Zone auto-detected: <strong>{autoDetectedZone.name}</strong>
                      </span>
                    </div>
                  )}
                  
                  {formData.wardId && !autoDetectedZone && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-700">
                        No zone found for this ward. Please select manually.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {formData.role === 'Zone Admin' && (
                <div className="mt-2">
                  <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Zone <span className="text-red-500">*</span>
                  </Label>
                  <SearchableSelectServer
                    value={formData.zoneId}
                    onChange={(value) => setFormData({ ...formData, zoneId: value })}
                    fetchOptions={searchZones}
                    placeholder="Search zone..."
                    searchPlaceholder="Type to search..."
                    emptyMessage="No zones found"
                    className="mt-1"
                    initialOptions={zones.slice(0, 20)}
                    portal={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Auto-detection Section - Only for Polling Agent */}
          {formData.role === 'Polling Agent' && formData.pollingUnitId && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-blue-700">Auto-detected Assignment</h4>
                <Badge variant="outline" className="ml-auto bg-blue-100 text-blue-700 border-blue-200 text-xs">
                  {isFetchingPollingUnit ? 'Detecting...' : 'AI Powered'}
                </Badge>
              </div>

              {isFetchingPollingUnit ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-blue-600">Detecting ward and zone...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">Ward</span>
                    </div>
                    {autoDetectedWard ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {autoDetectedWard.name}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Not found
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-100">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">Zone</span>
                    </div>
                    {autoDetectedZone ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {autoDetectedZone.name}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Not found
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {(!autoDetectedWard || !autoDetectedZone) && !isFetchingPollingUnit && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-amber-600 flex items-center gap-1 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Manual override required - please select below:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {!autoDetectedWard && (
                      <div>
                        <Label className="text-xs text-gray-600">Select Ward</Label>
                        <SearchableSelectServer
                          value={formData.wardId}
                          onChange={(value) => setFormData({ ...formData, wardId: value })}
                          fetchOptions={searchWards}
                          placeholder="Search ward..."
                          searchPlaceholder="Type to search..."
                          emptyMessage="No wards found"
                          className="mt-0.5"
                          initialOptions={wards.slice(0, 20)}
                          portal={true}
                        />
                      </div>
                    )}
                    {!autoDetectedZone && (
                      <div>
                        <Label className="text-xs text-gray-600">Select Zone</Label>
                        <SearchableSelectServer
                          value={formData.zoneId}
                          onChange={(value) => setFormData({ ...formData, zoneId: value })}
                          fetchOptions={searchZones}
                          placeholder="Search zone..."
                          searchPlaceholder="Type to search..."
                          emptyMessage="No zones found"
                          className="mt-0.5"
                          initialOptions={zones.slice(0, 20)}
                          portal={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Ward and Zone are automatically assigned based on the selected polling unit
              </p>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <DialogFooter className="sticky bottom-0 bg-gray-50 border-t px-6 py-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating User...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
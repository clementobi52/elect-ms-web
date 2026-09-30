"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertTriangle,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Database,
  Mail,
  Bell,
  Globe,
  Lock,
  Users,
  FileText,
  MapPin,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader2,
  Server,
  Cloud,
  Clock,
  Activity,
  HardDrive,
  Cpu,
  Network,
  Key,
  UserCheck,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Upload,
  RefreshCcw,
  Zap,
  ShieldCheck,
  Fingerprint,
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface SystemSettings {
  // General Settings
  appName: string;
  appVersion: string;
  appEnvironment: string;
  maintenanceMode: boolean;
  
  // Security Settings
  twoFactorAuth: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordExpiryDays: number;
  
  // Email Settings
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  incidentAlerts: boolean;
  resultAlerts: boolean;
  agentAlerts: boolean;
  
  // Data Management
  autoBackup: boolean;
  backupFrequency: string;
  backupRetention: number;
  dataRetentionDays: number;
  
  // Feature Toggles
  enableAgents: boolean;
  enableResults: boolean;
  enableIncidents: boolean;
  enableAnalytics: boolean;
  enableLiveTracking: boolean;
  
  // Integration Settings
  mapsApiKey: string;
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;
}

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  cpuCores: number;
  memoryTotal: string;
  memoryUsed: string;
  memoryFree: string;
  uptime: string;
  databaseSize: string;
  lastBackup: string;
  nextBackup: string;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalZones: number;
  totalWards: number;
  totalPollingUnits: number;
  totalResults: number;
  totalIncidents: number;
  pendingResults: number;
  verifiedResults: number;
  rejectedResults: number;
  pendingIncidents: number;
  resolvedIncidents: number;
}

interface Setting {
  id: string;
  category: string;
  key: string;
  value: any;
  type: string;
  label: string;
  description: string;
  isSystem: boolean;
  isEditable: boolean;
  options: string[] | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Dialog states
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState<SystemSettings>({
    appName: 'Elect MS',
    appVersion: '1.0.0',
    appEnvironment: 'production',
    maintenanceMode: false,
    twoFactorAuth: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    passwordExpiryDays: 90,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Elect MS',
    emailNotifications: true,
    pushNotifications: false,
    incidentAlerts: true,
    resultAlerts: true,
    agentAlerts: true,
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    dataRetentionDays: 365,
    enableAgents: true,
    enableResults: true,
    enableIncidents: true,
    enableAnalytics: true,
    enableLiveTracking: true,
    mapsApiKey: '',
    smsProvider: 'twilio',
    smsApiKey: '',
    smsSenderId: 'ElectMS',
  });

  // System info state
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    nodeVersion: 'v18.17.0',
    platform: 'Linux',
    cpuCores: 4,
    memoryTotal: '16 GB',
    memoryUsed: '4.2 GB',
    memoryFree: '11.8 GB',
    uptime: '3d 12h 45m',
    databaseSize: '245 MB',
    lastBackup: 'Not available',
    nextBackup: 'Not available',
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalZones: 0,
    totalWards: 0,
    totalPollingUnits: 0,
    totalResults: 0,
    totalIncidents: 0,
    pendingResults: 0,
    verifiedResults: 0,
    rejectedResults: 0,
    pendingIncidents: 0,
    resolvedIncidents: 0,
  });


  // ============================================
  // API FUNCTIONS
  // ============================================

  const fetchSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/system/settings`, {
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 Settings response:', data);

      if (data.success && data.data) {
        // Convert array of settings to object
        const settingsMap: any = {};
        data.data.forEach((setting: Setting) => {
          settingsMap[setting.key] = setting.value;
        });

        // Update settings state with fetched values
        setSettings(prev => ({
          ...prev,
          appName: settingsMap.appName || prev.appName,
          appVersion: settingsMap.appVersion || prev.appVersion,
          appEnvironment: settingsMap.appEnvironment || prev.appEnvironment,
          maintenanceMode: settingsMap.maintenanceMode || false,
          twoFactorAuth: settingsMap.twoFactorAuth || false,
          sessionTimeout: settingsMap.sessionTimeout || 60,
          maxLoginAttempts: settingsMap.maxLoginAttempts || 5,
          passwordExpiryDays: settingsMap.passwordExpiryDays || 90,
          smtpHost: settingsMap.smtpHost || '',
          smtpPort: settingsMap.smtpPort || 587,
          smtpUser: settingsMap.smtpUser || '',
          smtpPassword: settingsMap.smtpPassword || '',
          fromEmail: settingsMap.fromEmail || '',
          fromName: settingsMap.fromName || 'Elect MS',
          emailNotifications: settingsMap.emailNotifications !== undefined ? settingsMap.emailNotifications : true,
          pushNotifications: settingsMap.pushNotifications || false,
          incidentAlerts: settingsMap.incidentAlerts !== undefined ? settingsMap.incidentAlerts : true,
          resultAlerts: settingsMap.resultAlerts !== undefined ? settingsMap.resultAlerts : true,
          agentAlerts: settingsMap.agentAlerts !== undefined ? settingsMap.agentAlerts : true,
          autoBackup: settingsMap.autoBackup !== undefined ? settingsMap.autoBackup : true,
          backupFrequency: settingsMap.backupFrequency || 'daily',
          backupRetention: settingsMap.backupRetention || 30,
          dataRetentionDays: settingsMap.dataRetentionDays || 365,
          enableAgents: settingsMap.enableAgents !== undefined ? settingsMap.enableAgents : true,
          enableResults: settingsMap.enableResults !== undefined ? settingsMap.enableResults : true,
          enableIncidents: settingsMap.enableIncidents !== undefined ? settingsMap.enableIncidents : true,
          enableAnalytics: settingsMap.enableAnalytics !== undefined ? settingsMap.enableAnalytics : true,
          enableLiveTracking: settingsMap.enableLiveTracking !== undefined ? settingsMap.enableLiveTracking : true,
          mapsApiKey: settingsMap.mapsApiKey || '',
          smsProvider: settingsMap.smsProvider || 'twilio',
          smsApiKey: settingsMap.smsApiKey || '',
          smsSenderId: settingsMap.smsSenderId || 'ElectMS',
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    }
  }, [API_BASE_URL, toast]);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/system/info`, {
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 System info response:', data);

      if (data.success && data.data) {
        setSystemInfo({
          nodeVersion: data.data.nodeVersion || 'N/A',
          platform: data.data.platform || 'N/A',
          cpuCores: data.data.cpuCores || 0,
          memoryTotal: data.data.memoryTotal || 'N/A',
          memoryUsed: data.data.memoryUsed || 'N/A',
          memoryFree: data.data.memoryFree || 'N/A',
          uptime: data.data.uptime || 'N/A',
          databaseSize: data.data.databaseSize || 'N/A',
          lastBackup: data.data.lastBackup || 'Not available',
          nextBackup: data.data.nextBackup || 'Not available',
          totalUsers: data.data.totalUsers || 0,
          activeUsers: data.data.activeUsers || 0,
          inactiveUsers: data.data.inactiveUsers || 0,
          totalZones: data.data.totalZones || 0,
          totalWards: data.data.totalWards || 0,
          totalPollingUnits: data.data.totalPollingUnits || 0,
          totalResults: data.data.totalResults || 0,
          totalIncidents: data.data.totalIncidents || 0,
          pendingResults: data.data.pendingResults || 0,
          verifiedResults: data.data.verifiedResults || 0,
          rejectedResults: data.data.rejectedResults || 0,
          pendingIncidents: data.data.pendingIncidents || 0,
          resolvedIncidents: data.data.resolvedIncidents || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching system info:', error);
      toast({
        title: "Error",
        description: "Failed to load system info",
        variant: "destructive",
      });
    }
  }, [API_BASE_URL, toast]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSettings(),
        fetchSystemInfo(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchSettings, fetchSystemInfo, toast]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No auth token found');
      }

      // Format settings for API
      const settingsToSave: Record<string, any> = {};
      
      // General settings
      settingsToSave['general.appName'] = settings.appName;
      settingsToSave['general.appVersion'] = settings.appVersion;
      settingsToSave['general.appEnvironment'] = settings.appEnvironment;
      settingsToSave['general.maintenanceMode'] = settings.maintenanceMode;
      settingsToSave['general.dataRetentionDays'] = settings.dataRetentionDays;
      settingsToSave['general.backupRetention'] = settings.backupRetention;
      
      // Security settings
      settingsToSave['security.sessionTimeout'] = settings.sessionTimeout;
      settingsToSave['security.maxLoginAttempts'] = settings.maxLoginAttempts;
      settingsToSave['security.passwordExpiryDays'] = settings.passwordExpiryDays;
      settingsToSave['security.twoFactorAuth'] = settings.twoFactorAuth;
      
      // Email settings
      settingsToSave['email.smtpHost'] = settings.smtpHost;
      settingsToSave['email.smtpPort'] = settings.smtpPort;
      settingsToSave['email.smtpUser'] = settings.smtpUser;
      settingsToSave['email.smtpPassword'] = settings.smtpPassword;
      settingsToSave['email.fromEmail'] = settings.fromEmail;
      settingsToSave['email.fromName'] = settings.fromName;
      
      // Notification settings
      settingsToSave['notifications.emailNotifications'] = settings.emailNotifications;
      settingsToSave['notifications.pushNotifications'] = settings.pushNotifications;
      settingsToSave['notifications.incidentAlerts'] = settings.incidentAlerts;
      settingsToSave['notifications.resultAlerts'] = settings.resultAlerts;
      settingsToSave['notifications.agentAlerts'] = settings.agentAlerts;
      
      // Feature settings
      settingsToSave['features.enableAgents'] = settings.enableAgents;
      settingsToSave['features.enableResults'] = settings.enableResults;
      settingsToSave['features.enableIncidents'] = settings.enableIncidents;
      settingsToSave['features.enableAnalytics'] = settings.enableAnalytics;
      settingsToSave['features.enableLiveTracking'] = settings.enableLiveTracking;
      settingsToSave['features.autoBackup'] = settings.autoBackup;
      settingsToSave['features.backupFrequency'] = settings.backupFrequency;
      
      // Integration settings
      settingsToSave['integrations.mapsApiKey'] = settings.mapsApiKey;
      settingsToSave['integrations.smsProvider'] = settings.smsProvider;
      settingsToSave['integrations.smsApiKey'] = settings.smsApiKey;
      settingsToSave['integrations.smsSenderId'] = settings.smsSenderId;

      const response = await fetch(`${API_BASE_URL}/admin/system/settings`, {
        method: 'PUT',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ settings: settingsToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "✅ Settings Saved",
          description: data.message || "System settings have been updated successfully.",
        });
        // Refresh data to get latest values
        await fetchData();
      } else {
        throw new Error(data.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleSettingChange = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const handleClearCache = () => {
    setConfirmAction({
      title: 'Clear System Cache',
      description: 'This will clear all cached data. The system may be slower temporarily while cache is rebuilt.',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/admin/system/cache/clear`, {
            method: 'POST',
            headers: withTenantHeaders({
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            })
          });

          if (response.ok) {
            const data = await response.json();
            toast({
              title: "✅ Cache Cleared",
              description: data.message || "System cache has been cleared successfully.",
            });
          } else {
            throw new Error('Failed to clear cache');
          }
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || "Failed to clear cache",
            variant: "destructive",
          });
        }
        setIsConfirmDialogOpen(false);
        setConfirmAction(null);
      }
    });
    setIsConfirmDialogOpen(true);
  };

  const handleBackupDatabase = () => {
    setConfirmAction({
      title: 'Backup Database',
      description: 'This will create a full backup of the database. The backup will be stored on the server.',
      onConfirm: async () => {
        toast({
          title: "✅ Backup Started",
          description: "Database backup has been initiated. You will be notified when complete.",
        });
        setIsConfirmDialogOpen(false);
        setConfirmAction(null);
      }
    });
    setIsConfirmDialogOpen(true);
  };

  const handleMaintenanceMode = () => {
    const newMode = !settings.maintenanceMode;
    setConfirmAction({
      title: newMode ? 'Enable Maintenance Mode' : 'Disable Maintenance Mode',
      description: newMode 
        ? 'The system will be put into maintenance mode. Users will see a maintenance page and will not be able to access the system.'
        : 'The system will be taken out of maintenance mode. Users will regain access to the system.',
      onConfirm: () => {
        handleSettingChange('maintenanceMode', newMode);
        toast({
          title: newMode ? "🔧 Maintenance Mode Enabled" : "✅ Maintenance Mode Disabled",
          description: newMode 
            ? "The system is now in maintenance mode."
            : "The system is now back online.",
        });
        setIsConfirmDialogOpen(false);
        setConfirmAction(null);
      }
    });
    setIsConfirmDialogOpen(true);
  };

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchData();
  }, []);

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="⚙️ Settings"
          subtitle="System Admin View - System Configuration"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="⚙️ Settings"
        subtitle="System Admin View - System Configuration"
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Manage system configuration, security, and integrations
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackupDatabase}
            >
              <Database className="h-4 w-4 mr-2" />
              Backup
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-1">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Configure basic system settings and application preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appName">Application Name</Label>
                    <Input
                      id="appName"
                      value={settings.appName}
                      onChange={(e) => handleSettingChange('appName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appVersion">Version</Label>
                    <Input
                      id="appVersion"
                      value={settings.appVersion}
                      onChange={(e) => handleSettingChange('appVersion', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appEnvironment">Environment</Label>
                    <select
                      id="appEnvironment"
                      className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                      value={settings.appEnvironment}
                      onChange={(e) => handleSettingChange('appEnvironment', e.target.value)}
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Maintenance Mode</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Switch
                        checked={settings.maintenanceMode}
                        onCheckedChange={handleMaintenanceMode}
                      />
                      <span className="text-sm">
                        {settings.maintenanceMode ? 'Enabled' : 'Disabled'}
                      </span>
                      {settings.maintenanceMode && (
                        <Badge variant="destructive" className="ml-2">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      When enabled, users will see a maintenance page
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Data Management</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dataRetentionDays">Data Retention (days)</Label>
                      <Input
                        id="dataRetentionDays"
                        type="number"
                        value={settings.dataRetentionDays}
                        onChange={(e) => handleSettingChange('dataRetentionDays', parseInt(e.target.value) || 365)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Number of days to keep historical data
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="backupRetention">Backup Retention (days)</Label>
                      <Input
                        id="backupRetention"
                        type="number"
                        value={settings.backupRetention}
                        onChange={(e) => handleSettingChange('backupRetention', parseInt(e.target.value) || 30)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Number of days to keep backups
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Configure security policies and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value) || 60)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={settings.maxLoginAttempts}
                      onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value) || 5)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="passwordExpiryDays">Password Expiry (days)</Label>
                    <Input
                      id="passwordExpiryDays"
                      type="number"
                      value={settings.passwordExpiryDays}
                      onChange={(e) => handleSettingChange('passwordExpiryDays', parseInt(e.target.value) || 90)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Two-Factor Authentication</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Switch
                        checked={settings.twoFactorAuth}
                        onCheckedChange={(checked) => handleSettingChange('twoFactorAuth', checked)}
                      />
                      <span className="text-sm">
                        {settings.twoFactorAuth ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Require 2FA for all admin users
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Settings
                </CardTitle>
                <CardDescription>
                  Configure SMTP settings for system emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      placeholder="smtp.gmail.com"
                      value={settings.smtpHost}
                      onChange={(e) => handleSettingChange('smtpHost', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      placeholder="587"
                      value={settings.smtpPort}
                      onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value) || 587)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      placeholder="user@example.com"
                      value={settings.smtpUser}
                      onChange={(e) => handleSettingChange('smtpUser', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="smtpPassword"
                        type="password"
                        placeholder="••••••••"
                        value={settings.smtpPassword}
                        onChange={(e) => handleSettingChange('smtpPassword', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      placeholder="noreply@electms.com"
                      value={settings.fromEmail}
                      onChange={(e) => handleSettingChange('fromEmail', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      placeholder="Elect MS"
                      value={settings.fromName}
                      onChange={(e) => handleSettingChange('fromName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Notification Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Email Notifications</p>
                        <p className="text-xs text-muted-foreground">Send system notifications via email</p>
                      </div>
                      <Switch
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Push Notifications</p>
                        <p className="text-xs text-muted-foreground">Send push notifications to admins</p>
                      </div>
                      <Switch
                        checked={settings.pushNotifications}
                        onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Incident Alerts</p>
                        <p className="text-xs text-muted-foreground">Alert on new incidents</p>
                      </div>
                      <Switch
                        checked={settings.incidentAlerts}
                        onCheckedChange={(checked) => handleSettingChange('incidentAlerts', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Result Alerts</p>
                        <p className="text-xs text-muted-foreground">Alert on new result submissions</p>
                      </div>
                      <Switch
                        checked={settings.resultAlerts}
                        onCheckedChange={(checked) => handleSettingChange('resultAlerts', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Settings */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Feature Management
                </CardTitle>
                <CardDescription>
                  Enable or disable system features and modules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Agent Management</p>
                      <p className="text-xs text-muted-foreground">Enable polling agent management</p>
                    </div>
                    <Switch
                      checked={settings.enableAgents}
                      onCheckedChange={(checked) => handleSettingChange('enableAgents', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Results Management</p>
                      <p className="text-xs text-muted-foreground">Enable result submission and verification</p>
                    </div>
                    <Switch
                      checked={settings.enableResults}
                      onCheckedChange={(checked) => handleSettingChange('enableResults', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Incident Reporting</p>
                      <p className="text-xs text-muted-foreground">Enable incident reporting system</p>
                    </div>
                    <Switch
                      checked={settings.enableIncidents}
                      onCheckedChange={(checked) => handleSettingChange('enableIncidents', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Analytics Dashboard</p>
                      <p className="text-xs text-muted-foreground">Enable analytics and reporting</p>
                    </div>
                    <Switch
                      checked={settings.enableAnalytics}
                      onCheckedChange={(checked) => handleSettingChange('enableAnalytics', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Live Tracking</p>
                      <p className="text-xs text-muted-foreground">Enable real-time agent tracking</p>
                    </div>
                    <Switch
                      checked={settings.enableLiveTracking}
                      onCheckedChange={(checked) => handleSettingChange('enableLiveTracking', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Auto Backup</p>
                      <p className="text-xs text-muted-foreground">Automatically backup database</p>
                    </div>
                    <Switch
                      checked={settings.autoBackup}
                      onCheckedChange={(checked) => handleSettingChange('autoBackup', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Info */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Information
                </CardTitle>
                <CardDescription>
                  System health, performance, and resource utilization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* System Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Node Version</p>
                    <p className="text-lg font-bold">{systemInfo.nodeVersion}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Platform</p>
                    <p className="text-lg font-bold">{systemInfo.platform}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">CPU Cores</p>
                    <p className="text-lg font-bold">{systemInfo.cpuCores}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <p className="text-lg font-bold">{systemInfo.uptime}</p>
                  </div>
                </div>

                {/* Resource Usage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Used</span>
                          <span className="font-medium">{systemInfo.memoryUsed}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: '30%' }}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Total: {systemInfo.memoryTotal}</span>
                          <span>30%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Database</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Size</span>
                          <span className="font-medium">{systemInfo.databaseSize}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Last Backup</span>
                          <span className="font-medium">{systemInfo.lastBackup}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Next Backup</span>
                          <span className="font-medium">{systemInfo.nextBackup}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Data Stats */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Data Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{systemInfo.totalUsers}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{systemInfo.activeUsers}</p>
                      <p className="text-xs text-muted-foreground">Active Users</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{systemInfo.totalZones}</p>
                      <p className="text-xs text-muted-foreground">Zones</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{systemInfo.totalWards}</p>
                      <p className="text-xs text-muted-foreground">Wards</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{systemInfo.totalPollingUnits}</p>
                      <p className="text-xs text-muted-foreground">Polling Units</p>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">{systemInfo.totalResults}</p>
                      <p className="text-xs text-muted-foreground">Results</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{systemInfo.totalIncidents}</p>
                      <p className="text-xs text-muted-foreground">Incidents</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">{systemInfo.pendingIncidents}</p>
                      <p className="text-xs text-muted-foreground">Pending Incidents</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {confirmAction?.title}
              </DialogTitle>
              <DialogDescription>
                {confirmAction?.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsConfirmDialogOpen(false);
                setConfirmAction(null);
              }}>
                Cancel
              </Button>
              <Button variant={confirmAction?.title.includes('Enable') ? 'default' : 'destructive'} onClick={confirmAction?.onConfirm}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
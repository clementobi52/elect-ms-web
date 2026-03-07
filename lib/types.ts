// Role definitions matching backend
export const ROLES = {
  POLLING_AGENT: 'polling_agent',
  WARD_ADMIN: 'ward_admin',
  ZONE_ADMIN: 'zone_admin',
  SITUATION_ROOM: 'situation_room',
  SYSTEM_ADMIN: 'system_admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// User type
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  pollingUnitId?: string;
  wardId?: string;
  zoneId?: string;
  status?: 'Online' | 'Offline';
  createdAt?: string;
  updatedAt?: string;
}

// Polling Unit type
export interface PollingUnit {
  id: string;
  name: string;
  code: string;
  wardId: string;
  ward?: Ward;
  latitude: number;
  longitude: number;
  registeredVoters?: number;
  agents?: User[];
}

// Ward type
export interface Ward {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zone?: Zone;
  pollingUnits?: PollingUnit[];
}

// Zone type
export interface Zone {
  id: string;
  name: string;
  code: string;
  wards?: Ward[];
}

// Election Result type
export interface ElectionResult {
  id: string;
  pollingUnitId: string;
  pollingUnit?: PollingUnit;
  agentId: string;
  agent?: User;
  imageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewComment?: string;
  reviewedBy?: string;
  reviewer?: User;
  votes?: VoteCount[];
  createdAt: string;
  updatedAt: string;
}

// Vote count type
export interface VoteCount {
  id: string;
  resultId: string;
  partyCode: string;
  partyName: string;
  votes: number;
}

// Incident Report type
export interface IncidentReport {
  id: string;
  pollingUnitId: string;
  pollingUnit?: PollingUnit;
  reportedBy: string;
  reporter?: User;
  type: 'violence' | 'disruption' | 'irregularity' | 'fraud' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  attachments?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

// Dashboard Stats type
export interface DashboardStats {
  totalPollingUnits: number;
  activeAgents: number;
  totalResults: number;
  pendingResults: number;
  approvedResults: number;
  rejectedResults: number;
  totalIncidents: number;
  criticalIncidents: number;
  resolvedIncidents: number;
}

// Role-based permissions
export const PERMISSIONS = {
  [ROLES.POLLING_AGENT]: {
    canViewOwnPollingUnit: true,
    canUploadResults: true,
    canReportIncidents: true,
    canViewOwnReports: true,
  },
  [ROLES.WARD_ADMIN]: {
    canViewWardPollingUnits: true,
    canViewWardAgents: true,
    canReviewResults: true,
    canViewWardIncidents: true,
    canManageWardAgents: false,
  },
  [ROLES.ZONE_ADMIN]: {
    canViewZoneWards: true,
    canViewZonePollingUnits: true,
    canViewZoneAgents: true,
    canReviewResults: true,
    canViewZoneIncidents: true,
    canManageWardAdmins: false,
  },
  [ROLES.SITUATION_ROOM]: {
    canViewAllData: true,
    canViewRealTimeStats: true,
    canViewAllIncidents: true,
    canViewAllResults: true,
    canGenerateReports: true,
    canManageUsers: false,
  },
  [ROLES.SYSTEM_ADMIN]: {
    canViewAllData: true,
    canManageAllUsers: true,
    canManageZones: true,
    canManageWards: true,
    canManagePollingUnits: true,
    canViewSystemLogs: true,
    canConfigureSystem: true,
  },
} as const;

// Helper function to check if user has permission
export function hasPermission(role: Role, permission: string): boolean {
  const rolePermissions = PERMISSIONS[role] as Record<string, boolean>;
  return rolePermissions?.[permission] ?? false;
}

// Helper function to get role display name
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    [ROLES.POLLING_AGENT]: 'Polling Agent',
    [ROLES.WARD_ADMIN]: 'Ward Admin',
    [ROLES.ZONE_ADMIN]: 'Zonal Admin',
    [ROLES.SITUATION_ROOM]: 'Situation Room',
    [ROLES.SYSTEM_ADMIN]: 'System Admin',
  };
  return displayNames[role] || role;
}

// Helper function to get role badge color
export function getRoleBadgeColor(role: Role): string {
  const colors: Record<Role, string> = {
    [ROLES.POLLING_AGENT]: 'bg-blue-100 text-blue-800',
    [ROLES.WARD_ADMIN]: 'bg-green-100 text-green-800',
    [ROLES.ZONE_ADMIN]: 'bg-purple-100 text-purple-800',
    [ROLES.SITUATION_ROOM]: 'bg-orange-100 text-orange-800',
    [ROLES.SYSTEM_ADMIN]: 'bg-red-100 text-red-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

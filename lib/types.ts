// lib/types.ts

// ============================================
// ROLE DEFINITIONS
// ============================================

export const ROLES = {
  POLLING_AGENT: 'polling_agent',
  WARD_ADMIN: 'ward_admin',
  ZONE_ADMIN: 'zone_admin',
  SITUATION_ROOM: 'situation_room',
  SYSTEM_ADMIN: 'system_admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ✅ ADD: Display names for roles
export const ROLE_DISPLAY_NAMES = {
  'polling_agent': 'Polling Agent',
  'ward_admin': 'Ward Admin',
  'zone_admin': 'Zone Admin',
  'situation_room': 'Situation Room Admin',
  'system_admin': 'System Admin',
  'Polling Agent': 'Polling Agent',
  'Ward Admin': 'Ward Admin',
  'Zone Admin': 'Zone Admin',
  'Situation Room Admin': 'Situation Room Admin',
  'System Admin': 'System Admin',
} as const;

// ✅ ADD: Role options for dropdowns
export const ROLE_OPTIONS = [
  { value: 'Polling Agent', label: 'Polling Agent' },
  { value: 'Ward Admin', label: 'Ward Admin' },
  { value: 'Zone Admin', label: 'Zone Admin' },
  { value: 'Situation Room Admin', label: 'Situation Room Admin' },
  { value: 'System Admin', label: 'System Admin' },
];

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role | string;
  pollingUnitId?: string | null;
  wardId?: string | null;
  zoneId?: string | null;
  status?: 'active' | 'inactive' | 'pending' | 'Active' | 'Inactive' | 'Pending' | 'Suspended';
  pollingUnit?: PollingUnit;
  ward?: Ward;
  zone?: Zone;
  lastKnownLatitude?: number | null;
  lastKnownLongitude?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  pollingUnitName: string;
  pollingUnitId?: string;
  pollingUnit?: PollingUnit;
  wardId?: string;
  ward?: Ward;
  zoneId?: string;
  zone?: Zone;
  role?: string;
  status?: string;
  updatedAt?: string;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  };
  resultsSubmitted?: number;
  lastActive?: string;
  locationReconciledBy?: string;
  locationReconciledAt?: string;
}

// ============================================
// GEOGRAPHIC HIERARCHY TYPES
// ============================================

export interface State {
  id: string;
  name: string;
  code: string;
  capital?: string;
  region?: string;
  lgas?: LGA[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LGA {
  id: string;
  name: string;
  code: string;
  stateId: string;
  state?: State;
  wards?: Ward[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Zone {
  id: string;
  name: string;
  code?: string;
  stateId?: string;
  lgaId?: string;
  state?: State;
  lga?: LGA;
  wards?: Ward[];
  pollingUnits?: PollingUnit[];
  wardCount?: number;
  pollingUnitCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ward {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zone?: Zone;
  stateId?: string;
  lgaId?: string;
  standardWardId?: string;
  standardWard?: StandardWard;
  pollingUnits?: PollingUnit[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StandardWard {
  id: string;
  name: string;
  code: string;
  lgaId: string;
  lga?: LGA;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// POLLING UNIT TYPES
// ============================================

export interface PollingUnit {
  id: string;
  name: string;
  code?: string;
  wardId?: string;
  ward?: Ward;
  stateId?: string;
  lgaId?: string;
  standardWardId?: string;
  standardWard?: StandardWard;
  zoneId?: string;
  zone?: Zone;
  wardName?: string;
  latitude: number;
  longitude: number;
  registeredVoters?: number;
  agents?: User[];
  agent?: User | { id: string; name: string; email: string };
  state?: { id: string; name: string; code: string };
  lga?: { id: string; name: string; code: string };
  location?: any;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// ELECTION RESULT TYPES
// ============================================

export interface VoteCount {
  id: string;
  resultId: string;
  partyCode: string;
  partyName: string;
  votes: number;
  party?: Party;
}

export interface ElectionResult {
  id: string;
  pollingUnitId: string;
  pollingUnit?: PollingUnit;
  agentId: string;
  agent?: User;
  resultFileUrl?: string;
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'Verified' | 'Pending' | 'Rejected';
  reviewComment?: string;
  reviewedBy?: string;
  reviewer?: User;
  votes?: VoteCount[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// INCIDENT TYPES
// ============================================

export interface IncidentReport {
  id: string;
  pollingUnitId: string;
  pollingUnit?: PollingUnit;
  reportedBy: string;
  reporter?: User;
  type: 'violence' | 'disruption' | 'irregularity' | 'fraud' | 'other' | string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  description: string;
  attachments?: string[];
  mediaUrl?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed' | string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PARTY TYPES
// ============================================

export interface Party {
  id: string;
  name: string;
  code?: string;
  logoUrl?: string;
  slogan?: string;
  registrationNumber?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// DASHBOARD STATS
// ============================================

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
  totalUsers?: number;
  totalAgents?: number;
  totalWardAdmins?: number;
  totalZoneAdmins?: number;
  totalSituationRoomUsers?: number;
  totalSystemAdmins?: number;
  totalZones?: number;
  totalWards?: number;
}

// ============================================
// REPORT TYPES
// ============================================

export interface Report {
  id: string;
  name: string;
  type: 'summary' | 'results' | 'incidents' | 'agents' | 'wards';
  format: 'pdf' | 'csv' | 'excel';
  generatedAt: string;
  generatedBy: string;
  size: string;
  status: 'ready' | 'processing' | 'failed';
  url?: string | null;
}

// ============================================
// ROLE PERMISSIONS
// ============================================

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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user has a specific permission
 */
export function hasPermission(role: Role | string, permission: string): boolean {
  // Convert display name to role key if needed
  const roleKey = getRoleKey(role);
  const rolePermissions = PERMISSIONS[roleKey as Role] as Record<string, boolean>;
  return rolePermissions?.[permission] ?? false;
}

/**
 * Get role key from display name or role
 */
export function getRoleKey(role: string): string {
  const roleMap: Record<string, string> = {
    'Polling Agent': ROLES.POLLING_AGENT,
    'Ward Admin': ROLES.WARD_ADMIN,
    'Zone Admin': ROLES.ZONE_ADMIN,
    'Situation Room Admin': ROLES.SITUATION_ROOM,
    'System Admin': ROLES.SYSTEM_ADMIN,
  };
  return roleMap[role] || role;
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    [ROLES.POLLING_AGENT]: 'Polling Agent',
    [ROLES.WARD_ADMIN]: 'Ward Admin',
    [ROLES.ZONE_ADMIN]: 'Zone Admin',
    [ROLES.SITUATION_ROOM]: 'Situation Room Admin',
    [ROLES.SYSTEM_ADMIN]: 'System Admin',
    'Polling Agent': 'Polling Agent',
    'Ward Admin': 'Ward Admin',
    'Zone Admin': 'Zone Admin',
    'Situation Room Admin': 'Situation Room Admin',
    'System Admin': 'System Admin',
  };
  return displayNames[role] || role;
}

/**
 * Get badge color for a role
 */
export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    [ROLES.POLLING_AGENT]: 'bg-blue-100 text-blue-800 border-blue-200',
    [ROLES.WARD_ADMIN]: 'bg-green-100 text-green-800 border-green-200',
    [ROLES.ZONE_ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
    [ROLES.SITUATION_ROOM]: 'bg-orange-100 text-orange-800 border-orange-200',
    [ROLES.SYSTEM_ADMIN]: 'bg-red-100 text-red-800 border-red-200',
    'Polling Agent': 'bg-blue-100 text-blue-800 border-blue-200',
    'Ward Admin': 'bg-green-100 text-green-800 border-green-200',
    'Zone Admin': 'bg-purple-100 text-purple-800 border-purple-200',
    'Situation Room Admin': 'bg-orange-100 text-orange-800 border-orange-200',
    'System Admin': 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    Critical: 'bg-red-100 text-red-800 border-red-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Low: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return colors[severity] || 'bg-gray-100 text-gray-800';
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    investigating: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    verified: 'bg-green-100 text-green-800',
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Suspended: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
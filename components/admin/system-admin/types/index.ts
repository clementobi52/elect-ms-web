// components/admin/system-admin/types/index.ts

import type {
  LGA,
  PollingUnit,
  StandardWard,
  State,
  User,
  Ward,
  Zone,
} from '@/lib/types';

// ==================== Re-export from lib/types ====================
export type {
  Zone,
  Ward,
  PollingUnit,
  User,
  State,
  LGA,
  StandardWard,
  Party,
  ElectionResult,
  IncidentReport,
  VoteCount,
  Agent,
  Report,
  DashboardStats,
  Role,
} from '@/lib/types';

export {
  ROLES,
  PERMISSIONS,
  hasPermission,
  getRoleDisplayName,
  getRoleBadgeColor,
  getSeverityColor,
  getStatusColor,
} from '@/lib/types';

// ==================== System Admin Specific Types ====================

export interface SystemStats {
  totalUsers: number;
  totalZones: number;
  totalWards: number;
  totalPollingUnits: number;
  totalAgents: number;
  totalWardAdmins: number;
  totalZoneAdmins: number;
  situationRoomUsers: number;
  systemAdmins: number;
  activeUsers: number;
  pendingApprovals: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LogFilters {
  action: string;
  status: string;
  startDate: string;
  endDate: string;
  search: string;
}

export interface DeleteDialogProps {
  open: boolean;
  type: string;
  id: string;
  name: string;
}

export interface CreateUserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  pollingUnitId?: string;
  wardId?: string;
  zoneId?: string;
}

export interface UpdateUserFormData {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  pollingUnitId?: string;
  wardId?: string;
  zoneId?: string;
}

// ==================== Additional Types ====================

export interface UserWithRelations extends User {
  pollingUnit?: PollingUnit;
  ward?: Ward;
  zone?: Zone;
}

export interface PollingUnitWithRelations extends Omit<PollingUnit, 'agent' | 'state' | 'lga'> {
  ward?: WardWithRelations;
  state?: State | null;
  lga?: LGA | null;
  standardWard?: StandardWard;
  agent?: User | null;
}

export interface WardWithRelations extends Ward {
  zone?: Zone;
  pollingUnits?: PollingUnit[];
}

export interface ZoneWithRelations extends Zone {
  wards?: WardWithRelations[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}
// components/admin/system-admin/types/index.ts

import { 
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
  ROLES,
  PERMISSIONS,
  hasPermission,
  getRoleDisplayName,
  getRoleBadgeColor,
  getSeverityColor,
  getStatusColor
} from '@/lib/types';

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

// Re-export all types from lib
export {
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
  ROLES,
  PERMISSIONS,
  hasPermission,
  getRoleDisplayName,
  getRoleBadgeColor,
  getSeverityColor,
  getStatusColor
};
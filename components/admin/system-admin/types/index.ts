// components/admin/system-admin/types/index.ts
import { Zone, Ward, PollingUnit, User } from '@/lib/types';

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

export * from '@/lib/types';
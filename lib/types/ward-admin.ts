export interface Party {
  id: string;
  name: string;
  logoUrl?: string;
  slogan?: string;
  registrationNumber?: string;
}

export interface PollingAgent {
  id: string;
  name: string;
  email: string;
  status: 'Online' | 'Offline';
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  assignedPollingUnit?: {
    name: string;
    latitude: number;
    longitude: number;
  } | null;
  distanceFromPollingUnit?: string | null;
  withinPollingUnit?: 'Yes' | 'No' | 'Unknown';
}

export interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  agent: string;
  status: string;
  resultsSubmitted: boolean;
}

export interface Vote {
  partyId?: string;
  party: string;
  votes: number;
}

export interface PendingResult {
  id: string;
  pollingUnit: string;
  agent: string;
  submittedAt: string;
  resultFileUrl?: string;
  votes: Vote[];
}

export interface Incident {
  id: string;
  type: string;
  pollingUnit: string;
  reporter: string;
  time: string;
  severity: string;
  status: string;
  description?: string;
}

export interface DashboardData {
  message: string;
  pollingAgents: PollingAgent[];
}

export interface WardStats {
  totalPollingUnits: number;
  activeAgents: number;
  offlineAgents: number;
  totalResults: number;
  pendingResults: number;
  approvedResults: number;
  rejectedResults: number;
  totalIncidents: number;
  criticalIncidents: number;
}
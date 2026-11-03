export interface AdminDashboardStats {
  total_clients: number;
  total_drivers: number;
  pending_drivers: number;
  approved_drivers: number;
  active_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  pending_requests: number;
  total_revenue: number;
}

export interface AdminTripItem {
  id: number;
  request_id?: number;
  client_id?: number;
  driver_id?: number;
  vehicle_id?: number;
  estimated_fare: number;
  final_fare?: number | null;
  status: string;
  driver_arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  distance_travelled_km?: number | null;
  duration_travelled_min?: number | null;
  created_at: string;
  updated_at?: string;
  client?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  driver?: {
    id: number;
    user_id?: number;
    license_number: string;
    approval_status?: string;
    rating_average: number;
    user: {
      id?: number;
      name: string;
      email?: string;
      phone?: string;
    };
  };
  vehicle?: {
    id?: number;
    plate: string;
    brand: string;
    model: string;
    year?: number;
    color?: string;
  };
}

export interface AdminDashboardResponse {
  success: boolean;
  stats: AdminDashboardStats;
  recent_trips: AdminTripItem[];
  recent_incidents: any[];
}

export interface AdminDriverItem {
  id: number;
  user_id: number;
  license_number: string;
  approval_status: 'pending' | 'approved' | 'rejected' | string;
  availability_status: 'available' | 'unavailable' | string;
  rating_average: number;
  ratings_count: number;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    status: string;
  };
  vehicles?: Array<{
    id: number;
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string;
  }>;
  latest_location?: {
    id?: number;
    latitude: number;
    longitude: number;
    recorded_at: string;
  } | null;
}

export interface AdminDriversResponse {
  success: boolean;
  drivers: AdminDriverItem[];
}

export interface DriverApprovalRequest {
  approval_status: 'approved' | 'rejected' | 'pending';
  admin_notes?: string;
}

export interface AdminFareItem {
  id: number;
  name: string;
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  minimum_fare: number;
  surge_multiplier: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AdminFaresResponse {
  success: boolean;
  fares: AdminFareItem[];
}

export interface CreateFareRequest {
  name: string;
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  minimum_fare: number;
  surge_multiplier: number;
  active: boolean;
}

export interface AdminAuditLogItem {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  ip_address?: string;
  details?: any;
  created_at: string;
  user?: {
    id?: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface AdminAuditLogsResponse {
  success: boolean;
  logs: AdminAuditLogItem[];
}

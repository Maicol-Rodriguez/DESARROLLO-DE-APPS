export type DriverAvailabilityStatus = 'available' | 'unavailable';
export type DriverApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface DriverVehicle {
  id?: number;
  driver_id?: number;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  capacity?: number;
  color: string;
  status?: string;
}

export interface DriverProfile {
  id: number;
  user_id: number;
  license_number: string;
  approval_status: DriverApprovalStatus;
  availability_status: DriverAvailabilityStatus;
  rating_average: number;
  ratings_count: number;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  vehicles?: DriverVehicle[];
}

export interface DriverRideRequest {
  id: number;
  client_id: number;
  origin_name: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_name: string;
  destination_latitude?: number;
  destination_longitude?: number;
  estimated_distance_km: number;
  estimated_duration_min: number;
  estimated_fare: number;
  status: string;
  created_at?: string;
  updated_at?: string;
  client?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface DriverTrip {
  id: number;
  request_id?: number;
  client_id?: number;
  driver_id?: number;
  status: 'assigned' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | string;
  estimated_fare?: number;
  final_fare?: number | null;
  driver_arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  distance_travelled_km?: number | null;
  duration_travelled_min?: number | null;
  created_at?: string;
  request?: DriverRideRequest;
  client?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface AcceptTripResponse {
  success: boolean;
  message: string;
  trip: DriverTrip;
}

export interface CompleteTripRequest {
  actual_distance_km: number;
  actual_duration_min: number;
}

export interface DriverLocationRequest {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  trip_id?: number | null;
}

export interface DriverLocationResponse {
  success: boolean;
  location: {
    id?: number;
    driver_id: number;
    trip_id?: number | null;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    recorded_at: string;
  };
}

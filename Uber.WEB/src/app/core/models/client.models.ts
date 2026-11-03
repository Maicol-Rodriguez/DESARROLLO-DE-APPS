export interface EstimateFareRequest {
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
}

export interface FareBreakdown {
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  minimum_fare: number;
  surge_multiplier: number;
}

export interface FareEstimate {
  distance_km: number;
  duration_min: number;
  estimated_fare: number;
  currency: string;
  fare_breakdown: FareBreakdown;
}

export interface EstimateFareResponse {
  success: boolean;
  estimate: FareEstimate;
}

export interface CreateRideRequest {
  origin_name: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_name: string;
  destination_latitude: number;
  destination_longitude: number;
}

export interface RideRequestItem {
  id: number;
  client_id: number;
  origin_name: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_name: string;
  destination_latitude: number;
  destination_longitude: number;
  estimated_distance_km: number;
  estimated_duration_min: number;
  estimated_fare: number;
  status: 'requested' | 'accepted' | 'cancelled' | 'completed' | string;
  created_at: string;
  updated_at?: string;
}

export interface RideRequestResponse {
  success: boolean;
  message: string;
  ride_request: RideRequestItem;
}

export interface DriverUser {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface DriverLocation {
  latitude: number;
  longitude: number;
  recorded_at?: string;
}

export interface DriverActiveInfo {
  id: number;
  rating_average: number;
  ratings_count?: number;
  license_number?: string;
  approval_status?: string;
  availability_status?: string;
  user: DriverUser;
  latest_location?: DriverLocation | null;
}

export interface VehicleActiveInfo {
  id?: number;
  plate: string;
  brand: string;
  model: string;
  color: string;
  year?: number;
  capacity?: number;
  status?: string;
}

export interface ActiveTripData {
  id: number;
  request_id?: number;
  client_id?: number;
  driver_id?: number;
  vehicle_id?: number;
  fare_config_id?: number;
  status: 'assigned' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | string;
  estimated_fare: number;
  final_fare?: number | null;
  driver_arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at?: string;
  driver?: DriverActiveInfo;
  vehicle?: VehicleActiveInfo;
  request?: RideRequestItem;
}

export interface ActiveRideResponse {
  success: boolean;
  has_active: boolean;
  type?: 'request' | 'trip';
  data?: ActiveTripData | RideRequestItem | null;
}

export interface CancelRideRequest {
  reason: string;
}

export interface TripRatingRequest {
  score: number; // 1 - 5
  comment?: string;
  has_incident?: boolean;
}

export interface TripRatingItem {
  id: number;
  trip_id: number;
  reviewer_id: number;
  reviewed_user_id: number;
  score: number;
  comment?: string;
  has_incident?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TripHistoryItem {
  id: number;
  request_id?: number;
  client_id?: number;
  driver_id?: number;
  vehicle_id?: number;
  estimated_fare: number;
  final_fare: number | null;
  distance_travelled_km?: number | null;
  duration_travelled_min?: number | null;
  status: 'assigned' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | string;
  driver_arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at?: string;
  driver?: DriverActiveInfo;
  vehicle?: VehicleActiveInfo;
  request?: RideRequestItem;
  ratings?: TripRatingItem[];
}

export interface TripsHistoryResponse {
  success: boolean;
  trips: {
    data: TripHistoryItem[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    next_page_url?: string | null;
    prev_page_url?: string | null;
  };
}

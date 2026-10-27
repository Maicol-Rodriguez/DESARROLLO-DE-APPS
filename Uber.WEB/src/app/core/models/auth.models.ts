export type UserRole = 'client' | 'driver' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
}

export interface LoginRequest {
  login: string; // Correo o teléfono
  password: string;
}

export interface RegisterClientRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'client';
}

export interface RegisterDriverRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'driver';
  license_number: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  capacity: number;
  color: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface MeResponse {
  success: boolean;
  user: User;
}

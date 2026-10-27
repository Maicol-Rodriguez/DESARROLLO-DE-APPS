import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  MeResponse,
  RegisterClientRequest,
  RegisterDriverRequest,
  User,
  UserRole
} from '../models/auth.models';
import { UiService } from './ui.service';

/**
 * Servicio de Autenticación:
 * Maneja el inicio de sesión, registro (cliente y conductor),
 * almacenamiento del token JWT, cierre de sesión y perfil del usuario.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private uiService = inject(UiService);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Estado reactivo con Signals de Angular
  currentUser = signal<User | null>(this.getStoredUser());
  token = signal<string | null>(this.getStoredToken());

  constructor() {}

  /**
   * Inicia sesión con correo/teléfono y contraseña.
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  /**
   * Registra un nuevo usuario con rol de cliente.
   */
  registerClient(data: RegisterClientRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  /**
   * Registra un nuevo usuario con rol de conductor (incluye vehículo y licencia).
   */
  registerDriver(data: RegisterDriverRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  /**
   * Obtiene el perfil actualizado del usuario autenticado.
   */
  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/me`).pipe(
      tap((response) => {
        if (response.user) {
          this.currentUser.set(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      })
    );
  }

  /**
   * Cierra la sesión en el servidor y limpia el almacenamiento local.
   */
  logout(): void {
    // Intentamos notificar al servidor para invalidar el token
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      next: () => {},
      error: () => {}
    });

    // Limpiamos los datos locales inmediatamente
    this.clearSession();
    this.uiService.showToast('Sesión cerrada correctamente', 'primary');
    this.router.navigate(['/login']);
  }

  /**
   * Guarda el token y usuario tras autenticación exitosa.
   */
  private handleAuthSuccess(response: AuthResponse): void {
    if (response.access_token) {
      localStorage.setItem('token', response.access_token);
      this.token.set(response.access_token);
    }
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
      this.currentUser.set(response.user);
    }
  }

  /**
   * Limpia el almacenamiento local y resetea las señales reactivas.
   */
  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token.set(null);
    this.currentUser.set(null);
  }

  /**
   * Recupera el token guardado en el navegador.
   */
  getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Recupera el usuario guardado en el navegador.
   */
  getStoredUser(): User | null {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser) as User;
    } catch {
      return null;
    }
  }

  /**
   * Indica si el usuario tiene una sesión activa.
   */
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  /**
   * Devuelve el rol del usuario logueado ('client', 'driver', 'admin').
   */
  getUserRole(): UserRole | null {
    const user = this.currentUser() || this.getStoredUser();
    return user ? user.role : null;
  }
}

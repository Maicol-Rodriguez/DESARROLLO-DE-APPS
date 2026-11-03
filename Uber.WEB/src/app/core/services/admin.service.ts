import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AdminDashboardStats,
  AdminDashboardResponse,
  AdminTripItem,
  AdminDriverItem,
  AdminDriversResponse,
  DriverApprovalRequest,
  AdminFareItem,
  AdminFaresResponse,
  CreateFareRequest,
  AdminAuditLogItem,
  AdminAuditLogsResponse
} from '../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Estado reactivo con Signals
  stats = signal<AdminDashboardStats | null>(null);
  recentTrips = signal<AdminTripItem[]>([]);
  recentIncidents = signal<any[]>([]);
  drivers = signal<AdminDriverItem[]>([]);
  fares = signal<AdminFareItem[]>([]);
  auditLogs = signal<AdminAuditLogItem[]>([]);
  isLoading = signal<boolean>(false);

  /**
   * Obtiene las métricas globales, KPIs y viajes recientes del dashboard.
   */
  getDashboard(): Observable<AdminDashboardResponse> {
    this.isLoading.set(true);
    return this.http.get<AdminDashboardResponse>(`${this.apiUrl}/admin/dashboard`).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.stats.set(res.stats);
          this.recentTrips.set(res.recent_trips || []);
          this.recentIncidents.set(res.recent_incidents || []);
        }
      })
    );
  }

  /**
   * Obtiene el listado de conductores registrados, opcionalmente filtrados por approval_status.
   */
  getDrivers(approvalStatus?: string): Observable<AdminDriversResponse> {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (approvalStatus && approvalStatus !== 'all') {
      params = params.set('approval_status', approvalStatus);
    }

    return this.http.get<AdminDriversResponse>(`${this.apiUrl}/admin/drivers`, { params }).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.success && Array.isArray(res.drivers)) {
          this.drivers.set(res.drivers);
        }
      })
    );
  }

  /**
   * Actualiza el estado de aprobación de un conductor (approved, rejected, pending).
   */
  updateDriverApproval(
    driverId: number,
    data: DriverApprovalRequest
  ): Observable<{ success: boolean; message: string; driver: any }> {
    return this.http.patch<{ success: boolean; message: string; driver: any }>(
      `${this.apiUrl}/admin/drivers/${driverId}/approval`,
      data
    ).pipe(
      tap((res) => {
        if (res.success) {
          // Actualizamos localmente el conductor en la lista
          this.drivers.update((list) =>
            list.map((d) => (d.id === driverId ? { ...d, approval_status: data.approval_status } : d))
          );
        }
      })
    );
  }

  /**
   * Consulta las configuraciones de tarifas de la plataforma.
   */
  getFares(): Observable<AdminFaresResponse> {
    this.isLoading.set(true);
    return this.http.get<AdminFaresResponse>(`${this.apiUrl}/admin/fares`).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.success && Array.isArray(res.fares)) {
          this.fares.set(res.fares);
        }
      })
    );
  }

  /**
   * Crea una nueva tarifa urbana en el sistema.
   */
  createFare(data: CreateFareRequest): Observable<{ success: boolean; message: string; fare: AdminFareItem }> {
    return this.http.post<{ success: boolean; message: string; fare: AdminFareItem }>(
      `${this.apiUrl}/admin/fares`,
      data
    ).pipe(
      tap((res) => {
        if (res.success && res.fare) {
          this.fares.update((list) => [res.fare, ...list]);
        }
      })
    );
  }

  /**
   * Consulta los registros cronológicos de auditoría y seguridad.
   */
  getAuditLogs(): Observable<AdminAuditLogsResponse> {
    this.isLoading.set(true);
    return this.http.get<AdminAuditLogsResponse>(`${this.apiUrl}/admin/audit-logs`).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.success && Array.isArray(res.logs)) {
          this.auditLogs.set(res.logs);
        }
      })
    );
  }
}

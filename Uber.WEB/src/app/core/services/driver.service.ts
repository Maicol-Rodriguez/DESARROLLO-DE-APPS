import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, timer, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  DriverAvailabilityStatus,
  DriverApprovalStatus,
  DriverProfile,
  DriverRideRequest,
  DriverTrip,
  AcceptTripResponse,
  CompleteTripRequest,
  DriverLocationRequest,
  DriverLocationResponse
} from '../models/driver.models';

const ACTIVE_TRIP_KEY = 'uber_driver_active_trip';

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  // Estado reactivo con Signals
  availability = signal<DriverAvailabilityStatus>('unavailable');
  approvalStatus = signal<DriverApprovalStatus>('approved');
  driverProfile = signal<DriverProfile | null>(null);
  pendingRequests = signal<DriverRideRequest[]>([]);
  activeTrip = signal<DriverTrip | null>(null);
  isPollingRequests = signal<boolean>(false);
  isTransmittingGps = signal<boolean>(false);
  lastLocation = signal<DriverLocationResponse['location'] | null>(null);

  private requestsSub: Subscription | null = null;
  private gpsSub: Subscription | null = null;

  constructor() {
    this.restoreStoredSession();
  }

  /**
   * Restaura el estado previo del conductor (perfil, disponibilidad y viaje activo en localStorage).
   */
  private restoreStoredSession(): void {
    const user = this.authService.currentUser() as any;
    if (user && user.driver_profile) {
      this.driverProfile.set(user.driver_profile);
      this.approvalStatus.set(user.driver_profile.approval_status || 'approved');
      this.availability.set(user.driver_profile.availability_status || 'unavailable');
    }

    const savedTrip = localStorage.getItem(ACTIVE_TRIP_KEY);
    if (savedTrip) {
      try {
        const trip: DriverTrip = JSON.parse(savedTrip);
        if (trip && trip.status !== 'completed' && trip.status !== 'cancelled') {
          this.activeTrip.set(trip);
        } else {
          localStorage.removeItem(ACTIVE_TRIP_KEY);
        }
      } catch {
        localStorage.removeItem(ACTIVE_TRIP_KEY);
      }
    }
  }

  /**
   * Conmuta la disponibilidad del conductor entre 'available' y 'unavailable'.
   */
  setAvailability(status: DriverAvailabilityStatus): Observable<{ success: boolean; message: string; availability_status: DriverAvailabilityStatus }> {
    return this.http.put<{ success: boolean; message: string; availability_status: DriverAvailabilityStatus }>(
      `${this.apiUrl}/driver/availability`,
      { status }
    ).pipe(
      tap((res) => {
        if (res.success) {
          this.availability.set(res.availability_status);
          if (res.availability_status === 'available') {
            this.startRequestsPolling();
          } else {
            this.stopRequestsPolling();
          }
        }
      })
    );
  }

  /**
   * Obtiene la lista de solicitudes de viaje pendientes de asignación.
   */
  getRideRequests(): Observable<{ success: boolean; requests: DriverRideRequest[] }> {
    return this.http.get<{ success: boolean; requests: DriverRideRequest[] }>(`${this.apiUrl}/driver/ride-requests`).pipe(
      tap((res) => {
        if (res.success && Array.isArray(res.requests)) {
          this.pendingRequests.set(res.requests);
        }
      })
    );
  }

  /**
   * Acepta una solicitud de transporte con control de concurrencia 409 (RNF-05).
   */
  acceptRideRequest(requestId: number, fallbackRequest?: DriverRideRequest): Observable<AcceptTripResponse> {
    return this.http.post<AcceptTripResponse>(`${this.apiUrl}/driver/ride-requests/${requestId}/accept`, {}).pipe(
      tap((res) => {
        if (res.success && res.trip) {
          const tripData: DriverTrip = {
            ...res.trip,
            request: fallbackRequest || res.trip.request,
            client: fallbackRequest?.client || res.trip.client
          };

          this.activeTrip.set(tripData);
          localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(tripData));
          
          // Removemos la solicitud de la lista de pendientes
          this.pendingRequests.update((list) => list.filter((r) => r.id !== requestId));
          this.stopRequestsPolling();
        }
      })
    );
  }

  /**
   * Registra la llegada del conductor al punto de recogida del pasajero.
   */
  registerArrival(tripId: number): Observable<{ success: boolean; message: string; trip: DriverTrip }> {
    return this.http.post<{ success: boolean; message: string; trip: DriverTrip }>(
      `${this.apiUrl}/driver/trips/${tripId}/arrive`,
      {}
    ).pipe(
      tap((res) => {
        if (res.success && this.activeTrip()) {
          const updated: DriverTrip = {
            ...this.activeTrip()!,
            status: 'driver_arrived',
            driver_arrived_at: res.trip?.driver_arrived_at || new Date().toISOString()
          };
          this.activeTrip.set(updated);
          localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(updated));
        }
      })
    );
  }

  /**
   * Inicia formalmente el viaje hacia el destino.
   */
  startTrip(tripId: number): Observable<{ success: boolean; message: string; trip: DriverTrip }> {
    return this.http.post<{ success: boolean; message: string; trip: DriverTrip }>(
      `${this.apiUrl}/driver/trips/${tripId}/start`,
      {}
    ).pipe(
      tap((res) => {
        if (res.success && this.activeTrip()) {
          const updated: DriverTrip = {
            ...this.activeTrip()!,
            status: 'in_progress',
            started_at: res.trip?.started_at || new Date().toISOString()
          };
          this.activeTrip.set(updated);
          localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(updated));
        }
      })
    );
  }

  /**
   * Finaliza el viaje y liquida la tarifa definitiva.
   */
  completeTrip(tripId: number, data: CompleteTripRequest): Observable<{ success: boolean; message: string; trip: DriverTrip }> {
    return this.http.post<{ success: boolean; message: string; trip: DriverTrip }>(
      `${this.apiUrl}/driver/trips/${tripId}/complete`,
      data
    ).pipe(
      tap((res) => {
        if (res.success) {
          const updated: DriverTrip = {
            ...(this.activeTrip() || res.trip),
            status: 'completed',
            final_fare: res.trip?.final_fare,
            distance_travelled_km: res.trip?.distance_travelled_km,
            duration_travelled_min: res.trip?.duration_travelled_min,
            completed_at: res.trip?.completed_at || new Date().toISOString()
          };
          this.activeTrip.set(updated);
          localStorage.removeItem(ACTIVE_TRIP_KEY);
          this.availability.set('available');
        }
      })
    );
  }

  /**
   * Limpia el viaje finalizado de la pantalla para permitir tomar nuevos servicios.
   */
  clearCompletedTrip(): void {
    this.activeTrip.set(null);
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    if (this.availability() === 'available') {
      this.startRequestsPolling();
    }
  }

  /**
   * Transmite la ubicación GPS del conductor al servidor.
   */
  updateLocation(loc: DriverLocationRequest): Observable<DriverLocationResponse> {
    return this.http.post<DriverLocationResponse>(`${this.apiUrl}/driver/location`, loc).pipe(
      tap((res) => {
        if (res.success && res.location) {
          this.lastLocation.set(res.location);
        }
      })
    );
  }

  /**
   * Inicia el sondeo automático de solicitudes de transporte cada N ms.
   */
  startRequestsPolling(intervalMs: number = 4000): void {
    if (this.requestsSub) {
      return;
    }

    this.isPollingRequests.set(true);
    this.requestsSub = timer(0, intervalMs).pipe(
      switchMap(() => this.getRideRequests().pipe(
        catchError(() => of(null))
      ))
    ).subscribe();
  }

  /**
   * Detiene el sondeo de solicitudes.
   */
  stopRequestsPolling(): void {
    if (this.requestsSub) {
      this.requestsSub.unsubscribe();
      this.requestsSub = null;
    }
    this.isPollingRequests.set(false);
  }

  /**
   * Inicia la transmisión continua de ubicación GPS cada N ms.
   */
  startGpsTracking(intervalMs: number = 8000): void {
    if (this.gpsSub) {
      return;
    }

    this.isTransmittingGps.set(true);
    this.gpsSub = timer(0, intervalMs).pipe(
      switchMap(() => {
        return new Observable<DriverLocationRequest>((observer) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                observer.next({
                  latitude: parseFloat(pos.coords.latitude.toFixed(6)),
                  longitude: parseFloat(pos.coords.longitude.toFixed(6)),
                  heading: pos.coords.heading || 0,
                  speed: pos.coords.speed || 0,
                  trip_id: this.activeTrip()?.id || null
                });
                observer.complete();
              },
              () => {
                // Si falla GPS real, envía simulación basada en Bogotá
                observer.next({
                  latitude: 4.6715,
                  longitude: -74.0509,
                  heading: 90,
                  speed: 25,
                  trip_id: this.activeTrip()?.id || null
                });
                observer.complete();
              },
              { timeout: 5000, enableHighAccuracy: true }
            );
          } else {
            observer.next({
              latitude: 4.6715,
              longitude: -74.0509,
              heading: 90,
              speed: 25,
              trip_id: this.activeTrip()?.id || null
            });
            observer.complete();
          }
        }).pipe(
          switchMap((loc) => this.updateLocation(loc).pipe(catchError(() => of(null))))
        );
      })
    ).subscribe();
  }

  /**
   * Detiene la transmisión continua de GPS.
   */
  stopGpsTracking(): void {
    if (this.gpsSub) {
      this.gpsSub.unsubscribe();
      this.gpsSub = null;
    }
    this.isTransmittingGps.set(false);
  }
}

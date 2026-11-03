import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, timer, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  EstimateFareRequest,
  EstimateFareResponse,
  CreateRideRequest,
  RideRequestResponse,
  ActiveRideResponse,
  CancelRideRequest,
  TripRatingRequest,
  TripsHistoryResponse,
  TripHistoryItem
} from '../models/client.models';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Estado reactivo con Signals de Angular
  activeRide = signal<ActiveRideResponse | null>(null);
  isPolling = signal<boolean>(false);
  tripsHistory = signal<TripHistoryItem[]>([]);
  isLoadingTrips = signal<boolean>(false);

  private pollingSub: Subscription | null = null;

  /**
   * Estima la tarifa de un viaje según coordenadas de origen y destino.
   */
  estimateFare(data: EstimateFareRequest): Observable<EstimateFareResponse> {
    return this.http.post<EstimateFareResponse>(`${this.apiUrl}/client/estimate-fare`, data);
  }

  /**
   * Crea una nueva solicitud de viaje en el sistema.
   */
  createRideRequest(data: CreateRideRequest): Observable<RideRequestResponse> {
    return this.http.post<RideRequestResponse>(`${this.apiUrl}/client/ride-requests`, data).pipe(
      tap((res) => {
        if (res.success && res.ride_request) {
          this.activeRide.set({
            success: true,
            has_active: true,
            type: 'request',
            data: res.ride_request
          });
          this.startPolling();
        }
      })
    );
  }

  /**
   * Consulta el estado del viaje o solicitud activa.
   */
  getActiveRide(): Observable<ActiveRideResponse> {
    return this.http.get<ActiveRideResponse>(`${this.apiUrl}/client/active`).pipe(
      tap((res) => {
        this.activeRide.set(res);
      })
    );
  }

  /**
   * Cancela una solicitud o viaje activo antes de iniciar el recorrido.
   */
  cancelRide(id: number, reason: string): Observable<{ success: boolean; message: string }> {
    const body: CancelRideRequest = { reason };
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/client/cancel/${id}`, body).pipe(
      tap(() => {
        this.activeRide.set({
          success: true,
          has_active: false,
          data: null
        });
        this.stopPolling();
      })
    );
  }

  /**
   * Obtiene el historial paginado de viajes del cliente.
   */
  getTrips(page: number = 1): Observable<TripsHistoryResponse> {
    this.isLoadingTrips.set(true);
    return this.http.get<TripsHistoryResponse>(`${this.apiUrl}/client/trips?page=${page}`).pipe(
      tap((res) => {
        if (res.success && res.trips) {
          this.tripsHistory.set(res.trips.data || []);
        }
        this.isLoadingTrips.set(false);
      }),
      catchError((err) => {
        this.isLoadingTrips.set(false);
        throw err;
      })
    );
  }

  /**
   * Califica un viaje finalizado (1 a 5 estrellas) con comentarios y reporte de incidencias.
   */
  rateTrip(tripId: number, data: TripRatingRequest): Observable<{ success: boolean; message: string; rating: any }> {
    return this.http.post<{ success: boolean; message: string; rating: any }>(`${this.apiUrl}/client/trips/${tripId}/rating`, data);
  }

  /**
   * Inicia el sondeo continuo (polling) cada N milisegundos para actualizar el estado del viaje en vivo.
   */
  startPolling(intervalMs: number = 4000): void {
    if (this.pollingSub) {
      return; // Ya está activo
    }

    this.isPolling.set(true);
    this.pollingSub = timer(0, intervalMs).pipe(
      switchMap(() => this.getActiveRide().pipe(
        catchError(() => of(null))
      ))
    ).subscribe((res) => {
      if (res && (!res.has_active || (res.type === 'trip' && (res.data?.status === 'completed' || res.data?.status === 'cancelled')))) {
        // Si ya no está activo o ya finalizó/canceló, detenemos el sondeo periódico
        if (!res.has_active) {
          this.stopPolling();
        }
      }
    });
  }

  /**
   * Detiene el sondeo en segundo plano.
   */
  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
    this.isPolling.set(false);
  }
}

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonButtons,
  IonBadge,
  IonItem,
  IonLabel,
  IonInput,
  IonSegment,
  IonSegmentButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonToggle
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  carSportOutline,
  pulseOutline,
  timeOutline,
  locationOutline,
  navigateOutline,
  refreshOutline,
  star,
  closeCircleOutline,
  callOutline,
  cashOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  speedometerOutline,
  timerOutline,
  shieldCheckmarkOutline,
  personOutline,
  radioOutline,
  hardwareChipOutline,
  flagOutline,
  listOutline,
  checkmarkDoneOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { DriverService } from '../../../core/services/driver.service';
import { UiService } from '../../../core/services/ui.service';
import { RideMapComponent } from '../../../shared/components/ride-map/ride-map.component';
import {
  DriverRideRequest,
  DriverTrip,
  DriverAvailabilityStatus
} from '../../../core/models/driver.models';

@Component({
  selector: 'app-driver-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonButtons,
    IonBadge,
    IonItem,
    IonLabel,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonToggle,
    RideMapComponent
  ]
})
export class DriverRequestsPage implements OnInit, OnDestroy {
  authService = inject(AuthService);
  driverService = inject(DriverService);
  uiService = inject(UiService);

  // Segmento seleccionado
  selectedSegment: 'requests' | 'active' | 'vehicle' = 'requests';

  // Estados locales para liquidación al finalizar viaje
  actualDistanceKm: number = 2.5;
  actualDurationMin: number = 8;
  isProcessingAction = signal<boolean>(false);
  isTogglingAvailability = signal<boolean>(false);

  constructor() {
    addIcons({
      carSportOutline,
      pulseOutline,
      timeOutline,
      locationOutline,
      navigateOutline,
      refreshOutline,
      star,
      closeCircleOutline,
      callOutline,
      cashOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      speedometerOutline,
      timerOutline,
      shieldCheckmarkOutline,
      personOutline,
      radioOutline,
      hardwareChipOutline,
      flagOutline,
      listOutline,
      checkmarkDoneOutline
    });
  }

  ngOnInit(): void {
    // Si ya tiene un viaje activo en curso, cambiamos de una vez a la pestaña de viaje activo
    if (this.activeTrip) {
      this.selectedSegment = 'active';
      this.initCompletionDefaults(this.activeTrip);
    }

    // Si está disponible, iniciamos sondeo de solicitudes
    if (this.isAvailable) {
      this.driverService.startRequestsPolling(4000);
      this.driverService.startGpsTracking(8000);
    } else {
      // Cargar lista inicial una vez
      this.driverService.getRideRequests().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.driverService.stopRequestsPolling();
    this.driverService.stopGpsTracking();
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get driverProfile() {
    return this.driverService.driverProfile();
  }

  get availability(): DriverAvailabilityStatus {
    return this.driverService.availability();
  }

  get isAvailable(): boolean {
    return this.availability === 'available';
  }

  get isApproved(): boolean {
    return this.driverService.approvalStatus() === 'approved';
  }

  get pendingRequests(): DriverRideRequest[] {
    return this.driverService.pendingRequests();
  }

  get activeTrip(): DriverTrip | null {
    return this.driverService.activeTrip();
  }

  get lastLocation() {
    return this.driverService.lastLocation();
  }

  get isTransmittingGps(): boolean {
    return this.driverService.isTransmittingGps();
  }

  get tripOriginLat(): number | undefined {
    return this.activeTrip?.request?.origin_latitude;
  }

  get tripOriginLng(): number | undefined {
    return this.activeTrip?.request?.origin_longitude;
  }

  get tripDestLat(): number | undefined {
    return this.activeTrip?.request?.destination_latitude;
  }

  get tripDestLng(): number | undefined {
    return this.activeTrip?.request?.destination_longitude;
  }

  get driverCurrentLat(): number | undefined {
    return this.lastLocation?.latitude || 4.6715;
  }

  get driverCurrentLng(): number | undefined {
    return this.lastLocation?.longitude || -74.0509;
  }

  /**
   * Cambia la disponibilidad entre En Línea (available) y Desconectado (unavailable).
   */
  toggleAvailability(event: any): void {
    const newStatus: DriverAvailabilityStatus = event.detail.checked ? 'available' : 'unavailable';
    this.isTogglingAvailability.set(true);

    this.driverService.setAvailability(newStatus).subscribe({
      next: (res) => {
        this.isTogglingAvailability.set(false);
        this.uiService.showToast(res.message || `Disponibilidad: ${newStatus}`, 'success', 2500);

        if (newStatus === 'available') {
          this.driverService.startGpsTracking(8000);
        } else {
          this.driverService.stopGpsTracking();
        }
      },
      error: () => {
        this.isTogglingAvailability.set(false);
        // En caso de fallo (ej. cuenta no aprobada), se restablece el toggle
        event.target.checked = this.isAvailable;
      }
    });
  }

  /**
   * Acepta una solicitud de viaje con protección RNF-05 (409 Conflict).
   */
  acceptRequest(req: DriverRideRequest): void {
    this.isProcessingAction.set(true);

    this.driverService.acceptRideRequest(req.id, req).subscribe({
      next: (res) => {
        this.isProcessingAction.set(false);
        this.uiService.showToast('¡Servicio aceptado! Conduce al punto de recogida', 'success', 3500);
        this.initCompletionDefaults(res.trip || req);
        this.selectedSegment = 'active';
      },
      error: () => {
        this.isProcessingAction.set(false);
        // Si ocurrió 409 (otro conductor lo tomó), refrescamos solicitudes
        this.driverService.getRideRequests().subscribe();
      }
    });
  }

  /**
   * Inicializa valores por defecto para liquidar el viaje.
   */
  private initCompletionDefaults(item: any): void {
    this.actualDistanceKm = item?.estimated_distance_km || item?.request?.estimated_distance_km || 2.5;
    this.actualDurationMin = item?.estimated_duration_min || item?.request?.estimated_duration_min || 8;
  }

  /**
   * Registra la llegada al punto de recogida (Paso 1 ➔ Paso 2).
   */
  arriveAtPickup(): void {
    const trip = this.activeTrip;
    if (!trip) {
      return;
    }

    this.isProcessingAction.set(true);
    this.driverService.registerArrival(trip.id).subscribe({
      next: (res) => {
        this.isProcessingAction.set(false);
        this.uiService.showToast(res.message || 'Llegada registrada. Pasajero notificado', 'success');
      },
      error: () => {
        this.isProcessingAction.set(false);
      }
    });
  }

  /**
   * Inicia el recorrido hacia el destino (Paso 2 ➔ Paso 3).
   */
  startRide(): void {
    const trip = this.activeTrip;
    if (!trip) {
      return;
    }

    this.isProcessingAction.set(true);
    this.driverService.startTrip(trip.id).subscribe({
      next: (res) => {
        this.isProcessingAction.set(false);
        this.uiService.showToast(res.message || 'Viaje iniciado. ¡Buen viaje!', 'success');
      },
      error: () => {
        this.isProcessingAction.set(false);
      }
    });
  }

  /**
   * Finaliza el viaje y liquida la tarifa definitiva (Paso 3 ➔ Paso 4).
   */
  completeRide(): void {
    const trip = this.activeTrip;
    if (!trip) {
      return;
    }

    if (!this.actualDistanceKm || !this.actualDurationMin) {
      this.uiService.showToast('Debes ingresar la distancia y duración reales recorridas', 'warning');
      return;
    }

    this.isProcessingAction.set(true);
    this.driverService
      .completeTrip(trip.id, {
        actual_distance_km: Number(this.actualDistanceKm),
        actual_duration_min: Number(this.actualDurationMin)
      })
      .subscribe({
        next: (res) => {
          this.isProcessingAction.set(false);
          this.uiService.showToast(res.message || '¡Viaje liquidado con éxito!', 'success', 4000);
        },
        error: () => {
          this.isProcessingAction.set(false);
        }
      });
  }

  /**
   * Cierra el servicio liquidado para permitir tomar nuevas solicitudes.
   */
  dismissCompletedTrip(): void {
    this.driverService.clearCompletedTrip();
    this.selectedSegment = 'requests';
  }

  /**
   * Envía manualmente una actualización de GPS.
   */
  sendManualGps(): void {
    if (navigator.geolocation) {
      this.uiService.showToast('Obteniendo coordenadas GPS...', 'primary', 1500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.driverService
            .updateLocation({
              latitude: parseFloat(pos.coords.latitude.toFixed(6)),
              longitude: parseFloat(pos.coords.longitude.toFixed(6)),
              heading: pos.coords.heading || 0,
              speed: pos.coords.speed || 0,
              trip_id: this.activeTrip?.id || null
            })
            .subscribe({
              next: () => {
                this.uiService.showToast('Ubicación GPS transmitida al servidor', 'success', 2500);
              }
            });
        },
        () => {
          // Fallback con coordenadas por defecto
          this.driverService
            .updateLocation({
              latitude: 4.6715,
              longitude: -74.0509,
              heading: 90,
              speed: 28,
              trip_id: this.activeTrip?.id || null
            })
            .subscribe({
              next: () => {
                this.uiService.showToast('Ubicación GPS simulada transmitida', 'success', 2500);
              }
            });
        }
      );
    }
  }

  /**
   * Conmuta la transmisión continua de GPS.
   */
  toggleGpsTelemetry(event: any): void {
    if (event.detail.checked) {
      this.driverService.startGpsTracking(8000);
      this.uiService.showToast('Transmisión continua de GPS iniciada', 'primary', 2000);
    } else {
      this.driverService.stopGpsTracking();
      this.uiService.showToast('Transmisión de GPS pausada', 'primary', 2000);
    }
  }

  /**
   * Refresca las solicitudes por pull-to-refresh.
   */
  refreshRequests(event?: any): void {
    this.driverService.getRideRequests().subscribe({
      next: () => {
        if (event) {
          event.target.complete();
        }
      },
      error: () => {
        if (event) {
          event.target.complete();
        }
      }
    });
  }

  /**
   * Formato legible del estado del viaje.
   */
  formatTripStatus(status?: string): { label: string; color: string } {
    switch (status) {
      case 'assigned':
        return { label: 'Conductor Asignado', color: 'primary' };
      case 'driver_arrived':
        return { label: 'En el Punto de Recogida', color: 'secondary' };
      case 'in_progress':
        return { label: 'Viaje en Curso', color: 'success' };
      case 'completed':
        return { label: 'Finalizado y Liquidado', color: 'success' };
      case 'cancelled':
        return { label: 'Cancelado', color: 'danger' };
      default:
        return { label: status || 'Pendiente', color: 'medium' };
    }
  }

  /**
   * Cierra sesión del conductor.
   */
  logout(): void {
    this.driverService.stopRequestsPolling();
    this.driverService.stopGpsTracking();
    this.authService.logout();
  }
}

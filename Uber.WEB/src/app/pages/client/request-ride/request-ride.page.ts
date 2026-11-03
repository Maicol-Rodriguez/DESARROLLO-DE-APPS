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
  IonChip,
  IonRefresher,
  IonRefresherContent,
  IonTextarea,
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
  starOutline,
  closeCircleOutline,
  callOutline,
  cashOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  speedometerOutline,
  timerOutline,
  shieldCheckmarkOutline,
  pricetagOutline,
  personOutline,
  mapOutline,
  chatbubbleEllipsesOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { ClientService } from '../../../core/services/client.service';
import { UiService } from '../../../core/services/ui.service';
import { RideMapComponent } from '../../../shared/components/ride-map/ride-map.component';
import {
  FareEstimate,
  CreateRideRequest,
  ActiveTripData,
  RideRequestItem,
  TripHistoryItem
} from '../../../core/models/client.models';

interface DemoRoute {
  label: string;
  originName: string;
  originLat: number;
  originLng: number;
  destName: string;
  destLat: number;
  destLng: number;
}

@Component({
  selector: 'app-request-ride',
  templateUrl: './request-ride.page.html',
  styleUrls: ['./request-ride.page.scss'],
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
    IonChip,
    IonRefresher,
    IonRefresherContent,
    IonTextarea,
    IonToggle,
    RideMapComponent
  ]
})
export class RequestRidePage implements OnInit, OnDestroy {
  authService = inject(AuthService);
  clientService = inject(ClientService);
  uiService = inject(UiService);

  // Pestaña actual seleccionada
  selectedSegment: 'request' | 'active' | 'history' = 'request';

  // Formulario de estimación y solicitud
  originName: string = 'Parque de la 93, Calle 93A # 12-50';
  originLat: number = 4.6766;
  originLng: number = -74.0483;

  destName: string = 'Centro Comercial Andino, Carrera 11 # 82-71';
  destLat: number = 4.6664;
  destLng: number = -74.0536;

  // Estado reactivo local
  fareEstimate = signal<FareEstimate | null>(null);
  isEstimating = signal<boolean>(false);
  isRequesting = signal<boolean>(false);

  // Estado del formulario de calificación
  activeRatingTripId: number | null = null;
  ratingScore: number = 5;
  ratingComment: string = '';
  ratingHasIncident: boolean = false;
  isSubmittingRating = signal<boolean>(false);

  // Rutas demo para pruebas rápidas con un clic
  demoRoutes: DemoRoute[] = [
    {
      label: 'Parque 93 ➔ CC Andino',
      originName: 'Parque de la 93, Calle 93A # 12-50',
      originLat: 4.6766,
      originLng: -74.0483,
      destName: 'Centro Comercial Andino, Carrera 11 # 82-71',
      destLat: 4.6664,
      destLng: -74.0536
    },
    {
      label: 'Zona T ➔ Unicentro',
      originName: 'Zona T, Calle 83 # 12A',
      originLat: 4.6668,
      originLng: -74.0526,
      destName: 'Centro Comercial Unicentro, Cra 15 # 124',
      destLat: 4.7032,
      destLng: -74.0321
    },
    {
      label: 'Plaza Bolívar ➔ El Dorado',
      originName: 'Plaza de Bolívar, Cra 7 # 11-10',
      originLat: 4.5981,
      originLng: -74.076,
      destName: 'Aeropuerto El Dorado, Terminal 1',
      destLat: 4.698,
      destLng: -74.1415
    }
  ];

  constructor() {
    addIcons({
      carSportOutline,
      pulseOutline,
      timeOutline,
      locationOutline,
      navigateOutline,
      refreshOutline,
      star,
      starOutline,
      closeCircleOutline,
      callOutline,
      cashOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      speedometerOutline,
      timerOutline,
      shieldCheckmarkOutline,
      pricetagOutline,
      personOutline,
      mapOutline,
      chatbubbleEllipsesOutline
    });
  }

  ngOnInit(): void {
    // Al iniciar, verificamos si ya existe un viaje activo
    this.checkInitialActiveRide();
    // Cargamos el historial inicial
    this.clientService.getTrips().subscribe();
  }

  ngOnDestroy(): void {
    this.clientService.stopPolling();
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get activeRide() {
    return this.clientService.activeRide();
  }

  get hasActiveRide(): boolean {
    return !!this.activeRide?.has_active;
  }

  get activeTrip(): ActiveTripData | null {
    const active = this.activeRide;
    if (active && active.type === 'trip' && active.data) {
      return active.data as ActiveTripData;
    }
    return null;
  }

  get activeRequest(): RideRequestItem | null {
    const active = this.activeRide;
    if (active && active.type === 'request' && active.data) {
      return active.data as RideRequestItem;
    }
    return null;
  }

  get activeRideStatus(): string {
    return this.activeTrip?.status || this.activeRequest?.status || '';
  }

  get activeRideId(): number | null {
    return this.activeTrip?.id || this.activeRequest?.id || null;
  }

  get activeOriginName(): string {
    return this.activeTrip?.request?.origin_name || this.activeRequest?.origin_name || 'Punto de Origen';
  }

  get activeDestName(): string {
    return this.activeTrip?.request?.destination_name || this.activeRequest?.destination_name || 'Punto de Destino';
  }

  get activeFare(): number {
    return this.activeTrip?.final_fare || this.activeTrip?.estimated_fare || this.activeRequest?.estimated_fare || 0;
  }

  get activeOriginLat(): number | undefined {
    return this.activeTrip?.request?.origin_latitude || this.activeRequest?.origin_latitude || this.originLat;
  }

  get activeOriginLng(): number | undefined {
    return this.activeTrip?.request?.origin_longitude || this.activeRequest?.origin_longitude || this.originLng;
  }

  get activeDestLat(): number | undefined {
    return this.activeTrip?.request?.destination_latitude || this.activeRequest?.destination_latitude || this.destLat;
  }

  get activeDestLng(): number | undefined {
    return this.activeTrip?.request?.destination_longitude || this.activeRequest?.destination_longitude || this.destLng;
  }

  get activeDriverLat(): number | undefined {
    return this.activeTrip?.driver?.latest_location?.latitude;
  }

  get activeDriverLng(): number | undefined {
    return this.activeTrip?.driver?.latest_location?.longitude;
  }

  get tripsHistory(): TripHistoryItem[] {
    return this.clientService.tripsHistory();
  }

  get isLoadingTrips(): boolean {
    return this.clientService.isLoadingTrips();
  }

  /**
   * Verifica al cargar si el cliente tiene un viaje activo y activa el polling.
   */
  private checkInitialActiveRide(): void {
    this.clientService.getActiveRide().subscribe({
      next: (res) => {
        if (res.has_active) {
          this.selectedSegment = 'active';
          this.clientService.startPolling(4000);
        }
      }
    });
  }

  /**
   * Rellena las coordenadas de una ruta demo preconfigurada.
   */
  applyDemoRoute(route: DemoRoute): void {
    this.originName = route.originName;
    this.originLat = route.originLat;
    this.originLng = route.originLng;
    this.destName = route.destName;
    this.destLat = route.destLat;
    this.destLng = route.destLng;
    this.fareEstimate.set(null);
    this.uiService.showToast(`Ruta seleccionada: ${route.label}`, 'primary', 2000);
  }

  /**
   * Obtiene la posición GPS actual del navegador para el origen.
   */
  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.uiService.showToast('La geolocalización no está soportada en tu navegador', 'warning');
      return;
    }

    this.uiService.showToast('Obteniendo ubicación GPS...', 'primary', 1500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.originLat = parseFloat(pos.coords.latitude.toFixed(6));
        this.originLng = parseFloat(pos.coords.longitude.toFixed(6));
        this.originName = 'Mi ubicación actual (GPS)';
        this.fareEstimate.set(null);
        this.uiService.showToast('Ubicación GPS fijada como origen', 'success', 2500);
      },
      (err) => {
        this.uiService.showToast(`Error al obtener ubicación: ${err.message}`, 'danger');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  /**
   * Estima la tarifa llamando al backend con las coordenadas.
   */
  estimateFare(): void {
    if (!this.originLat || !this.originLng || !this.destLat || !this.destLng) {
      this.uiService.showToast('Debes ingresar coordenadas válidas para origen y destino', 'warning');
      return;
    }

    this.isEstimating.set(true);
    this.clientService
      .estimateFare({
        origin_latitude: Number(this.originLat),
        origin_longitude: Number(this.originLng),
        destination_latitude: Number(this.destLat),
        destination_longitude: Number(this.destLng)
      })
      .subscribe({
        next: (res) => {
          this.isEstimating.set(false);
          if (res.success && res.estimate) {
            this.fareEstimate.set(res.estimate);
            this.uiService.showToast(
              `Tarifa estimada: $${res.estimate.estimated_fare.toLocaleString()} COP (${res.estimate.distance_km} km)`,
              'success',
              3000
            );
          }
        },
        error: () => {
          this.isEstimating.set(false);
        }
      });
  }

  /**
   * Solicita el viaje al backend.
   */
  requestRide(): void {
    if (!this.originName || !this.destName) {
      this.uiService.showToast('Debes especificar el nombre o dirección del origen y destino', 'warning');
      return;
    }

    this.isRequesting.set(true);
    const req: CreateRideRequest = {
      origin_name: this.originName,
      origin_latitude: Number(this.originLat),
      origin_longitude: Number(this.originLng),
      destination_name: this.destName,
      destination_latitude: Number(this.destLat),
      destination_longitude: Number(this.destLng)
    };

    this.clientService.createRideRequest(req).subscribe({
      next: (res) => {
        this.isRequesting.set(false);
        this.uiService.showToast('¡Viaje solicitado! Buscando conductores cercanos...', 'success', 4000);
        this.fareEstimate.set(null);
        this.selectedSegment = 'active';
      },
      error: () => {
        this.isRequesting.set(false);
      }
    });
  }

  /**
   * Cancela el viaje o solicitud activa pidiendo el motivo al usuario.
   */
  async cancelCurrentRide(): Promise<void> {
    const active = this.activeRide;
    if (!active || !active.data || !active.data.id) {
      this.uiService.showToast('No hay un viaje activo para cancelar', 'warning');
      return;
    }

    const reason = await this.uiService.showPrompt(
      'Cancelar Viaje',
      'Ingresa el motivo de la cancelación:',
      'Ej: Demora del conductor, cambio de planes...',
      'Cambio de planes del usuario'
    );

    if (reason === null) {
      // Cancelado por el usuario en el modal
      return;
    }

    const tripId = active.data.id;
    await this.uiService.showLoading('Cancelando viaje...');

    this.clientService.cancelRide(tripId, reason || 'Cancelado por el usuario').subscribe({
      next: (res) => {
        this.uiService.dismissLoading();
        this.uiService.showToast(res.message || 'Viaje cancelado exitosamente', 'success');
        this.clientService.getTrips().subscribe();
        this.selectedSegment = 'request';
      },
      error: () => {
        this.uiService.dismissLoading();
      }
    });
  }

  /**
   * Abre el formulario interactivo para calificar un viaje finalizado.
   */
  openRatingForm(tripId: number): void {
    this.activeRatingTripId = tripId;
    this.ratingScore = 5;
    this.ratingComment = '';
    this.ratingHasIncident = false;
  }

  /**
   * Fija la puntuación de estrellas (1 a 5).
   */
  setScore(score: number): void {
    this.ratingScore = score;
  }

  /**
   * Envía la calificación al backend.
   */
  submitRating(): void {
    if (!this.activeRatingTripId) {
      return;
    }

    this.isSubmittingRating.set(true);
    this.clientService
      .rateTrip(this.activeRatingTripId, {
        score: this.ratingScore,
        comment: this.ratingComment,
        has_incident: this.ratingHasIncident
      })
      .subscribe({
        next: (res) => {
          this.isSubmittingRating.set(false);
          this.uiService.showToast(res.message || '¡Gracias por calificar el servicio!', 'success');
          this.activeRatingTripId = null;
          this.clientService.getTrips().subscribe();
          this.clientService.getActiveRide().subscribe();
        },
        error: () => {
          this.isSubmittingRating.set(false);
        }
      });
  }

  /**
   * Refresco manual por pull-to-refresh en historial.
   */
  refreshHistory(event?: any): void {
    this.clientService.getTrips().subscribe({
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
   * Formatea el estado del viaje para mostrar una etiqueta amigable.
   */
  formatStatus(status?: string): { label: string; color: string } {
    switch (status) {
      case 'requested':
        return { label: 'Buscando Conductor', color: 'warning' };
      case 'assigned':
        return { label: 'Conductor Asignado', color: 'primary' };
      case 'arrived':
        return { label: 'Conductor en el Punto', color: 'secondary' };
      case 'in_progress':
        return { label: 'Viaje en Curso', color: 'success' };
      case 'completed':
        return { label: 'Completado', color: 'success' };
      case 'cancelled':
        return { label: 'Cancelado', color: 'danger' };
      default:
        return { label: status || 'Pendiente', color: 'medium' };
    }
  }

  /**
   * Permite verificar si un viaje del historial ya cuenta con calificación registrada.
   */
  hasTripRating(trip: TripHistoryItem): boolean {
    return Array.isArray(trip.ratings) && trip.ratings.length > 0;
  }

  /**
   * Cierra sesión del usuario.
   */
  logout(): void {
    this.clientService.stopPolling();
    this.authService.logout();
  }
}

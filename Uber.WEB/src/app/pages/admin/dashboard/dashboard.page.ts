import { Component, OnInit, inject, signal } from '@angular/core';
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
  IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  statsChartOutline,
  peopleOutline,
  cashOutline,
  shieldCheckmarkOutline,
  refreshOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline,
  carSportOutline,
  personOutline,
  timeOutline,
  trendingUpOutline,
  walletOutline,
  pricetagOutline,
  checkmarkDoneOutline,
  documentTextOutline,
  addCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { UiService } from '../../../core/services/ui.service';
import {
  AdminDriverItem,
  AdminFareItem,
  CreateFareRequest
} from '../../../core/models/admin.models';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
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
    IonRefresherContent
  ]
})
export class AdminDashboardPage implements OnInit {
  authService = inject(AuthService);
  adminService = inject(AdminService);
  uiService = inject(UiService);

  // Pestaña actual seleccionada
  selectedSegment: 'kpis' | 'drivers' | 'fares' | 'logs' = 'kpis';

  // Filtro de conductores
  driverFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all';

  // Formulario para crear nueva tarifa
  showNewFareForm = signal<boolean>(false);
  newFare: CreateFareRequest = {
    name: 'Tarifa Hora Pico',
    base_fare: 4500,
    price_per_km: 1500,
    price_per_minute: 350,
    minimum_fare: 8000,
    surge_multiplier: 1.2,
    active: true
  };

  isProcessingAction = signal<boolean>(false);

  constructor() {
    addIcons({
      statsChartOutline,
      peopleOutline,
      cashOutline,
      shieldCheckmarkOutline,
      refreshOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      alertCircleOutline,
      carSportOutline,
      personOutline,
      timeOutline,
      trendingUpOutline,
      walletOutline,
      pricetagOutline,
      checkmarkDoneOutline,
      documentTextOutline,
      addCircleOutline
    });
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get stats() {
    return this.adminService.stats();
  }

  get recentTrips() {
    return this.adminService.recentTrips();
  }

  get drivers(): AdminDriverItem[] {
    const list = this.adminService.drivers();
    if (this.driverFilter === 'all') {
      return list;
    }
    return list.filter((d) => d.approval_status === this.driverFilter);
  }

  get fares(): AdminFareItem[] {
    return this.adminService.fares();
  }

  get auditLogs() {
    return this.adminService.auditLogs();
  }

  get isLoading(): boolean {
    return this.adminService.isLoading();
  }

  /**
   * Carga inicial o recarga de todos los datos administrativos.
   */
  loadAllData(event?: any): void {
    this.adminService.getDashboard().subscribe({
      next: () => {
        this.adminService.getDrivers().subscribe();
        this.adminService.getFares().subscribe();
        this.adminService.getAuditLogs().subscribe({
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
      },
      error: () => {
        if (event) {
          event.target.complete();
        }
      }
    });
  }

  /**
   * Cambia el filtro de conductores.
   */
  setDriverFilter(filter: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.driverFilter = filter;
  }

  /**
   * Aprueba un conductor registrado.
   */
  async approveDriver(driver: AdminDriverItem): Promise<void> {
    const notes = await this.uiService.showPrompt(
      'Aprobar Conductor',
      `¿Deseas autorizar a ${driver.user.name} para realizar viajes? Puedes agregar una nota opcional:`,
      'Ej: Documentación de SOAT y licencia verificada.',
      'Documentación de SOAT y licencia verificada.'
    );

    if (notes === null) {
      return; // Cancelado
    }

    this.isProcessingAction.set(true);
    await this.uiService.showLoading('Aprobando conductor...');

    this.adminService
      .updateDriverApproval(driver.id, {
        approval_status: 'approved',
        admin_notes: notes || 'Aprobado por el Administrador'
      })
      .subscribe({
        next: (res) => {
          this.isProcessingAction.set(false);
          this.uiService.dismissLoading();
          this.uiService.showToast(res.message || 'Conductor aprobado exitosamente', 'success');
          // Actualizamos métricas del dashboard
          this.adminService.getDashboard().subscribe();
        },
        error: () => {
          this.isProcessingAction.set(false);
          this.uiService.dismissLoading();
        }
      });
  }

  /**
   * Rechaza o suspende un conductor.
   */
  async rejectDriver(driver: AdminDriverItem): Promise<void> {
    const notes = await this.uiService.showPrompt(
      'Rechazar / Suspender Conductor',
      `Ingresa el motivo del rechazo o suspensión para ${driver.user.name}:`,
      'Ej: Documentos ilegibles o vencidos.',
      'Documentación no cumple con los requisitos.'
    );

    if (notes === null) {
      return; // Cancelado
    }

    this.isProcessingAction.set(true);
    await this.uiService.showLoading('Actualizando estado...');

    this.adminService
      .updateDriverApproval(driver.id, {
        approval_status: 'rejected',
        admin_notes: notes || 'Rechazado por el Administrador'
      })
      .subscribe({
        next: (res) => {
          this.isProcessingAction.set(false);
          this.uiService.dismissLoading();
          this.uiService.showToast(res.message || 'Conductor rechazado', 'primary');
          this.adminService.getDashboard().subscribe();
        },
        error: () => {
          this.isProcessingAction.set(false);
          this.uiService.dismissLoading();
        }
      });
  }

  /**
   * Guarda una nueva configuración de tarifa.
   */
  submitNewFare(): void {
    if (!this.newFare.name || !this.newFare.base_fare || !this.newFare.price_per_km) {
      this.uiService.showToast('Por favor completa todos los campos de la tarifa', 'warning');
      return;
    }

    this.isProcessingAction.set(true);
    this.adminService
      .createFare({
        name: this.newFare.name,
        base_fare: Number(this.newFare.base_fare),
        price_per_km: Number(this.newFare.price_per_km),
        price_per_minute: Number(this.newFare.price_per_minute),
        minimum_fare: Number(this.newFare.minimum_fare),
        surge_multiplier: Number(this.newFare.surge_multiplier),
        active: true
      })
      .subscribe({
        next: (res) => {
          this.isProcessingAction.set(false);
          this.uiService.showToast(res.message || 'Tarifa creada exitosamente', 'success');
          this.showNewFareForm.set(false);
          this.adminService.getFares().subscribe();
        },
        error: () => {
          this.isProcessingAction.set(false);
        }
      });
  }

  /**
   * Formato de estado de conductor.
   */
  formatDriverStatus(status?: string): { label: string; color: string } {
    switch (status) {
      case 'approved':
        return { label: 'Aprobado', color: 'success' };
      case 'pending':
        return { label: 'Pendiente', color: 'warning' };
      case 'rejected':
        return { label: 'Rechazado', color: 'danger' };
      default:
        return { label: status || 'Desconocido', color: 'medium' };
    }
  }

  /**
   * Formato de estado de viaje.
   */
  formatTripStatus(status?: string): { label: string; color: string } {
    switch (status) {
      case 'completed':
        return { label: 'Completado', color: 'success' };
      case 'cancelled':
        return { label: 'Cancelado', color: 'danger' };
      case 'in_progress':
        return { label: 'En Curso', color: 'warning' };
      case 'assigned':
        return { label: 'Asignado', color: 'primary' };
      default:
        return { label: status || 'Pendiente', color: 'medium' };
    }
  }

  /**
   * Cierra sesión del administrador.
   */
  logout(): void {
    this.authService.logout();
  }
}

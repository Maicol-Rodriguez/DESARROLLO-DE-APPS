import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  IonSpinner,
  IonBadge,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/angular';
import { environment } from '../../environments/environment';
import { UiService } from '../core/services/ui.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
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
    IonSpinner,
    IonBadge,
    IonList,
    IonItem,
    IonLabel
  ],
})
export class HomePage {
  private http = inject(HttpClient);
  private uiService = inject(UiService);

  readonly apiUrl = environment.apiUrl;
  loading = false;
  responseStatus: string | null = null;
  responseData: string | null = null;

  testConnection() {
    this.loading = true;
    this.responseStatus = null;
    this.responseData = null;

    this.http.get(`${this.apiUrl}/fares/active`).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.responseStatus = '200 OK - Backend respondió correctamente';
        this.responseData = JSON.stringify(res, null, 2);
        this.uiService.showToast('¡Conexión exitosa con el backend!', 'success');
      },
      error: (err) => {
        this.loading = false;
        this.responseStatus = `Código HTTP: ${err.status} (${err.statusText || 'Error'})`;
        this.responseData = JSON.stringify(err.error || { message: err.message }, null, 2);
      }
    });
  }

  test401Simulation() {
    this.responseStatus = 'Probando petición sin token...';
    // Petición a endpoint protegido sin token para probar el interceptor (401)
    this.http.get(`${this.apiUrl}/client/active`).subscribe({
      next: () => {},
      error: (err) => {
        this.responseStatus = `Código HTTP: ${err.status} - Interceptor activado`;
      }
    });
  }
}

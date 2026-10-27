import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSpinner,
  IonButtons,
  IonBackButton
} from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { RegisterClientRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-register-client',
  templateUrl: './register-client.page.html',
  styleUrls: ['./register-client.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonSpinner,
    IonButtons,
    IonBackButton
  ]
})
export class RegisterClientPage {
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private router = inject(Router);

  formData: RegisterClientRequest = {
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'client'
  };

  loading = false;

  onSubmit(): void {
    if (!this.formData.name || !this.formData.email || !this.formData.phone || !this.formData.password) {
      this.uiService.showToast('Por favor completa todos los campos obligatorios', 'warning');
      return;
    }

    this.loading = true;

    this.authService.registerClient(this.formData).subscribe({
      next: (response) => {
        this.loading = false;
        this.uiService.showToast(`¡Cuenta creada con éxito! Bienvenido, ${response.user.name}`, 'success');
        this.router.navigate(['/client/request-ride']);
      },
      error: () => {
        this.loading = false;
        // El interceptor procesa el 422 y muestra los errores específicos
      }
    });
  }
}

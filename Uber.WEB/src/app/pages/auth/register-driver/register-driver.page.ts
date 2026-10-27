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
  IonBackButton,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { RegisterDriverRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-register-driver',
  templateUrl: './register-driver.page.html',
  styleUrls: ['./register-driver.page.scss'],
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
    IonBackButton,
    IonGrid,
    IonRow,
    IonCol
  ]
})
export class RegisterDriverPage {
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private router = inject(Router);

  formData: RegisterDriverRequest = {
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'driver',
    license_number: '',
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    capacity: 4,
    color: ''
  };

  loading = false;

  onSubmit(): void {
    // Validaciones básicas de campos
    if (
      !this.formData.name ||
      !this.formData.email ||
      !this.formData.phone ||
      !this.formData.password ||
      !this.formData.license_number ||
      !this.formData.plate ||
      !this.formData.brand ||
      !this.formData.model ||
      !this.formData.year ||
      !this.formData.capacity ||
      !this.formData.color
    ) {
      this.uiService.showToast('Por favor completa todos los campos del conductor y vehículo', 'warning');
      return;
    }

    this.loading = true;

    // Aseguramos tipos numéricos para year y capacity
    const payload: RegisterDriverRequest = {
      ...this.formData,
      year: Number(this.formData.year),
      capacity: Number(this.formData.capacity)
    };

    this.authService.registerDriver(payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.uiService.showAlert(
          '¡Registro de Conductor Exitoso!',
          `Bienvenido, ${response.user.name}. Tu cuenta ha sido creada. Recuerda que un administrador debe aprobar tu documentación antes de que puedas comenzar a recibir servicios.`
        );
        this.router.navigate(['/driver/requests']);
      },
      error: () => {
        this.loading = false;
        // El interceptor maneja los errores de validación de Laravel
      }
    });
  }
}

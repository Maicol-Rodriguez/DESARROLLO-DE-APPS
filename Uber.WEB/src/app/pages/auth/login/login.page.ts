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
  IonChip
} from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { LoginRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
    IonChip
  ]
})
export class LoginPage {
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private router = inject(Router);

  credentials: LoginRequest = {
    login: '',
    password: ''
  };

  loading = false;

  /**
   * Envía las credenciales al backend para autenticarse.
   */
  async onSubmit(): Promise<void> {
    if (!this.credentials.login || !this.credentials.password) {
      this.uiService.showToast('Por favor completa tu correo/teléfono y contraseña', 'warning');
      return;
    }

    this.loading = true;

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.loading = false;
        this.uiService.showToast(`¡Bienvenido, ${response.user.name}!`, 'success');
        
        // Redirigir según el rol del usuario (Etapa 3)
        this.redirectByRole(response.user.role);
      },
      error: () => {
        this.loading = false;
        // El interceptor muestra el mensaje de error automáticamente
      }
    });
  }

  /**
   * Redirección inteligente según el rol retornado por el backend.
   */
  private redirectByRole(role: string): void {
    if (role === 'client') {
      this.router.navigate(['/client/request-ride']);
    } else if (role === 'driver') {
      this.router.navigate(['/driver/requests']);
    } else if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  /**
   * Rellena las credenciales de prueba rápidamente para comodidad del estudiante.
   */
  fillDemoCredentials(role: 'client' | 'driver' | 'admin'): void {
    if (role === 'client') {
      this.credentials.login = 'cliente@uber.com';
      this.credentials.password = 'cliente123';
    } else if (role === 'driver') {
      this.credentials.login = 'carlos@uber.com';
      this.credentials.password = 'conductor123';
    } else if (role === 'admin') {
      this.credentials.login = 'admin@uber.com';
      this.credentials.password = 'admin123';
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

/**
 * Servicio transversal para mostrar mensajes emergentes (Toasts) y alertas
 * en la interfaz de usuario de Ionic de forma sencilla.
 */
@Injectable({
  providedIn: 'root'
})
export class UiService {
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);

  private activeLoading: HTMLIonLoadingElement | null = null;

  /**
   * Muestra un mensaje flotante tipo Toast.
   * @param message Texto a mostrar
   * @param color Color temático de Ionic ('success', 'danger', 'warning', 'primary')
   * @param duration Duración en milisegundos (por defecto 3500ms)
   */
  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary', duration: number = 3500) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  /**
   * Muestra una ventana de alerta modal con un botón de OK.
   */
  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Muestra un indicador de carga mientras se procesa una petición.
   */
  async showLoading(message: string = 'Cargando...') {
    this.activeLoading = await this.loadingCtrl.create({
      message,
      spinner: 'circular'
    });
    await this.activeLoading.present();
  }

  /**
   * Oculta el indicador de carga activo si existe.
   */
  async dismissLoading() {
    if (this.activeLoading) {
      await this.activeLoading.dismiss();
      this.activeLoading = null;
    }
  }
}

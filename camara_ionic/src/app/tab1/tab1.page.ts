import { Component, inject, signal } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonImg,
  IonIcon,
  IonItem,
  IonLabel,
  IonRow,
  IonCol,
  IonGrid,
  IonToggle,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { camera, flashOffOutline, sparkles, trashOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { PhotoService } from '../services/photo.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonButton,
    IonCard,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonImg,
    IonIcon,
    IonItem,
    IonLabel,
    IonRow,
    IonCol,
    IonGrid,
    IonToggle,
    IonTitle,
    IonToolbar,
  ],
})
export class Tab1Page {
  readonly photoService = inject(PhotoService);
  private readonly toastController = inject(ToastController);
  readonly isHighDef = signal(false);

  constructor() {
    addIcons({ camera, flashOffOutline, sparkles, trashOutline });
  }

  toggleQuality(enabled: boolean): void {
    this.isHighDef.set(enabled);
  }

  async takePhoto(): Promise<void> {
    const result = await this.photoService.takeNewPhoto(this.isHighDef());

    if (!result.success) {
      const message = result.reason === 'permission_denied'
        ? 'Permiso denegado. Concede acceso a la camara y galeria en los ajustes del dispositivo.'
        : result.reason === 'cancelled'
          ? 'Captura cancelada.'
          : 'No se pudo abrir la camara. Revisa los permisos del navegador.';
      const toast = await this.toastController.create({
        message,
        duration: 3500,
        position: 'bottom',
        color: 'danger',
        buttons: [{ text: 'Entendido', role: 'cancel' }],
      });
      await toast.present();
    }
  }
}

import { Injectable, signal } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { UserPhoto } from '../models/photo.model';

export type PhotoCaptureReason = 'permission_denied' | 'cancelled' | 'error';

export interface PhotoCaptureResult {
  success: boolean;
  reason?: PhotoCaptureReason;
}

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly photosSignal = signal<UserPhoto[]>([]);
  readonly photos = this.photosSignal.asReadonly();

  async takeNewPhoto(isHighDef: boolean): Promise<PhotoCaptureResult> {
    try {
      const permissionStatus = await Camera.checkPermissions();
      const isWeb = Capacitor.getPlatform() === 'web';

      if (!isWeb) {
        const hasCameraPermission = permissionStatus.camera === 'granted';
        const hasPhotoPermission =
          permissionStatus.photos === 'granted' || permissionStatus.photos === 'limited';

        if (hasCameraPermission && hasPhotoPermission) {
          return this.capturePhoto(isHighDef);
        }

        const requestedPermissions = await Camera.requestPermissions({
          permissions: ['camera', 'photos'],
        });

        const cameraGranted = requestedPermissions.camera === 'granted';
        const photosGranted =
          requestedPermissions.photos === 'granted' ||
          requestedPermissions.photos === 'limited';

        if (!cameraGranted || !photosGranted) {
          return { success: false, reason: 'permission_denied' };
        }
      }

      return this.capturePhoto(isHighDef);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';

      if (message.includes('cancel')) {
        return { success: false, reason: 'cancelled' };
      }

      console.error('Error durante la captura:', error);
      return { success: false, reason: 'error' };
    }
  }

  private async capturePhoto(isHighDef: boolean): Promise<PhotoCaptureResult> {
    try {
      const capturedPhoto: Photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: isHighDef ? 95 : 60,
        width: isHighDef ? 1920 : 800,
        allowEditing: false,
        promptLabelHeader: 'Seleccionar origen',
        promptLabelPhoto: 'Elegir de la galeria',
        promptLabelPicture: 'Tomar fotografia',
      });

      this.photosSignal.update((photos) => [
        {
          filepath: `${Date.now()}.${capturedPhoto.format}`,
          webPath: capturedPhoto.webPath,
          format: capturedPhoto.format,
        },
        ...photos,
      ]);

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';

      if (message.includes('cancel')) {
        return { success: false, reason: 'cancelled' };
      }

      console.error('Error durante la captura:', error);
      return { success: false, reason: 'error' };
    }
  }

  deletePhoto(index: number): void {
    this.photosSignal.update((photos) => photos.filter((_, photoIndex) => photoIndex !== index));
  }
}
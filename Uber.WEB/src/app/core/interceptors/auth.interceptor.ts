import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { UiService } from '../services/ui.service';

/**
 * Interceptor HTTP:
 * 1. Agrega el header Authorization Bearer <token> a cada petición si existe token guardado.
 * 2. Agrega Accept: application/json.
 * 3. Captura errores de respuesta (401, 400, 403, 409, 422, etc.) y muestra mensajes legibles.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const uiService = inject(UiService);

  // 1. Obtener token del almacenamiento local
  const token = localStorage.getItem('token');

  // 2. Clonar petición con headers requeridos
  let headers = req.headers.set('Accept', 'application/json');

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const authReq = req.clone({ headers });

  // 3. Procesar respuesta y capturar errores globalmente
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ocurrió un error inesperado';

      if (error.status === 0) {
        // Error de red, servidor caído o bloqueo de CORS
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión de red o la disponibilidad del backend.';
        uiService.showToast(errorMessage, 'danger', 4500);
      } else if (error.status === 401) {
        // Token inválido, expirado o faltante
        errorMessage = error.error?.message || 'Sesión expirada o no autorizada. Inicia sesión nuevamente.';
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        uiService.showToast(errorMessage, 'warning', 3500);
        
        // Redirigir al login si no estamos ya allí
        if (!router.url.includes('/login')) {
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        // Rol no autorizado o conductor aún no aprobado
        errorMessage = error.error?.message || 'Acceso denegado. No tienes permisos para realizar esta acción.';
        uiService.showToast(errorMessage, 'danger', 4000);
      } else if (error.status === 409) {
        // Conflicto de concurrencia al aceptar viaje
        errorMessage = error.error?.message || 'Lo sentimos, este servicio ya fue tomado por otro conductor.';
        uiService.showToast(errorMessage, 'warning', 4000);
      } else if (error.status === 422) {
        // Errores de validación de campos de Laravel
        if (error.error?.errors && typeof error.error.errors === 'object') {
          const validationMessages = Object.values(error.error.errors)
            .flat()
            .join(' ');
          errorMessage = validationMessages || error.error.message || 'Datos de formulario inválidos.';
        } else {
          errorMessage = error.error?.message || 'Datos de formulario inválidos.';
        }
        uiService.showToast(errorMessage, 'danger', 4500);
      } else if (error.status === 400) {
        // Regla de negocio infringida (ej. ya tiene un viaje activo)
        errorMessage = error.error?.message || 'Solicitud inválida.';
        uiService.showToast(errorMessage, 'warning', 4000);
      } else if (error.status >= 500) {
        // Error interno de Laravel o de base de datos
        errorMessage = error.error?.message || `Error del servidor (${error.status}). Intenta más tarde.`;
        uiService.showToast(errorMessage, 'danger', 4000);
      }

      // Se propaga el error para que los componentes puedan finalizar spinners / loaders
      return throwError(() => error);
    })
  );
};

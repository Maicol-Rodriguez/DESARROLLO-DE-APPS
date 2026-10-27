import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';

/**
 * Guard de Autenticación:
 * Protege cualquier ruta privada, verificando que exista un token JWT válido.
 * Si no está autenticado, redirige inmediatamente a /login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const uiService = inject(UiService);

  if (authService.isAuthenticated()) {
    return true;
  }

  uiService.showToast('Debes iniciar sesión para acceder a esta sección.', 'warning');
  router.navigate(['/login']);
  return false;
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { UserRole } from '../models/auth.models';

/**
 * Guard de Control de Acceso por Rol (RBAC):
 * Comprueba que el rol del usuario conectado coincida con los roles autorizados
 * definidos en la propiedad `data: { expectedRoles: [...] }` de la ruta.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const uiService = inject(UiService);

  const expectedRoles: UserRole[] = route.data?.['expectedRoles'] || [];
  const currentRole = authService.getUserRole();

  if (!currentRole) {
    uiService.showToast('No se encontró el rol del usuario. Inicia sesión de nuevo.', 'warning');
    router.navigate(['/login']);
    return false;
  }

  // Si la ruta no especifica roles o si el rol del usuario está permitido
  if (expectedRoles.length === 0 || expectedRoles.includes(currentRole)) {
    return true;
  }

  // Si el rol no coincide, avisamos y redirigimos a su sección correspondiente
  uiService.showToast(`Acceso denegado: tu cuenta tiene rol "${currentRole}" y no puede entrar aquí.`, 'danger');

  if (currentRole === 'client') {
    router.navigate(['/client/request-ride']);
  } else if (currentRole === 'driver') {
    router.navigate(['/driver/requests']);
  } else if (currentRole === 'admin') {
    router.navigate(['/admin/dashboard']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};

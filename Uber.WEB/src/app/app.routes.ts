import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register-client',
    loadComponent: () => import('./pages/auth/register-client/register-client.page').then((m) => m.RegisterClientPage),
  },
  {
    path: 'register-driver',
    loadComponent: () => import('./pages/auth/register-driver/register-driver.page').then((m) => m.RegisterDriverPage),
  },

  // Rutas protegidas para rol CLIENTE
  {
    path: 'client/request-ride',
    loadComponent: () => import('./pages/client/request-ride/request-ride.page').then((m) => m.RequestRidePage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['client'] },
  },

  // Rutas protegidas para rol CONDUCTOR
  {
    path: 'driver/requests',
    loadComponent: () => import('./pages/driver/requests/requests.page').then((m) => m.DriverRequestsPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['driver'] },
  },

  // Rutas protegidas para rol ADMINISTRADOR
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./pages/admin/dashboard/dashboard.page').then((m) => m.AdminDashboardPage),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['admin'] },
  },

  // Página de utilidades / pruebas de conexión
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },

  // Comodín para rutas no existentes
  {
    path: '**',
    redirectTo: 'login',
  },
];

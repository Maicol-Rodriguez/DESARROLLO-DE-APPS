import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs/tab1',
    pathMatch: 'full',
  },
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'boton',
    loadComponent: () => import('./boton/boton.page').then( m => m.BotonPage)
  },
  {
    path: 'insignia',
    loadComponent: () => import('./insignia/insignia.page').then( m => m.InsigniaPage)
  },
  {
    path: 'alerta',
    loadComponent: () => import('./alerta/alerta.page').then( m => m.AlertaPage)
  },
  {
    path: 'tarjeta',
    loadComponent: () => import('./tarjeta/tarjeta.page').then( m => m.TarjetaPage)
  },
  {
    path: 'caja',
    loadComponent: () => import('./caja/caja.page').then( m => m.CajaPage)
  },
  {
    path: 'chips',
    loadComponent: () => import('./chips/chips.page').then( m => m.ChipsPage)
  },
  {
    path: 'boton-flotante',
    loadComponent: () => import('./boton-flotante/boton-flotante.page').then( m => m.BotonFlotantePage)
  },
  {
    path: 'acordeon',
    loadComponent: () => import('./acordeon/acordeon.page').then( m => m.AcordeonPage)
  },
  {
    path: 'popover',
    loadComponent: () => import('./popover/popover.page').then( m => m.PopoverPage)
  },
  {
    path: 'rango',
    loadComponent: () => import('./rango/rango.page').then( m => m.RangoPage)
  },
  {
    path: 'indicaodr-progeso',
    loadComponent: () => import('./indicaodr-progeso/indicaodr-progeso.page').then( m => m.IndicaodrProgesoPage)
  },
  {
    path: 'barra-herramientas',
    loadComponent: () => import('./barra-herramientas/barra-herramientas.page').then( m => m.BarraHerramientasPage)
  },
  {
    path: 'palanca',
    loadComponent: () => import('./palanca/palanca.page').then( m => m.PalancaPage)
  },
  {
    path: 'navegacion',
    loadComponent: () => import('./navegacion/navegacion.page').then( m => m.NavegacionPage)
  },
  {
    path: 'barra-busqueda',
    loadComponent: () => import('./barra-busqueda/barra-busqueda.page').then( m => m.BarraBusquedaPage)
  },
  {
    path: 'refresco',
    loadComponent: () => import('./refresco/refresco.page').then( m => m.RefrescoPage)
  },
  {
    path: 'seleccionar',
    loadComponent: () => import('./seleccionar/seleccionar.page').then( m => m.SeleccionarPage)
  },
  {
    path: 'tostada',
    loadComponent: () => import('./tostada/tostada.page').then( m => m.TostadaPage)
  },
  {
    path: 'iconos',
    loadComponent: () => import('./iconos/iconos.page').then( m => m.IconosPage)
  },
  {
    path: 'fecha-hora',
    loadComponent: () => import('./fecha-hora/fecha-hora.page').then( m => m.FechaHoraPage)
  },
  {
    path: 'hoja-accion',
    loadComponent: () => import('./hoja-accion/hoja-accion.page').then( m => m.HojaAccionPage)
  },
];

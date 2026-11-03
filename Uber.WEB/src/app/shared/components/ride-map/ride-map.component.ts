import {
  Component,
  Input,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-ride-map',
  template: `
    <div class="ride-map-wrapper">
      <div #mapContainer class="map-container" [style.height]="height"></div>
      <div *ngIf="showLegend" class="map-legend">
        <span class="legend-item origin"><span class="legend-dot"></span> Origen</span>
        <span class="legend-item dest"><span class="legend-dot"></span> Destino</span>
        <span *ngIf="driverLat && driverLng" class="legend-item driver"><span class="legend-dot"></span> Conductor</span>
      </div>
    </div>
  `,
  styles: [`
    .ride-map-wrapper {
      position: relative;
      width: 100%;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(196, 154, 108, 0.35);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .map-container {
      width: 100%;
      background: #1a1715;
      z-index: 1;
    }

    .map-legend {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(18, 17, 16, 0.85);
      backdrop-filter: blur(6px);
      padding: 4px 10px;
      border-radius: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.72rem;
      color: #ded6cf;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        &.origin .legend-dot {
          background: #2dd36f;
        }

        &.dest .legend-dot {
          background: #c49a6c;
        }

        &.driver .legend-dot {
          background: #fbc02d;
        }
      }
    }

    /* Estilos de marcadores de mapa en Leaflet */
    ::ng-deep .custom-map-marker {
      background: transparent;
      border: none;
    }

    ::ng-deep .marker-pin {
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);

      .pin-symbol {
        transform: rotate(45deg);
        font-weight: 800;
        font-size: 0.75rem;
        color: #121110;
      }

      &.origin-pin {
        background: #2dd36f;
        border: 2px solid #ffffff;
      }

      &.dest-pin {
        background: #c49a6c;
        border: 2px solid #ffffff;
      }

      &.driver-pin {
        border-radius: 50%;
        transform: none;
        background: #121110;
        border: 2px solid #fbc02d;
        box-shadow: 0 0 12px rgba(251, 192, 45, 0.75);

        .pin-symbol {
          transform: none;
          font-size: 1rem;
        }
      }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class RideMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() originLat?: number;
  @Input() originLng?: number;
  @Input() originName?: string;

  @Input() destLat?: number;
  @Input() destLng?: number;
  @Input() destName?: string;

  @Input() driverLat?: number;
  @Input() driverLng?: number;

  @Input() height: string = '240px';
  @Input() showLegend: boolean = true;
  @Input() interactive: boolean = true;

  private map: L.Map | null = null;
  private originMarker: L.Marker | null = null;
  private destMarker: L.Marker | null = null;
  private driverMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private driverLine: L.Polyline | null = null;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map) {
      this.updateMapLayers();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (!this.mapContainer || this.map) {
      return;
    }

    const initialLat = this.originLat || 4.6766;
    const initialLng = this.originLng || -74.0483;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: this.interactive,
      dragging: this.interactive,
      scrollWheelZoom: false,
      attributionControl: false
    });

    // Capa de mapa estilo CartoDB Dark Matter / Voyager
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    this.updateMapLayers();

    // Redimensionar después de renderizar en pantalla
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 250);
  }

  private updateMapLayers(): void {
    if (!this.map) {
      return;
    }

    const boundsPoints: L.LatLngExpression[] = [];

    // 1. Marcador de Origen
    if (this.originLat && this.originLng) {
      const originLatLng: L.LatLngExpression = [Number(this.originLat), Number(this.originLng)];
      boundsPoints.push(originLatLng);

      const originIcon = L.divIcon({
        className: 'custom-map-marker',
        html: '<div class="marker-pin origin-pin"><span class="pin-symbol">A</span></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      if (this.originMarker) {
        this.originMarker.setLatLng(originLatLng);
      } else {
        this.originMarker = L.marker(originLatLng, { icon: originIcon }).addTo(this.map);
      }

      if (this.originName) {
        this.originMarker.bindPopup(`<b>Origen:</b> ${this.originName}`);
      }
    } else if (this.originMarker) {
      this.map.removeLayer(this.originMarker);
      this.originMarker = null;
    }

    // 2. Marcador de Destino
    if (this.destLat && this.destLng) {
      const destLatLng: L.LatLngExpression = [Number(this.destLat), Number(this.destLng)];
      boundsPoints.push(destLatLng);

      const destIcon = L.divIcon({
        className: 'custom-map-marker',
        html: '<div class="marker-pin dest-pin"><span class="pin-symbol">B</span></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      if (this.destMarker) {
        this.destMarker.setLatLng(destLatLng);
      } else {
        this.destMarker = L.marker(destLatLng, { icon: destIcon }).addTo(this.map);
      }

      if (this.destName) {
        this.destMarker.bindPopup(`<b>Destino:</b> ${this.destName}`);
      }
    } else if (this.destMarker) {
      this.map.removeLayer(this.destMarker);
      this.destMarker = null;
    }

    // 3. Marcador del Conductor (si se proporciona)
    if (this.driverLat && this.driverLng) {
      const driverLatLng: L.LatLngExpression = [Number(this.driverLat), Number(this.driverLng)];
      boundsPoints.push(driverLatLng);

      const driverIcon = L.divIcon({
        className: 'custom-map-marker',
        html: '<div class="marker-pin driver-pin"><span class="pin-symbol">🚗</span></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      if (this.driverMarker) {
        this.driverMarker.setLatLng(driverLatLng);
      } else {
        this.driverMarker = L.marker(driverLatLng, { icon: driverIcon }).addTo(this.map);
        this.driverMarker.bindPopup('<b>Conductor</b> en tiempo real');
      }
    } else if (this.driverMarker) {
      this.map.removeLayer(this.driverMarker);
      this.driverMarker = null;
    }

    // 4. Trazo de Ruta entre Origen y Destino
    if (this.originLat && this.originLng && this.destLat && this.destLng) {
      const latlngs: L.LatLngExpression[] = [
        [Number(this.originLat), Number(this.originLng)],
        [Number(this.destLat), Number(this.destLng)]
      ];

      if (this.routeLine) {
        this.routeLine.setLatLngs(latlngs);
      } else {
        this.routeLine = L.polyline(latlngs, {
          color: '#c49a6c',
          weight: 4,
          opacity: 0.9,
          dashArray: '6, 8'
        }).addTo(this.map);
      }
    } else if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }

    // 5. Ajuste automático del encuadre (Bounds)
    if (boundsPoints.length >= 2) {
      const bounds = L.latLngBounds(boundsPoints);
      this.map.fitBounds(bounds, {
        padding: [35, 35],
        maxZoom: 16
      });
    } else if (boundsPoints.length === 1) {
      this.map.setView(boundsPoints[0], 14);
    }
  }
}

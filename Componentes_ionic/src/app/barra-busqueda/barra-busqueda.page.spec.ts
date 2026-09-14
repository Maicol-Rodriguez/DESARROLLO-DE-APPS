import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarraBusquedaPage } from './barra-busqueda.page';

describe('BarraBusquedaPage', () => {
  let component: BarraBusquedaPage;
  let fixture: ComponentFixture<BarraBusquedaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BarraBusquedaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

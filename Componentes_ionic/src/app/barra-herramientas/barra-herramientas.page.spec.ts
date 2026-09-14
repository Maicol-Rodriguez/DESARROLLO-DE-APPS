import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarraHerramientasPage } from './barra-herramientas.page';

describe('BarraHerramientasPage', () => {
  let component: BarraHerramientasPage;
  let fixture: ComponentFixture<BarraHerramientasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BarraHerramientasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

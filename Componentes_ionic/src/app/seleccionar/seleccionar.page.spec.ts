import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeleccionarPage } from './seleccionar.page';

describe('SeleccionarPage', () => {
  let component: SeleccionarPage;
  let fixture: ComponentFixture<SeleccionarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SeleccionarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

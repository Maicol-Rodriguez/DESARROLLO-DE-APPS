import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HojaAccionPage } from './hoja-accion.page';

describe('HojaAccionPage', () => {
  let component: HojaAccionPage;
  let fixture: ComponentFixture<HojaAccionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HojaAccionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

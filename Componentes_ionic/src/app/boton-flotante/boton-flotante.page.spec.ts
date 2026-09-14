import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BotonFlotantePage } from './boton-flotante.page';

describe('BotonFlotantePage', () => {
  let component: BotonFlotantePage;
  let fixture: ComponentFixture<BotonFlotantePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BotonFlotantePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

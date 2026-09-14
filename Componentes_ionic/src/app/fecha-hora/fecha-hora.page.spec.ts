import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FechaHoraPage } from './fecha-hora.page';

describe('FechaHoraPage', () => {
  let component: FechaHoraPage;
  let fixture: ComponentFixture<FechaHoraPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FechaHoraPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

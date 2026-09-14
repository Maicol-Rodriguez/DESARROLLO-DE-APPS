import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TostadaPage } from './tostada.page';

describe('TostadaPage', () => {
  let component: TostadaPage;
  let fixture: ComponentFixture<TostadaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TostadaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

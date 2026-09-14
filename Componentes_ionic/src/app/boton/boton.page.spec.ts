import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BotonPage } from './boton.page';

describe('BotonPage', () => {
  let component: BotonPage;
  let fixture: ComponentFixture<BotonPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BotonPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

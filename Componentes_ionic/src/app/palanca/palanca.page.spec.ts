import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PalancaPage } from './palanca.page';

describe('PalancaPage', () => {
  let component: PalancaPage;
  let fixture: ComponentFixture<PalancaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PalancaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

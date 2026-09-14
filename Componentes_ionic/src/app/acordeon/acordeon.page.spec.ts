import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcordeonPage } from './acordeon.page';

describe('AcordeonPage', () => {
  let component: AcordeonPage;
  let fixture: ComponentFixture<AcordeonPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AcordeonPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

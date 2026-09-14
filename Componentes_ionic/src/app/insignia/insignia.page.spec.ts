import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsigniaPage } from './insignia.page';

describe('InsigniaPage', () => {
  let component: InsigniaPage;
  let fixture: ComponentFixture<InsigniaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InsigniaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

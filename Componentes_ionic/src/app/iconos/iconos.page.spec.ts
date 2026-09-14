import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconosPage } from './iconos.page';

describe('IconosPage', () => {
  let component: IconosPage;
  let fixture: ComponentFixture<IconosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IconosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefrescoPage } from './refresco.page';

describe('RefrescoPage', () => {
  let component: RefrescoPage;
  let fixture: ComponentFixture<RefrescoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RefrescoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mail } from './mail';

describe('Mail', () => {
  let component: Mail;
  let fixture: ComponentFixture<Mail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

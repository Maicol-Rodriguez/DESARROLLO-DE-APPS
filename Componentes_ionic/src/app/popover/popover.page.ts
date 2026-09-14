import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonPopover, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-popover',
  templateUrl: './popover.page.html',
  styleUrls: ['./popover.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonPopover, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class PopoverPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

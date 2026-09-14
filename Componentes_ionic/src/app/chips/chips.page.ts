import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonChip, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-chips',
  templateUrl: './chips.page.html',
  styleUrls: ['./chips.page.scss'],
  imports: [IonButton, IonChip, IonContent, IonHeader, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class ChipsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

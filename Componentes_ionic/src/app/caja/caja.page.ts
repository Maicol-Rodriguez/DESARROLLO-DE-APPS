import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonCheckbox, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-caja',
  templateUrl: './caja.page.html',
  styleUrls: ['./caja.page.scss'],
  imports: [IonButton, IonCheckbox, IonContent, IonHeader, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class CajaPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

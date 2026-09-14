import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonRange, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-rango',
  templateUrl: './rango.page.html',
  styleUrls: ['./rango.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonRange, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class RangoPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

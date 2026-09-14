import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonItem, IonList, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-seleccionar',
  templateUrl: './seleccionar.page.html',
  styleUrls: ['./seleccionar.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonItem, IonList, IonSelect, IonSelectOption, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class SeleccionarPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

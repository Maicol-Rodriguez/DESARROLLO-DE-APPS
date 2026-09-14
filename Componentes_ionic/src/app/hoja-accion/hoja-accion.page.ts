import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonActionSheet, IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hoja-accion',
  templateUrl: './hoja-accion.page.html',
  styleUrls: ['./hoja-accion.page.scss'],
  imports: [IonActionSheet, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class HojaAccionPage implements OnInit {

  public actionButtons = [
    { text: 'Eliminar', role: 'destructive' },
    { text: 'Compartir' },
    { text: 'Cancelar', role: 'cancel' },
  ];

  constructor() { }

  ngOnInit() {
  }

}

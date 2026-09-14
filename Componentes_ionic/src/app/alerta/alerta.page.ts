import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonAlert, IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import type { OverlayEventDetail } from '@ionic/core';


@Component({
  selector: 'app-alerta',
  templateUrl: './alerta.page.html',
  styleUrls: ['./alerta.page.scss'],
  imports: [IonAlert, IonButton, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AlertaPage implements OnInit {

  public alertButtons = ['Aceptar'];
  public result = '';
  public alertInputs = [
    {
      placeholder: 'Nombre',
    },
    {
      placeholder: 'Apodo (máximo 8 caracteres)',
      attributes: {
        maxlength: 8,
      },
    },
    {
      type: 'number',
      placeholder: 'Edad',
      min: 1,
      max: 100,
    },
    {
      type: 'textarea',
      placeholder: 'Descripción',
    },
  ];
  public colorInputs = [
    {
      label: 'Rojo',
      type: 'radio',
      value: 'red',
    },
    {
      label: 'Azul',
      type: 'radio',
      value: 'blue',
    },
    {
      label: 'Verde',
      type: 'radio',
      value: 'green',
    },
  ];

  constructor() { }

  ngOnInit() {
  }

  setResult(event: CustomEvent<OverlayEventDetail>) {
    this.result = event.detail.role ?? '';
  }

}

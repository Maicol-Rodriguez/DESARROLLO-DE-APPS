import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonFab, IonFabButton, IonFabList, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { add, colorPalette, document, globe } from 'ionicons/icons';

addIcons({ add, colorPalette, document, globe });

@Component({
  selector: 'app-boton-flotante',
  templateUrl: './boton-flotante.page.html',
  styleUrls: ['./boton-flotante.page.scss'],
  imports: [IonButton, IonContent, IonFab, IonFabButton, IonFabList, IonHeader, IonIcon, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class BotonFlotantePage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

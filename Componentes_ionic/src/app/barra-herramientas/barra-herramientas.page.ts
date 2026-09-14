import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonLabel, IonProgressBar, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-barra-herramientas',
  templateUrl: './barra-herramientas.page.html',
  styleUrls: ['./barra-herramientas.page.scss'],
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonLabel, IonProgressBar, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class BarraHerramientasPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

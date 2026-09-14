import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonSearchbar, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-barra-busqueda',
  templateUrl: './barra-busqueda.page.html',
  styleUrls: ['./barra-busqueda.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonSearchbar, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class BarraBusquedaPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonDatetime, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-fecha-hora',
  templateUrl: './fecha-hora.page.html',
  styleUrls: ['./fecha-hora.page.scss'],
  imports: [IonButton, IonContent, IonDatetime, IonHeader, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class FechaHoraPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

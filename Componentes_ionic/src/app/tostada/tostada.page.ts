import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonTitle, IonToast, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { globe } from 'ionicons/icons';

addIcons({ globe });

@Component({
  selector: 'app-tostada',
  templateUrl: './tostada.page.html',
  styleUrls: ['./tostada.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToast, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class TostadaPage implements OnInit {

  public toastButtons = ['Cerrar'];

  constructor() { }

  ngOnInit() {
  }

}

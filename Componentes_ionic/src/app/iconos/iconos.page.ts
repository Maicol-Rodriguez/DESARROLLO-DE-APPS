import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { heart, home, logoIonic, star } from 'ionicons/icons';

addIcons({ heart, home, logoIonic, star });

@Component({
  selector: 'app-iconos',
  templateUrl: './iconos.page.html',
  styleUrls: ['./iconos.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class IconosPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonButton, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { heart } from 'ionicons/icons';

addIcons({ heart });

@Component({
  selector: 'app-boton',
  templateUrl: './boton.page.html',
  styleUrls: ['./boton.page.scss'],
  imports: [IonContent, IonIcon, IonButton, RouterLink, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})

export class BotonPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

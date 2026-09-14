import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonBadge, IonTabBar, IonTabButton, IonIcon, IonItem, IonLabel, IonList, IonContent, IonButton, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heart, calendar, musicalNote } from 'ionicons/icons';


addIcons({ heart, calendar, musicalNote });

@Component({
  selector: 'app-insignia',
  templateUrl: './insignia.page.html',
  styleUrls: ['./insignia.page.scss'],
  imports: [IonBadge, IonTabBar, IonTabButton, IonIcon, IonItem, IonLabel, IonList,IonContent, IonButton, IonHeader, RouterLink, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class InsigniaPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

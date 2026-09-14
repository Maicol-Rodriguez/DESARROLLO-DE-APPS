import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonRefresher, IonRefresherContent, IonTitle, IonToolbar, RefresherCustomEvent } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-refresco',
  templateUrl: './refresco.page.html',
  styleUrls: ['./refresco.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonRefresher, IonRefresherContent, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class RefrescoPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  handleRefresh(event: RefresherCustomEvent) {
    setTimeout(() => event.target.complete(), 800);
  }

}

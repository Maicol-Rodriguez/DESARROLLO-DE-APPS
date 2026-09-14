import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonAccordion, IonAccordionGroup, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-acordeon',
  templateUrl: './acordeon.page.html',
  styleUrls: ['./acordeon.page.scss'],
  imports: [IonAccordion, IonAccordionGroup, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class AcordeonPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

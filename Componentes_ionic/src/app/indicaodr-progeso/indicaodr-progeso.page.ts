import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonProgressBar, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-indicaodr-progeso',
  templateUrl: './indicaodr-progeso.page.html',
  styleUrls: ['./indicaodr-progeso.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonProgressBar, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class IndicaodrProgesoPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

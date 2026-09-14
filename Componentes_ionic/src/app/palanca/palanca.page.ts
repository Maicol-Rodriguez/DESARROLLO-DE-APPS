import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonTitle, IonToggle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-palanca',
  templateUrl: './palanca.page.html',
  styleUrls: ['./palanca.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToggle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class PalancaPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

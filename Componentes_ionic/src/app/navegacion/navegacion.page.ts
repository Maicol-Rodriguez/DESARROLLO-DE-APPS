import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonNav, IonNavLink, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-nav-root',
  template: '<ion-content class="ion-padding"><h2>Página inicial de Nav</h2><p>Esta navegación no cambia la URL.</p><ion-nav-link router-direction="forward" [component]="next"><ion-button>Ir a página 2</ion-button></ion-nav-link></ion-content>',
  imports: [IonButton, IonContent, IonNavLink],
})
class NavRootPage {
  next = NavSecondPage;
}

@Component({
  standalone: true,
  selector: 'app-nav-second',
  template: '<ion-content class="ion-padding"><h2>Página 2</h2><ion-nav-link router-direction="forward" [component]="next"><ion-button>Ir a página 3</ion-button></ion-nav-link><ion-nav-link router-direction="back"><ion-button fill="outline">Volver</ion-button></ion-nav-link></ion-content>',
  imports: [IonButton, IonContent, IonNavLink],
})
class NavSecondPage {
  next = NavThirdPage;
}

@Component({
  standalone: true,
  selector: 'app-nav-third',
  template: '<ion-content class="ion-padding"><h2>Página 3</h2><ion-nav-link router-direction="forward" [component]="next"><ion-button>Ir a página 4</ion-button></ion-nav-link><ion-nav-link router-direction="back"><ion-button fill="outline">Volver</ion-button></ion-nav-link></ion-content>',
  imports: [IonButton, IonContent, IonNavLink],
})
class NavThirdPage {
  next = NavFourthPage;
}

@Component({
  standalone: true,
  selector: 'app-nav-fourth',
  template: '<ion-content class="ion-padding"><h2>Página 4</h2><p>Fin de la navegación.</p><ion-nav-link router-direction="back"><ion-button fill="outline">Volver</ion-button></ion-nav-link></ion-content>',
  imports: [IonButton, IonContent, IonNavLink],
})
class NavFourthPage {}

@Component({
  selector: 'app-navegacion',
  templateUrl: './navegacion.page.html',
  styleUrls: ['./navegacion.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonNav, IonTitle, IonToolbar, RouterLink, CommonModule, FormsModule]
})
export class NavegacionPage implements OnInit {

  root = NavRootPage;

  constructor() { }

  ngOnInit() {
  }

}

import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { triangle } from 'ionicons/icons';

addIcons({ triangle });

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  // public environmentInjector = inject(EnvironmentInjector);

  constructor() {
  }
}

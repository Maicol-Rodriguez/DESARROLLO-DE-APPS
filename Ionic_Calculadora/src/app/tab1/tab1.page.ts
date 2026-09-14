import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonButton, IonList
} from '@ionic/angular';

interface Operacion {
  texto: string;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonButton, IonList,
    CommonModule, FormsModule
  ],
})
export class Tab1Page {
  numero1: number = 0;
  numero2: number = 0;
  operacion: string = '+';
  historial: Operacion[] = [];

  calcular() {
    const n1 = Number(this.numero1);
    const n2 = Number(this.numero2);
    let resultado: number;
    let simbolo: string;

    switch (this.operacion) {
      case '+':
        resultado = n1 + n2;
        simbolo = '+';
        break;
      case '-':
        resultado = n1 - n2;
        simbolo = '-';
        break;
      case '*':
        resultado = n1 * n2;
        simbolo = '×';
        break;
      case '/':
        resultado = n2 === 0 ? NaN : n1 / n2;
        simbolo = '÷';
        break;
      default:
        resultado = 0;
        simbolo = '';
    }

    const texto = isNaN(resultado)
      ? `${n1} ${simbolo} ${n2} = Error (división por cero)`
      : `${n1} ${simbolo} ${n2} = ${resultado}`;

    this.historial.unshift({ texto });
  }
}
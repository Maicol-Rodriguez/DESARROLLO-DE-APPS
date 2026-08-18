import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface HistorialItem {
  operacion: string;
  resultado: number;
}

@Component({
  selector: 'app-calculadora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculadora.html',
  styleUrls: ['./calculadora.css']
})
export class CalculadoraComponent {
  numero1: number = 0;
  numero2: number = 0;
  operacion: string = '+';
  resultado: number | null = null;
  historial: HistorialItem[] = [];

  calcular(): void {
    let res: number;

    switch (this.operacion) {
      case '+':
        res = this.numero1 + this.numero2;
        break;
      case '-':
        res = this.numero1 - this.numero2;
        break;
      case '*':
        res = this.numero1 * this.numero2;
        break;
      case '/':
        if (this.numero2 === 0) {
          alert('No se puede dividir entre cero');
          return;
        }
        res = this.numero1 / this.numero2;
        break;
      default:
        res = 0;
    }

    this.resultado = res;

    // Guardamos en el historial
    this.historial.unshift({
      operacion: `${this.numero1} ${this.operacion} ${this.numero2} = ${res}`,
      resultado: res
    });
  }

  limpiarHistorial(): void {
    this.historial = [];
  }
}
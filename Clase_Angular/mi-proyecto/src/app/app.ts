import { Component } from '@angular/core';
import { CalculadoraComponent } from './calculadora/calculadora';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CalculadoraComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {}
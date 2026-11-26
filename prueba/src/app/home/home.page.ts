import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { IonContent } from '@ionic/angular';

import {
  AnalysisResult,
  AnalysisService,
  ChatResponse,
  DocumentResult
} from '../core/analysis.service';

const MIN_WORDS = 50;
const MAX_CHARACTERS = 5000;
const MAX_SENTENCES = 100;
const MIN_WORDS_PER_SENTENCE = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_POLLS = 180;
const DOCUMENT_POLL_INTERVAL_MS = 2000;
const RESULT_NOTICE =
  'Este indicador es experimental y puede equivocarse: un texto de IA puede obtener una cifra baja y uno humano una alta. No demuestra quién escribió el texto.';

interface ChatEntry {
  pregunta: string;
  respuesta: string;
  razones: string[];
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [FormsModule, IonContent]
})
export class HomePage {
  private readonly analysisService = inject(AnalysisService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  modo: 'texto' | 'documento' = 'texto';
  texto = '';
  archivo: File | null = null;
  resultado: AnalysisResult | null = null;
  sessionId: string | null = null;
  pregunta = '';
  conversaciones: ChatEntry[] = [];
  cargando = false;
  mensajeCarga = '';
  error = '';

  get cantidadPalabras(): number {
    const limpio = this.texto.trim();
    return limpio ? limpio.split(/\s+/).length : 0;
  }

  get textoValido(): boolean {
    return this.cantidadPalabras >= MIN_WORDS
      && this.texto.length <= MAX_CHARACTERS
      && this.cantidadOraciones <= MAX_SENTENCES;
  }

  get cantidadOraciones(): number {
    const limpio = this.texto.trim();
    if (!limpio) {
      return 0;
    }
    return limpio
      .split(/(?<=[.!?])\s+/)
      .filter((oracion) => oracion.split(/\s+/).length >= MIN_WORDS_PER_SENTENCE)
      .length;
  }

  get mensajeValidacion(): string {
    if (this.cantidadPalabras < MIN_WORDS) {
      return `Faltan ${MIN_WORDS - this.cantidadPalabras} palabras para alcanzar el mínimo.`;
    }
    if (this.texto.length > MAX_CHARACTERS) {
      return `El texto supera el máximo de ${MAX_CHARACTERS} caracteres.`;
    }
    if (this.cantidadOraciones > MAX_SENTENCES) {
      return `El texto supera el límite de ${MAX_SENTENCES} oraciones completas.`;
    }
    return '';
  }

  get archivoValido(): boolean {
    return this.archivo !== null
      && this.archivo.size <= MAX_FILE_BYTES
      && /\.(pdf|docx)$/i.test(this.archivo.name);
  }

  async analizarTexto(): Promise<void> {
    if (!this.textoValido || this.cargando) {
      return;
    }
    this.iniciarSolicitud();
    this.mensajeCarga = 'Analizando el texto; puede tardar hasta unos minutos.';
    try {
      this.resultado = await firstValueFrom(this.analysisService.analyzeText(this.texto));
      this.sessionId = this.resultado.session_id ?? null;
    } catch (error) {
      this.error = this.obtenerMensajeError(error);
    } finally {
      this.finalizarSolicitud();
    }
  }

  async analizarDocumento(): Promise<void> {
    if (!this.archivoValido || !this.archivo || this.cargando) {
      return;
    }
    this.iniciarSolicitud();
    this.mensajeCarga = 'Subiendo el documento...';
    try {
      const carga = await firstValueFrom(this.analysisService.uploadDocument(this.archivo));
      this.sessionId = carga.session_id;
      this.mensajeCarga = 'Documento recibido. El modelo lo está analizando...';
      this.changeDetector.markForCheck();
      const resultado = await this.esperarResultadoDocumento(
        carga.document_id,
        carga.session_id
      );
      this.resultado = this.convertirResultadoDocumento(resultado);
    } catch (error) {
      this.error = this.obtenerMensajeError(error);
    } finally {
      this.finalizarSolicitud();
    }
  }

  async enviarPregunta(): Promise<void> {
    const mensaje = this.pregunta.trim();
    if (!this.sessionId || !mensaje || this.cargando) {
      return;
    }
    this.cargando = true;
    this.mensajeCarga = 'Generando una explicación...';
    this.error = '';
    try {
      const respuesta = await firstValueFrom(
        this.analysisService.sendMessage(this.sessionId, mensaje)
      );
      this.conversaciones = [...this.conversaciones, this.crearEntradaChat(mensaje, respuesta)];
      this.pregunta = '';
    } catch (error) {
      this.error = this.obtenerMensajeError(error);
    } finally {
      this.cargando = false;
      this.changeDetector.markForCheck();
    }
  }

  seleccionarArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.archivo = input.files?.[0] ?? null;
    this.error = '';
    this.resultado = null;
    this.mensajeCarga = '';
  }

  cambiarModo(modo: 'texto' | 'documento'): void {
    if (this.cargando) {
      return;
    }
    this.modo = modo;
    this.error = '';
    this.resultado = null;
  }

  limpiar(): void {
    this.texto = '';
    this.archivo = null;
    this.resultado = null;
    this.sessionId = null;
    this.conversaciones = [];
    this.pregunta = '';
    this.mensajeCarga = '';
    this.error = '';
  }

  anchoIndicador(): number {
    return Math.min(100, Math.max(0, this.resultado?.puntuacion ?? 0));
  }

  avisoResultado(): string {
    return this.resultado?.aviso ?? RESULT_NOTICE;
  }

  private iniciarSolicitud(): void {
    this.cargando = true;
    this.error = '';
    this.resultado = null;
    this.sessionId = null;
    this.conversaciones = [];
    this.mensajeCarga = '';
  }

  private finalizarSolicitud(): void {
    this.cargando = false;
    this.changeDetector.markForCheck();
  }

  private async esperarResultadoDocumento(
    documentId: string,
    sessionId: string
  ): Promise<DocumentResult> {
    for (let intento = 0; intento < MAX_DOCUMENT_POLLS; intento += 1) {
      await new Promise((resolve) => setTimeout(resolve, DOCUMENT_POLL_INTERVAL_MS));
      const respuesta = await firstValueFrom(
        this.analysisService.getDocumentResult(documentId, sessionId)
      );
      if (respuesta.status === 202) {
        continue;
      }
      if (!respuesta.body) {
        throw new Error('El servidor devolvió un resultado de documento vacío.');
      }
      return respuesta.body;
    }
    throw new Error('El análisis del documento tardó demasiado. Inténtalo de nuevo.');
  }

  private convertirResultadoDocumento(resultado: DocumentResult): AnalysisResult {
    return {
      puntuacion: resultado.porcentaje_ia,
      nivel: resultado.nivel,
      motivos: resultado.motivos,
      aviso: RESULT_NOTICE
    };
  }

  private crearEntradaChat(pregunta: string, respuesta: ChatResponse): ChatEntry {
    return {
      pregunta,
      respuesta: respuesta.respuesta,
      razones: respuesta.razones
    };
  }

  private obtenerMensajeError(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'El análisis tardó demasiado. Verifica que FastAPI siga activo e inténtalo de nuevo.';
    }
    if (error instanceof HttpErrorResponse) {
      const body: unknown = error.error;
      if (typeof body === 'object' && body !== null && 'detalles' in body) {
        const detalles = (body as { detalles?: unknown }).detalles;
        if (Array.isArray(detalles) && detalles.every((item) => typeof item === 'string')) {
          return detalles.join(' ');
        }
      }
      if (typeof body === 'object' && body !== null && 'detail' in body) {
        const detail = (body as { detail?: unknown }).detail;
        if (typeof detail === 'string') {
          return detail;
        }
      }
      if (error.status === 0) {
        return 'No se pudo conectar con FastAPI. Verifica que el servidor esté en ejecución.';
      }
      return `El servidor respondió con el error ${error.status}.`;
    }
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  }
}

import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AnalysisResult {
  session_id?: string;
  puntuacion: number;
  nivel: string;
  perplejidad?: number;
  variabilidad?: number;
  oraciones_sospechosas?: string[];
  motivos?: string[];
  aviso?: string;
}

export interface DocumentUpload {
  document_id: string;
  session_id: string;
  estado: string;
}

export interface DocumentResult {
  document_id: string;
  porcentaje_ia: number;
  nivel: string;
  motivos: string[];
}

export interface ChatResponse {
  respuesta: string;
  razones: string[];
}

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  analyzeText(texto: string): Observable<AnalysisResult> {
    return this.http.post<AnalysisResult>(`${this.baseUrl}/analizar`, { texto }).pipe(
      timeout({ first: 180_000 })
    );
  }

  uploadDocument(file: File): Observable<DocumentUpload> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DocumentUpload>(
      `${this.baseUrl}/api/v1/documentos/upload`,
      formData
    ).pipe(timeout({ first: 60_000 }));
  }

  getDocumentResult(
    documentId: string,
    sessionId: string
  ): Observable<HttpResponse<DocumentResult>> {
    const headers = new HttpHeaders({ 'X-Session-Id': sessionId });
    return this.http.get<DocumentResult>(
      `${this.baseUrl}/api/v1/documentos/${encodeURIComponent(documentId)}/resultado`,
      { headers, observe: 'response' }
    ).pipe(timeout({ first: 15_000 }));
  }

  sendMessage(sessionId: string, mensaje: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/api/v1/chat/mensaje`, {
      session_id: sessionId,
      mensaje
    }).pipe(timeout({ first: 120_000 }));
  }
}

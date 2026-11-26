import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalysisService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AnalysisService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('preserves the processing status when a document is still being analyzed', () => {
    service.getDocumentResult('document-id', 'session-id').subscribe((response) => {
      expect(response.status).toBe(202);
      expect(response.body).toEqual({ detail: 'El documento aún se está procesando' });
    });

    const request = http.expectOne(
      'http://127.0.0.1:8000/api/v1/documentos/document-id/resultado'
    );
    expect(request.request.headers.get('X-Session-Id')).toBe('session-id');
    request.flush(
      { detail: 'El documento aún se está procesando' },
      { status: 202, statusText: 'Accepted' }
    );
  });
});

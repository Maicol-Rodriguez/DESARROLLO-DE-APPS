import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('only enables text analysis within the shared word and character limits', () => {
    component.texto = Array.from({ length: 50 }, () => 'palabra').join(' ');
    expect(component.textoValido).toBe(true);

    component.texto = Array.from({ length: 49 }, () => 'palabra').join(' ');
    expect(component.textoValido).toBe(false);

    component.texto = `${Array.from({ length: 50 }, () => 'palabra').join(' ')}${'x'.repeat(5000)}`;
    expect(component.textoValido).toBe(false);
  });

  it('rejects text with more analyzable sentences than the backend limit', () => {
    component.texto = Array.from({ length: 101 }, () => 'Una frase de prueba.').join(' ');

    expect(component.cantidadOraciones).toBe(101);
    expect(component.textoValido).toBe(false);
    expect(component.mensajeValidacion).toContain('100 oraciones');
  });

  it('renders the result and stops loading after the API responds', async () => {
    component.texto = Array.from({ length: 50 }, () => 'palabra').join(' ');
    const request = component.analizarTexto();

    const analysis = http.expectOne('http://127.0.0.1:8000/analizar');
    analysis.flush({
      session_id: 'text-session',
      puntuacion: 45,
      nivel: 'medio',
      perplejidad: 65,
      variabilidad: 12,
      oraciones_sospechosas: [],
      aviso: 'Indicador orientativo.'
    });

    await request;
    fixture.detectChanges();

    expect(component.cargando).toBe(false);
    expect(component.sessionId).toBe('text-session');
    expect(fixture.nativeElement.textContent).toContain('Indicador: 45 / 100');
    expect(fixture.nativeElement.textContent).toContain('Pregúntale a Gemini');
    expect(fixture.nativeElement.textContent).toContain('se envían a Google Gemini');
  });

  it('sends a question to Gemini using the active text session', async () => {
    component.sessionId = 'text-session';
    component.resultado = {
      puntuacion: 45,
      nivel: 'medio',
      session_id: 'text-session'
    };
    component.pregunta = '¿Cuál es la idea principal?';

    const requestPromise = component.enviarPregunta();
    const request = http.expectOne('http://127.0.0.1:8000/api/v1/chat/mensaje');
    expect(request.request.body).toEqual({
      session_id: 'text-session',
      mensaje: '¿Cuál es la idea principal?'
    });
    request.flush({ respuesta: 'Explicación clara.', razones: [] });
    await requestPromise;

    expect(component.conversaciones[0].respuesta).toBe('Explicación clara.');
  });
});

"""Pruebas unitarias para el detector de textos IA usando unittest y mocks."""
import unittest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError

from detector import analizar_texto
from main import AnalisisRequest


class TestDetectorIA(unittest.TestCase):
    """Casos de prueba para validación de entrada y análisis simulado sin descargar modelos."""

    def test_texto_valido(self) -> None:
        """Verifica que un texto válido retorne la estructura completa esperada."""
        texto_valido = (
            "La inteligencia artificial ha transformado el desarrollo de software moderno en las últimas décadas. "
            "Los modelos de lenguaje actuales son capaces de producir oraciones fluidas, gramaticalmente correctas y complejas. "
            "No obstante, este tipo de herramientas tiende a generar patrones repetitivos con baja perplejidad y estilo homogéneo. "
            "Por este motivo, nuestro proyecto académico calcula métricas estadísticas para ofrecer una estimación orientativa "
            "que nunca debe considerarse como una prueba definitiva de autoría humana o sintética en ningún entorno académico."
        )
        mock_tok = MagicMock()
        mock_mod = MagicMock()

        with patch("detector.calcular_perplejidad", side_effect=[35.0, 30.0, 40.0, 32.0, 38.0]):
            resultado = analizar_texto(texto_valido, mock_tok, mock_mod)

        self.assertIn("puntuacion", resultado)
        self.assertIn("nivel", resultado)
        self.assertIn("perplejidad", resultado)
        self.assertIn("variabilidad", resultado)
        self.assertIn("oraciones_sospechosas", resultado)
        self.assertIn("aviso", resultado)
        self.assertIsInstance(resultado["oraciones_sospechosas"], list)
        self.assertLessEqual(len(resultado["oraciones_sospechosas"]), 3)
        self.assertIn(resultado["nivel"], ["bajo", "medio", "alto"])

    def test_texto_vacio(self) -> None:
        """Verifica que el validador rechace textos vacíos o solo con espacios en blanco."""
        with self.assertRaises(ValidationError) as contexto:
            AnalisisRequest(texto="   ")

        mensaje_error = str(contexto.exception)
        self.assertIn("no puede estar vacío", mensaje_error)

    def test_texto_demasiado_corto(self) -> None:
        """Verifica que el validador rechace textos con menos de 50 palabras."""
        texto_corto = "Este texto es demasiado breve para un análisis estadístico fiable."
        with self.assertRaises(ValidationError) as contexto:
            AnalisisRequest(texto=texto_corto)

        mensaje_error = str(contexto.exception)
        self.assertIn("al menos 50 palabras", mensaje_error)


if __name__ == "__main__":
    unittest.main()

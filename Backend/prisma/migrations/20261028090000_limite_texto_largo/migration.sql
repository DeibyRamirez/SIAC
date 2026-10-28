-- Usabilidad: límite de 600 caracteres en los textos que escribe el usuario (comentarios y
-- observaciones por condición). NOT VALID: se exige en inserciones y actualizaciones nuevas sin
-- revalidar ni truncar filas históricas. Evidencia.observaciones no se limita en BD porque guarda
-- el resumen generado de todas las condiciones (el DTO sí limita lo que envía el usuario).
ALTER TABLE "EvidenciaComentario"
  ADD CONSTRAINT "EvidenciaComentario_texto_max_600" CHECK (char_length("texto") <= 600) NOT VALID;
ALTER TABLE "EvaluacionCondicionEvidencia"
  ADD CONSTRAINT "EvaluacionCondicionEvidencia_observacion_max_600" CHECK ("observacion" IS NULL OR char_length("observacion") <= 600) NOT VALID;
ALTER TABLE "EvaluacionCondicionInstitucionalEvidencia"
  ADD CONSTRAINT "EvaluacionCondicionInstitucionalEvidencia_observacion_max_600" CHECK ("observacion" IS NULL OR char_length("observacion") <= 600) NOT VALID;

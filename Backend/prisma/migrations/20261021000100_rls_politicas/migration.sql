-- RLS (plan-rls.md) · Migración B: ENABLE + FORCE ROW LEVEL SECURITY y políticas en las 22 tablas.
-- Contexto: siac.usuario_id() y siac.rol() (set_config por transacción desde el backend).
-- Sin contexto no se ve ninguna fila (fallar cerrado). 'sistema' solo lo fija
-- Backend/src/prisma/contexto-sistema.ts (cron, outbox, ingesta, avance, despacho de alertas).
-- El dueño (postgres) tiene BYPASSRLS: migraciones y semilla no se ven afectadas.
-- Excluida: _prisma_migrations (solo la usa el dueño; siac_app no tiene permisos sobre ella).

ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Institucion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Institucion" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Programa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Programa" FORCE ROW LEVEL SECURITY;
ALTER TABLE "UsuarioPrograma" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsuarioPrograma" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Evidencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evidencia" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EvidenciaVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenciaVersion" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EvidenciaComentario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenciaComentario" FORCE ROW LEVEL SECURITY;
ALTER TABLE "HistorialEvidencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HistorialEvidencia" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Plantilla" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plantilla" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EvaluacionCondicionEvidencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluacionCondicionEvidencia" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EvaluacionCondicionInstitucionalEvidencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluacionCondicionInstitucionalEvidencia" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AnexoVigencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnexoVigencia" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AlertaInApp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AlertaInApp" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ResolucionMen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResolucionMen" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ConfiguracionSIAC" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConfiguracionSIAC" FORCE ROW LEVEL SECURITY;
ALTER TABLE "NotificacionSalida" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificacionSalida" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TramiteSIAC" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TramiteSIAC" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TramiteDocumentoGuia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TramiteDocumentoGuia" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EtapaAcreditacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EtapaAcreditacion" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CarpetaNormativa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarpetaNormativa" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DocumentoRequerido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentoRequerido" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ConfiguracionInformePowerBi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConfiguracionInformePowerBi" FORCE ROW LEVEL SECURITY;

-- Identidad
CREATE POLICY "usuario_select" ON "Usuario" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.usuario_visible("id"));
CREATE POLICY "usuario_insert" ON "Usuario" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "usuario_update" ON "Usuario" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin' OR "id" = siac.usuario_id())
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin' OR ("id" = siac.usuario_id() AND "rol"::text = siac.rol() AND "activo"));
CREATE POLICY "usuario_delete" ON "Usuario" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "usuario_programa_select" ON "UsuarioPrograma" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion() OR "usuarioId" = siac.usuario_id());
CREATE POLICY "usuario_programa_insert" ON "UsuarioPrograma" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "usuario_programa_update" ON "UsuarioPrograma" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "usuario_programa_delete" ON "UsuarioPrograma" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "institucion_select" ON "Institucion" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.rol() IS NOT NULL);
CREATE POLICY "institucion_insert" ON "Institucion" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "institucion_update" ON "Institucion" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "institucion_delete" ON "Institucion" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "programa_select" ON "Programa" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion() OR "id" IN (SELECT siac.programas_asignados()));
CREATE POLICY "programa_insert" ON "Programa" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "programa_update" ON "Programa" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "programa_delete" ON "Programa" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());

-- Evidencias: Borrador solo para su autor (también frente a Administrador y SuperAdmin)
CREATE POLICY "evidencia_select" ON "Evidencia" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.evidencia_fila_visible("estado"::text, "autorId", "programaId", "institucionId"));
CREATE POLICY "evidencia_insert" ON "Evidencia" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR ("autorId" = siac.usuario_id() AND (siac.es_gestion() OR (siac.rol() IN ('Cargador', 'Revisor') AND ("programaId" IN (SELECT siac.programas_asignados()) OR ("institucionId" IS NOT NULL AND siac.es_responsable_institucional()))))));
CREATE POLICY "evidencia_update" ON "Evidencia" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.evidencia_fila_visible("estado"::text, "autorId", "programaId", "institucionId"))
  WITH CHECK (siac.evidencia_fila_visible("estado"::text, "autorId", "programaId", "institucionId"));
CREATE POLICY "evidencia_delete" ON "Evidencia" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.evidencia_fila_visible("estado"::text, "autorId", "programaId", "institucionId") AND (siac.es_sistema() OR "autorId" = siac.usuario_id() OR siac.rol() = 'SuperAdmin'));
CREATE POLICY "evidencia_version_select" ON "EvidenciaVersion" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evidencia_version_insert" ON "EvidenciaVersion" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evidencia_version_update" ON "EvidenciaVersion" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.evidencia_visible("evidenciaId"))
  WITH CHECK (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evidencia_version_delete" ON "EvidenciaVersion" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evidencia_comentario_select" ON "EvidenciaComentario" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evidencia_comentario_insert" ON "EvidenciaComentario" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evidencia_comentario_update" ON "EvidenciaComentario" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.evidencia_visible("evidenciaId"))
  WITH CHECK (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evidencia_comentario_delete" ON "EvidenciaComentario" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "historial_evidencia_select" ON "HistorialEvidencia" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "historial_evidencia_insert" ON "HistorialEvidencia" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evaluacion_condicion_select" ON "EvaluacionCondicionEvidencia" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evaluacion_condicion_insert" ON "EvaluacionCondicionEvidencia" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evaluacion_condicion_inst_select" ON "EvaluacionCondicionInstitucionalEvidencia" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.evidencia_visible("evidenciaId"));
CREATE POLICY "evaluacion_condicion_inst_insert" ON "EvaluacionCondicionInstitucionalEvidencia" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.evidencia_visible("evidenciaId"));

-- Vigencias y resoluciones
CREATE POLICY "anexo_vigencia_select" ON "AnexoVigencia" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion() OR "programaId" IN (SELECT siac.programas_asignados()));
CREATE POLICY "anexo_vigencia_insert" ON "AnexoVigencia" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "anexo_vigencia_update" ON "AnexoVigencia" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "anexo_vigencia_delete" ON "AnexoVigencia" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "resolucion_men_select" ON "ResolucionMen" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion() OR "programaId" IN (SELECT siac.programas_asignados()) OR ("institucionId" IS NOT NULL AND siac.es_responsable_institucional()));
CREATE POLICY "resolucion_men_insert" ON "ResolucionMen" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "resolucion_men_update" ON "ResolucionMen" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "resolucion_men_delete" ON "ResolucionMen" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());

-- Notificaciones: alertas propias; outbox solo sistema (gestión lee la bitácora)
CREATE POLICY "alerta_inapp_select" ON "AlertaInApp" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR "usuarioId" = siac.usuario_id());
CREATE POLICY "alerta_inapp_insert" ON "AlertaInApp" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "alerta_inapp_update" ON "AlertaInApp" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR "usuarioId" = siac.usuario_id())
  WITH CHECK (siac.es_sistema() OR "usuarioId" = siac.usuario_id());
CREATE POLICY "alerta_inapp_delete" ON "AlertaInApp" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR "usuarioId" = siac.usuario_id());
CREATE POLICY "notificacion_salida_select" ON "NotificacionSalida" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "notificacion_salida_insert" ON "NotificacionSalida" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "notificacion_salida_update" ON "NotificacionSalida" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "notificacion_salida_delete" ON "NotificacionSalida" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());

-- Configuración y catálogos
CREATE POLICY "configuracion_siac_select" ON "ConfiguracionSIAC" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.rol() IS NOT NULL);
CREATE POLICY "configuracion_siac_insert" ON "ConfiguracionSIAC" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK ((siac.es_sistema() OR siac.es_gestion()) AND "id" = 'global');
CREATE POLICY "configuracion_siac_update" ON "ConfiguracionSIAC" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "configuracion_siac_delete" ON "ConfiguracionSIAC" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "configuracion_powerbi_select" ON "ConfiguracionInformePowerBi" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "configuracion_powerbi_insert" ON "ConfiguracionInformePowerBi" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "configuracion_powerbi_update" ON "ConfiguracionInformePowerBi" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "configuracion_powerbi_delete" ON "ConfiguracionInformePowerBi" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "plantilla_select" ON "Plantilla" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion() OR (siac.rol() IS NOT NULL AND "vigente"));
CREATE POLICY "plantilla_insert" ON "Plantilla" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "plantilla_update" ON "Plantilla" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "plantilla_delete" ON "Plantilla" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "tramite_siac_select" ON "TramiteSIAC" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.rol() IS NOT NULL);
CREATE POLICY "tramite_siac_insert" ON "TramiteSIAC" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "tramite_siac_update" ON "TramiteSIAC" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin')
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "tramite_siac_delete" ON "TramiteSIAC" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "tramite_documento_guia_select" ON "TramiteDocumentoGuia" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.rol() IS NOT NULL);
CREATE POLICY "tramite_documento_guia_insert" ON "TramiteDocumentoGuia" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "tramite_documento_guia_update" ON "TramiteDocumentoGuia" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin')
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "tramite_documento_guia_delete" ON "TramiteDocumentoGuia" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "etapa_acreditacion_select" ON "EtapaAcreditacion" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.rol() IS NOT NULL);
CREATE POLICY "etapa_acreditacion_insert" ON "EtapaAcreditacion" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "etapa_acreditacion_update" ON "EtapaAcreditacion" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin')
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "etapa_acreditacion_delete" ON "EtapaAcreditacion" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "carpeta_normativa_select" ON "CarpetaNormativa" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.rol() IS NOT NULL);
CREATE POLICY "carpeta_normativa_insert" ON "CarpetaNormativa" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "carpeta_normativa_update" ON "CarpetaNormativa" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin')
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "carpeta_normativa_delete" ON "CarpetaNormativa" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "documento_requerido_select" ON "DocumentoRequerido" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.rol() IS NOT NULL);
CREATE POLICY "documento_requerido_insert" ON "DocumentoRequerido" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "documento_requerido_update" ON "DocumentoRequerido" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin')
  WITH CHECK (siac.es_sistema() OR siac.rol() = 'SuperAdmin');
CREATE POLICY "documento_requerido_delete" ON "DocumentoRequerido" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.rol() = 'SuperAdmin');

-- Rol de lectura de Power BI (solo SELECT; la vista v_powerbi_puntajes es security_invoker)
CREATE POLICY "powerbi_evidencia" ON "Evidencia" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING ("estado" <> 'Borrador');
CREATE POLICY "powerbi_programa" ON "Programa" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING ("activo");
CREATE POLICY "powerbi_institucion" ON "Institucion" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_configuracion" ON "ConfiguracionSIAC" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_evaluacion" ON "EvaluacionCondicionEvidencia" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING ("evidenciaId" IN (SELECT "id" FROM "Evidencia"));
CREATE POLICY "powerbi_evaluacion_inst" ON "EvaluacionCondicionInstitucionalEvidencia" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING ("evidenciaId" IN (SELECT "id" FROM "Evidencia"));

-- RLS (plan-rls.md, aprobado por el PO el 20/10/2026) · Migración A: roles, funciones y permisos.
-- No activa la RLS (eso lo hace la migración B). Es idempotente y no contiene contraseñas:
-- los roles se crean NOLOGIN y el LOGIN + PASSWORD se fija a mano en cada entorno
-- (ver docs/despliegue.md, sección RLS).

-- 1. Roles ---------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siac_app') THEN
    CREATE ROLE siac_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siac_powerbi_lectura') THEN
    CREATE ROLE siac_powerbi_lectura NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  -- Si alguien creó los roles a mano con privilegios de más, la RLS no serviría: se detiene.
  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname IN ('siac_app', 'siac_powerbi_lectura') AND (rolbypassrls OR rolsuper)
  ) THEN
    RAISE EXCEPTION 'siac_app y siac_powerbi_lectura no pueden tener SUPERUSER ni BYPASSRLS';
  END IF;
END
$$;

ALTER ROLE siac_powerbi_lectura SET default_transaction_read_only = on;

-- 2. Funciones auxiliares (esquema siac, no expuesto por la Data API de Supabase) -----------
CREATE SCHEMA IF NOT EXISTS siac;
REVOKE ALL ON SCHEMA siac FROM PUBLIC;

-- Contexto de la petición, fijado por transacción con set_config(..., true) desde el backend.
CREATE OR REPLACE FUNCTION siac.usuario_id() RETURNS text
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT nullif(current_setting('app.usuario_id', true), '')
$$;

CREATE OR REPLACE FUNCTION siac.rol() RETURNS text
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT nullif(current_setting('app.rol', true), '')
$$;

CREATE OR REPLACE FUNCTION siac.es_sistema() RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT coalesce(siac.rol() = 'sistema', false)
$$;

CREATE OR REPLACE FUNCTION siac.es_gestion() RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT coalesce(siac.rol() IN ('Administrador', 'SuperAdmin'), false)
$$;

-- SECURITY DEFINER: leen Usuario/UsuarioPrograma sin recursión de RLS.
CREATE OR REPLACE FUNCTION siac.programas_asignados() RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT up."programaId" FROM "UsuarioPrograma" up WHERE up."usuarioId" = siac.usuario_id()
$$;

CREATE OR REPLACE FUNCTION siac.es_responsable_institucional() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(
    (SELECT u."responsableProcesoInstitucional" AND u."activo" FROM "Usuario" u WHERE u."id" = siac.usuario_id()),
    false
  )
$$;

-- Misma regla que construirFiltroVisibilidad + filtroBorradorSoloAutor (capa de servicio).
CREATE OR REPLACE FUNCTION siac.evidencia_fila_visible(
  p_estado text, p_autor text, p_programa text, p_institucion text
) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT siac.es_sistema() OR coalesce(
    siac.rol() IS NOT NULL
    AND (p_estado <> 'Borrador' OR p_autor = siac.usuario_id())
    AND (
      siac.es_gestion()
      OR (
        siac.rol() IN ('Cargador', 'Revisor')
        AND (siac.rol() = 'Revisor' OR p_autor = siac.usuario_id())
        AND (
          p_programa IN (SELECT siac.programas_asignados())
          OR (p_institucion IS NOT NULL AND siac.es_responsable_institucional())
        )
      )
    ),
    false
  )
$$;

-- Para las tablas hijas de Evidencia (versiones, comentarios, historial, evaluaciones).
CREATE OR REPLACE FUNCTION siac.evidencia_visible(p_evidencia text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(
    (SELECT siac.evidencia_fila_visible(e."estado"::text, e."autorId", e."programaId", e."institucionId")
     FROM "Evidencia" e WHERE e."id" = p_evidencia),
    false
  )
$$;

-- Usuarios visibles: uno mismo, gestión, quienes comparten programa y, entre responsables
-- institucionales, los demás responsables. Gestión y sistema ven todos.
CREATE OR REPLACE FUNCTION siac.usuario_visible(p_usuario text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT siac.es_sistema() OR siac.es_gestion() OR coalesce(
    siac.rol() IS NOT NULL AND (
      p_usuario = siac.usuario_id()
      OR EXISTS (SELECT 1 FROM "Usuario" u WHERE u."id" = p_usuario
                 AND u."rol"::text IN ('Administrador', 'SuperAdmin'))
      OR EXISTS (SELECT 1 FROM "UsuarioPrograma" up WHERE up."usuarioId" = p_usuario
                 AND up."programaId" IN (SELECT siac.programas_asignados()))
      OR (siac.es_responsable_institucional() AND EXISTS (
            SELECT 1 FROM "Usuario" u WHERE u."id" = p_usuario AND u."responsableProcesoInstitucional"))
      -- Personas que aparecen en evidencias que el usuario sí puede ver (autor, quien subió una
      -- versión, quien comentó, evaluó o cambió el estado): Prisma las une en los listados.
      OR EXISTS (SELECT 1 FROM "Evidencia" e WHERE e."autorId" = p_usuario
                 AND siac.evidencia_fila_visible(e."estado"::text, e."autorId", e."programaId", e."institucionId"))
      OR EXISTS (SELECT 1 FROM "EvidenciaVersion" v WHERE v."subidoPorId" = p_usuario
                 AND siac.evidencia_visible(v."evidenciaId"))
      OR EXISTS (SELECT 1 FROM "EvidenciaComentario" c WHERE c."revisorId" = p_usuario
                 AND siac.evidencia_visible(c."evidenciaId"))
      OR EXISTS (SELECT 1 FROM "HistorialEvidencia" h WHERE h."actorId" = p_usuario
                 AND siac.evidencia_visible(h."evidenciaId"))
      OR EXISTS (SELECT 1 FROM "EvaluacionCondicionEvidencia" ev WHERE ev."revisorId" = p_usuario
                 AND siac.evidencia_visible(ev."evidenciaId"))
      OR EXISTS (SELECT 1 FROM "EvaluacionCondicionInstitucionalEvidencia" ei WHERE ei."revisorId" = p_usuario
                 AND siac.evidencia_visible(ei."evidenciaId"))
    ),
    false
  )
$$;

-- Login y validación del JWT: corren antes de que exista contexto. Devuelven lo mínimo y el
-- backend rechaza a los usuarios inactivos (antes el login emitía token a un inactivo).
CREATE OR REPLACE FUNCTION siac.login_buscar_usuario(p_correo text)
RETURNS TABLE (
  "id" text, "nombre" text, "correo" text, "contrasena" text, "rol" text,
  "activo" boolean, "responsableProcesoInstitucional" boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u."id", u."nombre", u."correo", u."contrasena", u."rol"::text, u."activo",
         u."responsableProcesoInstitucional"
  FROM "Usuario" u WHERE u."correo" = lower(p_correo)
$$;

CREATE OR REPLACE FUNCTION siac.sesion_usuario(p_id text)
RETURNS TABLE (
  "id" text, "nombre" text, "correo" text, "rol" text,
  "activo" boolean, "responsableProcesoInstitucional" boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u."id", u."nombre", u."correo", u."rol"::text, u."activo", u."responsableProcesoInstitucional"
  FROM "Usuario" u WHERE u."id" = p_id
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA siac FROM PUBLIC;

-- 3. Permisos de siac_app ------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO siac_app;
GRANT USAGE ON SCHEMA siac TO siac_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA siac TO siac_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO siac_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO siac_app;
GRANT EXECUTE ON FUNCTION public.f_unaccent(text) TO siac_app;
-- _prisma_migrations: solo la usa el dueño en `migrate deploy`. (No existe en la BD sombra que
-- usa `prisma migrate diff --from-migrations`, por eso va condicionada.)
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public."_prisma_migrations" FROM siac_app;
  END IF;
END
$$;
-- Tablas futuras creadas por el dueño quedan accesibles (cada migración nueva debe traer su RLS;
-- lo vigila src/dominio/cobertura-rls.spec.ts).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO siac_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO siac_app;

-- 4. Permisos de siac_powerbi_lectura: solo la vista y las columnas que ella lee -----------
GRANT USAGE ON SCHEMA public TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_puntajes" TO siac_powerbi_lectura;
GRANT SELECT ("id", "programaId", "institucionId", "codigoGuia", "estado", "periodo",
              "puntajeActual", "totalCondicionesActual", "updatedAt")
  ON "Evidencia" TO siac_powerbi_lectura;
GRANT SELECT ("id", "codigo", "nombre", "facultad", "nivel", "fechaResolucion", "activo")
  ON "Programa" TO siac_powerbi_lectura;
GRANT SELECT ("id", "nombre", "fechaResolucion") ON "Institucion" TO siac_powerbi_lectura;
GRANT SELECT ("id", "aniosVigencia", "mesesAvisoVigencia", "mesesRojoVigencia")
  ON "ConfiguracionSIAC" TO siac_powerbi_lectura;
GRANT SELECT ("evidenciaId", "numeroRevision", "cumple")
  ON "EvaluacionCondicionEvidencia" TO siac_powerbi_lectura;
GRANT SELECT ("evidenciaId", "numeroRevision", "cumple")
  ON "EvaluacionCondicionInstitucionalEvidencia" TO siac_powerbi_lectura;

-- 5. Supabase: sin acceso de anon/authenticated (Data API). En PostgreSQL local o de CI esos
-- roles no existen y el bloque no hace nada.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END
$$;

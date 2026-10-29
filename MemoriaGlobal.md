# Memoria Global — SIAC

> **Instrucción para agentes de IA:** Leer este archivo **completo** antes de modificar Backend, Frontend o Documentos. Tras cada sesión significativa, actualizar **Estado actual**, **Tareas** y **Registro de cambios**.

| Campo | Valor |
|-------|-------|
| **Última actualización** | 2026-10-29 |
| **Versión frontend** | `0.1.0` (`Frontend/package.json`) |
| **Versión backend** | `0.1.0` (`Backend/package.json`) |
| **Supabase** | Proyecto `Simulacion_siac` · ref `olknaoacxwenqlawxysx` · región `ca-central-1` |
| **Ruta local** | `D:\Proyectos\Simulacion_SIAC` |
| **Institución** | Corporación Universitaria Autónoma del Cauca (CUAC) — Planeación / SIAC |
| **Marco normativo** | Decreto 1330 de 2021 (6 CI + 9 CP) |
| **Fase actual** | Sprint 3 en curso (HU-006 y HU-007 implementadas en repo; ClickUp es la fuente de verdad) |
| **Convención API** | F-03 en español — prefijo `/api/v1/` |

---

## 1. Qué es SIAC

**SIAC** (Sistema Interno de Aseguramiento de la Calidad) centraliza indicadores, procesos y evidencias institucionales para el proceso de acreditación. Arquitectura: monolito NestJS + Next.js separados por API REST (ADR-001).

**Flujo central:**

```text
Cargador descarga plantilla → sube evidencia (Borrador)
  → envía a revisión (EnRevision)
  → Revisor dictamina (Validado / Rechazado)
  → Administrador consulta validadas
  → Vigencias y semáforos alimentan panel administrativo
```

---

## 2. Estructura del repositorio

```text
SIAC/                             ← repo oficial DeibyRamirez/SIAC
├── MemoriaGlobal.md              ← Este archivo (fuente transversal)
├── Backend/                      ← NestJS 10 + Prisma + Supabase
│   ├── src/                      ← auth, documentos, programas, usuarios…
│   └── prisma/schema.prisma      ← Modelo F-03
├── Frontend/                     ← Next.js 16 App Router (app/, components/, lib/)
│   └── MEMORIA_PROYECTO.md       ← Memoria detallada frontend
├── Documentos/                   ← F-00..F-03, APIs, normativa
├── docs/
│   ├── etapa-0/                  ← Inception
│   ├── etapa-1/                  ← Fundación Supabase (Sprint 1)
│   └── etapa-2..4/               ← Sprints siguientes (estado oficial en ClickUp)
└── .agents/skills/               ← Skills IA del proyecto
```

---

## 3. Backend/

### Stack

| Componente | Tecnología |
|------------|------------|
| Framework | NestJS 10, TypeScript |
| ORM | Prisma 6 → Supabase PostgreSQL |
| Auth | JWT + Passport, dominio `@uniautonoma.edu.co` |
| Storage | Por defecto en dev: disco `Backend/almacen-local` (`S3_USAR_ALMACEN_LOCAL=true`); producción opcional Supabase S3 |
| Docs API | OpenAPI 3 en `docs/contrato-api/openapi.json`. Swagger UI en `/api/docs` solo si `NODE_ENV` no es `production` |
| Cron | `@nestjs/schedule` — vigencias 06:00 America/Bogota |

### Módulos implementados

| Módulo | Ruta base | Responsabilidad |
|--------|-----------|-----------------|
| Auth | `/auth` | Login JWT, perfil, Google stub |
| Usuarios | `/usuarios` | HU-011 roles |
| Documentos | `/evidencias` | CRUD, enviar-revisión, dictamen, historial |
| Plantillas | `/plantillas` | Biblioteca versionada |
| Programas | `/programas` | Panel semáforo |
| Búsqueda | `/busqueda` | Filtros URL + full-text |
| Aprobacion | `/aprobacion` | Alias deprecado |
| Vigencias | `/vigencias` | Anexos + cron |
| Notificaciones | `/notificaciones` | AlertaInApp |
| Acreditacion | `/acreditacion` | Checklist normativo |
| Integracion | `/integracion` | UPSERT maestros TI |
| Ingesta | `/evidencias/parsear-excel` | Carga masiva Excel |
| Metricas | `/metricas` | Embed token Power BI |
| Power BI | `/powerbi`, `/powerbi/embed-token` | URLs públicas (CRUD) y embed por categoría |
| Estructura | `/estructura` | CRUD etapas/carpetas/docs |
| Almacenamiento | (servicio) | Supabase S3 |

### Modelo de datos (Prisma)

12 entidades según F-03 §2.2: `Usuario`, `Programa`, `UsuarioPrograma`, `Evidencia`, `HistorialEvidencia`, `Plantilla`, `AnexoVigencia`, `AlertaInApp`, `EtapaAcreditacion`, `CarpetaNormativa`, `DocumentoRequerido`.

**Enums clave:** `RolUsuario` (`Cargador`, `Revisor`, `Administrador`, `SuperAdmin`; `ParAcademico` eliminado el 20/10/2026), `EstadoEvidencia`, `EstadoVigencia`, `OrigenDato`.

**Campos maestros TI:** `idExterno`, `origenDato`, `fechaSincronizacion` en Usuario y Programa.

### Catálogo externo vs dominio SIAC (ADR-005)

La API de carreras CUAC (`POST /integracion/sincronizar-carreras`) es **solo lectura de catálogo**: nombre, facultad, modalidad, duración y `activo`. SIAC **no consulta esa API en cada pantalla**; sincroniza a la tabla `Programa` y opera el resto del flujo en Supabase.

| Capa | Fuente | Qué almacena |
|------|--------|--------------|
| API externa | `backend-lac-theta-94.vercel.app/carreras` | Catálogo académico (solo lectura) |
| Supabase `Programa` | Sync + admin | Catálogo + `tipoTramiteActivo`, semáforos, avance, vigencia |
| Supabase resto | Cargador / Revisor / Admin | `Evidencia` G1–G4, `UsuarioPrograma`, `AnexoVigencia` |

**Reglas de sync:** en *update* solo se tocan campos de catálogo; no se sobrescriben `porcentajeAvance`, `semaforo`, `tipoTramiteActivo` ni `fechaResolucion`. Carreras que desaparecen del catálogo externo se marcan `activo: false` (no se borran filas ni evidencias). El admin configura `tipoTramiteActivo` (RC nuevo = G1; renovación = G1+G2) en el detalle de cada programa.

### ADRs aplicadas

| ADR | Decisión |
|-----|----------|
| ADR-001 | Monolito NestJS + Next.js |
| ADR-002 | Supabase PG + Storage (dev); MinIO prod futuro |
| ADR-003 | JWT MVP; OAuth Google stub |
| ADR-004 | `periodo` como String; factor/indicador retirados (T-REF-001), clasificación por `codigoGuia` G1–G4 |
| ADR-005 | Copia local maestros + adapter integracion |
| ADR-006 | Alertas in-app obligatorias; correo espejo del mensaje |
| ADR-008 | Correo Resend (dev) + SMTP (prod); módulo `correo/` con DIP |
| ADR-009 | Power BI «Publicar en la web» (`POWERBI_MODO=publico`); App Owns Data (`embebido`) bloqueado hasta credenciales Azure. **Informes públicos sin autenticación** |
| ADR-007 | Pruebas: Jest + supertest (backend) y Vitest + RTL (frontend); `docs/adr/ADR-007-pilas-de-pruebas.md` |

### Brechas backend pendientes

| ID | Brecha | Prioridad |
|----|--------|-----------|
| B-B1 | OAuth Google real | P2 |
| B-B2 | API TI institucional conectada | P1 |
| ~~B-B3~~ | ~~Buckets Supabase~~ — cancelado (almacen local / servidor univ.) | — |
| ~~B-B4~~ | ~~Semilla remota Supabase~~ — cancelado; `prisma:seed` en Postgres local | — |
| B-B5 | Tests E2E / CI backend | P2 |

---

## 4. Frontend/

### Stack

Next.js 16, React 19, Tailwind 4, shadcn, Recharts, TanStack Table.

### Roles y rutas

| Rol | Base | Vistas |
|-----|------|--------|
| Cargador | `/cargador` | evidencias, detalle rechazos, plantillas, carga |
| Revisor | `/revisor` | bandeja, dictamen con visor PDF |
| Administrador | `/administrador` | 8+ vistas (programas, vigencias, estructura…) |
| SuperAdmin | `/superadmin` | gestión usuarios + acceso a todos los módulos |

### Integración API

- Cliente: `Frontend/lib/servicios/cliente-api.ts`
- Base: `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`
- El flujo por programa (listado, alta de evidencias, bandeja del revisor) ya no cae a datos de prueba si la API falla. **Plantillas y evidencias** no usan semilla (solo usuarios en `prisma/semilla.ts`). Panel HU-010 consume `GET /programas/panel`.

### Brechas frontend pendientes

| ID | Brecha | Prioridad |
|----|--------|-----------|
| B-F1 | Conectar todas las vistas a API real (no mock) | P1 |
| B-F2 | Rol Par Académico — vistas dedicadas | P2 |
| B-F3 | Middleware server-side auth | P1 |
| B-F4 | Descarga via URL firmada en UI | ~~P1~~ resuelto en revisor/cargador |

> Detalle completo: [Frontend/MEMORIA_PROYECTO.md](Frontend/MEMORIA_PROYECTO.md)

---

## 5. Documentos/

| Archivo | Contenido |
|---------|-----------|
| [F-00_Acta_de_constitucion.docx.pdf](Documentos/F-00_Acta_de_constitucion.docx.pdf) | Acta de constitución |
| [F-01_Propuesta_tecnica_preliminar.docx.pdf](Documentos/F-01_Propuesta_tecnica_preliminar.docx.pdf) | Propuesta técnica |
| [F-02_Especificacion_de_requisitos.docx-1.pdf](Documentos/F-02_Especificacion_de_requisitos.docx-1.pdf) | Requisitos funcionales |
| [F-03_Arquitectura_y_diseno.docx.pdf](Documentos/F-03_Arquitectura_y_diseno.docx.pdf) | Arquitectura, modelo datos, API, ADRs |
| [Diseno_APIs_SIAC.docx.pdf](Documentos/Diseno_APIs_SIAC.docx.pdf) | Catálogo APIs backend |
| [estructura_decreto_etapas_documentos.md](Documentos/estructura_decreto_etapas_documentos.md) | Decreto 1330 — CI/CP |
| [Información del Proyecto.md](Documentos/Información%20del%20Proyecto.md) | Resumen ejecutivo |
| [PROTOTIPO-SIAC.md](Documentos/PROTOTIPO-SIAC.md) | Notas reunión stakeholders |

---

## 6. Despliegue desarrollo (sin Docker)

```mermaid
flowchart LR
    Browser[Navegador] --> Vercel[Vercel_NextJS]
    Vercel --> NestJS[NestJS_local_o_Vercel]
    NestJS --> SupaPG[(Supabase_PG)]
    NestJS --> SupaS3[Supabase_Storage]
```

| Servicio | Entorno dev |
|----------|-------------|
| Frontend | `localhost:3000` o Vercel |
| Backend | `localhost:3001/api/v1` |
| PostgreSQL | Supabase `Simulacion_siac` |
| Storage | Buckets `evidencias`, `plantillas`, `documentos` |

### Variables de entorno requeridas

**Backend (`Backend/.env`):**

```env
DATABASE_URL="postgresql://postgres.olknaoacxwenqlawxysx:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Session pooler (puerto 5432) — usar si db.xxx.supabase.co no resuelve DNS (P1001)
DIRECT_URL="postgresql://postgres.olknaoacxwenqlawxysx:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:5432/postgres"
S3_USAR_ALMACEN_LOCAL="false"
# Endpoint S3 confirmado en proyecto Simulacion_siac:
S3_ENDPOINT="https://olknaoacxwenqlawxysx.storage.supabase.co/storage/v1/s3"
S3_REGION="ca-central-1"
S3_BUCKET="evidencias"
S3_BUCKET_PLANTILLAS="plantillas"
S3_BUCKET_DOCUMENTOS="documentos"
S3_ACCESS_KEY="[S3_ACCESS_KEY]"
S3_SECRET_KEY="[S3_SECRET_KEY]"
PUERTO=3001
CORS_ORIGEN="http://localhost:3000"
```

**Frontend (`Frontend/.env.local`):**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## 7. Errores conocidos — Supabase, Prisma y Storage

> **Instrucción para agentes:** Consultar esta sección ante error 500 en cargas, fallos de `prisma:deploy`/`prisma:seed` o bandeja Revisor vacía.

### 7.1 Error 500 al subir documento pero el archivo SÍ aparece en Storage

**Síntoma:** Toast o respuesta `Error interno del servidor` (500), pero el PDF está en Supabase Storage.

**Causa:** El backend sube a S3 **antes** de completar PostgreSQL. Si falla un paso posterior (tabla/columna inexistente), el archivo queda huérfano en Storage.

Orden en evidencias (`documentos.service.ts`):

1. Crear fila `Evidencia`
2. `subirArchivo` → Supabase Storage ✅
3. Actualizar `rutaArchivo`, `version`
4. `registrarVersion` → tabla `EvidenciaVersion` ❌ si no existe
5. Respuesta 500 al cliente

**Solución:** Aplicar migraciones pendientes (§ 7.4). Verificar tablas `EvidenciaVersion` y columnas de `AnexoVigencia`.

---

### 7.2 Prisma P1001 — Can't reach database server

**Síntoma:**

```text
Error: P1001: Can't reach database server at `db.olknaoacxwenqlawxysx.supabase.co:5432`
```

**Causa:** `DIRECT_URL` apunta al host directo `db.xxx.supabase.co`, que en algunas redes **no resuelve DNS** (`Test-NetConnection` → `Name resolution failed`).

**Solución:**

1. Supabase Dashboard → Project Settings → Database → **Connection string → Session mode**
2. Copiar URI y usarla como `DIRECT_URL` (pooler `:5432`, no `db.xxx`):

```env
DIRECT_URL="postgresql://postgres.olknaoacxwenqlawxysx:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:5432/postgres"
```

3. `DATABASE_URL` sigue en puerto **6543** con `?pgbouncer=true`
4. Verificar proyecto no esté **Paused** en Supabase Dashboard

---

### 7.3 Prisma P3005 — database schema is not empty (baseline)

**Síntoma:**

```text
Error: P3005: The database schema is not empty.
```

**Causa:** La BD ya tiene tablas (semilla, SQL manual o `db push`), pero no existe historial en `_prisma_migrations`. Prisma no aplica migraciones sin baseline.

**Solución:** Marcar migraciones ya reflejadas en la BD como aplicadas (no re-ejecuta SQL):

```powershell
cd Backend
pnpm exec prisma migrate resolve --applied 20260908180000_inicial
pnpm exec prisma migrate resolve --applied 20260915180000_alinear_f03
pnpm exec prisma migrate resolve --applied 20260915210000_superadmin_enum
pnpm exec prisma migrate resolve --applied 20260916180000_evidencia_version_historial
pnpm exec prisma migrate resolve --applied 20260916220000_evidencia_version
pnpm prisma:deploy
```

**Importante:** `migrate resolve --applied` **no ejecuta SQL**. Si se marca una migración como aplicada sin crear las tablas, `deploy` dirá "No pending migrations" pero `seed` fallará con P2021 (`EvidenciaVersion` no existe).

**Reparación recomendada (proyecto SIAC):**

```powershell
cd Backend
pnpm prisma:deploy          # Única vía de esquema: aplica las migraciones pendientes
pnpm prisma:verify          # Comprueba esquema antes del seed (solo lectura)
pnpm prisma:seed
pnpm prisma:backfill-versiones   # v1 para evidencias legacy
```

Verificar manualmente:

```sql
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'EvidenciaVersion');
SELECT column_name FROM information_schema.columns WHERE table_name = 'Evidencia' AND column_name = 'version';
```

El antiguo `prisma:repair-schema` se retiró (S3-CIERRE): alteraba el esquema fuera de migraciones. Si falta un objeto, aplique la migración correspondiente de `Backend/prisma/migrations/` con `pnpm prisma:deploy`; nunca vía SQL manual ni `db push`.

---

### 7.4 Prisma P2021 / P2022 — tabla o columna no existe

**Síntoma (seed o API):**

```text
The table `public.EvidenciaVersion` does not exist in the current database.
-- o --
Invalid `prisma...`: column `Evidencia.version` does not exist
```

**Causa:** Migraciones `20260916180000_evidencia_version_historial` y/o `20260916220000_evidencia_version` no aplicadas.

**Solución A — SQL Editor (si `prisma:deploy` falla):** Ejecutar contenido de:

- `Backend/prisma/migrations/20260916220000_evidencia_version/migration.sql`
- `Backend/prisma/migrations/20260916180000_evidencia_version_historial/migration.sql`

Luego baseline (§ 7.3) y `pnpm prisma:seed`.

**Solución B — Deploy normal:** Tras arreglar `DIRECT_URL` (§ 7.2) y baseline (§ 7.3):

```powershell
pnpm prisma:deploy
pnpm prisma:seed
```

---

### 7.5 Bandeja Revisor vacía (sin datos semilla)

**Síntoma:** Revisor ve "No hay evidencias pendientes" aunque antes había datos demo.

**Causas:**

1. Bandeja usa `GET /aprobacion/pendientes` (solo `estado = EnRevision`), no el store local
2. Semilla backend antigua solo tenía Borrador + Validado, **cero EnRevision**
3. Semilla frontend (`evidenciasSemilla`) no se consumía si la API respondía vacía

**Solución implementada:**

- Semilla backend: evidencias `ev-seed-003`..`005` en `EnRevision`
- Frontend: fallback a store local si API vacía o falla (`revisor/bandeja/page.tsx`)
- Tras migraciones + seed: API devuelve pendientes reales

---

### 7.6 Endpoint S3 Supabase (proyecto Simulacion_siac)

**Correcto (confirmado en producción dev):**

```env
S3_ENDPOINT="https://olknaoacxwenqlawxysx.storage.supabase.co/storage/v1/s3"
```

Formato alternativo (`https://[ref].supabase.co/storage/v1/s3`) puede variar; si Storage sube archivos, el endpoint actual es válido.

**Buckets requeridos:** `evidencias`, `plantillas`, `documentos` (este último para panel Vigencias).

---

### 7.7 Diagnóstico rápido (checklist)

| Paso | Comando / acción |
|------|------------------|
| 1 | Supabase Dashboard: proyecto **Active** (no Paused) |
| 2 | `Test-NetConnection aws-0-ca-central-1.pooler.supabase.com -Port 5432` |
| 3 | `pnpm prisma:deploy` + `pnpm prisma:verify` (o baseline § 7.3) |
| 4 | `pnpm prisma:seed` + `pnpm prisma:backfill-versiones` |
| 5 | Reiniciar backend; reproducir carga; leer log consola (filtro HTTP loguea stack en 500) |
| 6 | `GET /integracion/estado-storage` — diagnóstico buckets S3 |

---

## 8. Estado actual (2026-10-10)

El estado oficial de los sprints vive en ClickUp. En el repositorio: Sprint 1 entregado; **Sprint 2 / Etapa 2 cerrada** (criterios en `docs/etapa-2/README.md`); **Sprint 3 / Etapa 3 en curso** (HU-006, HU-007, HU-009). Verificación local CI-equivalente: 10/10/2026 — Jest 187 tests, E2E 34 tests (CP-E2E-01..05), Vitest 51 tests, builds OK. **12/10/2026 — S3-01 (HU-009):** modelo de cifras institucionales (`VariableCifra`, `CargaCifras`, `CifraIndicador`), ingesta API con `x-api-key` e importación Excel; Jest 204 tests, build backend y `tsc` frontend OK. **S3-02:** frontend de cifras (panel por categoría, importación Excel, diccionario de variables, página `/administrador/cifras`); Vitest 62 tests, `tsc` 0 y `next build` OK. **S3-03:** registros por categoría según `docs/plantillas-siac.xlsx` (6 modelos + esquemas tipados, reemplazo por periodo/sede, plantilla/JSON, feed Power BI); import real 15804/1351/1338/80/71/12 con 0 errores, Jest 228, Vitest 63 y builds OK. **16/10/2026 — S3-HU006 (cierre HU-006):** máquina de estados, observación obligatoria por condición, notificación al Cargador con correo escapado, una sola petición de dictamen, CP-E2E-04 reescrito y E2E nuevo G2/G4; Jest 305 y Vitest 102, builds OK (E2E pendientes de CI: sin BD de pruebas local). **16/10/2026 — S3-HU007 (cierre HU-007):** umbrales PO (aviso 24 / rojo 18) con `Vencido` distinto de `Rojo` y relectura sin redeploy; opción B del semáforo general (30 casos); outbox `NotificacionSalida` + `AlertaInApp.claveEvento` con procesador de reintentos y bitácora `GET /notificaciones/salida`; cron 6:00 America/Bogota idempotente (D-1 + transiciones de vigencia); plantillas de correo puras con snapshots; demo acelerada 300 s con `GET /programas/:id/vigencia` y polling 5 s; Jest 42 suites / 372 tests, Vitest 24 / 107, `tsc`, `next build` y `pnpm build` OK (E2E no ejecutados: sin BD de pruebas; migración `20261016120000` creada y pendiente de `prisma migrate deploy`). **16/10/2026 — S3-CIERRE (HU-007 + limpieza de datos):** umbrales editables vía `GET/PATCH /api/v1/configuracion/vigencia` (SuperAdmin/Administrador; DTO 1..84, aviso > rojo, Swagger) con tarjeta «Umbrales del semáforo» en `/administrador/vigencias`; E2E nuevos `umbrales-vigencia` y `alertas-vigencia` (CA3 con referencias inyectadas, outbox `Enviado`/`Fallido` y bitácora); `EvidenciaComentario` pasó de SQL crudo a Prisma tipado; retirados `prisma/aplicar-esquema-versionado.ts` y `prisma:repair-schema`; migración `20261016120000` ya aplicada; Jest 48 suites / 413, Vitest 29 / 129, `tsc`, `next build` y `pnpm build` OK (E2E se validan en CI).

- [x] `Programa.facultad` y `Programa.slug` únicos (migración segura; slug generado del nombre)
- [x] `UsuarioPrograma` único por `(usuarioId, programaId)` con deduplicación previa
- [x] `GuardAlcancePrograma` relee la asignación en cada petición (el JWT no lleva programas)
- [x] Cargador carga solo en programas asignados; Revisor ve y dictamina solo los suyos
- [x] Administrador no dictamina y no puede asignar el rol SuperAdmin
- [x] Visibilidad de listados, detalle y búsqueda según RN-001 ajustada
- [x] `GET /programas` deja de escribir semáforo y porcentaje; conteos por estado en `GET /programas/:id`
- [x] `PATCH /programas/:id` y `PATCH /programas/:id/estado`; pantalla de asignación en `/administrador/usuarios`
- [x] Inicio y bandeja del revisor filtrados por programas asignados, sin respaldo a semilla
- [x] T-010.1 `GET /programas/panel` con avance ponderado, doble semáforo e institución singleton (G3/G4)
- [x] T-010.2 dominio `panel-siac.ts` con pesos renovación programa **50/50** (G1/G2), institución 85/15 (G3/G4) y umbrales en `ConfiguracionSIAC`; tests unitarios
- [x] Avance institucional admin: `GET /programas/avance-institucional` (promedio igualitario de programas activos); ciclo manual `POST /programas/:id/iniciar-ciclo-renovacion` + `Programa.inicioCicloTramiteAt`
- [x] Sync carreras CUAC → `Programa` (`idExterno`, `origenDato: API`); bajas del catálogo → `activo: false`
- [x] Admin configura `tipoTramiteActivo` por programa en detalle (`PATCH /programas/:id`)
- [x] Biblioteca de plantillas unificada (sin accesos Renovación/Nuevos)
- [ ] Columnas `semaforo` y `porcentajeAvance` en BD (legacy; ya no se persisten al dictaminar)
- [x] ~~INF-02 Baseline Supabase remoto~~ — cancelado; flujo local `docker compose` + `pnpm prisma:deploy`
- [x] ~~INF-01/03 buckets y semilla remota~~ — almacen local + semilla solo usuarios

### Estado anterior (2026-09-17)

- [x] Schema Prisma alineado F-03 con `ParAcademico`, `SuperAdmin`, `OrigenDato`, campos TI
- [x] Migración aplicada en Supabase (BD vacía → 12 tablas)
- [x] API versionada `/api/v1` + Swagger `/api/docs`
- [x] Módulos: integracion, ingesta, acreditacion, metricas
- [x] URLs firmadas Supabase Storage en descargas
- [x] Docs etapa-0 y etapa-1 reescritas
- [x] Frontend cliente actualizado a `/api/v1`
- [x] Subida evidencias vía FormData → Supabase Storage (`crearEvidenciaApi`)
- [x] Visor PDF inline en revisor y cargador (URL firmada)
- [x] Flujo cargador rechazado: `/cargador/evidencias/[id]` + reenvío a revisión
- [x] Sidebar colapsable desktop con persistencia `localStorage`
- [x] Rol SuperAdmin: CRUD usuarios, bypass guards, rutas `/superadmin`
- [x] Endpoint diagnóstico `GET /integracion/estado-storage`
- [x] Campo `version` en Evidencia + `PATCH /evidencias/:id/archivo` (versionado cargador)
- [x] Admin sin carga de evidencias; visor en `/administrador/evidencias/[id]`
- [x] Diálogos de confirmación en acciones críticas (eliminar, aprobar, rechazar, reenviar)
- [x] Badge novedades cargador en sidebar y listado
- [x] Pantalla carga sesión mejorada (`PantallaCargandoSiac`)
- [x] Búsqueda global Ctrl+K con API `/busqueda` (nombreArchivo, formato pdf/xlsx)
- [x] Cards con imagen: dashboard, `informesPowerBiSemilla` (8 categorías), programas 9:16
- [x] Modelo `EvidenciaVersion` + columnas `AnexoVigencia` (migración `20260916180000`)
- [x] Filtro HTTP con mensajes legibles Prisma/S3 + log stack en 500
- [x] Bandeja Revisor: API + fallback semilla; semilla backend con `EnRevision`
- [x] ~~INF-02 Baseline Supabase remoto~~ — cancelado; flujo local `docker compose` + `pnpm prisma:deploy`
- [x] ~~INF-01/03 buckets y semilla remota~~ — almacen local + semilla solo usuarios

---

## 9. Tareas backlog

### P0 — Inmediato

| ✓ | Tarea | Ámbito |
|---|-------|--------|
| [x] | Schema + migración Supabase | Backend |
| [x] | API v1 + endpoints F-03 | Backend |
| [x] | MemoriaGlobal + docs etapa 0-1 | Docs |
| [x] | ~~INF-01 buckets Supabase~~ — cancelado (disco local) | — |
| [x] | `.env` local + `prisma:seed` usuarios | Backend |

### P1 — Sprint 2 (completada en repo, 09/10/2026)

| ✓ | Tarea | Ámbito |
|---|-------|--------|
| [x] | T-DOC.1 — docs sin sprints 2–4 «Completada»; repo `DeibyRamirez/SIAC` | Docs |
| [x] | T-011.1 — facultad, slug, vínculo único | Backend |
| [x] | T-011.2 — alcance por programa, API y pantalla de asignación | Backend + Frontend |
| [x] | T-011.3 — editar/desactivar programa; conteos; GET sin escritura | Backend + Frontend |
| [x] | T-002.1 — inicio y bandeja del revisor por programas asignados | Frontend |
| [x] | HU-003, HU-004, HU-005 — núcleo documental | Backend + Frontend |
| [x] | HU-010 panel programas/institución (`GET /programas/panel`) | Backend + Frontend |
| [x] | HU-008 búsqueda, filtros URL, export CSV, columna «Nivel» | Frontend |
| [x] | Semáforos UI: etiquetas de negocio + color (`etiquetas-semaforo.ts`) | Frontend |
| [x] | Frontend 100% API real (paneles, búsqueda, plantillas y evidencias sin semilla) | Frontend |
| [ ] | Integración CSV maestros TI | Backend |
| [ ] | Pruebas con stakeholders CUAC | Todos |

### P2 — Futuro

| ✓ | Tarea | Ámbito |
|---|-------|--------|
| [ ] | OAuth Google | Backend |
| [ ] | Docker + MinIO producción CUAC | DevOps |
| [ ] | Deploy Vercel preview | DevOps |

---

## 10. Registro de cambios

### 2026-10-29 — Contrato OpenAPI de la API

- [Docs] `docs/contrato-api/openapi.json` y `docs/contrato-api/README.md`: los endpoints existentes, roles, errores, paginación y el contrato de lectura Power BI (`v_powerbi_puntajes`, rol `siac_powerbi_lectura`, seis dominios).
- [Backend] Decoradores de Swagger en controladores y DTOs. La interfaz `/api/docs` no se monta cuando `NODE_ENV=production`. La prueba `contrato-openapi.spec.ts` compara el documento generado con el archivo exportado.
- [Sin cambio de comportamiento] Ningún endpoint cambió de ruta, validación ni código de estado.

### 2026-10-21 — Row Level Security (plan-rls aprobado por el PO)

- [BD] Migración `20261021000000_rls_roles_funciones`:
  - crea de forma idempotente los roles `siac_app` y `siac_powerbi_lectura`, NOLOGIN, NOBYPASSRLS y sin contraseña;
  - agrega el esquema `siac` con las funciones de contexto y visibilidad (SECURITY DEFINER donde hace falta) y las búsquedas de login y sesión;
  - otorga los permisos;
  - revoca `anon`/`authenticated` solo si existen.
- [BD] Migración `20261021000100_rls_politicas`: ENABLE + FORCE RLS en las 22 tablas y 88 políticas por rol, programa, institución y Borrador del autor. Power BI queda limitado a `v_powerbi_puntajes`.
- [Backend] La extensión de Prisma fija `app.usuario_id` y `app.rol` con `set_config(..., true)` en cada transacción, compatible con pgbouncer. `MiddlewareContextoRls` abre el contexto por petición.
- [Backend] `ejecutarComoSistema` (`src/prisma/contexto-sistema.ts`, único punto que fija `sistema`) cubre el cron de vigencias, el outbox, la configuración, los agregados de avance y los destinatarios de notificaciones.
- [Backend] El login rechaza a los usuarios inactivos.
- [Desviaciones del plan] Se agregó `siac.usuario_visible`, que incluye a las personas que aparecen en evidencias visibles. Los porcentajes de avance se calculan por la ruta de sistema. La semilla y los scripts de mantenimiento usan `DIRECT_URL` (dueño). Los usuarios de la semilla y la pantalla de login demo no se tocaron.
- [Pruebas] Nuevos `test/e2e/rls.e2e-spec.ts` (SQL como `siac_app` y `siac_powerbi_lectura`) y `anexo-d1-revisor.e2e-spec.ts`. CI corre la suite e2e con la API como `siac_app`.
- [Despliegue] Pasos manuales en `docs/despliegue.md` §9.

### 2026-10-20 — Correcciones de la auditoría y eliminación del rol Par académico

- [Backend] `GET /plantillas?tipoTramite=` validado contra el enum (400 con mensaje en español).
- [Frontend] `ProveedorAlmacen`: cada lista (evidencias, plantillas, vigencias, alertas, programas) se publica al resolver su petición, con `estadoListas` (cargando/error), un reintento automático y `recargarLista`. Estados «Cargando…», error con «Reintentar» y vacío en plantillas, evidencias y vigencias.
- [Seguridad] Contraseñas de la semilla desde `SEMILLA_CLAVE_*` (obligatorias en producción); fuera del README.
- [Decisión] Rol `ParAcademico` eliminado (T-006.4 descartada). Migración `20261020220000_eliminar_rol_par_academico`: usuarios con el rol → `activo=false` y rol `Cargador`; enum recreado. Las entradas antiguas de esta memoria que lo mencionan son históricas.
- [Docs] README, backlog, ADR-008 (outbox), ADR-009 (8 categorías CUAC), índice de ADR, etapa-3, despliegue (keep-alive irregular) y `docs/todo-sprint3.md` actualizados.

### 2026-10-16 — S3-CIERRE: brechas de HU-007 y limpieza de SQL crudo

- [Backend] T-007.3a: `GET/PATCH /api/v1/configuracion/vigencia` (`ConfiguracionController`, SuperAdmin/Administrador, Swagger). `ActualizarUmbralesVigenciaDto` exige enteros 1..84 y `mesesAvisoVigencia > mesesRojoVigencia` (400 con mensaje claro); `ConfiguracionSiacService.cargar()` relee la BD, así el siguiente cálculo del semáforo aplica el cambio sin redeploy. No existe módulo de auditoría en el repo: no se registró auditoría adicional.
- [Backend] `EvidenciaComentario` dejó de usar SQL crudo (`$executeRawUnsafe`/`$queryRawUnsafe`) en `evidencia.repositorio.ts`: `deleteMany` + `createMany` en `$transaction` y `findMany` tipado con el mismo contrato y orden. Retirados `prisma/aplicar-esquema-versionado.ts` y el script `prisma:repair-schema`; `prisma:setup` ahora encadena `prisma:deploy`. `prisma/verificar-esquema.ts` queda como verificación de solo lectura. Todo lo que aplicaba repair-schema ya existe en migraciones (EvidenciaVersion, Evidencia.version, columnas de AnexoVigencia, EvidenciaComentario, enums); el remapeo de estados legacy y el catálogo mínimo de programas eran datos operativos (el catálogo se crea desde la app/semilla).
- [Backend/E2E] Nuevos `test/e2e/umbrales-vigencia.e2e-spec.ts` (verde→amarillo al subir el aviso, 400/403) y `test/e2e/alertas-vigencia.e2e-spec.ts` (CA3 sin sleeps: 3 eventos por destinatario sin duplicados, outbox con transporte en memoria `Enviado`, transporte que falla → `Fallido` con `ultimoError` tras `CORREO_MAX_INTENTOS`, bitácora `GET /notificaciones/salida`). Se ejecutan en CI.
- [Frontend] Tarjeta «Umbrales del semáforo» en `/administrador/vigencias` (solo SuperAdmin/Administrador) con validación espejo del DTO, `ConfiguracionServicio` (`/configuracion/vigencia`) y toast de éxito/error.
- [Tests] Backend: Jest 48 suites / 413 tests (404 + 9 nuevos), `tsc --noEmit` y `pnpm build` OK. Frontend: Vitest 29 archivos / 129 tests (117 + 12 nuevos: tarjeta y campana), `tsc --noEmit` y `next build` OK. `rg '\$queryRaw|\$executeRaw' Backend/src` solo devuelve `salud.service.ts` (`SELECT 1`, justificado) y `fts-evidencias.ts` (`Prisma.sql` parametrizado sobre `searchVector Unsupported("tsvector")`, no expresable con el cliente tipado).
- [Docs] `docs/etapa-3/README.md` (endpoints nuevos, migración outbox aplicada, pruebas del cierre), `docs/sprint-reviews/sprint-3.md` (estado real de HU-006/007/009) y `docs/estandar-base-siac.md` (scripts oficiales sin `prisma:repair-schema`).

### 2026-10-16 - Sprint 3: preparación de despliegue (Supabase + Render + Vercel)

- [Backend] Escucha en `0.0.0.0:$PORT` (Render) con respaldo `PUERTO`; CORS desde `CORS_ORIGENES` (coma), `CORS_ORIGEN` (heredada) y `FRONTEND_URL`; en producción no arranca sin `JWT_SECRETO`/`DATABASE_URL` y advierte de `FRONTEND_URL`, CORS vacío, almacén local y `TZ`.
- [Backend] `GET /api/v1/salud` público (sin guard; la API no tiene guard global) con ping `SELECT 1` y 503 si la BD no responde en 3 s.
- [Backend] `build` = `prisma generate && nest build`; `start:prod` corregido a `node dist/src/main.js`; `start:despliegue` = `prisma migrate deploy` + arranque; `engines.node` 24.x.
- [Backend] Cron de vigencias con `timeZone: 'America/Bogota'`; tick del modo prueba sin solapamiento; bandera explícita `VIGENCIA_MODO_PRUEBA_PERMITIR_PRODUCCION` (solo staging). Outbox con clave única: sigue planificado (C-4), no implementado.
- [Frontend] `urlBackendInterna()` exige `API_URL_INTERNAL` en producción (sin localhost); `apiDisponible()` ya no depende de la URL del servidor.
- [DevOps] `render.yaml` (plan starter, healthCheckPath, variables `sync: false`), `.env.example` completos, `.gitignore` de `.env.*`. Guía: [docs/despliegue.md](docs/despliegue.md).
- [Verificación] 31 migraciones aplican en BD vacía + semilla, sin drift (`migrate diff`).

### 2026-10-16 — S3-HU007: cierre de HU-007 (vigencias y alertas al 100 %)

- [Decisión] Umbrales PO 13/10 en `ConfiguracionSIAC`: `mesesAvisoVigencia=24`, nuevo `mesesRojoVigencia=18`; `calcularSemaforoVigencia` devuelve `Verde|Amarillo|Rojo|Vencido|SinVigencia` (Vencido ≠ Rojo) y `ConfiguracionSiacService.cargar()` relee la BD (sin redeploy). Opción B: `calcularSemaforoGeneral` = peor entre vigencia y avance, Vencido cuenta como Rojo, SinVigencia se ignora, RN-003 fuerza Rojo (30 casos en `panel-siac.spec.ts`).
- [Backend] Outbox C-4: `NotificacionSalida` + `AlertaInApp.claveEvento @unique` (migración `20261016120000_t007_3_umbrales_outbox`, `prisma migrate diff`, aditiva, sin aplicar); despacho transaccional idempotente por claves `vigencia:*`, `anexo_d1:*`, `dictamen:*`; `ProcesadorNotificacionesSalidaService` (cron cada minuto, reclamo `updateMany` condicionado, backoff `base·2^(n-1)`, `Fallido` al máximo); C-8 `GET /notificaciones/salida` paginado para Administrador/SuperAdmin. Plantillas puras en `src/correo/plantillas/` con snapshots; `CORREO_DESTINATARIOS_PERMITIDOS` (dev) + validación de canal al arrancar (`smtp`/`resend`) y `CORREO_CANAL="ninguno"` por defecto.
- [Backend] Cron T-007.2 `@Cron('0 6 * * *', { timeZone: VIGENCIAS_CRON_ZONA ?? 'America/Bogota' })`: D-1 (responsable por correo exacto + Administradores) y transiciones amarillo/rojo/vencido a Administrador/SuperAdmin/Revisor activos, 1 aviso por destinatario, idempotente; anexos con `findMany` filtrado. §0: demo 300 s con escala proporcional a umbrales (214/236/300 s), claves aisladas por sesión, script `pnpm demo:vigencia`, `GET /programas/:id/vigencia`, barra y campana con polling 5 s. `VIGENCIA_MODO_PRUEBA` en producción impide el arranque.
- [Frontend] `vigencia-registro.ts` con 24/18 y `Vencido`; etiquetas («Vencido», «Por vencer») y barra demo 5 min con semáforo del servidor; notificaciones `vigencia_roja`/`anexo_vence_manana`.
- [Tests] Jest 42 suites / 372 tests (CA1 reloj falso, 30 casos opción B, CA2/CA3, snapshots); Vitest 24 / 107; `tsc --noEmit`, `next build` y `pnpm build` OK. E2E no ejecutados en local: `Backend/.env` apunta a la BD compartida y no hay BD de pruebas; quedan para CI tras `prisma migrate deploy`.

### 2026-10-16 — S3-HU006: cierre de HU-006 (G1-G4 «Con observaciones», máquina de estados, notificación CA2)

- [Decisión] CP-E2E-04: la regla de 740c16c es correcta (no se crea una segunda evidencia de la misma guía con una abierta); el E2E se reescribió sobre el flujo real: nueva versión de la evidencia existente (`PATCH /evidencias/:id/archivo`) y borrador nunca enviado en un programa sin evidencias previas.
- [Backend] `dominio/maquina-estados-evidencia.ts` (tabla única + `transicionPermitida`) usada por `enviarRevision`, `dictaminar` y `reemplazarArchivo` (400 si no permitida); T-006.1 observación obligatoria con `cumple=false` en servicio y `DictaminarDto` («La condición X requiere una observación»); retirado el alias `POST /aprobacion/:id/dictaminar`.
- [Backend] Notificación CA2: tipos `dictamen_validado` / `dictamen_cumple` / `dictamen_con_observaciones`, asunto por tipo, enlace `SIAC_URL_FRONTEND` + ruta del cargador, `escaparHtml` para textos del usuario; el fallo de correo no revierte la alerta.
- [Backend] `GET /metricas/token` solo Administrador; `start:prod` → `node dist/src/main.js`; correo en memoria para E2E y E2E nuevo `dictamen-sin-puntaje.e2e-spec.ts` (G2/G4).
- [Frontend] Una sola petición de dictamen (el almacén solo refleja la respuesta); campos de condición marcados si falta observación; límite 20 MB compartido (`lib/constantes/documentos.ts`); filtros y acciones sin «Rechazado» en el flujo G1-G4; etiquetas de notificación nuevas.
- [Tests] Jest 36 suites / 305 tests; Vitest 24 archivos / 102 tests; `tsc`, `next build` y `pnpm build` OK. E2E no ejecutados local (sin BD de pruebas; `Backend/.env` apunta a la BD compartida y Docker no está disponible): pendiente en CI.

### 2026-10-13 — ADR-010 Camino 2 API cifras (replanteo, sin código)

- [Docs] [ADR-010](docs/adr/ADR-010-camino-2-api-cifras-institucionales.md): contrato 8 categorías alineado a `docs/plantillas-siac-general.xlsx`; opción preferida B1 (API valida → Excel maestro Drive → Power BI); endpoints futuros bajo `/api/v1/integracion/cifras-institucionales`.
- [Docs] Guía integradores: `docs/camino-2-api-cifras-institucionales.md`.

### 2026-10-13 — Retirada almacén local de cifras (Camino 1 Power BI)

- [Backend] Migración `20261013230000_eliminar_cifras_institucionales`: eliminados `VariableCifra`, `CargaCifras`, `CifraIndicador`, tablas `Registro*` / `ProgramaAseguramiento` / `SedeInfraestructura` y enum `FuenteCifra`. Se conserva `ConfiguracionInformePowerBi`.
- [Backend] Eliminado módulo `src/cifras` y `CIFRAS_API_KEY`.
- [Frontend] Eliminados panel Recharts, `/administrador/cifras` y cliente `/cifras/*`; dashboard de métricas solo iframe + mensajes si falta URL o falla la carga.
- [Docs] ADR-009 actualizado; `docs/powerbi-conexion-cifras.md` marcado obsoleto. Datos de informes: Excel externo → Power BI; contrato de campos en `docs/plantillas-siac-general.xlsx`.

### 2026-10-13 — HU-009 (T-009.3): 6 dashboards Power BI «Publicar en la web»

- [Frontend] Catálogo tipado `lib/informes-powerbi.ts` con 6 categorías (aseguramiento, infraestructura, egresados, investigación, profesores, estudiantes) y su variable `NEXT_PUBLIC_POWERBI_URL_*` (lectura estática en `lib/powerbi/configuracion-powerbi.ts`; solo se aceptan URL `https://app.powerbi.com/view?r=`).
- [Frontend] Iframe accesible (`loading="lazy"`, `allowFullScreen`, responsive); «Informe aún no publicado», respaldo Recharts (Estudiantes) y «Reintentar» si falla o tarda.
- [Frontend] Pestaña Power BI solo para Administrador y SuperAdmin (`lib/powerbi/acceso-powerbi.ts`); `POWERBI_MODO=publico|embebido` (embebido conserva la ruta simulada).
- [Frontend] `next.config.mjs`: CSP solo con `frame-src 'self' https://app.powerbi.com`.
- [Docs] ADR-009 (Publicar en la web vs App Owns Data, advertencia de exposición pública).

### 2026-10-12 — Fix S3-03: filtros del panel de cifras (periodo, facultad, programa, sede)

- [Backend] Nuevo `GET /cifras/:categoriaId/filtros?periodo=&facultad=`: valores DISTINCT reales de los registros (`periodos` desc, `facultades`, `programas` dependientes de la facultad, `sedes` para infraestructura); devuelve `[]` donde no exista la columna.
- [Backend] `GET /cifras/:categoriaId`: `periodosDisponibles` y `meta.periodo/fuente` se calculan sin aplicar facultad/programa/sede (los filtros solo reducen indicadores); `meta.sinCoincidencias=true` cuando hay datos en el periodo pero el filtro deja 0 (un filtro sin coincidencias ya no cae a semilla). Comparación de facultad/programa/sede normalizada (trim, sin mayúsculas/tildes). Nuevo query `programa` (nombre) manteniendo `programaId` heredado.
- [Frontend] Panel de cifras: los 3 selects (y «Sede» en infraestructura) se pueblan desde `/filtros`; cambiar facultad recarga programas y resetea la selección; los valores de URL inválidos se ignoran y se limpian; estado «No hay datos para los filtros seleccionados» + «Limpiar filtros» (sin importar) vs «Aún no hay cifras cargadas» + Importar.
- [Tests] Jest 30 suites / 237 tests (filtros distinct, facultad inexistente → sinCoincidencias con periodos poblados, programa dependiente de facultad) y Vitest 16 archivos / 68 tests (selects poblados, reset de programa, limpiar filtros); builds OK.

### 2026-10-12 — S3-03 / HU-009: datasets por categoría según docs/plantillas-siac.xlsx

- [Backend] Migración `20261012200000_cifras_registros`: `RegistroEstudiante`, `RegistroProfesor`, `RegistroEgresado`, `RegistroSemillero`, `ProgramaAseguramiento`, `SedeInfraestructura` (+ carga y timestamps, índices por periodo/facultad/programa). Aplicada con `migrate deploy`.
- [Backend] Catálogo tipado `src/cifras/esquemas/*` (6 categorías, encabezados reales con alias `falcultad` y `cantidad estudianes`, enums reales de grado, banderas excluyentes, fechas, monto m2) que genera validación, plantillas, ejemplo JSON, Swagger y diccionario. `valor_dimension` queda deprecada (se ignora).
- [Backend] Importación estricta por registros (reemplazo transaccional por periodo; infraestructura por sede; lotes de 1000; máx. 20 MB) y misma validación para ingesta JSON (`GET/POST` mantienen clave/valor solo para bienestar y relaciones-entorno). Errores `Fila N, columna X`.
- [Backend] `GET /cifras/:categoriaId` agrega desde registros (estudiantes 15804 en 2023-2, 9 facultades); `GET /cifras/:categoriaId/plantilla` (hoja de la categoría + instrucciones); `GET /cifras/:categoriaId/plantilla.json`; feed `GET /cifras/:categoriaId/datos` (x-api-key o JWT Admin, máx. 5000, sin nombres). Docs: `docs/powerbi-conexion-cifras.md`.
- [Tests] Fixture reducido en `Backend/test/fixtures/plantillas-siac-reducido.xlsx`; specs de validador, importación/reemplazo, privacidad y feed. Jest 228/228 y Vitest 63/63, `tsc` 0, builds OK.
- [Operación] Verificación con el Excel real completo (15804/1351/1338/80/71/12, filasError=0; reimport sin duplicar; feed sin nombres) y limpieza total de datos de prueba (0 registros restantes).
- [Backend] Ajuste de ortografía de encabezados visibles (`Período académico`, `Género`, `Código del estudiante`, `Código SNIES`, `Acreditado/Acreditable/Registro calificado`, `Área construida total (m²)`, etc.): el texto anterior queda como alias (`falcultad`, `cantidad estudianes`, `total m2 area construida`) para seguir importando archivos viejos; la normalización mapea `²`→`2`. Claves JSON/Prisma sin cambios. `Valor de la dimensión` sale de la plantilla, el ejemplo JSON, instrucciones y diccionario, pero se sigue aceptando e ignorando al importar. Jest 231/231, Vitest 63/63 y builds OK.

### 2026-10-12 — S3-02 / HU-009: importación de cifras y gráficas por categoría (frontend)

- [Frontend] Panel genérico `panel-cifras-categoria.tsx` con filtros periodo/facultad/programa en URL, KPIs, gráficos (línea por dimensión temporal, dona para conteos ≤6, barras), badge de fuente API/Excel/Semilla/Mixta y estado vacío con «Importar Excel» (solo Administrador); `panel-cifras-estudiantes` queda como wrapper.
- [Frontend] `dialogo-importar-cifras.tsx` (plantilla, validación cliente .xlsx ≤5 MB, errores por fila) y `ContenedorInformePowerBi` generalizado: sin embed/400/falla → panel de cifras de la categoría.
- [Frontend] Nueva página `/administrador/cifras` (categorías con última carga + importación; diccionario con PATCH de etiquetas CUAC) y ítem de sidebar.
- [Verificación] Vitest 62/62, `tsc --noEmit` 0 y `next build` OK; sin datos de prueba nuevos en BD (specs con servicios mockeados).

### 2026-10-13 — HU-009 / UX cargador / ayuda / correo

- [Frontend] Catálogo Power BI ampliado a 8 categorías (bienestar, relaciones-entorno); URLs vía API autenticada con fallback `NEXT_PUBLIC_*`; panel de actualización en dashboard admin; cargador con pasos 1–3 visibles y sugerencia de trámite; filtro de programas al 100 % documental en vigencias y carga de evidencias; asistente flotante FAQ (`AsistenteAyudaFlotante`).
- [Backend] `ConfiguracionInformePowerBi` + CRUD `/powerbi/informes`; hash SHA-256; roles Admin/SuperAdmin; plantillas HTML en correos de notificación; script `pnpm demo:semaforo-vigencia` (~5 min).
- [Operación] Aplicar migración `20261013180000_configuracion_informe_powerbi` y `pnpm prisma:generate` en Backend.

### 2026-10-12 — S3-01 / HU-009: cifras institucionales + ingesta API/Excel

- [Backend] Migración `20261012120000_cifras_institucionales`: enum `FuenteCifra` (API|EXCEL|SEMILLA) y modelos `VariableCifra`, `CargaCifras`, `CifraIndicador` (upsert lógico por variable/periodo/facultad/programa/sede/dimension/valorDimension). Aplicada con `prisma migrate deploy` sin perder datos (drift varchar/text preexistente no relacionado; `prisma migrate dev` sigue bloqueado por ese drift).
- [Backend] Seed `prisma/datos/variables-cifras.json`: 35 variables en 8 categorías; `pnpm prisma:seed` las upsertea (etiqueta CUAC editable).
- [Backend] `CifrasPrismaService` proveedor por defecto; `CifrasSemillaService` solo respaldo (fuente SEMILLA) cuando no hay datos.
- [Backend] Endpoints `/api/v1/cifras`: `GET /categorias`, `GET /variables`, `PATCH /variables/:id`, `GET /:categoriaId` (compatible `GET /estudiantes`), `GET /:categoriaId/plantilla` (.xlsx con hojas «datos» y «variables»), `POST /:categoriaId/ingesta` (header `x-api-key` contra `CIFRAS_API_KEY`, comparación timing-safe) y `POST /:categoriaId/importar` (exceljs, máx. 5 MB, errores por fila en español).
- [Backend] Tests: `cifras-importacion.service.spec.ts` (fila válida, clave inexistente, periodo inválido, valor no numérico, upsert reemplaza, parcial, SNIES) y `cifras-api-key.guard.spec.ts`; Jest 204/204.
- [Frontend] `lib/tipos/cifras.ts` alineado (`API|EXCEL|SEMILLA`, `DesgloseCifra`, `VariableCifra`, `periodosDisponibles`); sin cambios de UI.
- [Verificación] Smoke end-to-end: plantilla de profesores + 5 filas → `GET /cifras/profesores?periodo=2025-2` fuente EXCEL y etiquetas CUAC; ingesta sin/con clave inválida 401; estudiantes sin datos → fuente SEMILLA; DOCX/comentarios/checklist cubiertos por suite Jest.
- [Backend] Ajustes pre-commit (12/10): periodo validado con `@Matches(/^\d{4}(-[12])?$/)` en consulta e ingesta (mensaje «El periodo debe tener formato AAAA-S (ej. 2026-1) o AAAA.») y misma regla por fila en Excel; `meta.fuente` = `MIXTA` si el periodo mezcla fuentes y `fuente` por indicador; dimensión validada contra `VariableCifra.dimensiones` (nombre canónico, tolerante a mayúsculas/acentos); specs de DTO/dimensiones/fuente MIXTA (Jest 222/222).
- [Operación] Script puntual `pnpm datos:limpiar-cifras-prueba -- --ejecutar --permitir-bd-remota`: eliminó 6 indicadores y 4 cargas de prueba de `profesores`/`2025-2` (respaldo JSON en `Backend/respaldos/`).

### 2026-10-10 — Cierre verificado Etapa 2 / Sprint 2

- [Docs] Gate CI-equivalente local (Jest, E2E CP-E2E-01..05, Vitest, builds); corrección regex en `vigencias.e2e-spec.ts` (rutas `documentos/{año}/{trámite}/…`).
- [Docs] `MemoriaGlobal` §8 y `sprint-2.md` alineados a Sprint 2 completado; incrementos post-09/10 listados en `docs/etapa-3/README.md`.
- [Operación] Pendiente manual: marcar Sprint 2 en ClickUp.

### 2026-10-10 — Avance institucional y ciclo de renovación por programa

- [Backend] Pesos renovación programa G1/G2 **50/50**; `GET /programas/avance-institucional`; `Programa.inicioCicloTramiteAt` y `POST /programas/:id/iniciar-ciclo-renovacion` (solo ventana de vigencia amarilla/roja).
- [Frontend] Hero y dashboard de métricas usan avance institucional; detalle de programa con botón «Iniciar nuevo ciclo de renovación».

### 2026-10-08 — Almacenamiento local, trámites por programa y roles

- [Backend] Claves S3/local con `{año}/{tipoTramite}/…`; `GET /api/v1/almacen-local/*` (JWT) en modo disco; validación de guía vs `tipoTramiteActivo` al crear evidencia.
- [Backend] `PATCH /usuarios/:id/rol` solo SuperAdmin; asignación de programas limitada a Cargador/Revisor.
- [Frontend] Administrador: solo asignación de programas; cargador nueva evidencia acotada al trámite del programa.

### 2026-10-10 — Asignación proceso institucional (G3/G4)

- [Backend] `Usuario.responsableProcesoInstitucional`; `PUT /usuarios/:id/alcance-institucional`; alcance RN-001: G3/G4 solo para responsables asignados; creación institucional sin `programaId`; `GET /institucion/resumen` para Cargador/Revisor.
- [Frontend] Panel de asignación: badge destacado y checkbox del proceso único; cargador nueva evidencia con alcance Institución solo si tiene el flag.

### 2026-10-09 — Cierre Sprint 2 / Etapa 2 en repositorio

- [Frontend] `lib/utilidades/etiquetas-semaforo.ts`: semáforos con etiquetas de negocio (sin texto Verde/Amarillo/Rojo); componente `Semaforo` con `contexto`; filtros panel y búsqueda con `OpcionFiltroSemaforo`; badge de `estadoProceso` en rejilla de programas (RN-003).
- [Frontend] HU-008: filtros `formato`, fechas de verificación, columna «Nivel» en búsqueda, export CSV de resultados visibles.
- [Docs] `docs/etapa-2/README.md`, `docs/sprint-reviews/sprint-2.md`, `docs/product-backlog.md` y manual de usuario actualizados al cierre del sprint.

### 2026-10-07 — Inicio Etapa 3 / Sprint 3 (HU-009 dashboard Power BI)

- [Backend] `CifrasModule`: `GET /api/v1/cifras/categorias`, `GET /api/v1/cifras/estudiantes` (semilla JSON, contrato escalable `meta` + `indicadores` + `series`); guards Administrador y ParAcademico.
- [Backend] `PowerBiService`: query `categoriaId=estudiantes`, vista publicada por defecto sin Azure; roles embed ampliados a ParAcademico.
- [Frontend] Tab Power BI → categoría Estudiantes: iframe + fallback Recharts vía API (`PanelCifrasEstudiantes`, `ContenedorInformePowerBi`).
- [Docs] Variables env y checklist manual en `docs/etapa-3/README.md`.

### 2026-10-06 — Cierre del Sprint 2 (auditoría) y decisiones del PO

- [Decisión PO] G2 y G4 sin puntaje: el Revisor aprueba (Validado) o deja «Con observaciones» con texto; aportan 0 % hasta aprobarse y el 100 % de su peso (configurable) después. Se elimina el criterio «G2 al 70 %».
- [Decisión PO] Resolución MEN: con todos los documentos del trámite aprobados, el Administrador carga el PDF (única excepción a la regla .docx; MIME + firma %PDF) con número y fecha reales. Fin de vigencia = fecha + 7 años; sin resolución = «Sin vigencia» (gris). Se retira «activar vigencia». Tabla `ResolucionMen` y tipo de evidencia `ResolucionMen` (migración `20261006030000`).
- [Decisión PO] Pruebas: Jest + supertest (backend) y Vitest + RTL (frontend), ambas en la CI (ADR-007).
- [Decisión PO] PR #7 se cierra sin merge; lo útil (propietario único de evidencia, alcance por guía, columna «Programa / institución») va en un PR nuevo desde `develop_v2`.
- [Decisión PO] Par académico en pausa (T-006.4): sin acceso al panel de programas, sin página 403; rol y datos intactos.
- [Decisión PO] AnexoVigencia: script explícito `pnpm datos:limpiar-anexos-sin-documento` (respaldo JSON/CSV, idempotente) borra los anexos sin documento; los nuevos exigen documento, evidencia y categoría (`CategoriaAnexo`, CHECK `NOT VALID`, migración `20261006040000`). RN-003 usa la categoría y el vencimiento del certificado.
- [Backend] Umbrales del semáforo en `ConfiguracionSIAC` (verde 100, amarillo 55, vigencia 7 años, aviso 12 meses; migración `20261006020000`). Avance sin redondeos intermedios; filtro por semáforo antes de paginar.
- [Frontend] Panel de programas como Server Component con filtros en la URL, n/9, fecha de resolución y semestre; sin datos simulados.
- [CI] La CI corre `jest`, `test:e2e` (supertest sobre `postgres:16`) y `pnpm test` (Vitest). E2E del flujo CP-E2E-01 a CP-E2E-05 en `Backend/test/e2e/flujo-carga-panel.e2e-spec.ts`.
- [Docs] T-DOC.1: jerarquía real de ClickUp (workspace `90171502668`, lista `901717352937`), HU-008 y HU-010 en curso, DoD de la Etapa 2 sin marcar hasta el cierre en ClickUp, RN-003 corregida en la Etapa 1 y se elimina el volcado de texto del backend que estaba en la raíz del repositorio.

### 2026-10-09 — Notificaciones in-app + correo (Resend/SMTP)

- [Backend] Módulo `correo/` (DIP): Resend en desarrollo, SMTP en producción (`CORREO_CANAL`, ADR-008). `NotificacionesDespachoService` replica cada alerta in-app por correo.
- [Backend] Eventos: dictamen, envío a revisión (revisores con alcance), cron vigencia D-1, umbrales de avance programa (admin/par). `AlertaInApp.metadata` (JSON).
- [Frontend] `CampanaNotificaciones`: badge (`99+`), acciones por `tipo`/`metadata`/rol (`accion-notificacion.ts`), polling 60s y recarga al abrir campana / tras dictamen.
- [Docs/INF] Cancelados INF-01..03 Supabase remoto; arranque oficial Postgres Docker + almacen local (`docs/etapa-3`).

### 2026-09-30 — Arquitectura catálogo API + dominio SIAC

- [Backend] Migración `20260930140000_corregir_pesos_tramite_guia`: corrige `pesoPorcentaje` en `TramiteDocumentoGuia` (trámites de 2 guías sumaban 200 % por el default de la migración de relleno).
- [Backend] `sincronizarDesdeCarreras`: desactiva programas con `origenDato: API` cuyo `idExterno` ya no viene en el catálogo externo; respuesta incluye `desactivados`.
- [Backend] `PATCH /programas/:id` acepta `tipoTramiteActivo` (`RegistroCalificadoNuevo` | `RenovacionRegistroCalificado`).
- [Frontend] Detalle admin de programa: selector de tipo de trámite SIAC; toast de sync muestra importados, actualizados y desactivados.
- [Memoria] Patrón catálogo externo vs dominio SIAC documentado en §3.

### 2026-09-29 — Arranque sin datos demo (solo usuarios por rol)

- [Backend] `prisma/semilla.ts` crea solo 5 usuarios (Cargador, Revisor, Administrador, ParAcademico, SuperAdmin) con las claves de siempre. Se retiran de la semilla programas, `UsuarioPrograma`, institución, anexos de vigencia, etapa, carpetas y documento requerido. El catálogo `TramiteSIAC`/`TramiteDocumentoGuia` y la institución CUAC los siguen insertando las migraciones `20260929010000` y `20260928120000`. Ningún servicio depende de ids `*-seed-*`.
- [Frontend] Programas, evidencias, plantillas, vigencias y alertas vienen solo de la API (el almacén ya no rehidrata esos datos desde `sessionStorage` ni crea evidencias/plantillas locales sin API). `datos.programas` se carga en `ProveedorAlmacen` y `obtenerNombrePrograma(id, programas)` lo usa. Dashboard y resumen del Administrador calculan tendencia y distribución desde las evidencias reales (`lib/utilidades/metricas-evidencias.ts`); Power BI queda como catálogo de categorías sin puntajes inventados. Eliminados `datos-semilla/programas.ts`, `vigencias.ts` y `metricas-dashboard.ts`; se conservan `usuarios.ts` (tarjeta de credenciales del login, ahora con Par académico) y `estructura-decreto-1330.ts` (catálogo normativo).
- [Frontend] Biblioteca de plantillas: lista solo lo que devuelve `GET /plantillas` (archivos en el bucket `plantillas`); estado vacío explícito y botón **Descargar** con URL firmada (`GET /plantillas/:id/descargar`). Los `.docx` de `FormatosGuia/` siguen en disco como referencia y no se sirven desde la app.
- [Flujo de arranque] `pnpm prisma:deploy` → `pnpm prisma:seed` → iniciar sesión como Administrador → crear programas (o CSV `/integracion/sincronizar-csv`) y subir plantillas desde la Biblioteca. Pendiente: la migración `20260930010000_eliminar_factor_indicador` se aplica en Supabase con `pnpm prisma:deploy`.

### 2026-09-29 — T-REF-001: retiro de factor/indicador, clasificación por guía

- [Dominio] G1 y G3 son un solo archivo con todas sus condiciones; no hay un archivo por condición. Las 9 condiciones de programa y las 6 institucionales quedan solo como catálogo y checklist del dictamen (sin cambios en `EvaluacionCondicion*`, enums ni umbrales n/9 y n/6).
- [Backend] Migración `20260930010000_eliminar_factor_indicador`: borra `Evidencia.factor`, `Evidencia.indicador` y `Plantilla.factor`; rellena y exige `Plantilla.codigoGuia`; índices `(codigoGuia, periodo)`, `(programaId, codigoGuia)` y `(codigoGuia, tipoTramite, vigente)`.
- [Backend] `GET /evidencias` y `GET /busqueda` filtran por `codigoGuia` (en búsqueda se valida G1–G4); el texto libre ya no consulta factor/indicador y `q=G1` encuentra por guía. Plantillas versionadas por guía + tipo de trámite. Ingesta Excel con columnas nombre, programaCodigo, periodo, codigoGuia. Specs nuevas de búsqueda, plantillas e ingesta.
- [Frontend] Carga de evidencias sin selects de factor/indicador; detalle (cargador, admin, revisor) y tabla muestran la guía; filtro de guía en `/administrador/evidencias` (`?codigoGuia=`); biblioteca de plantillas con guía obligatoria (se infiere de `G1…G4` en el nombre del archivo). Se eliminan `catalogoFactoresIndicadores` y `factoresSemilla`.

### 2026-09-28 — HU-003 regla n/9, CI en develop_v2 y relleno de migraciones

- [CI] `ci.yml` corre también en `develop_v2` (push y PR), con servicio `postgres:16`: `prisma migrate deploy`, `migrate status`, semilla, jest y build del backend; tsc y build del frontend.
- [Backend] Migración `20260929010000_relleno_guias_tramites_imagenes`: rellena `codigoGuia` (evidencias, documentos requeridos y plantillas), el catálogo `TramiteSIAC`/`TramiteDocumentoGuia` y `Programa.urlImagen`.
- [Backend] D1/D5: estados `ConObservaciones` (n < total) y `Cumple` (n = total); `Evidencia.puntajeActual` y `totalCondicionesActual` (entero n/9; G3 n/6). El checklist ya no produce `Rechazado`/`Validado` ni porcentaje; esos estados quedan para la decisión explícita del Revisor (HU-006) en documentos sin checklist. Migraciones `20260929020000` (enum y columnas) y `20260929030000` (mapeo de datos existentes; el historial no se toca).
- [Backend] D2: semáforo por puntaje (verde 9, amarillo 5-8, rojo 0-4; n/6 escalado) combinado con RN-003; un documento con observaciones ya no fuerza rojo. `porcentajeCompletitud` queda como columna heredada sin uso (se retira con T-003.3).
- [Frontend] Etiquetas "Pendiente de verificación", "Con observaciones", "Cumple"; la UI muestra n/9 en lugar de %.

### 2026-09-28 — Sprint 2 Entregas 1 y 2 (UI revisor + trámites G1–G4)

- [Frontend] Revisor: botón Aprobar deshabilitado si hay observaciones; Mis revisiones en tabla con Sheet de historial RO; bandeja con fecha+hora; sidebar sin bloque de usuario.
- [Frontend] Semestre actual por defecto (`periodoAcademicoActual()` → 2026-2); panel SIAC por carrera con avance ponderado vía `GET /programas/:id/progreso`.
- [Frontend] Biblioteca plantillas: dos accesos (Renovación / Nuevos). HU-008: página evidencias con Server Component y filtros en URL.
- [Backend] `urlImagen` en `Programa`; enums G1–G4, `TipoTramiteSIAC`, catálogo trámites; `AvanceProcesoSIACService` con peso igual por documento guía; semáforo/estadoProceso derivados en listado programas (RN-003 + rechazos).
- [Backend] `GET /evidencias/:id/evaluaciones-condicion?numeroRevision=N`; mis revisiones enriquecidas con puntaje y observaciones por ciclo.

### 2026-10-13 — Correo Resend (dev)

- [Backend] `CORREO_REMITENTE` como alias de `CORREO_DESDE`; `RESEND_CORREO_SANDBOX` redirige envíos en desarrollo (modo prueba Resend). Producción CUAC: `CORREO_CANAL=smtp`.

### 2026-10-12 — HU-011 SuperAdmin: edición de usuarios

- [Frontend] `/superadmin/usuarios`: diálogo **Editar** (nombre, cargo, dependencia, rol, contraseña opcional; correo solo lectura) con `DialogoConfirmacion` antes de guardar; reactivar con confirmación; copy de baja lógica (no borrado en BD).
- [Backend] `POST`/`PATCH` usuarios devuelven el registro sin `contrasena`; `DELETE` sigue siendo desactivación (`activo: false`). No auto-desactivación; al menos un SuperAdmin activo al desactivar o bajar rol.

### 2026-09-28 — Alcance por programa (inicio Sprint 2)

- [Docs] T-DOC.1: Sprints 2–4 dejan de figurar como completados; el estado oficial es ClickUp. Repo oficial `DeibyRamirez/SIAC`. Se retira `Skills/FrontendDesing.md`.
- [Backend] Migración `20260928020000_programa_slug_facultad_vinculo_unico`: `facultad`, `slug` único y unicidad de `UsuarioPrograma` (dedup previo). No elimina `semaforo` ni `porcentajeAvance`.
- [Backend] `GuardAlcancePrograma` + `ServicioAlcancePrograma`: relectura de la BD en cada petición. RN-001 ajustada en evidencias, búsqueda y pendientes.
- [Backend] `GET/PUT /usuarios/:id/programas`; el Administrador no asigna SuperAdmin. `PATCH /programas/:id` y `/estado`. `GET /programas` sin escritura ni N+1.
- [Frontend] Asignación de programas en `/administrador/usuarios`. Alta del cargador, inicio y bandeja del revisor sin respaldo a datos de prueba.

### 2026-09-24 — Correcciones Sprint 1 (DOCX + UI)

- [Backend] Módulo `src/docx/`: firma en `docProps/custom.xml`, protección lectura, zonas editables, comentarios Word, validación mammoth al re-subir; campos `firmaDescarga` y `textoBaseAuditoria` en `EvidenciaVersion`
- [Backend] `GET /evidencias/mis-revisiones-revisor` — historial envíos a revisión (inicial / corrección)
- [Frontend] Sidebar sticky, colapsar abajo; loader global con blur; fechas con hora 12h (`formatearFechaHora`)
- [Frontend] Cargador: nombre readOnly, `ZonaCargaDocx`, botón único «Enviar a revisión»
- [Frontend] Revisor: checklist Correcto/Corregir, borrador `localStorage`, ruta `/revisor/revisiones`

### 2026-09-17 (lote 2) — Reparación EvidenciaVersion y versionado

- [Backend] Scripts: `prisma:repair-schema`, `prisma:verify`, `prisma:backfill-versiones`; `prisma:setup` encadenado
- [Backend] Carga evidencias/vigencias: BD antes que S3; rollback si falla Storage (evita 500 con archivo huérfano)
- [Backend] `reemplazarArchivo`: v2+ sin borrar v1 en bucket; compensación si falla subida
- [Docs] MemoriaGlobal §7.3: advertencia sobre `migrate resolve --applied` sin ejecutar SQL

### 2026-09-17 — Errores Supabase/Prisma documentados + fixes operativos

- [Docs] Sección **§ 7 Errores conocidos** en MemoriaGlobal: P1001, P3005, P2021, 500 con S3 OK, bandeja Revisor vacía
- [Docs] `DIRECT_URL` session pooler; `S3_ENDPOINT` formato `*.storage.supabase.co`; bucket `documentos`
- [Backend] Semilla: 3 evidencias `EnRevision` + `EvidenciaVersion` v1
- [Backend] `FiltroExcepcionHttp`: log stack, mapeo Prisma/S3, campo `detalle` en desarrollo
- [Frontend] Bandeja revisor: fallback semilla si API vacía/falla

### Cambios pendientes de documentación oficial (F-02 / F-03 / APIs)

| Cambio | Documentar en |
|--------|----------------|
| Campo `version` en `Evidencia` | F-03 modelo datos |
| `PATCH /evidencias/:id/archivo` | Diseno_APIs_SIAC |
| Admin sin carga; visor `/administrador/evidencias/[id]` | F-02 roles / HU consulta |
| Confirmaciones UI acciones críticas | F-02 usabilidad |
| Badge novedades cargador | F-02 notificaciones in-app |
| Búsqueda global Ctrl+K + `/busqueda?formato=` | Diseno_APIs_SIAC |
| `informesPowerBiSemilla` = 8 categorías calidad + `urlImagen` | Memoria frontend |
| `urlImagen` en `Programa` y `tarjetasResumenSemilla` | Memoria frontend |
| `PantallaCargandoSiac` | Memoria frontend |

### 2026-09-16 (lote 2) — UX, versionado e imágenes

- [Backend] Campo `version` en `Evidencia`; endpoint `PATCH /evidencias/:id/archivo`
- [Backend] Filtro `formato` (pdf/xlsx) en `GET /busqueda`
- [Frontend] Cargador: subir versión corregida [n] en detalle de evidencia rechazada
- [Frontend] Admin: eliminado botón cargar; visor PDF en `/administrador/evidencias/[id]`
- [Frontend] `DialogoConfirmacion` en eliminar, aprobar, rechazar, reenviar, desactivar usuario
- [Frontend] Badge novedades cargador; `PantallaCargandoSiac` con barra de progreso
- [Frontend] Búsqueda global conectada a API; hint Ctrl+K / Esc
- [Frontend] `informesPowerBiSemilla` reemplazado por 8 categorías calidad con imagen
- [Frontend] `tarjetasResumenSemilla` con imagen; programas con slot 9:16

### 2026-09-16 — Sidebar, flujos documentales, SuperAdmin

- [Frontend] `crearEvidencia` envía `FormData` con archivo a `/evidencias` (fix `rutaArchivo` null)
- [Frontend] Componente `VisorDocumentoInline`; revisor y cargador usan URL firmada
- [Frontend] Ruta `/cargador/evidencias/[id]` con observaciones y reenvío a revisión
- [Frontend] Sidebar plegable (`w-16`/`w-64`, tooltips, badge dot, `siac-sidebar-plegado`)
- [Backend] Rol `SuperAdmin` en schema; guards bypass; CRUD `/usuarios` (POST/PATCH/DELETE)
- [Backend] `GET /integracion/estado-storage` para diagnóstico S3
- [Frontend] Rutas `/superadmin` y `/superadmin/usuarios`; menú unificado SuperAdmin
- [Backend] Semilla: usuario `superadmin@uniautonoma.edu.co` / `SuperAdmin2026`

### 2026-09-15 — Alineación F-03 + Supabase + API v1

- [Backend] Schema Prisma ampliado: `OrigenDato`, `ParAcademico`, campos maestros TI, `UsuarioPrograma`
- [Backend] Migración Supabase `Simulacion_siac` (12 tablas)
- [Backend] Supabase Storage S3 con URLs firmadas; convención rutas F-03
- [Backend] Prefijo `/api/v1`, Swagger `/api/docs`, filtro errores F-03
- [Backend] Nuevos módulos: `integracion`, `ingesta`, `acreditacion`, `metricas`
- [Backend] Endpoints: enviar-revision, dictamen, historial, parsear-excel, sincronizar
- [Frontend] Cliente HTTP → `/api/v1`; dictamen en ruta F-03; tipo `ParAcademico`
- [Docs] Reescritura `docs/etapa-0` y `docs/etapa-1` (Supabase, sin Docker)
- [Docs] Creado `MemoriaGlobal.md` unificando Backend, Frontend, Documentos

### 2026-09-08 — Implementación full-stack (Etapas 0-4)

- [Backend] NestJS 10 con módulos base
- [Frontend] Capa servicios HTTP + fallback mock
- [Docs] etapa-0 a etapa-4 + manuales

### 2026-09-03 — Prototipo frontend v0

- [Frontend] 19 rutas mock, login Moodle CUAC, CRUD Decreto 1330

---

*Fin del documento — SIAC · CUAC · Práctica profesional 2026*

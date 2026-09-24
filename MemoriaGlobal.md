# Memoria Global — SIAC

> **Instrucción para agentes de IA:** Leer este archivo **completo** antes de modificar Backend, Frontend o Documentos. Tras cada sesión significativa, actualizar **Estado actual**, **Tareas** y **Registro de cambios**.

| Campo | Valor |
|-------|-------|
| **Última actualización** | 2026-09-17 |
| **Versión frontend** | `0.1.0` (`Frontend/frontend/package.json`) |
| **Versión backend** | `0.1.0` (`Backend/package.json`) |
| **Supabase** | Proyecto `Simulacion_siac` · ref `olknaoacxwenqlawxysx` · región `ca-central-1` |
| **Ruta local** | `D:\Proyectos\Simulacion_SIAC` |
| **Institución** | Corporación Universitaria Autónoma del Cauca (CUAC) — Planeación / SIAC |
| **Marco normativo** | Decreto 1330 de 2021 (6 CI + 9 CP) |
| **Fase actual** | Fundación técnica con Supabase (Etapa 1 completada) |
| **Convención API** | F-03 en español — prefijo `/api/v1/` |

---

## 1. Qué es SIAC

**SIAC** (Sistema Interno de Aseguramiento de la Calidad) centraliza indicadores, procesos y evidencias institucionales para el proceso de acreditación. Arquitectura: monolito NestJS + Next.js separados por API REST (ADR-001).

**Flujo central:**

```text
Cargador descarga plantilla → sube evidencia (Borrador)
  → envía a revisión (EnRevision)
  → Revisor dictamina (Validado / Rechazado)
  → Administrador / Par Académico consulta validadas
  → Vigencias y semáforos alimentan panel administrativo
```

---

## 2. Estructura del repositorio

```text
Simulacion_SIAC/
├── MemoriaGlobal.md              ← Este archivo (fuente transversal)
├── Backend/                      ← NestJS 10 + Prisma + Supabase
│   ├── src/modules/              ← auth, documentos, integracion, ingesta…
│   └── prisma/schema.prisma      ← Modelo F-03
├── Frontend/
│   ├── MEMORIA_PROYECTO.md       ← Memoria detallada frontend
│   └── frontend/                 ← Next.js 16 App Router
├── Documentos/                   ← F-00..F-03, APIs, normativa
├── docs/
│   ├── etapa-0/                  ← Inception
│   ├── etapa-1/                  ← Fundación Supabase
│   └── etapa-2..4/               ← Sprints siguientes
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
| Storage | Supabase Storage S3 + URLs firmadas |
| Docs API | Swagger en `/api/docs` |
| Cron | `@nestjs/schedule` — vigencias 00:00 |

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
| Estructura | `/estructura` | CRUD etapas/carpetas/docs |
| Almacenamiento | (servicio) | Supabase S3 |

### Modelo de datos (Prisma)

12 entidades según F-03 §2.2: `Usuario`, `Programa`, `UsuarioPrograma`, `Evidencia`, `HistorialEvidencia`, `Plantilla`, `AnexoVigencia`, `AlertaInApp`, `EtapaAcreditacion`, `CarpetaNormativa`, `DocumentoRequerido`.

**Enums clave:** `RolUsuario` (incl. `ParAcademico`, `SuperAdmin`), `EstadoEvidencia`, `EstadoVigencia`, `OrigenDato`.

**Campos maestros TI:** `idExterno`, `origenDato`, `fechaSincronizacion` en Usuario y Programa.

### ADRs aplicadas

| ADR | Decisión |
|-----|----------|
| ADR-001 | Monolito NestJS + Next.js |
| ADR-002 | Supabase PG + Storage (dev); MinIO prod futuro |
| ADR-003 | JWT MVP; OAuth Google stub |
| ADR-004 | periodo/factor/indicador como String |
| ADR-005 | Copia local maestros + adapter integracion |
| ADR-006 | Alertas in-app; SMTP opcional |

### Brechas backend pendientes

| ID | Brecha | Prioridad |
|----|--------|-----------|
| B-B1 | OAuth Google real | P2 |
| B-B2 | API TI institucional conectada | P1 |
| B-B3 | Buckets Storage creados en Supabase Dashboard | P0 |
| B-B4 | Semilla ejecutada en Supabase remoto | P0 |
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

- Cliente: `Frontend/frontend/lib/servicios/cliente-api.ts`
- Base: `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`
- Fallback mock via `ProveedorAlmacen` si API no responde

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

**Frontend (`Frontend/frontend/.env.local`):**

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
pnpm prisma:repair-schema   # Crea EvidenciaVersion y columnas si faltan
pnpm prisma:verify          # Comprueba esquema antes del seed
pnpm prisma:seed
pnpm prisma:backfill-versiones   # v1 para evidencias legacy
```

Verificar manualmente:

```sql
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'EvidenciaVersion');
SELECT column_name FROM information_schema.columns WHERE table_name = 'Evidencia' AND column_name = 'version';
```

Si `repair-schema` no basta, ejecutar SQL de `Backend/prisma/migrations/` en SQL Editor de Supabase.

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
| 3 | `pnpm prisma:repair-schema` + `pnpm prisma:verify` (o baseline § 7.3) |
| 4 | `pnpm prisma:seed` + `pnpm prisma:backfill-versiones` |
| 5 | Reiniciar backend; reproducir carga; leer log consola (filtro HTTP loguea stack en 500) |
| 6 | `GET /integracion/estado-storage` — diagnóstico buckets S3 |

---

## 8. Estado actual (2026-09-17)

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
- [ ] Baseline `_prisma_migrations` en Supabase remoto (`migrate resolve` — ver § 7.3)
- [ ] Buckets Storage: `evidencias`, `plantillas`, **`documentos`**
- [ ] `.env`: `DIRECT_URL` session pooler + `S3_ENDPOINT` formato `.storage.supabase.co`
- [ ] Semilla remota completa tras baseline (`pnpm prisma:seed`)

---

## 9. Tareas backlog

### P0 — Inmediato

| ✓ | Tarea | Ámbito |
|---|-------|--------|
| [x] | Schema + migración Supabase | Backend |
| [x] | API v1 + endpoints F-03 | Backend |
| [x] | MemoriaGlobal + docs etapa 0-1 | Docs |
| [ ] | Crear buckets Storage Supabase | Supabase |
| [ ] | Configurar `.env` y ejecutar semilla | Backend |

### P1 — Sprint 2

| ✓ | Tarea | Ámbito |
|---|-------|--------|
| [ ] | Frontend 100% API real | Frontend |
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

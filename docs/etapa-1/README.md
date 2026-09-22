# Etapa 1 — Fundación técnica

> **Sprint:** 1 (03/09 – 23/09/2026)  
> **Historias:** HU-001, HU-002, HU-011, inicio HU-003  
> **Estado:** Completada  
> **Referencia:** [MemoriaGlobal.md](../../MemoriaGlobal.md) · [F-03 §6](../../Documentos/F-03_Arquitectura_y_diseno.docx.pdf)

## Objetivo

Establecer infraestructura backend real sobre **Supabase** (PostgreSQL + Storage S3), autenticación JWT, modelo de datos F-03 y primera carga de evidencias — **sin Docker**.

## Supabase — proyecto Simulacion_siac

| Recurso | Valor |
|---------|-------|
| Proyecto | `Simulacion_siac` |
| Región | `ca-central-1` |
| URL | `https://[PROJECT_REF].supabase.co` |
| Ref | `[PROJECT_REF]` (Dashboard → Project Settings) |

### Checklist de configuración

- [x] Migración inicial aplicada (12 tablas + enums F-03)
- [ ] Crear buckets Storage: `evidencias`, `plantillas`, `documentos` (Dashboard → Storage)
- [ ] Verificar esquema: `pnpm prisma:verify` (tabla `EvidenciaVersion`)
- [ ] Configurar S3 Access Keys (Dashboard → Storage → S3 Connection)
- [ ] Copiar `Backend/.env.example` → `Backend/.env` con credenciales reales
- [ ] Ejecutar semilla: `pnpm prisma:seed`

### Variables de entorno backend

```env
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
S3_USAR_ALMACEN_LOCAL="false"
S3_ENDPOINT="https://[PROJECT_REF].supabase.co/storage/v1/s3"
S3_BUCKET="evidencias"
S3_BUCKET_PLANTILLAS="plantillas"
```

## Estructura Backend (F-03 §6.1)

```text
Backend/src/
├── main.ts                 # Prefijo api/v1 + Swagger /api/docs
├── app.module.ts
├── common/
│   ├── config/             # Configuración env
│   ├── guards/             # JWT, Roles, SoloValidados
│   └── filters/            # Formato error F-03
├── modules/
│   ├── auth/               # login, perfil, google (stub)
│   ├── usuarios/           # HU-011
│   ├── documentos/         # Evidencia + HistorialEvidencia
│   ├── programas/          # Panel semáforo
│   ├── plantillas/         # Bucket plantillas/
│   ├── aprobacion/         # Alias deprecado
│   ├── busqueda/           # Full-text search
│   ├── vigencias/          # AnexoVigencia + cron
│   ├── notificaciones/     # AlertaInApp
│   ├── acreditacion/       # GET /acreditacion/etapas
│   ├── integracion/        # POST /integracion/sincronizar
│   ├── ingesta/            # POST /evidencias/parsear-excel
│   ├── metricas/           # GET /metricas/token (Power BI)
│   └── almacenamiento/     # Supabase Storage S3
└── prisma/
    ├── schema.prisma       # Modelo F-03 completo
    └── semilla.ts          # 4 usuarios demo + 12 programas
```

## Catálogo API `/api/v1`

| Método | Ruta | Rol | HU |
|--------|------|-----|-----|
| POST | `/auth/login` | Público | HU-001 |
| GET | `/auth/perfil` | JWT | HU-001 |
| POST | `/auth/google` | Público (501 stub) | — |
| GET | `/usuarios` | Admin | HU-011 |
| PATCH | `/usuarios/:id/rol` | Admin | HU-011 |
| GET | `/programas` | JWT | HU-010 |
| GET | `/programas/:id` | JWT | HU-010 |
| POST | `/evidencias` | Cargador | HU-003 |
| GET | `/evidencias` | JWT | HU-003 |
| GET | `/evidencias/:id` | JWT | HU-003 |
| PATCH | `/evidencias/:id` | Cargador | HU-004 |
| DELETE | `/evidencias/:id` | Cargador | HU-004 |
| POST | `/evidencias/:id/enviar-revision` | Cargador | HU-003 |
| POST | `/evidencias/:id/dictamen` | Revisor | HU-006 |
| GET | `/evidencias/:id/historial` | JWT | HU-006 |
| GET | `/evidencias/:id/descargar` | JWT | URL firmada |
| POST | `/evidencias/parsear-excel` | Cargador/Admin | Ingesta |
| GET | `/plantillas` | JWT | HU-005 |
| POST | `/plantillas` | Revisor/Admin | HU-005 |
| GET | `/plantillas/:id/descargar` | JWT | URL firmada |
| GET | `/busqueda` | Admin | HU-008 |
| GET | `/vigencias/anexos` | Admin | HU-007 |
| GET | `/notificaciones` | JWT | HU-007 |
| PATCH | `/notificaciones/:id/leida` | JWT | HU-007 |
| GET | `/acreditacion/etapas` | JWT | Checklist |
| POST | `/integracion/sincronizar` | Admin | ADR-005 |
| GET | `/metricas/token` | Revisor/Admin | HU-009 |

**Swagger:** `http://localhost:3001/api/docs`

## Flujos críticos

### Flujo 1 — Carga de evidencia

```mermaid
sequenceDiagram
    participant C as Cargador_Frontend
    participant API as DocumentosService
    participant S3 as Supabase_Storage
    participant PG as Supabase_PostgreSQL

    C->>API: POST /api/v1/evidencias multipart JWT
    API->>API: Validar rol MIME tamano
    API->>PG: INSERT Evidencia Borrador
    API->>S3: PutObject evidencias/2026/id/archivo.pdf
    API->>PG: UPDATE rutaArchivo
    API->>PG: INSERT HistorialEvidencia
    API-->>C: 201 Created
```

### Flujo 2 — Dictamen de revisión

```mermaid
sequenceDiagram
    participant R as Revisor_Frontend
    participant API as DocumentosService
    participant PG as Supabase_PostgreSQL
    participant N as NotificacionesService

    R->>API: POST /api/v1/evidencias/id/dictamen
    API->>API: Validar estado EnRevision
    API->>PG: UPDATE Validado o Rechazado
    API->>PG: INSERT HistorialEvidencia
    API->>N: crear AlertaInApp autor
    API-->>R: 200 OK
```

### Flujo 3 — Cron vigencias (00:00)

`VigenciasService` recalcula `EstadoVigencia`, actualiza `Programa.semaforo` (RN-003), genera alertas in-app. SMTP opcional (ADR-006).

### Flujo 4 — Sincronización catálogos TI

`POST /api/v1/integracion/sincronizar` → Adapter consume API JSON o CSV → UPSERT `Programa`, `Usuario`, `UsuarioPrograma` → HTTP 502 si TI falla.

## Modelo de datos (resumen)

| Tabla | Origen | Descripción |
|-------|--------|-------------|
| Usuario | Maestro TI + SIAC | Cuentas con rol de aplicación |
| Programa | Maestro TI + SIAC | Programas académicos CUAC |
| UsuarioPrograma | Maestro TI | Vínculo N:M cargador-programa |
| Evidencia | Operativo SIAC | Documento con metadatos y estado |
| HistorialEvidencia | Operativo SIAC | Auditoría de cambios de estado |
| Plantilla | Operativo SIAC | Formatos oficiales versionados |
| AnexoVigencia | Operativo SIAC | Anexos críticos con vencimiento |
| AlertaInApp | Operativo SIAC | Notificaciones in-app |
| EtapaAcreditacion | Operativo SIAC | Checklist normativo |
| CarpetaNormativa | Operativo SIAC | Carpetas por etapa |
| DocumentoRequerido | Operativo SIAC | Documentos exigidos por carpeta |

## Criterios de aceptación

- [x] Login institucional emite JWT; sin token → 401
- [x] Cada rol ve su inicio (redirección por rol en frontend)
- [x] Cargador puede subir PDF/XLSX con metadatos → Borrador en Supabase PG
- [x] Guards impiden acciones según rol (RN-001 Par Académico)
- [x] API versionada `/api/v1` con Swagger publicado
- [x] Descarga mediante URL firmada Supabase Storage
- [ ] Semilla ejecutada en Supabase remoto (requiere `.env` local)

## Comandos

```bash
cd Backend
pnpm install
pnpm prisma:generate
pnpm prisma migrate deploy   # contra Supabase con DIRECT_URL
pnpm prisma:seed
pnpm start:dev               # http://localhost:3001/api/v1

cd Frontend/frontend
pnpm dev                     # http://localhost:3000
```

## Frontend — integración API

- Cliente HTTP: `Frontend/frontend/lib/servicios/cliente-api.ts`
- Base URL: `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`
- Servicios: evidencias, plantillas, programas
- Fallback mock si API no disponible

## Próxima etapa

→ [Etapa 2 — Núcleo documental](../etapa-2/README.md): CRUD completo, plantillas, búsqueda facetada, panel programas

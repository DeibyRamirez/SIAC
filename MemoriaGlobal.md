# Memoria Global â€” SIAC

> **InstrucciÃ³n para agentes de IA:** Leer este archivo **completo** antes de modificar Backend, Frontend o Documentos. Tras cada sesiÃ³n significativa, actualizar **Estado actual**, **Tareas** y **Registro de cambios**.

> **Checkout de entrega (este repo):** E:\Universidad\SEMESTRE 8\Practica Profesional\SIAC · remoto https://github.com/DeibyRamirez/SIAC.git · Next.js en `Frontend/` (`app/`, `components/`, `lib/`).

| Campo | Valor |
|-------|-------|
| **Ãšltima actualizaciÃ³n** | 2026-09-17 |
| **VersiÃ³n frontend** | `0.1.0` (`Frontend/package.json`) |
| **VersiÃ³n backend** | `0.1.0` (`Backend/package.json`) |
| **Supabase** | Proyecto `Simulacion_siac` Â· ref `olknaoacxwenqlawxysx` Â· regiÃ³n `ca-central-1` |
| **Ruta local** | `D:\Proyectos\Simulacion_SIAC` |
| **InstituciÃ³n** | CorporaciÃ³n Universitaria AutÃ³noma del Cauca (CUAC) â€” PlaneaciÃ³n / SIAC |
| **Marco normativo** | Decreto 1330 de 2021 (6 CI + 9 CP) |
| **Fase actual** | FundaciÃ³n tÃ©cnica con Supabase (Etapa 1 completada) |
| **ConvenciÃ³n API** | F-03 en espaÃ±ol â€” prefijo `/api/v1/` |

---

## 1. QuÃ© es SIAC

**SIAC** (Sistema Interno de Aseguramiento de la Calidad) centraliza indicadores, procesos y evidencias institucionales para el proceso de acreditaciÃ³n. Arquitectura: monolito NestJS + Next.js separados por API REST (ADR-001).

**Flujo central:**

```text
Cargador descarga plantilla â†’ sube evidencia (Borrador)
  â†’ envÃ­a a revisiÃ³n (EnRevision)
  â†’ Revisor dictamina (Validado / Rechazado)
  â†’ Administrador / Par AcadÃ©mico consulta validadas
  â†’ Vigencias y semÃ¡foros alimentan panel administrativo
```

---

## 2. Estructura del repositorio

```text
Simulacion_SIAC/
â”œâ”€â”€ MemoriaGlobal.md              â† Este archivo (fuente transversal)
â”œâ”€â”€ Backend/                      â† NestJS 10 + Prisma + Supabase
â”‚   â”œâ”€â”€ src/modules/              â† auth, documentos, integracion, ingestaâ€¦
â”‚   â””â”€â”€ prisma/schema.prisma      â† Modelo F-03
â”œâ”€â”€ Frontend/                      â† Next.js 16 App Router (app/, components/, lib/)
â”‚   â””â”€â”€ MEMORIA_PROYECTO.md       â† Memoria detallada frontend
â”œâ”€â”€ Documentos/                   â† F-00..F-03, APIs, normativa
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ etapa-0/                  â† Inception
â”‚   â”œâ”€â”€ etapa-1/                  â† FundaciÃ³n Supabase
â”‚   â””â”€â”€ etapa-2..4/               â† Sprints siguientes
â””â”€â”€ .agents/skills/               â† Skills IA del proyecto
```

---

## 3. Backend/

### Stack

| Componente | TecnologÃ­a |
|------------|------------|
| Framework | NestJS 10, TypeScript |
| ORM | Prisma 6 â†’ Supabase PostgreSQL |
| Auth | JWT + Passport, dominio `@uniautonoma.edu.co` |
| Storage | Supabase Storage S3 + URLs firmadas |
| Docs API | Swagger en `/api/docs` |
| Cron | `@nestjs/schedule` â€” vigencias 00:00 |

### MÃ³dulos implementados

| MÃ³dulo | Ruta base | Responsabilidad |
|--------|-----------|-----------------|
| Auth | `/auth` | Login JWT, perfil, Google stub |
| Usuarios | `/usuarios` | HU-011 roles |
| Documentos | `/evidencias` | CRUD, enviar-revisiÃ³n, dictamen, historial |
| Plantillas | `/plantillas` | Biblioteca versionada |
| Programas | `/programas` | Panel semÃ¡foro |
| BÃºsqueda | `/busqueda` | Filtros URL + full-text |
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

12 entidades segÃºn F-03 Â§2.2: `Usuario`, `Programa`, `UsuarioPrograma`, `Evidencia`, `HistorialEvidencia`, `Plantilla`, `AnexoVigencia`, `AlertaInApp`, `EtapaAcreditacion`, `CarpetaNormativa`, `DocumentoRequerido`.

**Enums clave:** `RolUsuario` (incl. `ParAcademico`, `SuperAdmin`), `EstadoEvidencia`, `EstadoVigencia`, `OrigenDato`.

**Campos maestros TI:** `idExterno`, `origenDato`, `fechaSincronizacion` en Usuario y Programa.

### ADRs aplicadas

| ADR | DecisiÃ³n |
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
| Administrador | `/administrador` | 8+ vistas (programas, vigencias, estructuraâ€¦) |
| SuperAdmin | `/superadmin` | gestiÃ³n usuarios + acceso a todos los mÃ³dulos |

### IntegraciÃ³n API

- Cliente: `Frontend/lib/servicios/cliente-api.ts`
- Base: `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`
- Fallback mock via `ProveedorAlmacen` si API no responde

### Brechas frontend pendientes

| ID | Brecha | Prioridad |
|----|--------|-----------|
| B-F1 | Conectar todas las vistas a API real (no mock) | P1 |
| B-F2 | Rol Par AcadÃ©mico â€” vistas dedicadas | P2 |
| B-F3 | Middleware server-side auth | P1 |
| B-F4 | Descarga via URL firmada en UI | ~~P1~~ resuelto en revisor/cargador |

> Detalle completo: [Frontend/MEMORIA_PROYECTO.md](Frontend/MEMORIA_PROYECTO.md)

---

## 5. Documentos/

| Archivo | Contenido |
|---------|-----------|
| [F-00_Acta_de_constitucion.docx.pdf](Documentos/F-00_Acta_de_constitucion.docx.pdf) | Acta de constituciÃ³n |
| [F-01_Propuesta_tecnica_preliminar.docx.pdf](Documentos/F-01_Propuesta_tecnica_preliminar.docx.pdf) | Propuesta tÃ©cnica |
| [F-02_Especificacion_de_requisitos.docx-1.pdf](Documentos/F-02_Especificacion_de_requisitos.docx-1.pdf) | Requisitos funcionales |
| [F-03_Arquitectura_y_diseno.docx.pdf](Documentos/F-03_Arquitectura_y_diseno.docx.pdf) | Arquitectura, modelo datos, API, ADRs |
| [Diseno_APIs_SIAC.docx.pdf](Documentos/Diseno_APIs_SIAC.docx.pdf) | CatÃ¡logo APIs backend |
| [estructura_decreto_etapas_documentos.md](Documentos/estructura_decreto_etapas_documentos.md) | Decreto 1330 â€” CI/CP |
| [InformaciÃ³n del Proyecto.md](Documentos/InformaciÃ³n%20del%20Proyecto.md) | Resumen ejecutivo |
| [PROTOTIPO-SIAC.md](Documentos/PROTOTIPO-SIAC.md) | Notas reuniÃ³n stakeholders |

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
# Session pooler (puerto 5432) â€” usar si db.xxx.supabase.co no resuelve DNS (P1001)
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

## 7. Errores conocidos â€” Supabase, Prisma y Storage

> **InstrucciÃ³n para agentes:** Consultar esta secciÃ³n ante error 500 en cargas, fallos de `prisma:deploy`/`prisma:seed` o bandeja Revisor vacÃ­a.


### 7.1 Error 500 al subir documento pero el archivo SÃ aparece en Storage

**SÃ­ntoma:** Toast o respuesta `Error interno del servidor` (500), pero el PDF estÃ¡ en Supabase Storage.

**Causa:** El backend sube a S3 **antes** de completar PostgreSQL. Si falla un paso posterior (tabla/columna inexistente), el archivo queda huÃ©rfano en Storage.

Orden en evidencias (`documentos.service.ts`):

1. Crear fila `Evidencia`
2. `subirArchivo` â†’ Supabase Storage âœ…
3. Actualizar `rutaArchivo`, `version`
4. `registrarVersion` â†’ tabla `EvidenciaVersion` âŒ si no existe
5. Respuesta 500 al cliente

**SoluciÃ³n:** Aplicar migraciones pendientes (Â§ 7.4). Verificar tablas `EvidenciaVersion` y columnas de `AnexoVigencia`.

---

### 7.2 Prisma P1001 â€” Can't reach database server

**SÃ­ntoma:**

```text
Error: P1001: Can't reach database server at `db.olknaoacxwenqlawxysx.supabase.co:5432`
```

**Causa:** `DIRECT_URL` apunta al host directo `db.xxx.supabase.co`, que en algunas redes **no resuelve DNS** (`Test-NetConnection` â†’ `Name resolution failed`).

**SoluciÃ³n:**

1. Supabase Dashboard â†’ Project Settings â†’ Database â†’ **Connection string â†’ Session mode**
2. Copiar URI y usarla como `DIRECT_URL` (pooler `:5432`, no `db.xxx`):

```env
DIRECT_URL="postgresql://postgres.olknaoacxwenqlawxysx:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:5432/postgres"
```

3. `DATABASE_URL` sigue en puerto **6543** con `?pgbouncer=true`
4. Verificar proyecto no estÃ© **Paused** en Supabase Dashboard

---

### 7.3 Prisma P3005 â€” database schema is not empty (baseline)

**SÃ­ntoma:**

```text
Error: P3005: The database schema is not empty.
```

**Causa:** La BD ya tiene tablas (semilla, SQL manual o `db push`), pero no existe historial en `_prisma_migrations`. Prisma no aplica migraciones sin baseline.

**SoluciÃ³n:** Marcar migraciones ya reflejadas en la BD como aplicadas (no re-ejecuta SQL):

```powershell
cd Backend
pnpm exec prisma migrate resolve --applied 20260908180000_inicial
pnpm exec prisma migrate resolve --applied 20260915180000_alinear_f03
pnpm exec prisma migrate resolve --applied 20260915210000_superadmin_enum
pnpm exec prisma migrate resolve --applied 20260916180000_evidencia_version_historial
pnpm exec prisma migrate resolve --applied 20260916220000_evidencia_version
pnpm prisma:deploy
```

**Importante:** `migrate resolve --applied` **no ejecuta SQL**. Si se marca una migraciÃ³n como aplicada sin crear las tablas, `deploy` dirÃ¡ "No pending migrations" pero `seed` fallarÃ¡ con P2021 (`EvidenciaVersion` no existe).

**ReparaciÃ³n recomendada (proyecto SIAC):**

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

### 7.4 Prisma P2021 / P2022 â€” tabla o columna no existe

**SÃ­ntoma (seed o API):**

```text
The table `public.EvidenciaVersion` does not exist in the current database.
-- o --
Invalid `prisma...`: column `Evidencia.version` does not exist
```

**Causa:** Migraciones `20260916180000_evidencia_version_historial` y/o `20260916220000_evidencia_version` no aplicadas.

**SoluciÃ³n A â€” SQL Editor (si `prisma:deploy` falla):** Ejecutar contenido de:

- `Backend/prisma/migrations/20260916220000_evidencia_version/migration.sql`
- `Backend/prisma/migrations/20260916180000_evidencia_version_historial/migration.sql`

Luego baseline (Â§ 7.3) y `pnpm prisma:seed`.

**SoluciÃ³n B â€” Deploy normal:** Tras arreglar `DIRECT_URL` (Â§ 7.2) y baseline (Â§ 7.3):

```powershell
pnpm prisma:deploy
pnpm prisma:seed
```

---

### 7.5 Bandeja Revisor vacÃ­a (sin datos semilla)

**SÃ­ntoma:** Revisor ve "No hay evidencias pendientes" aunque antes habÃ­a datos demo.

**Causas:**

1. Bandeja usa `GET /aprobacion/pendientes` (solo `estado = EnRevision`), no el store local
2. Semilla backend antigua solo tenÃ­a Borrador + Validado, **cero EnRevision**
3. Semilla frontend (`evidenciasSemilla`) no se consumÃ­a si la API respondÃ­a vacÃ­a

**SoluciÃ³n implementada:**

- Semilla backend: evidencias `ev-seed-003`..`005` en `EnRevision`
- Frontend: fallback a store local si API vacÃ­a o falla (`revisor/bandeja/page.tsx`)
- Tras migraciones + seed: API devuelve pendientes reales

---

### 7.6 Endpoint S3 Supabase (proyecto Simulacion_siac)

**Correcto (confirmado en producciÃ³n dev):**

```env
S3_ENDPOINT="https://olknaoacxwenqlawxysx.storage.supabase.co/storage/v1/s3"
```

Formato alternativo (`https://[ref].supabase.co/storage/v1/s3`) puede variar; si Storage sube archivos, el endpoint actual es vÃ¡lido.

**Buckets requeridos:** `evidencias`, `plantillas`, `documentos` (este Ãºltimo para panel Vigencias).

---

### 7.7 DiagnÃ³stico rÃ¡pido (checklist)

| Paso | Comando / acciÃ³n |
|------|------------------|
| 1 | Supabase Dashboard: proyecto **Active** (no Paused) |
| 2 | `Test-NetConnection aws-0-ca-central-1.pooler.supabase.com -Port 5432` |
| 3 | `pnpm prisma:repair-schema` + `pnpm prisma:verify` (o baseline Â§ 7.3) |
| 4 | `pnpm prisma:seed` + `pnpm prisma:backfill-versiones` |
| 5 | Reiniciar backend; reproducir carga; leer log consola (filtro HTTP loguea stack en 500) |
| 6 | `GET /integracion/estado-storage` â€” diagnÃ³stico buckets S3 |

---

## 8. Estado actual (2026-09-17)

- [x] Schema Prisma alineado F-03 con `ParAcademico`, `SuperAdmin`, `OrigenDato`, campos TI
- [x] MigraciÃ³n aplicada en Supabase (BD vacÃ­a â†’ 12 tablas)
- [x] API versionada `/api/v1` + Swagger `/api/docs`
- [x] MÃ³dulos: integracion, ingesta, acreditacion, metricas
- [x] URLs firmadas Supabase Storage en descargas
- [x] Docs etapa-0 y etapa-1 reescritas
- [x] Frontend cliente actualizado a `/api/v1`
- [x] Subida evidencias vÃ­a FormData â†’ Supabase Storage (`crearEvidenciaApi`)
- [x] Visor PDF inline en revisor y cargador (URL firmada)
- [x] Flujo cargador rechazado: `/cargador/evidencias/[id]` + reenvÃ­o a revisiÃ³n
- [x] Sidebar colapsable desktop con persistencia `localStorage`
- [x] Rol SuperAdmin: CRUD usuarios, bypass guards, rutas `/superadmin`
- [x] Endpoint diagnÃ³stico `GET /integracion/estado-storage`
- [x] Campo `version` en Evidencia + `PATCH /evidencias/:id/archivo` (versionado cargador)
- [x] Admin sin carga de evidencias; visor en `/administrador/evidencias/[id]`
- [x] DiÃ¡logos de confirmaciÃ³n en acciones crÃ­ticas (eliminar, aprobar, rechazar, reenviar)
- [x] Badge novedades cargador en sidebar y listado
- [x] Pantalla carga sesiÃ³n mejorada (`PantallaCargandoSiac`)
- [x] BÃºsqueda global Ctrl+K con API `/busqueda` (nombreArchivo, formato pdf/xlsx)
- [x] Cards con imagen: dashboard, `informesPowerBiSemilla` (8 categorÃ­as), programas 9:16
- [x] Modelo `EvidenciaVersion` + columnas `AnexoVigencia` (migraciÃ³n `20260916180000`)
- [x] Filtro HTTP con mensajes legibles Prisma/S3 + log stack en 500
- [x] Bandeja Revisor: API + fallback semilla; semilla backend con `EnRevision`
- [ ] Baseline `_prisma_migrations` en Supabase remoto (`migrate resolve` â€” ver Â§ 7.3)
- [ ] Buckets Storage: `evidencias`, `plantillas`, **`documentos`**
- [ ] `.env`: `DIRECT_URL` session pooler + `S3_ENDPOINT` formato `.storage.supabase.co`
- [ ] Semilla remota completa tras baseline (`pnpm prisma:seed`)

---

## 9. Tareas backlog

### P0 â€” Inmediato

| âœ“ | Tarea | Ãmbito |
|---|-------|--------|
| [x] | Schema + migraciÃ³n Supabase | Backend |
| [x] | API v1 + endpoints F-03 | Backend |
| [x] | MemoriaGlobal + docs etapa 0-1 | Docs |
| [ ] | Crear buckets Storage Supabase | Supabase |
| [ ] | Configurar `.env` y ejecutar semilla | Backend |

### P1 â€” Sprint 2

| âœ“ | Tarea | Ãmbito |
|---|-------|--------|
| [ ] | Frontend 100% API real | Frontend |
| [ ] | IntegraciÃ³n CSV maestros TI | Backend |
| [ ] | Pruebas con stakeholders CUAC | Todos |

### P2 â€” Futuro

| âœ“ | Tarea | Ãmbito |
|---|-------|--------|
| [ ] | OAuth Google | Backend |
| [ ] | Docker + MinIO producciÃ³n CUAC | DevOps |
| [ ] | Deploy Vercel preview | DevOps |

---

## 10. Registro de cambios

### 2026-09-17 (lote 2) â€” ReparaciÃ³n EvidenciaVersion y versionado

- [Backend] Scripts: `prisma:repair-schema`, `prisma:verify`, `prisma:backfill-versiones`; `prisma:setup` encadenado
- [Backend] Carga evidencias/vigencias: BD antes que S3; rollback si falla Storage (evita 500 con archivo huÃ©rfano)
- [Backend] `reemplazarArchivo`: v2+ sin borrar v1 en bucket; compensaciÃ³n si falla subida
- [Docs] MemoriaGlobal Â§7.3: advertencia sobre `migrate resolve --applied` sin ejecutar SQL

### 2026-09-17 â€” Errores Supabase/Prisma documentados + fixes operativos

- [Docs] SecciÃ³n **Â§ 7 Errores conocidos** en MemoriaGlobal: P1001, P3005, P2021, 500 con S3 OK, bandeja Revisor vacÃ­a
- [Docs] `DIRECT_URL` session pooler; `S3_ENDPOINT` formato `*.storage.supabase.co`; bucket `documentos`
- [Backend] Semilla: 3 evidencias `EnRevision` + `EvidenciaVersion` v1
- [Backend] `FiltroExcepcionHttp`: log stack, mapeo Prisma/S3, campo `detalle` en desarrollo
- [Frontend] Bandeja revisor: fallback semilla si API vacÃ­a/falla

### Cambios pendientes de documentaciÃ³n oficial (F-02 / F-03 / APIs)

| Cambio | Documentar en |
|--------|----------------|
| Campo `version` en `Evidencia` | F-03 modelo datos |
| `PATCH /evidencias/:id/archivo` | Diseno_APIs_SIAC |
| Admin sin carga; visor `/administrador/evidencias/[id]` | F-02 roles / HU consulta |
| Confirmaciones UI acciones crÃ­ticas | F-02 usabilidad |
| Badge novedades cargador | F-02 notificaciones in-app |
| BÃºsqueda global Ctrl+K + `/busqueda?formato=` | Diseno_APIs_SIAC |
| `informesPowerBiSemilla` = 8 categorÃ­as calidad + `urlImagen` | Memoria frontend |
| `urlImagen` en `Programa` y `tarjetasResumenSemilla` | Memoria frontend |
| `PantallaCargandoSiac` | Memoria frontend |

### 2026-09-16 (lote 2) â€” UX, versionado e imÃ¡genes

- [Backend] Campo `version` en `Evidencia`; endpoint `PATCH /evidencias/:id/archivo`
- [Backend] Filtro `formato` (pdf/xlsx) en `GET /busqueda`
- [Frontend] Cargador: subir versiÃ³n corregida [n] en detalle de evidencia rechazada
- [Frontend] Admin: eliminado botÃ³n cargar; visor PDF en `/administrador/evidencias/[id]`
- [Frontend] `DialogoConfirmacion` en eliminar, aprobar, rechazar, reenviar, desactivar usuario
- [Frontend] Badge novedades cargador; `PantallaCargandoSiac` con barra de progreso
- [Frontend] BÃºsqueda global conectada a API; hint Ctrl+K / Esc
- [Frontend] `informesPowerBiSemilla` reemplazado por 8 categorÃ­as calidad con imagen
- [Frontend] `tarjetasResumenSemilla` con imagen; programas con slot 9:16

### 2026-09-16 â€” Sidebar, flujos documentales, SuperAdmin

- [Frontend] `crearEvidencia` envÃ­a `FormData` con archivo a `/evidencias` (fix `rutaArchivo` null)
- [Frontend] Componente `VisorDocumentoInline`; revisor y cargador usan URL firmada
- [Frontend] Ruta `/cargador/evidencias/[id]` con observaciones y reenvÃ­o a revisiÃ³n
- [Frontend] Sidebar plegable (`w-16`/`w-64`, tooltips, badge dot, `siac-sidebar-plegado`)
- [Backend] Rol `SuperAdmin` en schema; guards bypass; CRUD `/usuarios` (POST/PATCH/DELETE)
- [Backend] `GET /integracion/estado-storage` para diagnÃ³stico S3
- [Frontend] Rutas `/superadmin` y `/superadmin/usuarios`; menÃº unificado SuperAdmin
- [Backend] Semilla: usuario `superadmin@uniautonoma.edu.co` / `SuperAdmin2026`

### 2026-09-15 â€” AlineaciÃ³n F-03 + Supabase + API v1

- [Backend] Schema Prisma ampliado: `OrigenDato`, `ParAcademico`, campos maestros TI, `UsuarioPrograma`
- [Backend] MigraciÃ³n Supabase `Simulacion_siac` (12 tablas)
- [Backend] Supabase Storage S3 con URLs firmadas; convenciÃ³n rutas F-03
- [Backend] Prefijo `/api/v1`, Swagger `/api/docs`, filtro errores F-03
- [Backend] Nuevos mÃ³dulos: `integracion`, `ingesta`, `acreditacion`, `metricas`
- [Backend] Endpoints: enviar-revision, dictamen, historial, parsear-excel, sincronizar
- [Frontend] Cliente HTTP â†’ `/api/v1`; dictamen en ruta F-03; tipo `ParAcademico`
- [Docs] Reescritura `docs/etapa-0` y `docs/etapa-1` (Supabase, sin Docker)
- [Docs] Creado `MemoriaGlobal.md` unificando Backend, Frontend, Documentos

### 2026-09-08 â€” ImplementaciÃ³n full-stack (Etapas 0-4)

- [Backend] NestJS 10 con mÃ³dulos base
- [Frontend] Capa servicios HTTP + fallback mock
- [Docs] etapa-0 a etapa-4 + manuales

### 2026-09-03 â€” Prototipo frontend v0

- [Frontend] 19 rutas mock, login Moodle CUAC, CRUD Decreto 1330

---

*Fin del documento â€” SIAC Â· CUAC Â· PrÃ¡ctica profesional 2026*


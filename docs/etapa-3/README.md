# Etapa 3 — Calidad e integración

> **Sprint PDF:** 3 (08/10 – 18/11/2026)  
> **Historias:** HU-006, HU-007, HU-009  
> **Estado:** Cierre de Sprint 3 en repositorio (S3-CIERRE, 16/10) — HU-006 y HU-007 implementadas con E2E en CI; HU-009 con dashboards públicos configurados. La validación oficial vive en ClickUp.

> El estado oficial vive en ClickUp; este repositorio documenta el inicio de la Etapa 3 en código y docs.

## Objetivo

Flujo de aprobación server-side, vigencias automatizadas con cron, Power BI embed y pruebas de aceptación.

## Entregables

### Backend

- **HU-006:** `AprobacionModule` — dictaminar Validado/Rechazado + historial + notificación in-app
- **HU-007:** `VigenciasModule` — cron diario 6AM (America/Bogota), semáforo de vigencia (PO 13/10), outbox de correo con reintentos + alertas in-app
- **HU-009:** `PowerBiModule` — embed token con fallback documentado
- **NotificacionesModule:** alertas in-app por usuario + outbox `NotificacionSalida` + bitácora `GET /notificaciones/salida`
- **EstructuraModule:** CRUD etapas/carpetas/documentos normativos

### Frontend

- Sincronización dictamen con API
- Servicio Power BI embed
- Notificaciones desde API

## Endpoints

| Método | Ruta | HU |
|--------|------|-----|
| GET | `/api/aprobacion/pendientes` | HU-006 |
| POST | `/api/v1/evidencias/:id/dictamen` | HU-006 (canónico; el alias `POST /api/aprobacion/:id/dictaminar` se retiró) |
| GET/POST/PATCH/DELETE | `/api/vigencias` | HU-007 |
| POST | `/api/vigencias/ejecutar-cron` | HU-007 |
| GET | `/api/vigencias/paquetes-registro` | HU-007 (paquetes de vigencia MEN) |
| GET/POST | `/api/vigencias/demo/estado`, `/api/vigencias/demo/iniciar`, `/api/vigencias/demo/detener` | HU-007 (§0 demo acelerada) |
| GET | `/api/v1/programas/:id/vigencia` | HU-007 (§0: `{semaforo, segundosRestantes, modoPrueba}`) |
| GET | `/api/v1/notificaciones` | HU-006/007 |
| GET | `/api/v1/notificaciones/salida?estado=&page=&limit=` | HU-007 (C-8: bitácora del outbox; Administrador/SuperAdmin) |
| GET | `/api/v1/configuracion/vigencia` | HU-007 (T-007.3a: umbrales del semáforo; SuperAdmin/Administrador) |
| PATCH | `/api/v1/configuracion/vigencia` | HU-007 (T-007.3a: `mesesAvisoVigencia`/`mesesRojoVigencia`, 1..84 y aviso > rojo) |
| PATCH | `/api/v1/notificaciones/:id/leida` | Alertas in-app |
| PATCH | `/api/v1/notificaciones/marcar-todas-leidas` | Alertas in-app |
| GET/PUT | `/api/v1/powerbi/informes` | HU-009 (URLs públicas por categoría) |
| GET | `/api/v1/powerbi/embed-token?categoriaId=` | HU-009 (modo embebido, T-009.2) |
| CRUD | `/api/estructura/*` | Estructura normativa |

### Entorno de desarrollo (Postgres + correo)

1. `docker compose up -d` (Postgres en `localhost:5433`).
2. `cd Backend` → copiar `.env.example` → `.env`.
3. `pnpm prisma:deploy` → `pnpm prisma:seed` (usuarios por rol).
4. Correo en dev: `CORREO_CANAL=resend` + `RESEND_API_KEY` + `CORREO_DESDE` y
   `CORREO_DESTINATARIOS_PERMITIDOS` (lista de correos de prueba; vacía = no se envía nada).
   Por defecto `CORREO_CANAL=ninguno`. Producción: `CORREO_CANAL=smtp` y variables SMTP
   institucionales (ADR-008). La validación de arranque exige las variables de cada canal.

Tareas de infra **canceladas** respecto a Supabase remoto: INF-01 (buckets), INF-02 (baseline remoto), INF-03 (semilla remota de negocio).

### Variables de entorno — Power BI / cifras (HU-009)

```env
# Azure App Owns Data (producción)
POWERBI_CLIENT_ID=
POWERBI_CLIENT_SECRET=
POWERBI_TENANT_ID=
POWERBI_WORKSPACE_ID=
POWERBI_REPORT_ID_ESTUDIANTES=<id-del-informe>   # opcional

```

Sin `POWERBI_CLIENT_ID`, el modo embebido permanece simulado. En producción se usa **modo público**: iframe con URL de `ConfiguracionInformePowerBi` (panel admin en el dashboard). Los datos del informe vienen del Excel maestro refrescado en Power BI Service (ver ADR-009 y ADR-010).

### Checklist manual — Dashboard de métricas (Power BI)

1. Iniciar sesión como **Administrador** o **SuperAdmin**.
2. Ir a **Dashboard de métricas** → tarjetas de las 8 categorías.
3. Verificar iframe cuando la URL está configurada en el panel de informes Power BI.
4. Si falta URL o falla la carga, comprobar mensaje al administrador y botón **Reintentar** (sin gráficos nativos de respaldo).
5. Swagger: `GET /api/v1/powerbi/informes` y `GET /api/v1/powerbi/informes/:categoriaId/url` con Bearer JWT.

## HU-007 (cierre 16/10/2026): vigencias y alertas

Decisiones del PO (13/10): vigencia de registro de 7 años; **verde** hasta el fin del año 5;
**amarillo** al iniciar el año 6 (24 meses antes del fin); **rojo** 18 meses antes del fin;
**Vencido** al terminar (distinto de Rojo); **gris (SinVigencia)** sin resolución MEN.
Umbrales configurables en `ConfiguracionSIAC` (`mesesAvisoVigencia=24`, `mesesRojoVigencia=18`)
y relectura en cada corrida del cron/panel: cambiarlos no exige redeploy.

### Semáforo general — opción B (peor entre vigencia y avance)

`calcularSemaforoGeneral(avance, vigencia, anexoInfraVencido)` en `Backend/src/dominio/panel-siac.ts`:
RN-003 (anexo de Infraestructura vencido) fuerza **Rojo**; si no, manda el peor color
(Verde < Amarillo < Rojo), **Vencido cuenta como Rojo** y **SinVigencia se ignora** (manda el avance).
Nunca devuelve gris como color general. Los 30 casos (`panel-siac.spec.ts`, `it.each`):

| Vigencia ↓ / Avance → | Verde | Amarillo | Rojo | Verde+RN-003 | Amarillo+RN-003 | Rojo+RN-003 |
|---|---|---|---|---|---|---|
| Verde      | Verde    | Amarillo | Rojo | Rojo | Rojo | Rojo |
| Amarillo   | Amarillo | Amarillo | Rojo | Rojo | Rojo | Rojo |
| Rojo       | Rojo     | Rojo     | Rojo | Rojo | Rojo | Rojo |
| Vencido    | Rojo     | Rojo     | Rojo | Rojo | Rojo | Rojo |
| SinVigencia| Verde    | Amarillo | Rojo | Rojo | Rojo | Rojo |

La barra de vigencia del frontend muestra «Vencido» como etiqueta propia (antes todo fin de
vigencia era «Rojo»).

### Outbox de correo (C-4) e idempotencia

- `NotificacionSalida` (`Backend/prisma/schema.prisma`) con `claveEvento @unique` y
  `AlertaInApp.claveEvento String? @unique` (las filas históricas quedan en `null`).
- `NotificacionesDespachoService` crea alerta in-app + fila de outbox en la misma
  `prisma.$transaction` del evento; el correo ya no se envía dentro de la petición.
- Claves: `vigencia:{entidadId}:{resolucionId}:{fechaFinISO}:{umbral}:{usuarioId}` (la demo inserta
  `demo-{inicioSesión}` como resolución), `anexo_d1:{anexoId}:{fechaVencimientoISO}:{usuarioId}`,
  `dictamen:{evidenciaId}:v{version}:{usuarioId}` (HU-006 sin cambio visible).
- `ProcesadorNotificacionesSalidaService` (`@Cron` cada minuto, NestJS): reclama filas con
  `UPDATE` condicionado por estado/intentos (seguro ante varias instancias), envía y marca
  `Enviado/enviadoAt`; fallo → `intentos++`, `ultimoError` y backoff
  `CORREO_REINTENTO_BASE_SEGUNDOS · 2^(n-1)`; al llegar a `CORREO_MAX_INTENTOS` → `Fallido`.
  La alerta in-app nunca se revierte. Esta tabla es la bitácora del CA3.
- Destinatarios permitidos (`CORREO_DESTINATARIOS_PERMITIDOS`, coma, minúsculas): en desarrollo,
  fuera de la lista → fila `Descartado` con motivo; lista vacía = no se envía nada.
  En producción se usa SMTP universitario (ADR-008).

### Pruebas del cierre S3-CIERRE

- `Backend/test/e2e/umbrales-vigencia.e2e-spec.ts`: PATCH cambia los umbrales y el siguiente
  cálculo del semáforo los usa (un programa pasa de Verde a Amarillo al subir el aviso), con
  400 de validación y 403 para roles no autorizados.
- `Backend/test/e2e/alertas-vigencia.e2e-spec.ts` (CA3, sin sleeps): referencias inyectadas al
  evaluador, un programa que cruza amarillo/rojo/vencido → 3 eventos por destinatario activo sin
  duplicados al repetir el cálculo; outbox procesado con transporte en memoria (`Enviado`) y
  transporte que falla siempre (`Fallido` con `ultimoError` tras `CORREO_MAX_INTENTOS`) visible
  en `GET /notificaciones/salida`.
- Frontend (Vitest): `components/siac/tarjeta-umbrales-semaforo.test.tsx` (render, validación,
  envío, rol sin permiso) y `components/layout/campana-notificaciones.test.tsx` (contador, lista,
  marcado con API, polling 5 s con fake timers, vacío y error de red).

### Cron diario (T-007.2)

`@Cron('0 6 * * *', { timeZone: VIGENCIAS_CRON_ZONA ?? 'America/Bogota' })` evalúa los anexos que
vencen mañana (responsable por coincidencia exacta de correo + Administradores activos) y las
transiciones de vigencia de programas e institución: 1 aviso por destinatario
(Administrador/SuperAdmin/Revisor activos) e idempotente por `claveEvento` (reejecutar el cron o
reiniciar la API no duplica).

### Demo vigencia acelerada (§0)

5 minutos ≈ 7 años: **amarillo ≈ 3:34 (214 s)**, **rojo ≈ 3:56 (236 s)**, **vencido 5:00 (300 s)**.

```bash
# Backend/.env (solo desarrollo; con NODE_ENV=production la API no arranca)
VIGENCIA_MODO_PRUEBA=true
VIGENCIA_DURACION_PRUEBA_SEG=300
```

1. `pnpm demo:vigencia` → crea/reinicia el programa «DEMO Vigencia acelerada» con resolución = ahora.
2. En la UI del programa, «Iniciar prueba de vigencia (5 min)» (Administrador/SuperAdmin).
3. La barra y la campana refrescan cada 5 s (`GET /programas/:id/vigencia`), y el evaluador
   (intervalo de 10 s) emite las alertas de cada transición con claves aisladas de la demo.

### Umbrales editables (T-007.3a, cierre 16/10/2026)

`GET/PATCH /api/v1/configuracion/vigencia` (SuperAdmin/Administrador) lee y actualiza
`mesesAvisoVigencia`/`mesesRojoVigencia` en `ConfiguracionSIAC`. El DTO exige enteros 1..84 y
`mesesAvisoVigencia > mesesRojoVigencia` (400 con mensaje claro); el DTO se documenta en Swagger.
Ambos campos son obligatorios (reemplazo completo aunque el verbo sea PATCH). Decisión 16/10/2026:
`mesesRojoVigencia ≥ 1` en todas las capas (DTO, `validarUmbralesSemaforo` al arrancar y la tarjeta
del frontend). Sin módulo de auditoría: cada cambio queda en el log con el id del usuario y los
valores anterior/nuevo.
La tarjeta «Umbrales del semáforo» de `/administrador/vigencias` usa la misma validación y hace
`PATCH` con toast de éxito/error (visible solo para SuperAdmin/Administrador). GET y el evaluador
releen la BD en cada corrida: el cambio aplica al siguiente cálculo sin redeploy.

### Migración

`Backend/prisma/migrations/20261016120000_t007_3_umbrales_outbox/migration.sql` — creada con
`prisma migrate diff` (SQL aditivo: `CREATE TYPE/TABLE/INDEX`, `ADD COLUMN` nullable/con default y
un `UPDATE` condicionado de la fila `global` si conservaba 12 meses). **Aplicada el 16/10/2026**
(S3-CIERRE); `prisma migrate deploy` la registra en el historial sin cambios pendientes.

## Casos de prueba (CP-01 a CP-04)

| Caso | Entrada | Resultado esperado | Estado |
|------|---------|-------------------|--------|
| CP-01 | Login válido | JWT + redirección por rol | Diseñado |
| CP-02 | correo gmail.com | Rechazo dominio | Diseñado |
| CP-03 | PDF + metadatos Cargador | Estado Borrador | Diseñado |
| CP-04 | Admin GET borrador | HTTP 403 | Diseñado |

## Pruebas E2E del flujo de carga y panel (CP-E2E-01 a CP-E2E-05, T-010.4)

Archivo: `Backend/test/e2e/flujo-carga-panel.e2e-spec.ts` (Jest + supertest contra la API completa, PostgreSQL local o de CI y Storage en memoria). Se ejecutan con `pnpm test:e2e` en la CI (job *Backend CI*).

| Caso | Entrada | Resultado esperado | Estado |
|------|---------|-------------------|--------|
| CP-E2E-01 | Cargador sube un .docx G1 de Derecho (programa nuevo), lo envía; el Revisor marca 5 de 9 condiciones | El Admin ve la evidencia «ConObservaciones», G1 `5/9` en el panel, avance 55,56 % y `semaforoAvance = Amarillo` (umbrales por defecto 55/100 de `ConfiguracionSIAC`) | Automatizado |
| CP-E2E-02 | PDF renombrado a `.docx` | HTTP 400 (no es un ZIP de Word) | Automatizado |
| CP-E2E-03 | Revisor asignado a otro programa dictamina la evidencia de Derecho | HTTP 403 | Automatizado |
| CP-E2E-04 | Con una G1 abierta (Borrador/EnRevision/ConObservaciones/Rechazado legado), una segunda carga G1 responde 409 y el flujo real es subir una nueva versión (`PATCH /evidencias/:id/archivo`). Un borrador nunca enviado sigue sin aparecer en `GET /evidencias` del Admin (detalle 403/404) | Decisión HU-006 (16/10): la regla de 740c16c es correcta; el caso se reescribió sobre el flujo real | Automatizado |
| CP-E2E-05 | Anexo de categoría Infraestructura vencido (01/09/2026) vinculado a la G1 | `anexoInfraestructuraVencido = true` y `semaforoGeneral = Rojo` (RN-003) | Automatizado |

Otras suites E2E del cierre del Sprint 2: `vigencias.e2e-spec.ts` (anexos, R-D), `resolucion-men.e2e-spec.ts` (resolución MEN), `limpiar-anexos-sin-documento.e2e-spec.ts` (script de datos), `busqueda.e2e-spec.ts` y `humo.e2e-spec.ts`. Las pruebas del panel en el frontend (T-010.5) usan Vitest + Testing Library (ver `docs/adr/ADR-007-pilas-de-pruebas.md`).

## Incrementos entregados tras el cierre de Etapa 2 (10/10/2026)

No forman parte del checklist de [`etapa-2/README.md`](../etapa-2/README.md); se registran aquí para el arranque del Sprint 3:

| Área | Entrega |
|------|---------|
| HU-010 / panel | Pesos renovación programa G1/G2 **50/50**; avance institucional (`GET /programas/avance-institucional`); ciclo manual `inicioCicloTramiteAt` + `POST …/iniciar-ciclo-renovacion` |
| Alcance institucional | `Usuario.responsableProcesoInstitucional`, G3/G4 por asignación, `GET /institucion/resumen` |
| Admin UX | Métricas sin borradores (validadas / revisión / corrección); hero con avance institucional |
| Revisor | Panel «Mis revisiones» con detalle por programa o institución |

## Criterios de aceptación

- [ ] Flujo: Cargador sube → Revisor aprueba/rechaza → Admin ve solo Validado
- [ ] Cron actualiza semáforo vigencias
- [ ] Alerta in-app en vencimiento próximo
- [ ] Power BI embed o fallback Recharts documentado
- [ ] Tests unitarios auth pasan

## Flujo BPM

```text
Cargador → sube evidencia (Borrador)
  → Revisor → aprueba (Validado) / rechaza (Rechazado + observaciones)
    → Administrador/Par → solo lectura de Validado
```

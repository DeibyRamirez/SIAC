# TODO — Planeación Sprint 3 · Calidad e integración (Etapa 3)

> Generado el 13/10/2026 a partir de la revisión de código, documentación del repo y ClickUp (lista «Sprint 3 · Calidad e integración», id 901717352938).
> **Commit revisado:** `d6905094bde45d28a4f54bf5940c07aefe42dfb6` (`develop_v2` = `origin/develop_v2`, 09/10/2026 23:29 -05, «[test][Sprint 2][HU-008] E2E busqueda con responsable institucional»).
> **Ojo:** la copia local `D:\Proyectos\SIAC` tiene **trabajo sin commitear** (33 archivos modificados + archivos nuevos) que implementa buena parte del correo y la campana de notificaciones (módulo `Backend/src/correo/`, `NotificacionesDespachoService`, ADR-008, migración `20261009200000_alerta_metadata`, `campana-notificaciones.tsx`). Este plan distingue **[commit]** (lo que está en `d690509`) de **[WIP local]** (lo que existe solo en el árbol de trabajo). Lo WIP no cuenta como hecho hasta que esté commiteado, con pruebas y CI verde.

## 1. Resumen

| HU | % estimado (commit) | % con WIP local | Estado |
|----|----|----|----|
| HU-006 · Aprobar/rechazar | 70 % | 80 % | Parcial (T-006.4 **pausada**, fuera del cálculo) |
| HU-007 · Vigencias y alertas | 50 % | 65 % | Parcial |
| HU-009 · Dashboard Power BI | 35 % | 35 % | Parcial |

| Subtarea | Estado | % |
|----|----|----|
| T-006.1 Observaciones por condición | hecho | 90 % |
| T-006.2 Dictamen y máquina de estados | parcial | 80 % |
| T-006.3 Notificación al Cargador | parcial | 50 % (85 % con WIP) |
| T-006.4 RN-001 Par académico | **pausada** (decisión PO) | — |
| T-007.1 Fecha de vigencia | hecho | 90 % |
| T-007.2 Cron diario de vigencias | parcial | 40 % |
| T-007.3 Semáforo combinado | parcial | 70 % |
| T-007.4 Alertas in-app y correo + bitácora SMTP | parcial | 30 % (60 % con WIP) |
| T-009.1 Vista/dataset n/9 para Power BI | falta | 10 % |
| T-009.2 Embed token (App Owns Data) | parcial | 30 % |
| T-009.3 Componente embed con fallback | parcial (casi hecho) | 75 % |
| T-009.4 Pruebas de aceptación con el cliente | falta | 10 % |

Pendientes heredados del Sprint 2: ver §5.

Criterios de aceptación de ClickUp (HU):

- **HU-006** (1) Borrador → Revisor aprueba → Validado y visible al Par: **parcial** (el dictamen solo opera sobre `EnRevision`; el Par está pausado). (2) Rechazo con observaciones → Cargador notificado y estado Rechazado: **parcial** (por decisión PO del 06/10 G1/G3 terminan en `ConObservaciones`/`Cumple` y G2/G4 en `Validado`/`ConObservaciones`; `Rechazado` solo queda para legado; notificación in-app sí, correo solo en WIP). (3) Par pide Borrador → 403: **pausada**.
- **HU-007** (1) Cron diario deja semáforo vigente/próximo/vencido: **parcial** (el estado se calcula al consultar; el cron no persiste nada). (2) D-1 → correo al responsable + alerta in-app: **parcial** (solo anexos, por coincidencia de texto del responsable). (3) Fallo SMTP → error en bitácora y alerta in-app se mantiene: **parcial** (se loguea con `Logger`, no hay bitácora persistente).
- **HU-009** (1) Usuario autorizado + embed token válido → informe dentro de la página: **parcial** (solo vista pública «Estudiantes»; token simulado). (2) Token expirado o fallo Azure → fallback sin salir de SIAC: **hecho** para Estudiantes (Recharts desde `/cifras/estudiantes`).

## 2. HU-006 · Aprobar/rechazar (RF-002)

### T-006.1 · Observaciones por condición — **hecho (90 %)**
- **Qué hay:** `Backend/src/aprobacion/dto/dictaminar.dto.ts` (`CondicionDictamenDto` / `CondicionInstitucionalDictamenDto` con `observacion`); `Backend/src/documentos/documentos.service.ts` `dictaminar()` (l. ~709-960) arma el resumen `• Condición: observación`, guarda evaluaciones por versión (`EvaluacionCondicionEvidencia`, `EvaluacionCondicionInstitucionalEvidencia`), comentarios inline (`EvidenciaComentario`) y genera el .docx con observaciones (`procesarDocxConObservaciones`). Ruta canónica `POST /api/v1/evidencias/:id/dictamen`; alias deprecado `POST /api/v1/aprobacion/:id/dictaminar`.
- **Qué falta:** exigir texto de observación cuando `cumple=false` (hoy es opcional); prueba unitaria específica.
- **Tareas:**
  1. **Qué:** validar observación obligatoria en condiciones no cumplidas. **Dónde:** `documentos.service.ts` (`dictaminar`), `documentos.service.spec.ts`, `Frontend/app/(app)/revisor/bandeja/[id]/page.tsx`. **Criterio:** dictamen con una condición `cumple:false` sin observación → HTTP 400 con mensaje en español; la UI bloquea el envío. **Cómo probar:** Jest (spec del servicio) + Vitest del formulario.

### T-006.2 · Dictamen y máquina de estados — **parcial (80 %)**
- **Qué hay:** solo se dictamina desde `EnRevision` (400 si no); G1 → `Cumple` (9/9) u `ConObservaciones`; G3 → `Cumple` (6/6) u `ConObservaciones`; G2/G4 sin puntaje → `Validado` u `ConObservaciones` con texto obligatorio; legado → `Validado`/`Rechazado`. Historial (`registrarHistorial`), recálculo de avance, guard `GuardAlcancePrograma` (403 si el revisor no está asignado; CP-E2E-03).
- **Qué falta:** (a) la página del revisor envía el dictamen **dos veces** (ver §5.4); (b) no hay transición explícita documentada en un solo lugar (tabla de transiciones); (c) el alias `/aprobacion/:id/dictaminar` sigue vivo; (d) los CA de ClickUp todavía hablan de «Rechazado» (pregunta al PO).
- **Tareas:**
  1. **Qué:** extraer la máquina de estados a `Backend/src/dominio/maquina-estados-evidencia.ts` (función pura `transicionPermitida(origen, destino, guia)`). **Dónde:** nuevo archivo + `documentos.service.ts`. **Criterio:** todas las transiciones válidas/ inválidas cubiertas por una tabla de pruebas. **Cómo probar:** `pnpm test` (spec nuevo con `it.each`).
  2. **Qué:** E2E del ciclo completo G2 y G4 (Validado / ConObservaciones → nueva versión → EnRevision). **Dónde:** `Backend/test/e2e/dictamen-sin-puntaje.e2e-spec.ts`. **Criterio:** estados e historial correctos; 400 si se envían condiciones a G2/G4. **Cómo probar:** `pnpm test:e2e`.
  3. **Qué:** decidir retiro del alias `/aprobacion/:id/dictaminar` (marcado `@deprecated`). **Dónde:** `Backend/src/aprobacion/*`. **Criterio:** si se retira, el frontend no lo usa (`rg "/aprobacion/" Frontend` vacío salvo `pendientes`). **Cómo probar:** build + E2E.

### T-006.3 · Notificación al Cargador — **parcial (50 %; 85 % con WIP)**
- **Qué hay [commit]:** tras el dictamen se crea `AlertaInApp` para `evidencia.autorId` (`construirNotificacionDictamen` + `NotificacionesService.crear`); `GET /api/v1/notificaciones`, `PATCH /api/v1/notificaciones/:id/leida`; el frontend las lee en `Frontend/lib/servicios/programas.servicio.ts`.
- **Qué hay [WIP local]:** `NotificacionesDespachoService.notificar()` crea la alerta y envía correo (Resend/SMTP); aviso a revisores al enviar a revisión (`revision_pendiente`); `metadata` JSON en `AlertaInApp`; `PATCH /notificaciones/marcar-todas-leidas`; campana `Frontend/components/layout/campana-notificaciones.tsx` con navegación por tipo (`lib/utilidades/accion-notificacion.ts` + test); E2E `Backend/test/e2e/notificaciones.e2e-spec.ts`.
- **Qué falta:** commitear el WIP en commits pequeños; plantilla de correo de dictamen (asunto/cuerpo con enlace); idempotencia y reintentos (ver §4); el envío de correo ocurre dentro de la petición del dictamen (latencia).
- **Tareas:**
  1. **Qué:** integrar el WIP de correo/notificaciones (ver §4, tareas C-1..C-3). **Criterio:** `pnpm test`, `pnpm test:e2e`, `vitest run`, builds verdes. **Cómo probar:** CI.
  2. **Qué:** E2E «dictamen ConObservaciones → Cargador tiene 1 alerta tipo dictamen con `metadata.evidenciaId` y el transporte simulado registró 1 correo». **Dónde:** `notificaciones.e2e-spec.ts`. **Cómo probar:** `pnpm test:e2e` con proveedor de correo en memoria.

### T-006.4 · RN-001 Par académico — **PAUSADA**
- Decisión del PO (MemoriaGlobal.md, 07/10): Par académico en pausa; rol y datos intactos, sin panel ni página 403. **No planificar desarrollo en este sprint.** Lo existente (`servicio-alcance-programa.ts`, CP-E2E-04 sobre borradores) se mantiene sin cambios.

## 3. HU-007 · Vigencias y alertas (RF-003)

### T-007.1 · Fecha de vigencia — **hecho (90 %)**
- **Qué hay:** `ResolucionMen` (PDF, fecha manual) en `Backend/src/programas/resolucion-men.service.ts` y `institucion.controller.ts`/`programas.controller.ts` (límite 20 MB `dominio/archivo-pdf.ts`); fin de vigencia = fecha + `ConfiguracionSIAC.aniosVigencia` (7) calculado al consultar (`dominio/panel-siac.ts` `calcularFechaFinVigencia`); `AnexoVigencia.fechaVencimiento` / `aniosVigencia` (7); E2E `resolucion-men.e2e-spec.ts`, `vigencias.e2e-spec.ts`.
- **Qué falta:** nada funcional; solo confirmar el umbral de amarillo (ver T-007.3).

### T-007.2 · Cron diario de vigencias — **parcial (40 %)**
- **Qué hay:** `@Cron(EVERY_DAY_AT_6AM)` en `Backend/src/vigencias/vigencias.service.ts` `actualizarVigenciasDiarias()`; `ScheduleModule.forRoot()` en `app.module.ts`; disparo manual `POST /api/v1/vigencias/ejecutar-cron` (Administrador). Recorre anexos y avisa solo si vencen **mañana (D-1)**.
- **Qué falta:** (a) no evalúa la **resolución MEN** de programas/institución (entrada a amarillo = año 6, vencida = rojo); (b) sin idempotencia: ejecutar dos veces el mismo día duplica alertas; (c) `findMany()` sin filtro; (d) zona horaria implícita del servidor (debe ser America/Bogota); (e) búsqueda de usuario por `correo contains` (frágil; el WIP lo cambia a coincidencia exacta).
- **Tareas:**
  1. **Qué:** cron evalúa transiciones de vigencia de programas e institución: al pasar a Amarillo y a Rojo (y D-1 para anexos). **Dónde:** `vigencias.service.ts` (o nuevo `vigencias-cron.service.ts`), `dominio/panel-siac.ts`. **Criterio:** con fecha simulada, un programa cuya resolución cumple el umbral genera 1 evento `vigencia_amarilla`; uno vencido genera 1 `vigencia_vencida`; sin resolución no genera nada. **Cómo probar:** Jest con `jest.useFakeTimers().setSystemTime(...)`.
  2. **Qué:** idempotencia por clave de evento (ver §4.5). **Criterio:** dos ejecuciones el mismo día → mismo número de alertas. **Cómo probar:** E2E llamando dos veces `POST /vigencias/ejecutar-cron`.
  3. **Qué:** fijar `timeZone: 'America/Bogota'` en el `@Cron`. **Cómo probar:** revisión de código + spec que verifica la metadata del decorador o configuración.

### T-007.3 · Semáforo combinado — **parcial (70 %)**
- **Qué hay:** `calcularSemaforoVigencia` (gris `SinVigencia` sin resolución, amarillo desde `mesesAvisoVigencia` antes del fin, rojo vencida) y combinación con avance (`panel-siac.ts` l. ~112-145); regla RN-003 de anexo de Infraestructura vencido → `semaforoGeneral = Rojo` (CP-E2E-05); umbrales en `ConfiguracionSIAC`.
- **Qué falta:** (a) **discrepancia de umbral:** `mesesAvisoVigencia` por defecto = 12 ⇒ amarillo desde el inicio del **año 7**; el contexto del PO dice «amarillo en el año 6» (⇒ 24 meses). Confirmar y ajustar el valor por defecto **solo en la semilla/migración local**, nunca contra BD compartida; (b) «anexos próximos a vencer» no entra en el semáforo combinado (solo vencidos de Infraestructura); (c) «tipo de anexo formal» no está definido.
- **Tareas:**
  1. **Qué:** ajustar umbral tras respuesta del PO. **Dónde:** `ConfiguracionSIAC` (default), `panel-siac.ts`, `vigencia-registro.test.ts` (frontend). **Criterio:** resolución del 01/01/2020 → Verde hasta 31/12/2024, Amarillo desde 01/01/2025 (si son 24 meses), Rojo desde 01/01/2027. **Cómo probar:** Jest + Vitest con fechas fijas.
  2. **Qué:** incluir anexos «Próximo» en el semáforo combinado (Amarillo). **Dónde:** `panel-programas.service.ts`. **Criterio:** programa verde con un anexo crítico próximo a vencer → Amarillo. **Cómo probar:** E2E en `vigencias.e2e-spec.ts`.

### T-007.4 · Alertas in-app y correo con bitácora SMTP — **parcial (30 %; 60 % con WIP)**
- **Qué hay [commit]:** in-app + `nodemailer` directo en `vigencias.service.ts` con `try/catch` → `Logger.error` (no persistente).
- **Qué hay [WIP]:** `notificarVigencia()` en `NotificacionesDespachoService`, canales Resend/SMTP/nulo, fallo de correo no revierte la alerta.
- **Qué falta:** bitácora persistente de fallos (CA 3), reintentos, preferencias, plantilla. Ver §4.

## 4. HU-009 · Dashboard Power BI (RF-005)

### T-009.1 · Vista/dataset n/9 por programa y condición — **falta (10 %)**
- **Qué hay:** `Backend/src/cifras/*` sirve cifras de Estudiantes desde JSON semilla (`cifras/datos`); puntajes n/9 existen en `Evidencia.puntajeActual` y `EvaluacionCondicionEvidencia`, pero no hay vista SQL ni endpoint de dataset.
- **Tareas:** **Qué:** vista `vw_puntajes_condicion_programa` (programa, guía, condición, cumple, versión, fecha) mediante migración Prisma **solo aplicada en local/CI**; o endpoint `GET /api/v1/cifras/puntajes` de solo lectura. **Dónde:** `Backend/prisma/migrations/<nueva>`, `cifras.service.ts`. **Criterio:** devuelve una fila por condición de la última versión dictaminada; G2/G4 excluidos (sin puntaje). **Cómo probar:** E2E con semilla de 1 G1 5/9 → 9 filas, 5 `cumple=true`.

### T-009.2 · Embed token (App Owns Data) — **parcial (30 %)**
- **Qué hay:** `GET /api/v1/powerbi/embed-token?categoriaId=estudiantes` (`powerbi.service.ts`); sin `POWERBI_CLIENT_ID` devuelve vista pública + `fallback:true`; con él devuelve `embedToken: 'token-simulado-desarrollo'` (no real).
- **Tareas:** **Qué:** obtener token AAD (client credentials) y llamar a `GenerateToken` de la API REST de Power BI; cachear hasta expiración. **Dónde:** `powerbi.service.ts` (+ cliente HTTP inyectable). **Criterio:** con cliente HTTP simulado devuelve token y `expiration`; ante 401/5xx devuelve `fallback:true` y mensaje en español, sin exponer secretos. **Cómo probar:** Jest con cliente simulado; prueba manual con credenciales reales solo en `.env` local.

### T-009.3 · Componente embed con fallback — **parcial (75 %)**
- **Qué hay:** `Frontend/components/siac/contenedor-informe-powerbi.tsx`, `rejilla-informes-powerbi.tsx`, `tarjeta-informe-powerbi.tsx`, página `app/(app)/administrador/dashboard/page.tsx`; botón «Reintentar carga del informe» y fallback Recharts.
- **Qué falta:** embed con token real (`powerbi-client`/`powerbi-client-react`) en vez de iframe público; refresco del token antes de expirar; pruebas Vitest del fallback.
- **Tareas:** **Qué:** Vitest+RTL: token inválido → se ve fallback y botón de reintento; reintento → vuelve a pedir el token. **Dónde:** `contenedor-informe-powerbi.test.tsx`. **Cómo probar:** `pnpm vitest run`.

### T-009.4 · Pruebas de aceptación con el cliente — **falta (10 %)**
- **Qué hay:** checklist manual en `docs/etapa-3/README.md`.
- **Tareas:** guion de aceptación (.docx, ver reglas) con los CA de HU-006/007/009 y acta firmada por el PO; registrar resultados en `docs/sprint-reviews/sprint-3.md`.

## 5. Pendientes heredados del Sprint 2

1. **Bandeja del Revisor y G3/G4** — **parcial.** `Backend/src/common/alcance/servicio-alcance-programa.ts` (l. ~116-130): el Revisor ve G3/G4 solo si `responsableProcesoInstitucional=true`; sin ese flag y sin SuperAdmin no los ve. **Tarea:** confirmar con el PO si es el comportamiento deseado; si sí, prueba E2E que lo fije y mensaje en la bandeja vacía; si no, ampliar el filtro. **Cómo probar:** E2E con dos revisores (con y sin flag).
2. **25 MB vs 20 MB** — **sigue abierto, pero en evidencias, no en la resolución.** `Frontend/app/(app)/cargador/evidencias/nueva/page.tsx` l. 261-262 y 369 dicen 25 MB; backend `documentos.service.ts` l. 77 = 20 MB. La resolución ya está alineada (20 MB en `tarjeta-cargar-resolucion.tsx` y `dominio/archivo-pdf.ts`). **Tarea:** constante compartida de 20 MB en el frontend. **Criterio:** archivo de 21 MB rechazado en la UI con «20 MB». **Cómo probar:** Vitest.
3. **`start:prod`** — **sigue abierto.** `Backend/package.json` `"start:prod": "node dist/main"`; como `tsconfig.json` incluye `prisma/semilla.ts`, la salida queda en `dist/src/main.js`. **Tarea:** cambiar a `node dist/src/main.js` (o `sourceRoot`/`tsconfig.build.json`). **Criterio:** `pnpm build && pnpm start:prod` levanta la API. **Cómo probar:** paso en CI tras el build (arranque de la API y petición de humo como en `humo.e2e-spec.ts`).
4. **Dictamen enviado dos veces** — **sigue abierto.** `Frontend/app/(app)/revisor/bandeja/[id]/page.tsx` l. ~487 llama a `dictaminarEvidenciaApi` y luego `dictaminarEvidencia` del almacén (`components/auth/proveedor-almacen.tsx` l. ~231-250) vuelve a llamar a la API (el segundo falla con 400 y se traga el error). **Tarea:** que el almacén solo actualice estado local tras la llamada (o que la página no llame directo). **Criterio:** una sola petición `POST /evidencias/:id/dictamen` por dictamen. **Cómo probar:** Vitest con `fetch` simulado contando llamadas.
5. **PR #8** (propietario único de evidencia, HU-010) — **abierto, sin merge, con conflictos** (`mergeable_state: dirty`, base `9874af2`). Su migración `20261006050000_evidencia_propietario_checks` y `resolverPropietario` **no** están en `develop_v2`. **Tarea:** decidir con el PO si aún aplica (develop_v2 ya avanzó con `responsableProcesoInstitucional`); si aplica, rebase sobre `develop_v2`, renumerar migración después de `20261009181000`, CI verde; si no, cerrar con comentario.

## 6. Correo y notificaciones in-app

### 6.1 Qué existe
- **[commit]** Tabla `AlertaInApp` (`id, usuarioId, mensaje, leida, tipo, createdAt`, índice `usuarioId+leida`); `NotificacionesModule` (`crear`, `listarPorUsuario` 50 últimas, `marcarLeida`); `nodemailer` y `@nestjs/schedule` instalados; cron 6 AM de anexos; variables `SMTP_HOST/PORT/USUARIO/CONTRASENA/FROM`.
- **[WIP local, sin commit]** ADR-008 (Resend en desarrollo, SMTP institucional en producción); `Backend/src/correo/` (puerto `ProveedorCorreo`, adaptadores Resend/SMTP/nulo, `resolverCanalCorreo`, modo sandbox `RESEND_CORREO_SANDBOX`, specs); `NotificacionesDespachoService` (in-app + correo, el fallo de correo no revierte), `NotificacionesDestinatariosService`, `NotificacionesAvanceService` (umbral de avance con deduplicación de 24 h por `metadata`); columna `AlertaInApp.metadata Json?` (migración `20261009200000_alerta_metadata`); `marcar-todas-leidas`; campana en la barra superior; E2E de notificaciones; nuevas claves en `.env.example`.
- **No existe:** tabla outbox/bitácora de envíos, reintentos, clave de idempotencia, preferencias por usuario, plantillas (solo texto plano), alertas de vigencia de la resolución MEN (año 6 / vencida).

### 6.2 Proveedor y configuración (.env.example, sin secretos)
```env
# Canal: resend | smtp | ninguno (en pruebas y CI: ninguno o memoria)
CORREO_CANAL="ninguno"
CORREO_DESDE="SIAC <notificaciones@dominio-verificado.example>"
RESEND_API_KEY=""
RESEND_CORREO_SANDBOX=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SEGURO="false"
SMTP_USUARIO=""
SMTP_CONTRASENA=""
# Enlaces en los correos
SIAC_URL_FRONTEND="http://localhost:3000"
# Reintentos del outbox
CORREO_MAX_INTENTOS="5"
CORREO_REINTENTO_BASE_SEGUNDOS="60"
# Cron de vigencias
VIGENCIAS_CRON_ZONA="America/Bogota"
```
Validar al arranque (en `configuracion.env.ts`) que si `CORREO_CANAL=smtp` existan `SMTP_HOST` y `CORREO_DESDE`; nunca loguear contraseñas ni API keys.

### 6.3 Plantillas
- Carpeta `Backend/src/correo/plantillas/` con funciones puras `(datos) => { asunto, texto, html }` por tipo: `dictamen_validado`, `dictamen_con_observaciones`, `dictamen_cumple`, `revision_pendiente`, `vigencia_amarilla`, `vigencia_vencida`, `anexo_vence_manana`, `avance_umbral`.
- Español, marca CUAC (paleta de `docs/paleta-colores-frontend.md`), enlace profundo (`SIAC_URL_FRONTEND` + ruta de `accion-notificacion.ts`), sin datos sensibles; escapar HTML de textos del usuario (observaciones).
- Pruebas: snapshot de asunto/texto por plantilla.

### 6.4 Eventos que disparan avisos
| Evento | Destinatario | In-app | Correo |
|---|---|---|---|
| Dictamen Validado / Cumple | Cargador autor | sí | sí |
| Dictamen Con observaciones (incluye observaciones por condición) | Cargador autor | sí | sí |
| Evidencia enviada a revisión | Revisores asignados (o responsables institucionales para G3/G4) | sí | sí (preferencia) |
| Vigencia entra en amarillo (año 6, según umbral confirmado) | Administradores + responsable del programa | sí | sí |
| Vigencia vencida | Administradores + responsable | sí | sí |
| Anexo vence mañana (D-1) | Responsable del anexo | sí | sí |
| Avance cruza umbral | Administradores | sí | opcional |

### 6.5 Reintentos e idempotencia (propuesta)
- Tabla `NotificacionSalida` (outbox): `id`, `claveEvento` **@unique** (p. ej. `dictamen:{evidenciaId}:v{version}:{usuarioId}`, `vigencia_amarilla:{programaId}:{fechaFin}:{usuarioId}`, `anexo_d1:{anexoId}:{fecha}`), `usuarioId`, `canal` (`correo`), `tipo`, `payload Json`, `estado` (`Pendiente|Enviado|Fallido|Descartado`), `intentos`, `ultimoError`, `proximoIntentoAt`, `enviadoAt`, timestamps.
- `AlertaInApp` también con `claveEvento` única (nullable) para no duplicar la alerta.
- La alerta in-app y la fila outbox se crean en la **misma transacción** que el cambio de negocio; el correo lo envía un procesador (`@Cron` cada minuto o `setInterval` controlado) fuera de la petición, con backoff exponencial y máximo `CORREO_MAX_INTENTOS`; al agotar → `Fallido` con `ultimoError` (esto es la **bitácora** que pide el CA 3 de HU-007).
- Endpoint de solo lectura para Administrador: `GET /api/v1/notificaciones/salida?estado=Fallido`.
- La migración se crea con `prisma migrate dev` **solo en Postgres local (docker compose)**; nunca aplicar contra la BD compartida desde una máquina de desarrollo.

### 6.6 Preferencias de usuario
- Tabla `PreferenciaNotificacion` (`usuarioId`, `tipo`, `correo Boolean @default(true)`), o columna JSON en `Usuario`. La in-app no se desactiva (es el registro); el correo sí, salvo eventos críticos (vigencia vencida) si el PO lo decide.
- UI: sección «Notificaciones» en el perfil; `GET/PUT /api/v1/usuarios/me/preferencias-notificacion`.

### 6.7 Pruebas con transporte simulado
- `CorreoMemoriaProveedor` (implementa `ProveedorCorreo`, guarda mensajes en un arreglo) registrado en `test/utilidades/app-e2e.ts`; opción `fallarSiguientes(n)`.
- Jest: plantillas, `resolverCanalCorreo`, despacho (fallo de correo no revierte la alerta), procesador outbox (reintento, backoff, `Fallido` tras N intentos), idempotencia (doble evento → 1 fila).
- E2E: dictamen → 1 alerta + 1 correo en memoria; cron dos veces → sin duplicados; fallo SMTP → alerta presente y fila `Fallido` con error.
- Vitest: campana (contador, marcar todas leídas, navegación por tipo).

### 6.8 Tareas
- **C-1** Commitear el módulo `correo/` + ADR-008 + `.env.example` (sin secretos). **Criterio:** specs verdes; `CORREO_CANAL=ninguno` en CI.
- **C-2** Commitear `NotificacionesDespachoService`/destinatarios/avance + migración `metadata` (probada solo en local/CI). **Criterio:** E2E de notificaciones verde.
- **C-3** Commitear campana y utilidades frontend + tests Vitest.
- **C-4** Outbox + idempotencia + procesador con reintentos (6.5). **Criterio:** pruebas de 6.7.
- **C-5** Plantillas (6.3). **C-6** Eventos de vigencia de resolución MEN (T-007.2). **C-7** Preferencias (6.6). **C-8** Vista de fallidos para Administrador.

## 7. Orden sugerido, dependencias y riesgos

1. Arreglos rápidos heredados: §5.3 `start:prod`, §5.4 doble dictamen, §5.2 límite 20 MB (independientes, 1 commit cada uno).
2. Decisión sobre PR #8 (afecta migraciones y propietario de evidencias; resolver antes de crear migraciones nuevas para evitar choques de orden).
3. C-1 → C-2 → C-3 (integrar WIP local; ya existe y es la base).
4. C-4 outbox + idempotencia → C-5 plantillas → T-006.3 cerrado.
5. Respuesta PO sobre umbral → T-007.3 → C-6 / T-007.2 → T-007.4 (bitácora = outbox).
6. T-006.1 / T-006.2 (validaciones y máquina de estados).
7. C-7 preferencias, C-8 vista de fallidos.
8. HU-009: T-009.1 → T-009.2 (requiere credenciales Azure de TI) → T-009.3 → T-009.4 (cierre con cliente).

**Riesgos:** WIP grande sin commitear en una sola máquina (riesgo de pérdida y de commits enormes); Resend no entrega a dominios institucionales sin dominio verificado (usar sandbox); SMTP institucional depende de TI; credenciales Azure/Power BI pueden no llegar en el sprint (mantener fallback); el cron con varias instancias del backend duplicaría envíos (mitigado con la clave única); zona horaria del servidor; conflictos de migraciones con PR #8; CA de ClickUp desalineados con decisiones del PO (Rechazado vs Con observaciones).

## 8. Preguntas abiertas para el PO

1. ¿Amarillo de vigencia desde el **inicio del año 6** (24 meses antes del fin) o desde el año 7 (12 meses, valor actual de `mesesAvisoVigencia`)?
2. Los CA de HU-006 dicen «Rechazado»; el código usa «Con observaciones» (decisión 06/10). ¿Se actualizan los CA en ClickUp?
3. HU-007 CA 2 pide D-1; ¿se mantiene D-1 para anexos y además avisos al entrar en amarillo y al vencer la resolución MEN? ¿Recordatorios periódicos (p. ej. mensual) durante el amarillo?
4. ¿Quién recibe las alertas de vigencia: Administradores, Cargador/Revisor asignados al programa, o un responsable explícito por programa?
5. ¿Qué es un «anexo crítico» / «tipo de anexo formal» para el semáforo combinado (T-007.3)? ¿Solo Infraestructura u otras categorías?
6. ¿Los revisores sin `responsableProcesoInstitucional` deben ver G3/G4 en su bandeja?
7. ¿PR #8 sigue vigente o se cierra?
8. ¿El usuario puede desactivar correos? ¿Cuáles eventos son obligatorios?
9. Proveedor de correo en producción: ¿SMTP institucional confirmado por TI (host, puerto, remitente)? ¿Dominio verificado para Resend en desarrollo?
10. HU-009: ¿habrá credenciales Azure (App Owns Data) este sprint? ¿Qué informes además de «Estudiantes»? ¿Fecha de la sesión de aceptación con el cliente?

## 9. Reglas para Cursor

- Código, comentarios de dominio, mensajes y UI en **español**.
- Usar las skills del proyecto (`.agents/skills/`): `siac-nextjs-nestjs-crud` (API/páginas), `siac-diseno-web-responsive` (UI), `siac-powerbi-datos` (HU-009), `siac-documentacion-arquitectura` (docs/ADR), `prisma-*` (migraciones), `verification-before-completion` antes de cerrar cada tarea; respetar la regla del núcleo y `AGENTS.md`; actualizar `MemoriaGlobal.md` tras cambios significativos.
- **Planear antes de codificar, por HU:** escribir el plan (archivos, pruebas, riesgos) y validarlo antes de tocar código.
- Commits pequeños y atómicos con el formato `[tipo][Sprint 3][HU-xxx] descripción`; una tarea por commit cuando sea posible.
- CI verde siempre (`pnpm test`, `pnpm test:e2e`, `pnpm build` en Backend; `tsc --noEmit`, `vitest run`, `next build` en Frontend). Pruebas: Jest + supertest (backend) y Vitest + Testing Library (frontend), según ADR-007.
- Commits de un solo autor, **DeibyRamirez**, sin trailers (`Co-authored-by`, `Signed-off-by`, etc.).
- Evidencias solo **.docx** (la única excepción es la resolución MEN en PDF).
- **No ejecutar migraciones contra bases compartidas** (Supabase/producción); solo Postgres local (docker compose) o CI.
- Nunca commitear `.env` ni secretos; solo claves vacías o de ejemplo en `.env.example`. Usar `pnpm`.
- Par académico (T-006.4) en pausa: no tocar su flujo.

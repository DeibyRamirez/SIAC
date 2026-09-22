# Memoria del proyecto — SIAC

> **Instrucción para agentes de IA:** Leer este archivo **completo** antes de crear, modificar o diagnosticar cualquier parte del proyecto. Tras cada sesión de trabajo significativa, actualizar las secciones **Estado actual**, **Tareas** y **Registro de cambios** al final del documento.

| Campo | Valor |
|-------|-------|
| **Última actualización** | 2026-09-08 |
| **Versión frontend** | `0.1.0` (`Frontend/package.json`) |
| **Versión backend** | `0.1.0` (`backend/package.json`) |
| **Rama activa** | Simulación SIAC — implementación completa |
| **Repositorio remoto** | `https://github.com/BICHO128/SISTEMA-SIAC.git` |
| **Ruta local** | `D:\Proyectos\Simulacion_SIAC` |
| **Institución** | Corporación Universitaria Autónoma del Cauca (CUAC) — Dependencia de Planeación / SIAC |
| **Marco normativo** | Decreto 1330 de 2021 (6 CI + 9 CP, etapas Pre-radicación / Radicación) |
| **Fase actual** | Sistema full-stack funcional (NestJS + Next.js + PostgreSQL) |
| **Meta inmediata** | Validación por etapas con stakeholders CUAC |

---

## 1. Qué es este proyecto

**SIAC** (Sistema Interno de Aseguramiento de la Calidad) es una plataforma web para la **gestión, centralización y trazabilidad** de indicadores, procesos y evidencias institucionales, alineada al proceso de acreditación de la SIAC.

**Prioridad actual:** entregar un **prototipo frontend funcional** que replique el look & feel del diseño v0.dev, con datos mock y CRUD local, listo para integrar con el backend planificado (NestJS + Prisma + PostgreSQL + S3).

**Flujo de negocio central (evidencias):**

```text
Cargador descarga plantilla → diligencia y sube evidencia (borrador)
  → Revisor valida / rechaza con observaciones
  → Administrador supervisa, configura estructura normativa y métricas
  → Evidencias validadas alimentan dashboards y control de vigencias
```

**Alcance de esta entrega (frontend prototipo):**

- Auth mock por rol con correo `@uniautonoma.edu.co`
- 3 roles: **Cargador**, **Revisor**, **Administrador**
- 8 vistas admin + vistas cargador/revisor
- CRUD mock de etapas, carpetas y documentos (Decreto 1330)
- Persistencia en `sessionStorage` (clave `siac-almacen-prototipo`)
- **Sin** backend real, OAuth Google real, Power BI embed ni S3

---

## 2. Equipo y coordinación

| Persona | Rol | Ámbito / notas |
|---------|-----|----------------|
| **David Urrutia Cerón** | Desarrollo full-stack / producto | Frontend prototipo, memoria del proyecto, futuro backend NestJS |
| **Stakeholders CUAC** | Planeación / SIAC | Validación funcional, estructura normativa, plantillas |

### Protocolo de trabajo

1. Código, comentarios, variables y textos UI en **español**.
2. Cambios mínimos y enfocados; no commitear sin petición explícita.
3. Antes de UI nueva, revisar reglas en `.agents/skills/` si existen.
4. Tras cambios en frontend: `pnpm run build` en `Frontend/`.
5. Actualizar esta memoria al cerrar sesiones relevantes.

---

## 3. Reglas de trabajo (Cursor)

- Respuestas y UI en **español**.
- Convención de nombres en español (`usarAlmacen`, `BarraLateral`, `PlantillaPaginaApp`, etc.).
- Prototipo mock: toda persistencia pasa por `ProveedorAlmacen` → preparado para reemplazar por API REST.
- No subir secretos (`.env`, credenciales reales).

---

## 4. Arquitectura del repositorio

```text
Simulacion_SIAC/
├── MEMORIA_PROYECTO.md          ← Este archivo (fuente de verdad para agentes)
├── README.md                    ← Guía de inicio rápido
├── docs/                        ← Documentación por etapa (0-4) + manuales
├── Documentos/                  ← Docs institucionales y normativos
├── backend/                     ← NestJS 10 + Prisma + PostgreSQL (ACTIVO)
│   ├── src/                     ← Módulos: auth, documentos, plantillas, etc.
│   └── prisma/                  ← Schema, migraciones, semilla
├── Frontend/                    ← Next.js 16 App Router (ACTIVO)
│   ├── app/                     ← Rutas por rol
│   ├── components/              ← auth, layout, siac, ui
│   └── lib/servicios/           ← Cliente HTTP hacia API
├── .agents/skills/              ← Skills de proyecto para agentes IA
└── docker-compose.yml           ← PostgreSQL + MinIO
```

### Archivos más críticos

| Archivo | Función |
|---------|---------|
| `Frontend/lib/almacen-prototipo.ts` | Lectura/escritura mock + merge con semillas |
| `Frontend/components/auth/proveedor-almacen.tsx` | Contexto React con CRUD completo |
| `Frontend/components/auth/proveedor-sesion.tsx` | Auth mock + redirección por rol |
| `Frontend/lib/datos-semilla/estructura-decreto-1330.ts` | 6 CI + 9 CP + etapas + documentos |
| `Frontend/components/layout/shell-aplicacion.tsx` | Shell v0 + `PlantillaPaginaApp` |
| `Frontend/components/layout/barra-lateral.tsx` | Navegación por rol |
| `Frontend/app/login/page.tsx` | Login estilo Moodle institucional |

---

## 5. Stack tecnológico

| Capa | Tecnología | Notas |
|------|------------|-------|
| Frontend (activo) | **Next.js 16.3.3**, React 19, TypeScript 5.7 | App Router, Turbopack |
| Estilos | **Tailwind CSS 4**, tokens v0 en `globals.css` | Primario `#102f55`, acento `#3a9c98` |
| UI | **shadcn** (base-nova / `@base-ui/react`) | Button, Card, Table, Dialog, Chart, Sheet… |
| Gráficos | **Recharts 3.8** + shadcn Chart | Dashboard admin |
| Tablas | **TanStack Table 9** | Evidencias, bandejas |
| Toasts | **Sonner** | Feedback CRUD |
| Búsqueda | **cmdk** | Diálogo Ctrl+K mock |
| Backend (activo) | **NestJS 10**, Prisma 6, PostgreSQL 14 | API REST en `backend/` |
| ORM | **Prisma** | Repository pattern |
| Auth | **JWT + Passport.js** | Login real + fallback mock |
| Storage | Almacén local / S3 (MinIO) | `@aws-sdk/client-s3` |
| BI | Power BI Embedded + Recharts fallback | HU-009 |

**Comandos frontend:**

```bash
cd Frontend
pnpm install
pnpm dev      # http://localhost:3000
pnpm run build
```

---

## 6. Roles de usuario

| Rol | Ruta base | Responsabilidad |
|-----|-----------|-----------------|
| **Cargador** | `/cargador` | Subir evidencias, usar plantillas, ver estado propio |
| **Revisor** | `/revisor` | Bandeja de revisión, aprobar/rechazar con observaciones |
| **Administrador** | `/administrador` | Métricas, programas, evidencias, vigencias, plantillas, estructura normativa |

### Credenciales de demostración (mock)

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Cargador | `maria.cargadora@uniautonoma.edu.co` | `Cargador2026` |
| Revisor | `revisor.calidad@uniautonoma.edu.co` | `Revisor2026` |
| Administrador | `admin.planeacion@uniautonoma.edu.co` | `Admin2026` |

Definidas en `Frontend/lib/datos-semilla/usuarios.ts`. El login muestra panel lateral con botones **Copiar correo** / **Copiar contraseña**.

---

## 7. Rutas implementadas (frontend)

### Administrador (8 vistas)

| Ruta | Descripción |
|------|-------------|
| `/administrador` | Resumen: KPIs, hero acreditación, gráficos |
| `/administrador/dashboard` | Métricas Recharts + tab Power BI (placeholder) |
| `/administrador/programas` | Grid 12 programas académicos |
| `/administrador/evidencias` | Tabla completa + CRUD mock |
| `/administrador/vigencias` | Alertas semáforo + anexos |
| `/administrador/plantillas` | Biblioteca + CRUD plantillas |
| `/administrador/bandeja-revision` | Supervisión global de revisión |
| `/administrador/estructura` | CRUD árbol normativo Decreto 1330 |
| `/administrador/busqueda` | Redirect → `/administrador/evidencias` |

### Cargador

| Ruta | Descripción |
|------|-------------|
| `/cargador` | Resumen + KPIs |
| `/cargador/evidencias` | Mis evidencias |
| `/cargador/evidencias/nueva` | Formulario carga mock |
| `/cargador/plantillas` | Descarga formatos (solo lectura) |

### Revisor

| Ruta | Descripción |
|------|-------------|
| `/revisor` | Resumen |
| `/revisor/bandeja` | Bandeja pendientes |
| `/revisor/bandeja/[id]` | Dictamen con observaciones |

---

## 8. Modelo de dominio (Decreto 1330)

Tipos en `Frontend/lib/tipos/index.ts`:

- `EtapaAcreditacion` — Pre-radicación, Radicación, Autoevaluación, Renovación
- `CondicionDecreto` — 6 institucionales (CI) + 9 de programa (CP)
- `CarpetaNormativa` — Organización admin por etapa/condición
- `DocumentoRequerido` — Documentos/plantillas dentro de cada carpeta
- `Evidencia`, `Plantilla`, `Programa`, `AlertaVigencia`, etc.

Semilla normativa: `Frontend/lib/datos-semilla/estructura-decreto-1330.ts`

### Contratos API futuros (NestJS)

```text
GET/POST/PATCH/DELETE /api/etapas
GET/POST/PATCH/DELETE /api/carpetas
GET/POST/PATCH/DELETE /api/documentos-requeridos
GET/POST/PATCH/DELETE /api/evidencias
GET/POST/PATCH/DELETE /api/plantillas
```

En el prototipo, `ProveedorAlmacen` simula estas operaciones; al integrar backend solo se reemplaza la capa de persistencia.

---

## 9. Brechas conocidas (fuera del prototipo actual)

| ID | Brecha | Prioridad | Notas |
|----|--------|-----------|-------|
| B1 | Backend NestJS + PostgreSQL | P0 | Carpeta `backend/` vacía |
| B2 | Subida real S3 / parseo PDF-Excel | P0 | HU ingesta de datos |
| B3 | Power BI Embedded (Azure tokens) | P1 | Tab placeholder existe |
| B4 | OAuth / Google login real | P1 | Botón mock en login |
| B5 | Notificaciones email + cron vigencias | P1 | Alertas solo in-app mock |
| B6 | Middleware server-side de auth | P1 | Guardia solo en cliente |
| B7 | Full-text search + filtros URL | P2 | Búsqueda global mock |
| B8 | Tests automatizados / CI | P2 | Sin pipeline GitHub Actions |

---

## 10. Documentación interna

| Documento | Contenido |
|-----------|-----------|
| `Documentos/Información del Proyecto.md` | Objetivo, módulos, cronograma, stack planificado |
| `Documentos/estructura_decreto_etapas_documentos.md` | CI/CP, etapas, vigencia 7 años |
| `Documentos/PROTOTIPO-SIAC.md` | Transcripción reunión stakeholders |
| `Documentos/CHARLA 1 - SIAC.txt` | Notas charla inicial |
| `MEMORIA_PROYECTO.md` | Memoria viva del proyecto (este archivo) |

---

## 11. Estado actual del repositorio

- **Git:** repositorio **no inicializado** localmente (2026-09-03); remoto preparado en GitHub.
- **Build frontend:** `pnpm run build` ✅ sin errores TypeScript (19 rutas generadas).
- **Backend:** no iniciado.
- **Working tree:** frontend completo + documentación + memoria; `.gitignore` raíz añadido.
- **Foco inmediato:** primer commit/push a `main`; validación con usuarios CUAC; iniciar scaffold NestJS.

### Validaciones recientes

| Prueba | Resultado |
|--------|-----------|
| `pnpm run build` | ✅ OK |
| Navegación 8 rutas admin | ✅ Implementadas |
| CRUD estructura normativa | ✅ Persiste en `sessionStorage` |
| Login estilo Moodle CUAC | ✅ Logo oficial + panel credenciales |
| Responsive sidebar móvil | ✅ Sheet shadcn |

> **Nota:** Si el navegador tiene datos viejos en `sessionStorage`, limpiar clave `siac-almacen-prototipo` para ver semillas actualizadas.

---

## 12. Tareas a realizar (backlog operativo)

> Marcar **`[x]`** al completar.

### Frontend — prototipo

| ✓ | ID | Tarea | Prior. | Notas |
|---|-----|-------|--------|-------|
| [x] | F1 | Design system v0 + shadcn | P0 | globals.css, Inter, tokens |
| [x] | F2 | Layout 3 roles (sidebar/topbar/shell) | P0 | Sheet móvil |
| [x] | F3 | 8 páginas administrador | P0 | Ver §7 |
| [x] | F4 | Vistas Cargador y Revisor estilo v0 | P0 | Sin cambiar lógica flujo |
| [x] | F5 | CRUD mock Decreto 1330 | P0 | etapas/carpetas/documentos |
| [x] | F6 | Semillas enriquecidas (12 prog., ~20 evidencias) | P1 | datos-semilla/ |
| [x] | F7 | Login estilo Moodle CUAC | P1 | logo + copiar credenciales |
| [x] | F8 | Memoria del proyecto | P1 | Este archivo |
| [x] | B1 | Scaffold NestJS + Prisma | P0 | `backend/` completo |
| [x] | B2 | Auth JWT + roles | P0 | AuthModule + guards |
| [x] | B3 | Endpoints CRUD entidades SIAC | P0 | Todos los módulos |
| [x] | B4 | Integración S3 upload/download | P1 | Almacenamiento local/S3 |
| [x] | B5 | Power BI Embedded | P2 | Con fallback Recharts |
| [x] | B6 | Flujo aprobación + vigencias + cron | P0 | AprobacionModule + VigenciasModule |
| [x] | F11 | Capa servicios HTTP frontend | P0 | `lib/servicios/` |
| [ ] | F9 | Pruebas manuales con stakeholders CUAC | P1 | Checklist HU-003 a HU-011 |

### DevOps

| ✓ | ID | Tarea | Prior. | Notas |
|---|-----|-------|--------|-------|
| [ ] | D1 | `git init` + push a GitHub | P0 | Usuario — manual |
| [ ] | D2 | GitHub Actions (lint + build) | P2 | `.github/workflows/ci.yml` ✅ |
| [ ] | D3 | Deploy preview (Vercel) | P2 | Opcional demo |

---

## 13. Registro de decisiones

| Fecha | Decisión | Motivo |
|-------|----------|--------|
| 2026-09-03 | Prototipo solo frontend con `sessionStorage` | Validar UX antes de invertir en backend |
| 2026-09-03 | UI alineada a diseño v0.dev | Acuerdo con stakeholders y capturas referencia |
| 2026-09-03 | Decreto 1330 como semilla normativa | Documentación local en `Documentos/` |
| 2026-09-03 | shadcn base-nova (`@base-ui/react`) | CLI shadcn actual; usar prop `render` en lugar de `asChild` |
| 2026-09-03 | Login estilo Moodle CUAC | Familiaridad institucional; campo «Correo institucional» |
| 2026-09-03 | `PlantillaPaginaApp` por página vs layout único | Cada ruta requiere `titulo` y `rol` distintos en guardia |
| 2026-09-03 | Memoria en raíz (`MEMORIA_PROYECTO.md`) | Mismo patrón que proyecto SEMPER FI |

---

## 14. Registro de cambios (changelog de memoria)

### 2026-09-08 — Implementación full-stack completa (Etapas 0-4)

- [Backend] NestJS 10 con 10 módulos: Auth, Documentos, Plantillas, Programas, Búsqueda, Aprobación, Vigencias, Notificaciones, PowerBI, Estructura.
- [Backend] Prisma schema + migración inicial + semilla con 3 usuarios demo.
- [Backend] JWT + guards por rol + RN-001 (par no ve borradores).
- [Backend] Cron diario vigencias + notificaciones in-app + SMTP opcional.
- [Frontend] Capa `lib/servicios/` con cliente HTTP JWT.
- [Frontend] ProveedorSesion y ProveedorAlmacen conectados a API + fallback mock.
- [Docs] `docs/etapa-0` a `docs/etapa-4` + manuales usuario/técnico.
- [Skills] 4 skills en `.agents/skills/` para agentes IA.
- [DevOps] docker-compose.yml, GitHub Actions CI, README raíz.

### 2026-09-03 — Entrega prototipo frontend v0 + memoria + login institucional

- [Frontend] Implementado plan completo estilo v0: 8 páginas admin, cargador, revisor, componentes SIAC reutilizables.
- [Dominio] Tipos Decreto 1330, semillas 6 CI + 9 CP, CRUD etapas/carpetas/documentos en `ProveedorAlmacen`.
- [UI] Sidebar/topbar v0, KPIs, Recharts, tablas TanStack, búsqueda Ctrl+K, sidebar móvil con Sheet.
- [Login] Rediseño estilo Moodle CUAC (`/login`): logo oficial, campos vacíos, botón Google mock, panel lateral con copiar credenciales por rol.
- [Build] `pnpm run build` verificado sin errores TS.
- [Repo] Creados `MEMORIA_PROYECTO.md` y `.gitignore` raíz; git pendiente de inicialización manual.
- [Pendiente] Backend NestJS, integración API real, OAuth Google, Power BI embed, deploy CI.

---

*Fin del documento — SIAC · CUAC · Práctica profesional 2026*

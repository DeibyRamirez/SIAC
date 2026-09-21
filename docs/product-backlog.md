# Product Backlog — SIAC

> Metodología: Scrum · Priorización: MoSCoW · Referencia: F-02, [etapa-0](etapa-0/README.md)

## Leyenda MoSCoW

| Prioridad | Significado |
|-----------|-------------|
| **Must** | Obligatorio para MVP / entrega |
| **Should** | Importante, puede diferirse un sprint |
| **Could** | Deseable si hay capacidad |
| **Won't** | Fuera de alcance (Not List) |

---

## Historias de usuario

| ID | Historia | Como | Quiero | Para | Prioridad | Sprint |
|----|----------|------|--------|------|-----------|--------|
| HU-001 | Inicio de sesión JWT | Usuario institucional | autenticarme con correo y contraseña | acceder al sistema de forma segura | Must | 1 |
| HU-002 | Pantalla de inicio por rol | Usuario autenticado | ver mi panel según mi rol | acceder solo a funciones permitidas | Must | 1 |
| HU-011 | Roles y permisos | Administrador | gestionar roles de usuarios | controlar accesos según RN-001 | Must | 1 |
| HU-003 | Carga de evidencias | Cargador | subir PDF/XLSX con metadatos | registrar evidencias en estado Borrador | Must | 1–2 |
| HU-004 | CRUD de evidencias | Cargador | editar/eliminar mis borradores | corregir antes de enviar a revisión | Must | 2 |
| HU-005 | Biblioteca de plantillas | Revisor/Admin | publicar y versionar plantillas oficiales | estandarizar formatos de acreditación | Must | 2 |
| HU-008 | Búsqueda y filtros | Administrador | buscar evidencias con filtros en URL | compartir vistas específicas | Must | 2 |
| HU-010 | Panel de programas | Administrador | ver semáforo por programa | monitorear cumplimiento RN-003 | Must | 2 |
| HU-006 | Aprobar/rechazar evidencias | Revisor | dictaminar evidencias en revisión | validar calidad documental | Must | 3 |
| HU-007 | Semáforo de vigencias | Administrador | ver alertas de vencimiento | anticipar incumplimientos | Must | 3 |
| HU-009 | Métricas Power BI | Revisor/Admin | ver dashboards embebidos | analizar indicadores institucionales | Should | 3 |

---

## Reglas de negocio vinculadas

| ID | Regla | HU relacionadas |
|----|-------|-----------------|
| RN-001 | Par Académico / Admin no accede a borradores ni rechazados | HU-002, HU-004, HU-011 |
| RN-003 | Programa con anexo infraestructura vencido → semáforo rojo | HU-007, HU-010 |

---

## Requisitos no funcionales (F-02 / ADRs)

| ID | Requisito | ADR / Notas |
|----|-----------|-------------|
| RNF-001 | API REST versionada `/api/v1` | ADR-001 |
| RNF-002 | Autenticación JWT | ADR-003 |
| RNF-003 | PostgreSQL + Storage S3 | ADR-002 |
| RNF-004 | Alertas in-app obligatorias | ADR-006 |
| RNF-005 | Monolito NestJS + Next.js | ADR-001 |

---

## Not List (Won't — alcance congelado)

- Integración SACES por API
- Aplicación móvil nativa
- Microservicios
- Encuestas institucionales
- Docker/MinIO en desarrollo

---

## Estado del backlog

| Sprint | HUs | Estado |
|--------|-----|--------|
| Etapa 0 | Planificación | ✅ Completada |
| Sprint 1 | HU-001, HU-002, HU-011, HU-003* | ✅ Completada |
| Sprint 2 | HU-003, HU-004, HU-005, HU-008, HU-010 | ✅ Completada |
| Sprint 3 | HU-006, HU-007, HU-009 | ✅ Completada |
| Sprint 4 | Aceptación HU-001..011 | ✅ Completada |

*HU-003 inicia en Sprint 1, cierra en Sprint 2.

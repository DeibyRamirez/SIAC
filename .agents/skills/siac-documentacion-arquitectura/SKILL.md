---
name: siac-documentacion-arquitectura
description: >-
  Documenta arquitectura SIAC por etapas en docs/etapa-N/, actualiza MEMORIA_PROYECTO.md,
  flujos BPM por rol, transacciones ACID en evidencias y SOLID en capas NestJS. Usar al
  cerrar sprints, diseñar módulos backend o redactar decisiones técnicas del proyecto.
---

# Documentación y arquitectura — SIAC

## Cuándo aplicar

- Inicio o cierre de etapa/sprint
- Decisiones de arquitectura nuevas
- Documentar flujos de negocio (evidencias, revisión)
- Diseño módulos NestJS
- Tras sesiones de desarrollo significativas

## Estructura docs por etapa

```text
docs/
├── etapa-0/README.md    # Inception (completada)
├── etapa-1/README.md    # Fundación: NestJS + Prisma + JWT
├── etapa-2/README.md    # Módulos núcleo: CRUD, plantillas, búsqueda
├── etapa-3/README.md    # Integración: Power BI, vigencias, aprobación
└── etapa-4/README.md    # Cierre: pruebas, manuales, despliegue
```

### Plantilla README por etapa

Copiar al crear `docs/etapa-N/README.md`:

```markdown
# Etapa N — [Nombre]

> **Periodo:** DD/MM/AAAA – DD/MM/AAAA  
> **Estado:** En curso | Completada  
> **Referencia:** [MEMORIA_PROYECTO.md](../../Frontend/MEMORIA_PROYECTO.md)

## Objetivo

[Un párrafo: qué se entrega al cerrar esta etapa]

## Historias de usuario incluidas

| ID | Historia | Estado |
|----|----------|--------|
| HU-XXX | ... | ⬜ / ✅ |

## Entregables

| Artefacto | Ubicación | Estado |
|-----------|-----------|--------|
| ... | ... | ⬜ |

## Decisiones técnicas

1. [Decisión + justificación breve]

## Diagrama / flujo (opcional)

[ASCII o enlace]

## Checklist de cierre

- [ ] Criterio 1
- [ ] Criterio 2

## Próxima etapa

→ [Etapa N+1](../etapa-N+1/README.md): [resumen una línea]
```

### Mapeo etapas ↔ sprints (referencia)

| Etapa | Sprint | HUs principales |
|-------|--------|-----------------|
| 0 | — | Prototipo, documentación inception |
| 1 | 1 | HU-001 login JWT, HU-002 inicio por rol, HU-011 permisos |
| 2 | 2 | HU-003–005, HU-008, HU-010 |
| 3 | 3 | HU-006–007, HU-009 Power BI |
| 4 | 4 | Pruebas aceptación, migración institucional |

## Memoria del proyecto

**Archivo obligatorio**: `Frontend/MEMORIA_PROYECTO.md`

Leer **completo** antes de modificar código. Actualizar al cerrar sesión relevante:

### Secciones a mantener vigentes

| Sección | Qué actualizar |
|---------|----------------|
| Cabecera (tabla) | Fecha, versión, rama, fase |
| Estado actual | Qué funciona hoy vs pendiente |
| Tareas | Checklist P0/P1/P2 |
| Registro de cambios | Entrada cronológica al final |

### Formato entrada registro

```markdown
### YYYY-MM-DD — [Título breve]
- [Backend] ...
- [Frontend] ...
- [Docs] ...
- [Pendiente] ...
```

### Protocolo agente

1. Leer memoria al inicio de sesión
2. Tras cambios significativos: actualizar **Estado actual**, **Tareas** y **Registro**
3. No duplicar info entre memoria y `docs/etapa-N/` — memoria = snapshot vivo; etapa = entregable formal

## Flujos BPM — Evidencias

### Actores

| Rol SIAC | Rol documento | Responsabilidad |
|----------|---------------|-----------------|
| Cargador | Responsable | Descarga plantilla, diligencia, sube borrador |
| Revisor | Calidad | Valida, observa, aprueba o rechaza |
| Administrador | Par académico | Supervisa, configura normativa, ve validadas |

### Diagrama de estados

```text
                    ┌─────────────┐
                    │   Borrador   │ ← Cargador crea/edita
                    └──────┬──────┘
                           │ enviar
                           ▼
                    ┌─────────────┐
         ┌─────────│ EnRevision   │─────────┐
         │         └─────────────┘         │
    rechazar                              aprobar
         │                                   │
         ▼                                   ▼
  ┌─────────────┐                    ┌─────────────┐
  │  Rechazado   │                    │  Validado    │ → dashboards, vigencias
  └──────┬──────┘                    └─────────────┘
         │ corregir y reenviar
         └──────────────────────────► EnRevision
```

### Secuencia BPM

```text
1. Cargador → descarga plantilla oficial (Biblioteca)
2. Cargador → sube evidencia + metadatos (programa, periodo, factor, indicador)
3. Sistema → estado Borrador; almacena archivo (S3 planificado)
4. Cargador → envía a revisión → EnRevision
5. Revisor → bandeja pendientes; dictamen con observaciones
6. Si rechaza → Cargador corrige → vuelve a paso 4
7. Si aprueba → Validado; visible para Administrador/Par académico
8. Validadas → alimentan métricas (Recharts/Power BI) y control vigencias
```

Documentar variantes (admin crea evidencia, supervisión global) en la etapa correspondiente.

## ACID en transacciones de evidencias

Operaciones que **deben** ser atómicas (Prisma `$transaction`):

| Operación | Tablas involucradas |
|-----------|---------------------|
| Enviar a revisión | evidencia (estado) + historial_revision |
| Aprobar/rechazar | evidencia + historial + notificación |
| Carga con metadatos | evidencia + registro_archivo (S3 key) |
| Ingesta Excel lote | N evidencias + log_ingesta (todo o rollback por lote configurable) |

### Reglas

1. **Atomicidad**: no dejar evidencia `EnRevision` sin registro en historial
2. **Consistencia**: transiciones estado válidas según matriz BPM; rechazar saltos
3. **Aislamiento**: nivel `Read Committed` mínimo; locks optimistas con `@version` si hay concurrencia
4. **Durabilidad**: commit solo tras upload S3 confirmado (o rollback completo)

### Anti-patrones

- Actualizar estado en frontend sin confirmar respuesta API
- Dos requests paralelas de revisión sobre misma evidencia
- Guardar archivo en storage sin registro DB (huérfanos)

## SOLID en capas NestJS

### Responsabilidades

| Capa | S | O | L | I | D |
|------|---|---|---|---|---|
| **Controller** | Una ruta = un método delgado | Extender vía nuevos controllers | — | Interfaces respuesta | Inyecta Service |
| **Service** | Una regla de negocio por método | Nuevos casos vía servicios especializados | — | Depende de abstracciones Repository | Inyecta Repository, no Prisma directo |
| **Repository** | Solo persistencia | — | Implementaciones intercambiables | Interface `IEvidenciasRepository` | Inyecta PrismaService |

### Ejemplo inyección

```typescript
// evidencias.module.ts
@Module({
  providers: [
    EvidenciasService,
    { provide: EVidenciasRepository, useClass: EvidenciasPrismaRepository },
  ],
  controllers: [EvidenciasController],
})
export class EvidenciasModule {}
```

Controller **nunca** importa `PrismaService` directamente.

## Patrones de diseño SIAC

| Patrón | Aplicación |
|--------|------------|
| **Repository** | Abstrae Prisma; facilita tests con mock |
| **Adapter/Gateway** | APIs externas universidad → DTO interno |
| **DTO** | Entrada/salida HTTP; class-validator |
| **DI** | NestJS providers; testabilidad |
| **Module** | Bounded context: evidencias, plantillas, auth |
| **Singleton** | PrismaService, config |

### Adapter/Gateway (APIs externas)

```text
ApiUniversidadAdapter
  → fetch API institucional (programas, estudiantes)
  → transforma respuesta externa
  → retorna Programa[] según lib/tipos
```

Un adapter por sistema externo; no mezclar en Service de dominio.

## Arquitectura global

```text
┌─────────────────┐     REST/JWT      ┌─────────────────┐
│  Next.js 16     │ ◄──────────────► │  NestJS 10       │
│  App Router SSR │                   │  Módulos + DTO  │
└────────┬────────┘                   └────────┬────────┘
         │                                      │
         │                              ┌───────▼───────┐
         │                              │ Prisma → PG   │
         │                              └───────┬───────┘
         │                              ┌───────▼───────┐
         └─ Recharts (fallback)         │ S3 / MinIO    │
            Power BI embed              └───────────────┘
```

**No microservicios** — monolito modular por plazo y equipo.

## Checklist documentación

- [ ] Etapa actual tiene `docs/etapa-N/README.md` actualizado
- [ ] HUs marcadas ✅ o ⬜ con evidencia (PR, ruta, endpoint)
- [ ] `Frontend/MEMORIA_PROYECTO.md` con fecha y registro de cambios
- [ ] Flujos BPM reflejan estados en Prisma y tipos TS
- [ ] Transacciones ACID identificadas en Service correspondiente
- [ ] Patrones nombrados en decisiones técnicas de la etapa

## Archivos de referencia

| Archivo | Contenido |
|---------|-----------|
| `Frontend/MEMORIA_PROYECTO.md` | Fuente de verdad agentes |
| `docs/etapa-0/README.md` | Plantilla etapa completada |
| `Documentos/Información del Proyecto.md` | Módulos y usuarios |
| `Documentos/estructura_decreto_etapas_documentos.md` | Normativa Decreto 1330 |
| `Frontend/frontend/lib/tipos/index.ts` | Estados evidencia |
| `Documentos/Información del Proyecto.md` § Patrones | Repository, Adapter, DTO, DI |

---
name: siac-powerbi-datos
description: >-
  Implementa ingesta Excel, pipeline de datos hacia dashboards y Power BI Embedded
  (App Owns Data, embed tokens Azure) con fallback Recharts. Usar para HU-009, métricas
  administrador, parseo xlsx/exceljs o integración BI en Frontend/.
---

# Power BI y pipeline de datos — SIAC

## Cuándo aplicar

- Historia **HU-009**: métricas embebidas Power BI (Sprint 3 / Etapa 3)
- Tab dashboard en `/administrador/dashboard`
- Ingesta o limpieza de Excel institucional
- Fallback cuando Azure/Power BI no esté disponible
- Sincronización datos SIAC → informes

## HU-009 — Alcance

| Aspecto | Detalle |
|---------|---------|
| ID | HU-009 |
| Título | Métricas embebidas Power BI |
| Sprint | 3 (Etapa 3) |
| Ruta UI | `Frontend/app/(app)/administrador/dashboard/page.tsx` |
| Estado prototipo | Tab "Power BI" con placeholder + simulación token expirado |
| Producción | iframe embed + token desde backend NestJS |

## Arquitectura del pipeline

```text
Excel/PDF subido (Cargador)
  → Backend: parseo exceljs/xlsx + validación metadatos
  → PostgreSQL (Prisma): evidencias, programas, métricas agregadas
  → Dataset Power BI (refresh programado o push)
  → NestJS: genera Embed Token (Azure AD + Power BI REST)
  → Next.js SSR: página dashboard solicita token al API
  → Cliente: renderiza informe embebido
  ↓ (si falla token/Azure)
  → Fallback: Recharts con datos de `lib/datos-semilla/metricas-dashboard.ts` o API REST
```

## Power BI Embedded — App Owns Data

### Modelo

- **App Owns Data**: la aplicación (service principal Azure) posee el workspace; el usuario final no necesita licencia Pro
- El backend genera **Embed Token** de corta duración (~1 h)
- El frontend solo recibe `embedUrl`, `reportId`, `accessToken` — nunca credenciales Azure

### Variables de entorno (backend, no commitear)

```env
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
POWERBI_WORKSPACE_ID=
POWERBI_REPORT_ID=
```

### Flujo backend (NestJS planificado)

```text
GET /api/metricas/embed-token?programaId=...
  1. JwtAuthGuard + RolesGuard('Administrador')
  2. PowerBiService.obtenerTokenEmbed(programaId)
  3. Azure AD: client_credentials → access_token
  4. Power BI REST: GenerateToken (reportId, datasetId, roles RLS opcional)
  5. Response DTO: { embedUrl, accessToken, expiration }
```

### Flujo frontend (Next.js)

Preferir **Server Component** que obtiene token en servidor; componente cliente solo para embed:

```tsx
// Patrón objetivo (cuando exista API)
async function ContenedorPowerBi({ programaId }: { programaId: string }) {
  const embed = await obtenerEmbedToken(programaId) // fetch server-side
  if (!embed) return <FallbackRecharts programaId={programaId} />
  return <InformePowerBi {...embed} />
}
```

Biblioteca cliente: `powerbi-client` (añadir con `pnpm add powerbi-client`).

### Prototipo actual

El tab Power BI simula:
- Selector de programa
- Toggle "Simular token expirado"
- Placeholder iframe + mensaje de error + botón reintentar

**Conservar** el fallback UX al integrar Azure real.

## Limpieza Excel — exceljs / xlsx

### Cuándo usar cada librería

| Librería | Preferir para |
|----------|---------------|
| **exceljs** | Escritura, estilos, streams, plantillas generadas |
| **xlsx** (SheetJS) | Lectura rápida de .xlsx legacy, extracción tabular simple |

Instalar en backend (no en frontend salvo preview cliente):

```bash
pnpm add exceljs xlsx
pnpm add -D @types/xlsx
```

### Pipeline de limpieza SIAC

```typescript
// Pasos obligatorios al ingerir Excel institucional
1. Validar extensión .xlsx y tamaño máximo
2. Leer primera hoja (o hoja nombrada en plantilla)
3. Detectar fila de encabezados (skip filas vacías/metadatos institucionales)
4. Normalizar columnas → snake_case español interno
5. Validar campos obligatorios: programa, periodo, factor, indicador
6. Rechazar filas duplicadas (hash programa+periodo+indicador+archivo)
7. Mapear a DTO EvidenciaCreateDto antes de persistir
8. Registrar errores por fila (no fallar todo el lote)
```

### Columnas esperadas (referencia Decreto 1330)

Alinear con metadatos en `lib/tipos/index.ts` → interface `Evidencia`:

- `programaId` / código programa
- `periodo` (ej. `2024-1`)
- `factor`, `indicador`
- `nombreArchivo`, `responsable` (opcional)

### Salida

- Registros válidos → transacción Prisma (ver skill documentación: ACID)
- Informe de ingesta → `{ total, aceptados, rechazados, errores[] }`

## Fallback Recharts

### Cuándo activar

- Token embed expirado o Azure no responde
- Entorno desarrollo sin credenciales Power BI
- Modo degradado explícito en config

### Implementación existente

| Recurso | Ubicación |
|---------|-----------|
| Tab "Métricas SIAC" | Mismo dashboard, tab `metricas` |
| Datos semilla | `lib/datos-semilla/metricas-dashboard.ts` |
| Gráficos | `components/siac/grafico-tendencia.tsx`, `grafico-distribucion.tsx` |
| Wrapper shadcn | `components/ui/chart.tsx` (Recharts 3.8) |

### Patrón fallback

```tsx
function DashboardMetricas({ embedDisponible, embed, metricas }: Props) {
  return (
    <Tabs defaultValue={embedDisponible ? 'powerbi' : 'metricas'}>
      {/* Tab Power BI: iframe o error */}
      {/* Tab Métricas SIAC: siempre disponible como respaldo */}
    </Tabs>
  )
}
```

Regla: **nunca** dejar al administrador sin métricas visibles; el tab Recharts es el plan B permanente.

## Seguridad y rendimiento

1. Tokens embed solo vía API autenticada; TTL corto; no cachear en localStorage
2. RLS en Power BI por `programaId` cuando aplique
3. Excel: sanitizar celdas (sin fórmulas ejecutables); límite filas (~10k)
4. Refresh dataset: cron o webhook post-ingesta masiva
5. Logs de auditoría: quién solicitó embed token y cuándo

## Checklist HU-009

- [ ] Endpoint NestJS `embed-token` con guards Administrador
- [ ] Service principal Azure registrado en tenant CUAC
- [ ] Informe publicado en workspace App Owns Data
- [ ] Frontend: embed real con manejo expiración (re-fetch token)
- [ ] Fallback Recharts probado con API caída
- [ ] Pipeline Excel documentado en etapa correspondiente (`docs/etapa-3/`)
- [ ] Actualizar `Frontend/MEMORIA_PROYECTO.md` al cerrar integración

## Archivos de referencia

| Archivo | Contenido |
|---------|-----------|
| `Frontend/app/(app)/administrador/dashboard/page.tsx` | Tabs métricas + Power BI |
| `Frontend/lib/datos-semilla/metricas-dashboard.ts` | Datos mock/fallback |
| `Frontend/components/siac/grafico-*.tsx` | Gráficos Recharts |
| `docs/etapa-0/README.md` | HU-009 en backlog |
| `Documentos/Información del Proyecto.md` | Módulo ingesta + Power BI |

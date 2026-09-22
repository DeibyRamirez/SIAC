---
name: siac-diseno-web-responsive
description: >-
  Aplica diseño responsive SIAC con tokens CUAC, shadcn base-nova y layouts por rol
  (Cargador, Revisor, Administrador). Usar al crear o modificar UI, componentes de layout,
  sidebar móvil con Sheet, breakpoints Tailwind o estilos en Frontend/.
---

# Diseño web responsive — SIAC

## Cuándo aplicar

- Nuevas páginas en `Frontend/app/(app)/`
- Cambios en `components/layout/` o `components/siac/`
- Ajustes de tokens, colores o breakpoints
- Componentes shadcn/ui nuevos o modificados

## Tokens CUAC (fuente de verdad)

Definidos en `Frontend/app/globals.css`. **No hardcodear hex distintos**; usar clases semánticas Tailwind o variables CSS.

| Token | Valor | Uso |
|-------|-------|-----|
| Institucional | `#0A3B74` | `--primary`, títulos, sidebar, footer |
| Cyan técnico | `#1D70B8` | `--ring`, links, badges azules |
| Esmeralda | `#1CBCA6` | KPIs, nav activo, acentos positivos |
| Coral | `#F25C30` | Alertas, tags naranja |
| Ocre | `#C28B10` | Tags ámbar |
| Fucsia | `#D82B5A` | Tags críticos, `--destructive` |
| Púrpura | `#904179` | Tags tecnología |
| Texto principal | `#333333` | `--foreground` |
| Texto secundario | `#555555` | `--muted-foreground` |
| Fondo degradado | `#FFF2EE → #E8F6F6` | Clase `.fondo-app` en shell |

Variables CSS semánticas (preferir sobre hex en componentes nuevos):

```css
--primary: #0a3b74;
--accent: #e8f6f6;
--accent-foreground: #0a3b74;
--ring: #1d70b8;
```

Clases utilitarias en `globals.css`:
- `.fondo-app` — degradado institucional
- `.titulo-institucional` — uppercase, letter-spacing amplio
- `.borde-institucional` — borde izquierdo azul
- `.tarjeta-institucional` — cards 12px radius
- `.tarjeta-visual` — cards con imagen 20px radius
- `.footer-institucional` — franja inferior CUAC
- `.badge-categoria` — pills redondeadas

Gráficos Recharts: `--color-chart-1` (#0A3B74), `--color-chart-2` (#1CBCA6).

## Stack UI

| Herramienta | Config |
|-------------|--------|
| shadcn | `style: base-nova` en `components.json` |
| Primitivos | `@base-ui/react` (no Radix en componentes nuevos) |
| Tailwind | v4 — `@import 'tailwindcss'` + `@theme inline` en `globals.css` |
| Iconos | `lucide-react` |
| Fuentes | Montserrat vía `layout.tsx` |

Instalar componentes shadcn desde `Frontend/`:

```bash
pnpm dlx shadcn@latest add <componente>
```

## Layout por rol

### Shell compartido

`components/layout/shell-aplicacion.tsx`:

- `ShellAplicacion`: sidebar desktop + Sheet móvil + topbar + `<main>` + `PieInstitucional`
- `PlantillaPaginaApp`: envuelve con `GuardiaSesion` + shell
- Fondo: clase `.fondo-app` (degradado institucional)

Patrón obligatorio en páginas autenticadas:

```tsx
export default function MiPagina() {
  return (
    <PlantillaPaginaApp titulo="Título visible en topbar" rol="Administrador">
      {/* contenido */}
    </PlantillaPaginaApp>
  )
}
```

Roles válidos: `'Cargador' | 'Revisor' | 'Administrador'` (`lib/tipos/index.ts`).

### Navegación por rol

`components/layout/barra-lateral.tsx` → función `itemsPorRol(rol)`:

| Rol | Rutas base | Ítems clave |
|-----|------------|-------------|
| **Cargador** | `/cargador` | Resumen, cargar evidencia, mis evidencias, plantillas |
| **Revisor** | `/revisor` | Resumen, bandeja (badge pendientes) |
| **Administrador** | `/administrador` | Dashboard, programas, evidencias, vigencias, plantillas, bandeja, estructura |

Al agregar ruta nueva: actualizar `itemsPorRol`, crear página bajo `app/(app)/<rol>/` y usar `PlantillaPaginaApp` con el rol correcto.

### Topbar

`components/layout/barra-superior.tsx`: breadcrumb, búsqueda Ctrl+K, alertas, avatar. Altura ~72px. El botón menú (`md:hidden`) abre el Sheet.

## Responsive y Sheet móvil

### Breakpoints (Tailwind defaults)

| Prefijo | Ancho | Comportamiento SIAC |
|---------|-------|---------------------|
| (base) | <640px | Sidebar oculta; menú hamburguesa; padding `px-4` |
| `sm:` | ≥640px | Grids 2 cols; avatar topbar visible |
| `md:` | ≥768px | Sidebar fija (`hidden md:flex`); topbar breadcrumb; padding `md:px-6` |
| `lg:` | ≥1024px | Grids admin 4 cols |
| `xl:` | ≥1280px | Dashboard 2 cols gráficos |

### Patrón sidebar móvil (no alterar)

```tsx
// shell-aplicacion.tsx
<BarraLateral className="hidden md:flex" />
<Sheet open={menuMovilAbierto} onOpenChange={setMenuMovilAbierto}>
  <SheetContent side="left" className="w-64 p-0 sm:max-w-xs">
    <BarraLateral
      className="flex h-full w-full border-0"
      alNavegar={() => setMenuMovilAbierto(false)}
    />
  </SheetContent>
</Sheet>
```

Reglas:
- Desktop: sidebar `w-64` fija, sin Sheet
- Móvil: un solo `BarraLateral` dentro del Sheet; cerrar con `alNavegar` al hacer clic en enlace
- Contenido principal: `min-w-0 flex-1` para evitar overflow horizontal

### Grids recomendados

```tsx
// KPIs
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

// Dashboard dual
<div className="grid gap-4 xl:grid-cols-2">

// Tarjetas visuales (Power BI, plantillas)
<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

// Encabezado + acciones
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
```

## Componentes SIAC reutilizables

Ubicación: `components/siac/`

| Componente | Uso |
|------------|-----|
| `tarjeta-kpi` | Métricas con tendencia |
| `tarjeta-hero-acreditacion` | Hero Decreto 1330 |
| `grafico-tendencia` / `grafico-distribucion` | Recharts + tokens CUAC |
| `tabla-evidencias` | TanStack Table |
| `insignia-estado` | Estados evidencia/vigencia |
| `filtros-segmentados` | Filtros UI |
| `rejilla-informes-powerbi` | Catálogo informes Power BI estilo tarjetas |
| `catalogo-categorias-plantilla` | Navegación por carpetas de plantillas |

Preferir estos antes de crear variantes ad hoc.

## Plantillas — navegación por categoría

No mostrar todas las plantillas en lista plana. Usar:

- `/administrador/plantillas` o `/cargador/plantillas` → grid de 3 carpetas
- `/administrador/plantillas/[categoria]` → plantillas filtradas (`institucional`, `programa`, `autoevaluacion`)

Utilidades en `lib/categorias-plantilla.ts`.

## Convenciones visuales

1. **Espaciado página**: `space-y-6` entre secciones; main ya aporta `px-4 py-6 md:px-6 md:py-8`
2. **Cards**: `tarjeta-institucional ring-1 ring-foreground/10`
3. **Nav activo**: `border-l-2 border-esmeralda bg-accent font-semibold text-primary`
4. **Badges contador**: variant `esmeralda`
5. **Textos UI**: 100% español; nombres de componentes en español (`BarraLateral`, `TarjetaKpi`)

## Checklist antes de entregar UI

- [ ] Tokens desde `globals.css`; sin colores fuera de paleta CUAC
- [ ] Página usa `PlantillaPaginaApp` con rol correcto
- [ ] Probado en viewport móvil (<768px): Sheet abre/cierra y navega
- [ ] Sin scroll horizontal en tablas (`overflow-x-auto` si aplica)
- [ ] Componente shadcn base-nova; no mezclar primitivos Radix legacy
- [ ] `pnpm run build` exitoso en `Frontend/`

## Archivos de referencia

| Archivo | Contenido |
|---------|-----------|
| `Frontend/app/globals.css` | Tokens y `@theme` Tailwind 4 |
| `Frontend/components.json` | Config shadcn base-nova |
| `Frontend/components/layout/shell-aplicacion.tsx` | Shell + plantilla + footer |
| `Frontend/components/layout/pie-institucional.tsx` | Footer institucional |
| `Frontend/components/layout/barra-lateral.tsx` | Nav por rol |
| `Frontend/components/layout/barra-superior.tsx` | Topbar responsive |
| `Frontend/components/ui/sheet.tsx` | Sheet móvil |

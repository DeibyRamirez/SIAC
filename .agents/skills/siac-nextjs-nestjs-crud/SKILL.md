---
name: siac-nextjs-nestjs-crud
description: >-
  Guía CRUD full-stack SIAC con Next.js 16 App Router SSR, NestJS 10, Prisma Repository,
  pnpm, DTOs class-validator y JWT por rol. Usar al implementar APIs, módulos backend,
  páginas SSR o alinear contratos con Frontend/lib/tipos/index.ts.
---

# Next.js + NestJS CRUD — SIAC

## Cuándo aplicar

- Crear o modificar endpoints REST
- Módulos NestJS (`backend/src/`)
- Páginas Next.js que consumen API (reemplazar mock)
- DTOs, validación, guards por rol
- Migración de `ProveedorAlmacen` → fetch server-side

## Principios arquitectónicos

| Regla | Detalle |
|-------|---------|
| **No SPA pura** | Next.js App Router con SSR/Server Components; datos iniciales en servidor |
| **Frontend/backend separados** | Repos distintos o carpetas `Frontend/` y `backend/`; API REST JSON |
| **pnpm exclusivo** | Nunca `npm install`; usar `pnpm` en frontend y backend |
| **Código en español** | Variables, DTOs, mensajes de error, textos UI |
| **Contratos tipados** | Fuente de verdad TS: `Frontend/lib/tipos/index.ts` |

## Gestor de paquetes

```bash
# Frontend
cd Frontend
pnpm install
pnpm dev

# Backend (cuando exista)
cd backend
pnpm install
pnpm start:dev
```

**Prohibido**: `npm`, `yarn`, `npx` para dependencias del proyecto.

## Next.js 16 — App Router SSR

### Estructura rutas

```text
Frontend/app/
├── layout.tsx              # Root layout
├── login/page.tsx          # Pública
└── (app)/                  # Grupo autenticado
    ├── layout.tsx
    ├── cargador/
    ├── revisor/
    └── administrador/
```

### Patrón página SSR (objetivo producción)

```tsx
// app/(app)/administrador/evidencias/page.tsx
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { listarEvidencias } from '@/lib/api/evidencias' // fetch con cookie/token

export default async function EvidenciasPage() {
  const evidencias = await listarEvidencias() // Server Component
  return (
    <PlantillaPaginaApp titulo="Evidencias" rol="Administrador">
      <TablaEvidencias datosIniciales={evidencias} />
    </PlantillaPaginaApp>
  )
}
```

### Cliente vs servidor

| Server Component | Client Component (`'use client'`) |
|------------------|-----------------------------------|
| Fetch inicial datos | Formularios interactivos |
| Layout estático | `useState`, `useEffect` |
| Validación sesión cookie | Tablas con sorting cliente |

Prototipo actual usa `'use client'` + `sessionStorage`; al integrar API, **mover fetch a servidor** donde sea posible.

### API routes Next.js

Usar solo como BFF opcional (proxy cookies). **Lógica de negocio en NestJS**, no duplicar en Next.

## NestJS 10 — Estructura modular

```text
backend/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/          # JwtAuthGuard, RolesGuard
│   ├── decorators/        # @Roles(), @UsuarioActual()
│   └── filters/           # HttpExceptionFilter
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   └── auth.service.ts
├── evidencias/
│   ├── evidencias.module.ts
│   ├── evidencias.controller.ts
│   ├── evidencias.service.ts
│   ├── evidencias.repository.ts
│   └── dto/
│       ├── crear-evidencia.dto.ts
│       └── actualizar-evidencia.dto.ts
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts
```

### Capas SOLID

```text
Controller  → HTTP, status codes, delega a Service
Service     → Reglas de negocio, orquestación, transacciones
Repository  → Prisma queries; sin lógica de negocio
```

## Prisma + Repository pattern

### Schema (alineado a tipos frontend)

Mapear entidades de `lib/tipos/index.ts`:

```prisma
model Evidencia {
  id            String   @id @default(uuid())
  nombre        String
  programaId    String
  periodo       String
  factor        String
  indicador     String
  estado        EstadoEvidencia @default(Borrador)
  autorId       String
  nombreArchivo String
  fechaCarga    DateTime @default(now())
  observaciones String?
  responsable   String?
  programa      Programa @relation(fields: [programaId], references: [id])
  autor         Usuario  @relation(fields: [autorId], references: [id])
}

enum EstadoEvidencia {
  Borrador
  EnRevision
  Validado
  Rechazado
}

enum RolUsuario {
  Cargador
  Revisor
  Administrador
}
```

### Repository ejemplo

```typescript
@Injectable()
export class EvidenciasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(datos: Prisma.EvidenciaCreateInput): Promise<Evidencia> {
    return this.prisma.evidencia.create({ data: datos })
  }

  async listarPorPrograma(programaId: string): Promise<Evidencia[]> {
    return this.prisma.evidencia.findMany({
      where: { programaId },
      orderBy: { fechaCarga: 'desc' },
    })
  }
}
```

Service usa `$transaction` para operaciones multi-tabla (evidencia + historial revisión).

## DTO + class-validator

```typescript
// dto/crear-evidencia.dto.ts
import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator'

export class CrearEvidenciaDto {
  @IsString()
  @MaxLength(200)
  nombre: string

  @IsUUID()
  programaId: string

  @IsString()
  periodo: string

  @IsString()
  factor: string

  @IsString()
  indicador: string

  @IsString()
  nombreArchivo: string

  @IsOptional()
  @IsString()
  responsable?: string
}
```

Activar pipe global en `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
```

## JWT + guards por rol

### Flujo auth (HU-001, HU-011)

```text
POST /auth/login { correo, contrasena }
  → AuthService valida credenciales (bcrypt)
  → JWT { sub, rol, correo } TTL configurable
  → Frontend guarda httpOnly cookie o Authorization header

Request protegido
  → JwtAuthGuard extrae payload
  → RolesGuard verifica @Roles('Revisor')
```

### Decoradores

```typescript
@Roles('Revisor', 'Administrador')
@UseGuards(JwtAuthGuard, RolesGuard)
@Patch(':id/revisar')
async revisar(@Param('id') id: string, @Body() dto: RevisarEvidenciaDto) { ... }
```

### Matriz permisos CRUD evidencias

| Acción | Cargador | Revisor | Administrador |
|--------|----------|---------|---------------|
| Crear borrador | ✅ | ❌ | ✅ |
| Editar propio borrador | ✅ | ❌ | ✅ |
| Enviar a revisión | ✅ | ❌ | ✅ |
| Aprobar/rechazar | ❌ | ✅ | ✅ |
| Eliminar | ❌ | ❌ | ✅ |
| Listar todas | ❌ | ✅ bandeja | ✅ |

## Contratos API SIAC

### Convenciones REST

| Recurso | Base path | Notas |
|---------|-----------|-------|
| Auth | `/auth` | login, refresh, perfil |
| Evidencias | `/evidencias` | filtros query: `programaId`, `estado`, `periodo` |
| Plantillas | `/plantillas` | CRUD admin |
| Programas | `/programas` | lectura + admin |
| Vigencias | `/vigencias` | alertas |
| Métricas | `/metricas` | embed-token Power BI |
| Estructura | `/estructura` | árbol Decreto 1330 |

### Formato respuesta

```typescript
// Éxito lista
{ datos: T[], total: number, pagina?: number }

// Éxito item
{ datos: T }

// Error
{ mensaje: string, codigo: string, detalles?: Record<string, string[]> }
```

### Alineación tipos TS

Al cambiar schema Prisma, **actualizar** `Frontend/lib/tipos/index.ts` en la misma PR.

Tipos clave exportados:

```typescript
export type RolUsuario = 'Cargador' | 'Revisor' | 'Administrador'
export type EstadoEvidencia = 'Borrador' | 'EnRevision' | 'Validado' | 'Rechazado'
export interface Evidencia { /* ... */ }
export interface Programa { /* ... */ }
export interface Plantilla { /* ... */ }
```

## Migración mock → API

1. Crear cliente `lib/api/cliente.ts` con base URL `process.env.NEXT_PUBLIC_API_URL`
2. Reemplazar métodos de `proveedor-almacen.tsx` por hooks que llamen API
3. Mantener semillas como fallback solo en `NODE_ENV=development` si se requiere
4. Transacciones evidencia: backend garantiza ACID; frontend solo muestra resultado

## Checklist CRUD nuevo

- [ ] DTO con class-validator
- [ ] Repository Prisma (sin lógica negocio)
- [ ] Service con reglas rol/estado
- [ ] Controller con guards correctos
- [ ] Tipos sincronizados en `lib/tipos/index.ts`
- [ ] Página Next.js fetch server-side
- [ ] `pnpm run build` frontend + backend
- [ ] Documentar endpoint en `docs/etapa-N/`

## Archivos de referencia

| Archivo | Contenido |
|---------|-----------|
| `Frontend/lib/tipos/index.ts` | Contratos dominio |
| `Frontend/components/auth/proveedor-almacen.tsx` | CRUD mock a reemplazar |
| `Frontend/components/auth/guardia-sesion.tsx` | Guardia rol cliente |
| `Frontend/MEMORIA_PROYECTO.md` | Stack y rutas |
| `docs/etapa-0/README.md` | HUs por sprint |

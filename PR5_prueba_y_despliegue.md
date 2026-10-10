# PR #5: prueba local y despliegue

## 1. Contexto del PR #5

- **PR:** https://github.com/DeibyRamirez/SIAC/pull/5 (en borrador)
- **Rama:** `feature/HU-011-alcance-programas`
- **Base:** `develop_v2`
- **Commit:** `a1e4f05fcfa5a498182c773300c71a6e29b0e95c`. Es un solo commit, con autor y committer DeibyRamirez y sin trailers.
- **Título:** `[feature][Sprint 1][HU-011][HU-002] Alcance por programa, permisos del Revisor y corrección del estado de los sprints`
- **Tamaño:** 62 archivos (+2442/-630), sin conflictos.

### Qué incluye

- **T-DOC.1:** corrige la documentación que marcaba los Sprints 2 a 4 como completos.
- **T-011.1 a T-011.3:** alcance por programa. El guard `GuardAlcancePrograma` hace que cada usuario solo acceda a sus programas, y ya no se puede asignar dos veces el mismo usuario al mismo programa (unicidad en `UsuarioPrograma`).
- Nueva API y nueva pantalla `/administrador/usuarios` para asignar programas a los usuarios.
- **T-002.1:** permisos del Revisor. Además, el Admin ya no puede asignar el rol SuperAdmin.
- `GET /programas` ya no escribe en la base de datos.
- El frontend ya no usa datos de prueba cuando la API falla.
- **Cambio de estado a propósito:** `estadoProceso` pasa de `'En curso'` a `'En progreso'`, con la migración `20260928030000_estado_proceso_en_progreso`. En el frontend, la etapa `EnCurso` pasa a `EnProgreso`.
- **Restaurado:** la carpeta `.cursor/` (`mcp.json` y `rules/00-nucleo-siac.mdc`), la línea `.cursor/memory.jsonl` en `.gitignore` y las menciones originales en `AGENTS.md`, `MEMORIA_PROYECTO.md` y `Frontend/MEMORIA_PROYECTO.md`.
- **Verificado:** el backend compila y pasan sus 7 suites con 27 pruebas. El frontend pasa `tsc` y el build. Todavía no se ha probado en el navegador.

---

## 2. Probar en local (PowerShell)

> **Importante:** la migración cambia datos. Usa una base de datos de **desarrollo**, nunca la de producción.
> Tu borrado sin commit de `Skills/FrontendDesing.md` se conserva al cambiar de rama.

### 2.1 Cambiar a la rama del PR

```powershell
cd D:\Proyectos\SIAC
git fetch origin
git switch -c prueba-pr5 origin/feature/HU-011-alcance-programas
```

### 2.2 Backend (puerto 3001)

```powershell
cd D:\Proyectos\SIAC\Backend
pnpm install
```

Crea el `.env` solo si todavía no existe:

```powershell
Copy-Item .env.example .env
```

Variables necesarias en `Backend\.env`:

```env
DATABASE_URL="postgresql://postgres.TU_REF:TU_CLAVE@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.TU_REF:TU_CLAVE@aws-0-REGION.pooler.supabase.com:5432/postgres"
JWT_SECRETO="un-secreto-largo-de-desarrollo"
JWT_EXPIRACION="8h"
PUERTO=3001
CORS_ORIGEN="http://localhost:3000"

# Para no depender del Storage de Supabase en local:
S3_USAR_ALMACEN_LOCAL="true"
ALMACEN_LOCAL_RUTA="./almacen-local"
# Si usas el Storage de Supabase, pon S3_USAR_ALMACEN_LOCAL="false" y completa S3_ENDPOINT, S3_ACCESS_KEY y S3_SECRET_KEY.
# SMTP, Power BI y TI son opcionales.
```

Generar el cliente de Prisma:

```powershell
pnpm prisma:generate
```

Aplicar las migraciones, incluida la de "En progreso" (**solo en la base de desarrollo**):

```powershell
pnpm prisma:deploy
```

Cargar los datos semilla (opcional):

```powershell
pnpm prisma:seed
```

Correr las pruebas (deben pasar 27):

```powershell
pnpm test
```

Compilar:

```powershell
pnpm build
```

Levantar el backend:

```powershell
pnpm start:dev
```

- API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs

### 2.3 Frontend (puerto 3000), en otra terminal

```powershell
cd D:\Proyectos\SIAC\Frontend
pnpm install
```

```powershell
Set-Content .env.local "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1"
```

```powershell
pnpm dev
```

- App: http://localhost:3000

### 2.4 Qué revisar a mano en el navegador

- [ ] En la lista de programas solo aparece **"En progreso"** y ningún "En curso". Para mirarlo directo en la base, usa `pnpm prisma:studio` desde `Backend`.
- [ ] Con el backend apagado, el frontend muestra un error y **no** datos de prueba.
- [ ] Como **Admin**, en `/administrador/usuarios` se puede asignar un programa a un usuario.
- [ ] El **Admin no puede** asignar el rol SuperAdmin.
- [ ] Un usuario asignado a un solo programa **solo ve ese programa**. Si intenta abrir otro por URL o por la API, recibe **403**.
- [ ] El **Revisor** puede revisar pero no tiene permisos de administración.
- [ ] Asignar dos veces el mismo usuario al mismo programa da error.

### 2.5 Volver a develop_v2 y borrar la rama de prueba

```powershell
cd D:\Proyectos\SIAC
git switch develop_v2
git branch -D prueba-pr5
```

---

## 3. Flujo de despliegue: develop_v2 primero, luego main

### Paso A: marcar el PR como listo e integrarlo en develop_v2 con rebase

```powershell
gh pr ready 5 --repo DeibyRamirez/SIAC
```

```powershell
gh pr merge 5 --repo DeibyRamirez/SIAC --rebase --delete-branch
```

Con `--rebase` queda el mismo commit único, a nombre de DeibyRamirez.

### Paso B: aplicar la migración en develop_v2 y validar

```powershell
cd D:\Proyectos\SIAC
git switch develop_v2
git pull origin develop_v2
```

```powershell
cd D:\Proyectos\SIAC\Backend
pnpm install
pnpm prisma:generate
```

Con el `.env` apuntando a la base **del entorno de develop_v2**:

```powershell
pnpm prisma:deploy
```

Después repite la lista de la sección 2.4 en ese entorno.

### Paso C: crear el PR de develop_v2 a main (según la convención)

```powershell
gh pr create --repo DeibyRamirez/SIAC --base main --head develop_v2 `
  --title "[feature][Sprint 1][HU-011][HU-002] Paso de develop_v2 a main: alcance por programa y permisos del Revisor" `
  --body "Tipo: feature`nSprint: 1`nHistorias de usuario: HU-011, HU-002`nResumen: Integra en main el bloque base del Sprint 1 validado en develop_v2 (alcance por programa, permisos del Revisor, estado 'En progreso')."
```

Revísalo en GitHub y luego intégralo (cambia `<numero>` por el número del PR):

```powershell
gh pr merge <numero> --repo DeibyRamirez/SIAC --merge
```

### Paso D: migración en producción y verificación del CD

1. Aplica la migración en la base de **producción** antes del despliegue o junto con él. Si no, el código nuevo buscará "En progreso" y la base seguirá diciendo "En curso". Usa el `.env` de producción:

```powershell
cd D:\Proyectos\SIAC\Backend
pnpm prisma:deploy
```

2. El push a `main` dispara el workflow `CD`. Revísalo en:
   https://github.com/DeibyRamirez/SIAC/actions
   - Los jobs **Deploy backend** y **Deploy frontend** deben desplegar de verdad, no solo imprimir "Configure ... to enable ... deployment".
3. En Vercel, `NEXT_PUBLIC_API_URL` debe apuntar a la URL pública del backend.
4. En Render, `CORS_ORIGEN` debe apuntar a la URL de Vercel.

---

## 4. Notas importantes

- **La migración cambia datos:** convierte `'En curso'` en `'En progreso'`. Pruébala en una base de desarrollo, nunca en producción.
- **CI** (`.github/workflows/ci.yml`): solo corre en push o PR hacia `develop` y `main`. **No corre en `develop_v2`**, así que ahí hay que validar a mano con `pnpm test` y `pnpm build`.
- **CD** (`.github/workflows/cd.yml`): solo despliega con **push a `main`**, o a mano con `workflow_dispatch`.
- **Ningún workflow aplica migraciones:** `prisma migrate deploy` hay que correrlo a mano en cada base.
- **Secrets necesarios en GitHub** (Settings, Secrets and variables, Actions, environment `production`):
  - Backend (Render): `RENDER_DEPLOY_HOOK_URL`
  - Frontend (Vercel): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
  - Variable opcional: `NEXT_PUBLIC_API_URL`, que se usa en el build.
- **Puertos locales:** 3001 para el backend (`PUERTO`) y 3000 para el frontend.
- **Herramientas:** Node 20 y pnpm 10. Para los pasos A y C necesitas la CLI `gh` con sesión iniciada como DeibyRamirez (`gh auth login`).
- Este archivo está en la raíz del repo sin commit. No lo agregues a ningún commit; bórralo o muévelo cuando ya no lo necesites.

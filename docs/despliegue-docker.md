# Despliegue SIAC con Docker (servidor universitario)

Orquestación pensada para **un servidor propio** de la institución: API NestJS, frontend Next.js (modo `standalone`) y tareas puntuales de Prisma. **No incluye PostgreSQL**: la base de datos vive en el servicio gestionado por la universidad.

## Requisitos

- Docker Engine 24+ y Docker Compose v2.
- Archivo de entorno **fuera del repositorio** (por ejemplo `/etc/siac/siac.prod.env`), con permisos restrictivos (`chmod 600`).
- Cadenas `DATABASE_URL` y `DIRECT_URL` hacia Postgres institucional (migraciones vía `DIRECT_URL`).
- Red/firewall: exponer solo el puerto del frontend (3000) o un reverse proxy TLS delante.

## Variables (solo nombres)

Defínalas en el `env_file`; **no** las commitee ni las pase por argumentos de build.

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Conexión de la API (pooler / rol aplicación **`siac_app`**, nunca el dueño `postgres`). |
| `DIRECT_URL` | Migraciones y scripts Prisma (rol con permisos DDL). |
| `AUTH_LOGIN_LIMITE_INTENTOS` | Intentos de login por IP por ventana (por defecto `5`). |
| `AUTH_LOGIN_LIMITE_TTL_MS` | Ventana del límite de login en ms (por defecto `60000`). |
| `TRUST_PROXY` | `false`, `true` o número de saltos de proxy para `req.ip` (rate limit). En producción, si no se define, se asume `1` detrás del reverse proxy. Use `false` solo si la API recibe tráfico directo sin proxy. |
| `JWT_SECRETO` | Firma de tokens (producción, ≥ 32 caracteres aleatorios). |
| `FRONTEND_URL` | Enlaces en correos y CORS si aplica. |
| `CORS_ORIGENES` | Orígenes permitidos (opcional si solo hay BFF). |
| `S3_USAR_ALMACEN_LOCAL` | `true` para disco local (volumen `siac-almacen`). |
| `ALMACEN_LOCAL_RUTA` | Ruta en el contenedor API (por defecto `/app/almacen-local`). |
| `API_URL_INTERNAL` | En **runtime** del contenedor `web` (compose la fija a `http://api:3001/api/v1`). |
| `PRIMER_ADMIN_NOMBRE` | Solo al ejecutar `prisma:primer-admin` (instancia vacía). |
| `PRIMER_ADMIN_CORREO` | Correo institucional del primer SuperAdmin. |
| `PRIMER_ADMIN_CLAVE` | Clave temporal (mínimo 12 caracteres); no guardar en historial de shell. |
| `DOMINIO_INSTITUCIONAL` | Dominio de correo permitido (opcional). |
| Variables S3 (`S3_*`) | Si `S3_USAR_ALMACEN_LOCAL=false`. |
| `CORREO_*` / Resend | Canal de notificaciones (opcional). |
| `PUERTO` / `PORT` | Puerto HTTP del API (3001 por defecto). |

**No usar en imagen:** secretos en `ARG`/`ENV` del Dockerfile, ni `start:despliegue` (las migraciones van en el servicio `migrate`).

## Paso obligatorio: rol `siac_app` con LOGIN (RLS)

Las migraciones crean `siac_app` con `NOLOGIN`. **La API en producción debe conectarse con ese rol**, no con el dueño de la base (`postgres`), porque el dueño tiene `BYPASSRLS` y las políticas de Row Level Security no se aplican.

1. Tras el primer `migrate` (servicio `migrate` o `pnpm prisma:deploy` con `DIRECT_URL` del dueño), habilite el login del rol de aplicación en el motor PostgreSQL institucional (SQL Editor o `psql`). Use una contraseña larga generada en el gestor de secretos; **no** la pegue en el repositorio ni en `env_file` versionado:

   ```sql
   ALTER ROLE siac_app LOGIN PASSWORD '<contraseña-larga-aleatoria>';
   ```

2. Compruebe que el rol no es superusuario ni tiene `BYPASSRLS`:

   ```sql
   SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = 'siac_app';
   ```

3. En el `env_file` del compose, asigne **`DATABASE_URL` al usuario `siac_app`** (mismo host/puerto que usa el pooler o la institución). Mantenga **`DIRECT_URL`** con el rol de migración (dueño o rol DDL).

4. Al arrancar, la API registra una **advertencia** (sin detener el proceso) si `DATABASE_URL` apunta a `postgres`, a un superusuario o a un rol con `BYPASSRLS`.

Detalle ampliado (Supabase/Render): `docs/despliegue.md` §9.

## Proxy, IP del cliente y límite de login

`POST /api/v1/auth/login` aplica **5 intentos por minuto por IP** (configurable con `AUTH_LOGIN_LIMITE_INTENTOS` y `AUTH_LOGIN_LIMITE_TTL_MS`) y responde **429** al superar el cupo.

- Con **`TRUST_PROXY=false`** (o en desarrollo, por defecto), Express **no** confía en `X-Forwarded-For`: el contador usa la IP del socket. Un cliente no puede falsear la IP salvo que llegue tráfico directo a Node.
- Con **`TRUST_PROXY=1`** (valor por defecto en `NODE_ENV=production` si no se define otra cosa), la IP del cliente la fija el **primer** reverse proxy de confianza (nginx, balanceador o el proxy del servidor universitario). **No exponga el puerto 3001 de la API a Internet sin proxy**: si alguien conecta directamente a Node, podría enviar un `X-Forwarded-For` arbitrario.

Coloque el reverse proxy delante de `api` en `docker-compose.prod.yml` o en la capa institucional y deje `TRUST_PROXY=1` salvo que TI confirme un arreglo distinto (p. ej. dos saltos: `TRUST_PROXY=2`).

No existen en la API endpoints de refresh token ni de recuperación de contraseña en el alcance actual; solo se limita el login.

## Construcción de imágenes

Desde la raíz del repositorio:

```bash
export SIAC_ENV_FILE=/ruta/segura/siac.prod.env   # solo para compose; no necesario para build

docker build -t siac-api:prod -f Backend/Dockerfile --target runtime Backend
docker build -t siac-web:prod -f Frontend/Dockerfile --target runtime Frontend
```

El Dockerfile del frontend define `SIAC_DOCKER_BUILD=true` para activar `output: 'standalone'` (Vercel y `pnpm build` local no lo usan).

El CI valida estos mismos `docker build` sin publicar en ningún registro.

## Arranque (compose)

```bash
export SIAC_ENV_FILE=/etc/siac/siac.prod.env
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Orden:

1. **`migrate`** (una sola ejecución): `pnpm prisma:deploy`.
2. **`api`**: una réplica (`deploy.replicas: 1`) — los crons de vigencia usan memoria local; no escalar sin Redis/leader election.
3. **`web`**: Next.js en el puerto 3000.

Health checks integrados:

- API: `GET /api/v1/salud`
- Web: respuesta HTTP en `/`

## Semilla de configuración

Tras migraciones, si hace falta asegurar la fila global de configuración (sin usuarios):

```bash
docker compose -f docker-compose.prod.yml run --rm migrate pnpm prisma:seed
```

## Primer administrador (sin dejar secretos en el historial)

**No** exportar `PRIMER_ADMIN_*` en la shell interactiva si el historial está activo. Opciones seguras:

### Opción A — archivo temporal con permisos restrictivos

```bash
umask 077
cat > /tmp/siac-primer-admin.env <<'EOF'
PRIMER_ADMIN_NOMBRE=Nombre Apellido
PRIMER_ADMIN_CORREO=admin@uniautonoma.edu.co
PRIMER_ADMIN_CLAVE=clave-temporal-segura-12+
EOF
docker compose -f docker-compose.prod.yml run --rm \
  --env-file /etc/siac/siac.prod.env \
  --env-file /tmp/siac-primer-admin.env \
  migrate pnpm prisma:primer-admin
shred -u /tmp/siac-primer-admin.env 2>/dev/null || rm -f /tmp/siac-primer-admin.env
```

### Opción B — `docker compose run` con `--env-file` dedicado fuera del repo

Mismo patrón: un archivo legible solo por el operador, nunca versionado.

El script aborta si ya existen usuarios.

## Almacenamiento local

Si `S3_USAR_ALMACEN_LOCAL=true`, monte el volumen nombrado `siac-almacen` (ya definido en `docker-compose.prod.yml`). Haga copias de seguridad del volumen en el plan de continuidad institucional.

Con almacenamiento S3-compatible, ponga `S3_USAR_ALMACEN_LOCAL=false` y configure las variables `S3_*` en el `env_file`.

## Comprobaciones manuales

```bash
curl -sf "http://localhost:3001/api/v1/salud"
curl -sf -o /dev/null -w "%{http_code}\n" "http://localhost:3000/"
```

## Límites de esta guía

No cubre: instalación del motor Docker en el SO universitario, certificados TLS del reverse proxy, firewall institucional, backup remoto del volumen ni alta disponibilidad multi-nodo. Esas tareas dependen de la política de TI de la CUAC.

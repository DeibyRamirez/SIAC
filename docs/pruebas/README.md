# Artefactos de prueba (F-05 / ISO 29119)

## Contenido

| Artefacto | Descripción |
|-----------|-------------|
| `F-05_Documento_de_pruebas.docx` | Documento de pruebas consolidado |
| `postman/SIAC-api-v1.postman_collection.json` | Colección Postman completa `/api/v1` (generada desde OpenAPI) |
| `postman/COBERTURA-SWAGGER.md` | Matriz Swagger → colección y exclusiones |
| `postman/siac-local.postman_environment.json` | Entorno local/CI (`localhost:3001`, placeholders) |
| `ejecutar-newman.sh` | Newman + `htmlextra` + JSON → `reporte-newman.html` / `reporte-newman.json` |
| `sanitizar-reporte-newman.mjs` | Quita JWT/contraseñas de los reportes antes de commit/artifacts |
| `k6/carga-api-local.js` | Script k6 (5 VU, 30 s) contra `GET /salud` |

Generar o actualizar la colección tras cambiar `docs/contrato-api/openapi.json`:

```bash
node docs/pruebas/postman/generar-coleccion-desde-openapi.mjs
```

## Newman (API)

Solo **localhost** o el PostgreSQL efímero de CI. El script `verificar-destino-newman.sh` bloquea Supabase, Vercel y Render.

1. `docker compose up -d` en la raíz del repo (puerto **5433**).
2. En `Backend/`:

   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/siac"
   export DIRECT_URL="$DATABASE_URL"
   export NEWMAN_CLAVE_PRUEBA="<mín. 12 caracteres, solo terminal>"
   pnpm prisma migrate deploy
   pnpm prisma:seed
   pnpm prisma:usuarios-newman
   pnpm prisma:fixtures-newman
   pnpm build && pnpm start:prod
   ```

3. Otra terminal: `export NEWMAN_CLAVE_PRUEBA=...` y `./docs/pruebas/ejecutar-newman.sh`.

El script `ejecutar-newman.sh` vuelve a ejecutar `prisma:usuarios-newman` y `prisma:fixtures-newman`, fusiona IDs en un entorno efímero y **falla (exit ≠ 0)** si alguna aserción Newman no pasa.

**Última corrida local verificada (misma rama):** 113 peticiones ejecutadas (0 errores de transporte), **323** aserciones (**323** aprobadas, **0** fallidas). Los reportes sanitizados distinguen transporte OK de aserciones HTTP/JSON aprobadas.

Las mismas rutas están cubiertas además por `Backend/test/e2e` (supertest) en el CI (`.github/workflows/ci.yml`).

### E2E (referencia CI)

Última corrida **verde** en `develop_v2` (comprobar en GitHub Actions):

- Run [42132532700](https://github.com/DeibyRamirez/SIAC/actions/runs/42132532700) — commit `cc55616233ba83e7447c47539152c84c86333490`
- Jest unitario: **79** suites, **677** tests
- E2E: **21** suites, **100** tests (0 fallidos, 0 omitidos)

## k6 (carga básica)

Instalar [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) y, con la API levantada:

```bash
K6_BASE_URL=http://localhost:3001/api/v1 k6 run docs/pruebas/k6/carga-api-local.js
```

No ejecutar contra producción (`siac-one.vercel.app` ni Render).

## Cobertura (referencia)

```bash
cd Backend && pnpm test:cov
cd Frontend && pnpm test:cov
```

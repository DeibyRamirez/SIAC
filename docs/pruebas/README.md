# Artefactos de prueba (F-05 / ISO 29119)

## Contenido

| Artefacto | Descripción |
|-----------|-------------|
| `F-05_Documento_de_pruebas.docx` | Documento de pruebas consolidado |
| `postman/SIAC-principal.postman_collection.json` | Colección Postman (éxito + error por endpoint) |
| `postman/siac-local.postman_environment.json` | Entorno local (`localhost:3001`) |
| `ejecutar-newman.sh` | Ejecuta Newman y escribe `newman/newman-report.json` |
| `k6/carga-api-local.js` | Script k6 (5 VU, 30 s) contra `GET /salud` |

## Newman (API)

1. `docker compose up -d` en la raíz del repo.
2. En `Backend/`: `pnpm prisma migrate deploy && pnpm prisma:seed && pnpm start:dev`.
3. `./docs/pruebas/ejecutar-newman.sh`.

Las mismas rutas están cubiertas por `Backend/test/e2e` (supertest) en el CI (`.github/workflows/ci.yml`).

## k6 (carga básica)

Instalar [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) y, con la API levantada:

```bash
K6_BASE_URL=http://localhost:3001/api/v1 k6 run docs/pruebas/k6/carga-api-local.js
```

No ejecutar contra producción (`siac-one.vercel.app` ni Render).

## Cobertura (referencia)

Medir en el commit documentado en F-05:

```bash
cd Backend && pnpm test:cov
cd Frontend && pnpm test:cov
```

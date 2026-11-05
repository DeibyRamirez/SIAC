/**
 * Prueba básica de carga k6 — SOLO entorno local o CI (nunca producción).
 * Uso: k6 run docs/pruebas/k6/carga-api-local.js
 * Requiere API en K6_BASE_URL (por defecto http://localhost:3001/api/v1).
 *
 * RNF: F-02 no define SLAs numéricos en el repo; se relaciona con RNF-001 (API REST)
 * y la observación de arranque en frío (docs/despliegue.md, DEF-007).
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const base = __ENV.K6_BASE_URL || 'http://localhost:3001/api/v1';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  const salud = http.get(`${base}/salud`);
  check(salud, { 'salud 200': (r) => r.status === 200 });
  sleep(0.3);
}

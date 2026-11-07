#!/usr/bin/env node
/**
 * Genera la colección Postman F-05 desde docs/contrato-api/openapi.json (108 operaciones).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolverExpectativa } from './resolver-expectativas-newman.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../..');
const OPENAPI = path.join(REPO, 'docs/contrato-api/openapi.json');
const SALIDA = path.join(__dirname, 'SIAC-api-v1.postman_collection.json');
const MATRIZ = path.join(__dirname, 'COBERTURA-SWAGGER.md');

const doc = JSON.parse(fs.readFileSync(OPENAPI, 'utf8'));

const OMITIR_EN_API = new Set(['post /api/v1/auth/login', 'get /api/v1/auth/perfil', 'get /api/v1/salud']);

function metodoHttp(m) {
  return m.toUpperCase();
}

function quitarPrefijo(ruta) {
  return ruta.replace(/^\/api\/v1/, '') || '/';
}

function sustituirPath(ruta, expectativa) {
  let rel = quitarPrefijo(ruta);
  const mapa = {
    '{categoria}': 'estudiantes',
    '{slug}': '{{programaSlug}}',
    '{tipoTramite}': '{{tipoTramite}}',
    '{periodo}': '{{periodoAcademico}}',
    '{evidenciaId}': '{{evidenciaId}}',
    '{programaId}': '{{programaId}}',
    '{usuarioId}': '{{usuarioId}}',
  };
  for (const [seg, val] of Object.entries(mapa)) rel = rel.split(seg).join(val);
  if (expectativa?.urlSuffix) {
    rel = `/${expectativa.urlSuffix}`;
  } else if (ruta.includes('almacen-local/*')) {
    rel = '/{{almacenClavePrueba}}';
  }
  const idVar = expectativa?.idVar ?? 'recursoId';
  rel = rel.replace(/\{id\}/g, `{{${idVar}}}`);
  rel = rel.replace(/(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g, (match, name) => {
    const mapped = mapa[`{${name}}`];
    if (mapped) return mapped;
    if (name === 'a' || name === 'b') return '1';
    if (name === 'categoriaId') return 'estudiantes';
    return `{{${idVar}}}`;
  });
  return rel.startsWith('/') ? rel : `/${rel}`;
}

function scriptsPrueba(status) {
  return {
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec: [
        `pm.test('HTTP ${status}', function () { pm.response.to.have.status(${status}); });`,
        "const ctype = pm.response.headers.get('Content-Type') || '';",
        `if (pm.response.code === ${status} && ctype.includes('application/json')) {`,
        '  pm.test("Cuerpo JSON válido", function () {',
        '    const b = pm.response.json();',
        '    pm.expect(b).to.satisfy((v) => v !== null && typeof v === "object");',
        '  });',
        status >= 400
          ? "  pm.test('Forma ErrorHttpDto', function () { const b = pm.response.json(); pm.expect(b).to.have.property('statusCode'); pm.expect(b).to.have.property('message'); });"
          : "  pm.test('Sin ErrorHttpDto en éxito', function () { const b = pm.response.json(); if (!Array.isArray(b)) { pm.expect(b).to.not.have.property('statusCode'); } });",
        '}',
      ],
    },
  };
}

function crearPeticion(nombre, metodo, ruta, op) {
  const m = metodo.toLowerCase();
  const exp = resolverExpectativa(m, ruta, op);
  const status = exp.status;
  const headers = [];
  if (exp.apiKey) {
    headers.push({ key: 'x-api-key', value: '{{apiKeyIntegrador}}' });
  } else if (exp.token) {
    headers.push({ key: 'Authorization', value: `Bearer {{${exp.token}}}` });
  }
  let body;
  if (exp.multipart) {
    const formdata = [{ key: 'archivo', type: 'file', src: exp.archivo }];
    for (const field of exp.fields ?? []) formdata.push(field);
    if (exp.multipartVacio) formdata.length = 0;
    body = { mode: 'formdata', formdata };
  } else if (exp.body) {
    headers.push({ key: 'Content-Type', value: 'application/json' });
    body = { mode: 'raw', raw: exp.body };
  }
  const rel = sustituirPath(ruta, exp);
  return {
    name: nombre,
    request: {
      method: metodoHttp(m),
      header: headers,
      body,
      url: `{{baseUrl}}${rel}`,
      description: (exp.escenario ?? 'positivo') + (op.description ? `\n\n${op.description.slice(0, 400)}` : ''),
    },
    event: [scriptsPrueba(status)],
  };
}

function carpetaPreparacion() {
  const roles = [
    ['Login Cargador', 'correoCargador', 'tokenCargador'],
    ['Login Revisor', 'correoRevisor', 'tokenRevisor'],
    ['Login Administrador', 'correoAdmin', 'tokenAdmin'],
    ['Login SuperAdmin', 'correoSuperAdmin', 'tokenSuperAdmin'],
  ];
  return {
    name: '00 — Preparación (tokens)',
    item: [
      ...roles.map(([titulo, correoVar, tokenVar]) => ({
        name: titulo,
        event: [{
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'pm.test("HTTP 200", () => pm.response.to.have.status(200));',
              `pm.collectionVariables.set("${tokenVar}", pm.response.json().token);`,
            ],
          },
        }],
        request: {
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: `{\n  "correo": "{{${correoVar}}}",\n  "contrasena": "{{clavePrueba}}"\n}`,
          },
          url: '{{baseUrl}}/auth/login',
        },
      })),
      {
        name: 'GET salud (público)',
        event: [scriptsPrueba(200)],
        request: { method: 'GET', url: '{{baseUrl}}/salud' },
      },
    ],
  };
}

function carpetaErrores() {
  return {
    name: '98 — Negativo (autenticación)',
    item: [
      {
        name: 'Login SQLi (400 validación)',
        event: [scriptsPrueba(400)],
        request: {
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: '{\n  "correo": "admin\' OR \'1\'=\'1\'@uniautonoma.edu.co",\n  "contrasena": "\' OR 1=1 --"\n}',
          },
          url: '{{baseUrl}}/auth/login',
        },
      },
      {
        name: 'Perfil sin token (401)',
        event: [scriptsPrueba(401)],
        request: { method: 'GET', url: '{{baseUrl}}/auth/perfil' },
      },
      {
        name: 'Token Power BI como Revisor (403)',
        event: [scriptsPrueba(403)],
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{tokenRevisor}}' }],
          url: '{{baseUrl}}/metricas/token',
        },
      },
    ],
  };
}

const porTag = new Map();
const matrizFilas = [];

for (const [ruta, metodos] of Object.entries(doc.paths ?? {})) {
  for (const [metodo, op] of Object.entries(metodos)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(metodo)) continue;
    const opKey = `${metodo} ${ruta}`;
    let cobertura = 'SIAC-api-v1 (carpeta API)';
    let nota = '';
    if (OMITIR_EN_API.has(opKey)) {
      cobertura = opKey.startsWith('post') ? '00 — Preparación (login×4)' : opKey.includes('salud') ? '00 — Preparación' : '98 — Negativo / 00';
      nota = 'No duplicada en carpetas API; cubierta en preparación o negativo.';
    } else if (ruta.includes('/almacen-local/')) {
      nota = 'Ruta concreta GET /almacen-local/{{almacenClavePrueba}} (fixture de archivo en preparar-fixtures-newman).';
    }
    matrizFilas.push({
      metodo: metodoHttp(metodo),
      ruta,
      cobertura,
      nota,
    });
    if (OMITIR_EN_API.has(opKey)) continue;
    const tag = op.tags?.[0] ?? 'Sin etiqueta';
    const item = crearPeticion(op.summary || op.operationId || opKey, metodo, ruta, op);
    if (!porTag.has(tag)) porTag.set(tag, []);
    porTag.get(tag).push(item);
  }
}

const carpetasOpenApi = [...porTag.entries()]
  .sort(([a], [b]) => a.localeCompare(b, 'es'))
  .map(([tag, items]) => ({
    name: `API — ${tag}`,
    item: items.sort((a, b) => {
      const prioridad = (m) => ({ GET: 1, PATCH: 2, POST: 3, PUT: 3, DELETE: 9 }[m] ?? 5);
      const pa = prioridad(a.request.method);
      const pb = prioridad(b.request.method);
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, 'es');
    }),
  }));

const coleccion = {
  info: {
    _postman_id: 'siac-f05-api-v1-completa',
    name: 'SIAC API /api/v1 (F-05 Newman)',
    description:
      '108 operaciones OpenAPI. Preparación: tokens + BD fixtures (pnpm prisma:fixtures-newman). Sin secretos en repo.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3001/api/v1' },
    { key: 'tokenAdmin', value: '' },
    { key: 'tokenRevisor', value: '' },
    { key: 'tokenCargador', value: '' },
    { key: 'tokenSuperAdmin', value: '' },
    { key: 'programaId', value: '' },
    { key: 'programaIdCarga', value: '' },
    { key: 'evidenciaId', value: '' },
    { key: 'evidenciaEnRevisionId', value: '' },
    { key: 'evidenciaIdEnviar', value: '' },
    { key: 'evidenciaIdEliminar', value: '' },
    { key: 'vigenciaAnexoId', value: '' },
    { key: 'usuarioId', value: '' },
    { key: 'usuarioIdDeshabilitar', value: '' },
    { key: 'etapaId', value: '' },
    { key: 'carpetaId', value: '' },
    { key: 'documentoRequeridoId', value: '' },
    { key: 'alertaId', value: '' },
    { key: 'plantillaId', value: '' },
    { key: 'integradorIdRevocar', value: '' },
    { key: 'apiKeyIntegrador', value: '' },
    { key: 'almacenClavePrueba', value: '' },
    { key: 'programaSlug', value: '' },
    { key: 'categoriaCifras', value: 'estudiantes' },
    { key: 'periodoAcademico', value: '2026-1' },
    { key: 'tipoTramite', value: 'RegistroCalificadoNuevo' },
    { key: 'recursoId', value: '00000000-0000-4000-8000-000000000099' },
  ],
  event: [
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          "const keys = ['programaId','programaIdCarga','evidenciaId','evidenciaIdEnviar','evidenciaIdEliminar','evidenciaEnRevisionId','vigenciaAnexoId','usuarioId','usuarioIdDeshabilitar','etapaId','carpetaId','documentoRequeridoId','alertaId','plantillaId','integradorIdRevocar','apiKeyIntegrador','almacenClavePrueba','programaSlug'];",
          'keys.forEach((k) => { const v = pm.environment.get(k); if (v) pm.collectionVariables.set(k, v); });',
        ],
      },
    },
  ],
  item: [carpetaPreparacion(), ...carpetasOpenApi, carpetaErrores()],
};

fs.writeFileSync(SALIDA, `${JSON.stringify(coleccion, null, 2)}\n`);

const duplicadas = 3;
const enApi = matrizFilas.length - duplicadas;

const matriz = [
  '# Matriz de cobertura Swagger → colección Postman',
  '',
  `Generado: ${new Date().toISOString()}`,
  '',
  '## Conteo',
  '',
  `| Concepto | Cantidad |`,
  `|----------|----------:|`,
  `| Operaciones HTTP en \`openapi.json\` | **${matrizFilas.length}** |`,
  `| Cubiertas en carpetas API (sin duplicar login/perfil/salud) | **${enApi}** |`,
  `| Cubiertas solo en 00 / 98 (login, salud, perfil/errores) | **${duplicadas}** |`,
  `| **Total cubiertas (108)** | **${matrizFilas.length}** |`,
  '',
  'Desglose de las 4 rutas que antes parecían “faltantes”: 3 son login/salud/perfil (no se repiten en API) + 1 es el wildcard `*path` cubierto con **ruta concreta** y archivo de fixture.',
  '',
  '| Método | Ruta | Dónde en la colección | Notas |',
  '|--------|------|------------------------|-------|',
  ...matrizFilas.map(
    (f) => `| ${f.metodo} | \`${f.ruta}\` | ${f.cobertura} | ${f.nota || '—'} |`,
  ),
  '',
  '## Almacenamiento local',
  '',
  '`GET /api/v1/almacen-local/*path` en OpenAPI es plantilla de ruta. Newman usa `GET /api/v1/almacen-local/{{almacenClavePrueba}}` con archivo creado en `Backend/prisma/preparar-fixtures-newman.ts`. El backend devolvía 500 si el archivo no existía (stream sin handler); corregido a **404** en `almacenamiento-local.controller.ts`. No hay E2E HTTP de esta ruta en supertest (las E2E usan `AlmacenamientoMemoria`).',
  '',
].join('\n');

fs.writeFileSync(MATRIZ, `${matriz}\n`);

const totalItems =
  coleccion.item.reduce((n, f) => n + (f.item?.length ?? 0), 0);
console.log(`Colección: ${SALIDA} (${enApi} ops API + prep/negativo = ${totalItems} peticiones)`);
console.log(`Matriz: ${MATRIZ} (${matrizFilas.length} filas)`);

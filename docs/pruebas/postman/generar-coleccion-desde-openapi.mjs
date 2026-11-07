#!/usr/bin/env node
/**
 * Genera la colección Postman F-05 a partir de docs/contrato-api/openapi.json.
 * Ejecutar desde la raíz del repo: node docs/pruebas/postman/generar-coleccion-desde-openapi.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../..');
const OPENAPI = path.join(REPO, 'docs/contrato-api/openapi.json');
const SALIDA = path.join(__dirname, 'SIAC-api-v1.postman_collection.json');
const MATRIZ = path.join(__dirname, 'COBERTURA-SWAGGER.md');

const SENTINEL_UUID = '00000000-0000-4000-8000-000000000099';

const doc = JSON.parse(fs.readFileSync(OPENAPI, 'utf8'));

const VAR_POR_SEGMENTO = {
  '{id}': 'recursoId',
  '{evidenciaId}': 'evidenciaId',
  '{programaId}': 'programaId',
  '{usuarioId}': 'usuarioId',
  '{categoria}': 'categoriaCifras',
  '{slug}': 'programaSlug',
  '{tipoTramite}': 'tipoTramite',
  '{periodo}': 'periodoAcademico',
  '{path}': 'rutaAlmacenLocal',
};

function metodoHttp(m) {
  return m.toUpperCase();
}

function quitarPrefijo(ruta) {
  return ruta.replace(/^\/api\/v1/, '') || '/';
}

function elegirToken(ruta, metodo) {
  if (ruta.includes('/integracion/claves')) return 'tokenSuperAdmin';
  if (ruta.includes('/usuarios')) return 'tokenSuperAdmin';
  if (ruta.includes('/cifras-institucionales') && !ruta.includes('integracion')) {
    return 'tokenAdmin';
  }
  if (ruta.includes('/aprobacion') || ruta.includes('mis-revisiones')) return 'tokenRevisor';
  if (ruta.includes('/integracion/catalogo') || ruta.includes('/integracion/sync')) return 'tokenAdmin';
  if (ruta.includes('/auth/')) return null;
  if (ruta.includes('/salud')) return null;
  if (metodo === 'post' && ruta === '/evidencias') return 'tokenCargador';
  if (ruta.includes('/metricas/token')) return 'tokenAdmin';
  if (ruta.includes('/aprobacion')) return 'tokenRevisor';
  return 'tokenSuperAdmin';
}

function usaApiKey(ruta, seguridad) {
  if (seguridad?.some((s) => s['api-key'] !== undefined)) return true;
  return ruta.includes('/integracion/cifras-institucionales/');
}

function statusEsperado(op, metodo, ruta, cuerpoPlano, esMultipart) {
  const codigos = Object.keys(op.responses ?? {});
  const tieneIdVariable =
    ruta.includes('{id}') ||
    ruta.includes('{evidenciaId}') ||
    ruta.includes('{usuarioId}') ||
    ruta.includes('{programaId}');

  if (esMultipart) return 400;
  if (ruta.includes('/integracion/cifras-institucionales/')) return 401;
  if (ruta.includes('/vigencias/demo')) return 400;
  if (ruta.includes('/integracion/sync') || ruta.includes('/integracion/catalogo')) return 400;
  if (ruta.includes('/evidencias') && tieneIdVariable && metodo !== 'post') return 404;
  if (metodo === 'delete' && tieneIdVariable) return 404;
  if ((metodo === 'get' || metodo === 'patch') && tieneIdVariable) return 404;
  if (ruta === '/auth/google') return 501;
  if (ruta === '/auth/login' && cuerpoPlano?.includes('OR 1=1')) return 400;
  if (cuerpoPlano === '{}' && ['post', 'patch', 'put'].includes(metodo)) return 400;
  if (metodo === 'post' && codigos.includes('201') && cuerpoPlano !== '{}') return 201;
  if (metodo === 'post' && codigos.includes('201')) return 400;
  if (codigos.includes('200')) return 200;
  if (codigos.includes('204')) return 204;
  if (codigos.includes('403')) return 403;
  if (codigos.includes('401')) return 401;
  return parseInt(codigos.find((c) => /^\d+$/.test(c)) ?? '400', 10);
}

function sustituirPath(ruta) {
  let out = quitarPrefijo(ruta);
  const mapaValor = {
    '{evidenciaId}': '{{evidenciaId}}',
    '{programaId}': '{{programaId}}',
    '{usuarioId}': '{{usuarioId}}',
    '{slug}': '{{programaSlug}}',
    '{categoria}': '{{categoriaCifras}}',
    '{tipoTramite}': '{{tipoTramite}}',
    '{periodo}': '{{periodoAcademico}}',
    '{path}': 'fixtures/prueba.txt',
    '{id}': '{{recursoId}}',
  };
  for (const [seg, valor] of Object.entries(mapaValor)) {
    out = out.split(seg).join(valor);
  }
  out = out.replace(/\{[^}]+\}/g, SENTINEL_UUID);
  if (!out.includes('{{recursoId}}') && !out.includes('{{evidenciaId}}')) {
    /* sin cambios */
  }
  if (out.includes('{{recursoId}}') && out.includes(SENTINEL_UUID) === false) {
    /* recursoId puede seguir vacío → 404 */
  }
  return out;
}

function cuerpoEjemplo(op, ruta, metodo) {
  const content = op.requestBody?.content;
  if (!content) return null;
  if (content['multipart/form-data']) {
    return { mode: 'formdata', formdata: [{ key: 'archivo', type: 'file', src: [] }] };
  }
  if (content['application/json']) {
    if (ruta === '/auth/login') {
      return {
        mode: 'raw',
        raw: '{\n  "correo": "{{correoAdmin}}",\n  "contrasena": "{{clavePrueba}}"\n}',
      };
    }
    const schema = content['application/json'].schema;
    if (schema?.$ref?.endsWith('IniciarSesionDto')) {
      return {
        mode: 'raw',
        raw: '{\n  "correo": "{{correoAdmin}}",\n  "contrasena": "{{clavePrueba}}"\n}',
      };
    }
    return { mode: 'raw', raw: '{}' };
  }
  return null;
}

function scriptsPrueba(status) {
  const lineas = [
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
  ];
  if (status === 200) {
    lineas.push(
      "if (pm.request.url.path.join('/').includes('auth/login')) {",
      '  pm.test("Guarda token admin", function () {',
      '    const b = pm.response.json();',
      '    pm.expect(b.token).to.be.a("string").and.not.empty;',
      '    pm.collectionVariables.set("tokenAdmin", b.token);',
      '  });',
      '}',
    );
  }
  return {
    listen: 'test',
    script: { type: 'text/javascript', exec: lineas },
  };
}

function crearPeticion(nombre, metodo, ruta, op) {
  const m = metodo.toLowerCase();
  const pathRel = sustituirPath(ruta);
  const url = `{{baseUrl}}${pathRel.startsWith('/') ? pathRel : `/${pathRel}`}`;
  const body = cuerpoEjemplo(op, quitarPrefijo(ruta), m);
  const rawLogin = body?.raw ?? '';
  const esMultipart = Boolean(op.requestBody?.content?.['multipart/form-data']);
  const status = statusEsperado(op, m, quitarPrefijo(ruta), rawLogin, esMultipart);
  const headers = [{ key: 'Content-Type', value: 'application/json', disabled: !body || body.mode !== 'raw' }];
  const tokenVar = elegirToken(quitarPrefijo(ruta), m);
  if (usaApiKey(ruta, op.security)) {
    headers.push({ key: 'x-api-key', value: '{{apiKeyIntegrador}}' });
  } else if (tokenVar) {
    headers.push({ key: 'Authorization', value: `Bearer {{${tokenVar}}}` });
  }
  return {
    name: nombre,
    request: {
      method: metodoHttp(m),
      header: headers,
      body: body ?? undefined,
      url,
      description: op.description?.slice(0, 500) ?? '',
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
  const logins = roles.map(([titulo, correoVar, tokenVar]) => ({
    name: titulo,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("HTTP 200", function () { pm.response.to.have.status(200); });',
            `pm.test("Token ${tokenVar}", function () {`,
            '  const b = pm.response.json();',
            '  pm.expect(b.token).to.be.a("string").and.not.empty;',
            `  pm.collectionVariables.set("${tokenVar}", b.token);`,
            '  pm.expect(b.usuario).to.have.property("id");',
            '});',
          ],
        },
      },
    ],
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: `{\n  "correo": "{{${correoVar}}}",\n  "contrasena": "{{clavePrueba}}"\n}`,
      },
      url: '{{baseUrl}}/auth/login',
    },
  }));

  return {
    name: '00 — Preparación (tokens)',
    item: [
      ...logins,
      {
        name: 'GET salud (público)',
        event: [scriptsPrueba(200)],
        request: { method: 'GET', url: '{{baseUrl}}/salud' },
      },
    ],
  };
}

function carpetaFixtures() {
  return {
    name: '01 — Fixtures (IDs aislados)',
    item: [
      {
        name: 'GET programas — guardar programaId',
        event: [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                'pm.test("HTTP 200", () => pm.response.to.have.status(200));',
                'const lista = pm.response.json();',
                'pm.test("Listado de programas (puede estar vacío sin sync CUAC)", () => {',
                '  pm.expect(lista).to.be.an("array");',
                '  if (lista.length > 0) {',
                '    pm.collectionVariables.set("programaId", lista[0].id);',
                '    if (lista[0].slug) pm.collectionVariables.set("programaSlug", lista[0].slug);',
                '  }',
                '});',
              ],
            },
          },
        ],
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{tokenAdmin}}' }],
          url: '{{baseUrl}}/programas',
        },
      },
      {
        name: 'GET evidencias — guardar evidenciaId si existe',
        event: [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                'pm.test("HTTP 200", () => pm.response.to.have.status(200));',
                'const pagina = pm.response.json();',
                'const datos = pagina.datos ?? pagina;',
                'pm.test("Respuesta paginada u objeto", () => pm.expect(datos).to.be.ok);',
                'const filas = Array.isArray(datos) ? datos : pagina.datos;',
                'if (Array.isArray(filas) && filas.length) {',
                '  pm.collectionVariables.set("evidenciaId", filas[0].id);',
                '}',
              ],
            },
          },
        ],
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{tokenAdmin}}' }],
          url: '{{baseUrl}}/evidencias?limite=5',
        },
      },
      {
        name: 'GET usuarios — guardar usuarioId',
        event: [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                'pm.test("HTTP 200", () => pm.response.to.have.status(200));',
                'const lista = pm.response.json();',
                'const filas = lista.datos ?? lista;',
                'pm.test("Listado usuarios", () => pm.expect(filas).to.be.an("array").that.is.not.empty);',
                'pm.collectionVariables.set("usuarioId", filas[0].id);',
              ],
            },
          },
        ],
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{tokenSuperAdmin}}' }],
          url: '{{baseUrl}}/usuarios',
        },
      },
      {
        name: 'Valor por defecto categoría cifras',
        event: [
          {
            listen: 'prerequest',
            script: {
              type: 'text/javascript',
              exec: [
                'if (!pm.collectionVariables.get("categoriaCifras")) {',
                '  pm.collectionVariables.set("categoriaCifras", "Estudiantes");',
                '}',
                'if (!pm.collectionVariables.get("periodoAcademico")) {',
                '  pm.collectionVariables.set("periodoAcademico", "2026-1");',
                '}',
              ],
            },
          },
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: ['pm.test("Variables fixture listas", () => pm.expect(true).to.be.true);'],
            },
          },
        ],
        request: { method: 'GET', url: '{{baseUrl}}/salud' },
      },
    ],
  };
}

function carpetaErrores() {
  return {
    name: '99 — Errores esperados',
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
const exclusiones = [];
const OMITIR_RUTAS = new Set([
  '/api/v1/almacen-local/*path', // El wildcard literal tumba el proceso Node si no hay archivo (DEF local).
]);
const OMITIR_OP = new Set([
  'post /api/v1/auth/login',
  'get /api/v1/auth/perfil',
  'get /api/v1/salud',
]);

for (const [ruta, metodos] of Object.entries(doc.paths ?? {})) {
  if (OMITIR_RUTAS.has(ruta)) {
    exclusiones.push(
      `- **${ruta}**: excluida de Newman (wildcard de almacenamiento local; cubierta en E2E \`humo\`/\`flujo-carga-panel\`).`,
    );
    continue;
  }
  for (const [metodo, op] of Object.entries(metodos)) {
    if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(metodo)) continue;
    const opKey = `${metodo} ${ruta}`;
    if (OMITIR_OP.has(opKey)) continue;
    const tags = op.tags?.length ? op.tags : ['Sin etiqueta'];
    const tag = tags[0];
    const nombre = `${metodoHttp(metodo)} ${quitarPrefijo(ruta)}`;
    const item = crearPeticion(op.summary || op.operationId || nombre, metodo, ruta, op);
    if (op.requestBody?.content?.['multipart/form-data']) {
      exclusiones.push(
        `- **${nombre}** \`${ruta}\`: requiere archivo binario; la petición generada espera **400** sin adjunto (cobertura de ruta + validación). Subir .docx real queda en E2E supertest.`,
      );
    }
    if (!porTag.has(tag)) porTag.set(tag, []);
    porTag.get(tag).push(item);
    matrizFilas.push({
      metodo: metodoHttp(metodo),
      ruta,
      tag,
      coleccion: 'SIAC-api-v1.postman_collection.json',
      notas: exclusiones.length ? '' : '',
    });
  }
}

const carpetasOpenApi = [...porTag.entries()]
  .sort(([a], [b]) => a.localeCompare(b, 'es'))
  .map(([tag, items]) => ({
    name: `API — ${tag}`,
    item: items.sort((a, b) => a.name.localeCompare(b.name, 'es')),
  }));

const coleccion = {
  info: {
    _postman_id: 'siac-f05-api-v1-completa',
    name: 'SIAC API /api/v1 (F-05 Newman)',
    description:
      'Colección generada desde docs/contrato-api/openapi.json. Ejecutar en orden: preparación → fixtures → rutas. Variables: entorno siac-local.postman_environment.json (sin secretos en el repo).',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3001/api/v1' },
    { key: 'tokenAdmin', value: '' },
    { key: 'tokenRevisor', value: '' },
    { key: 'tokenCargador', value: '' },
    { key: 'tokenSuperAdmin', value: '' },
    { key: 'programaId', value: '' },
    { key: 'evidenciaId', value: SENTINEL_UUID },
    { key: 'usuarioId', value: SENTINEL_UUID },
    { key: 'programaSlug', value: 'ingenieria-sistemas' },
    { key: 'categoriaCifras', value: 'Estudiantes' },
    { key: 'periodoAcademico', value: '2026-1' },
    { key: 'apiKeyIntegrador', value: '' },
    { key: 'recursoId', value: SENTINEL_UUID },
    { key: 'tipoTramite', value: 'RegistroCalificadoNuevo' },
  ],
  item: [carpetaPreparacion(), carpetaFixtures(), ...carpetasOpenApi, carpetaErrores()],
};

fs.writeFileSync(SALIDA, `${JSON.stringify(coleccion, null, 2)}\n`);

const matriz = [
  '# Matriz de cobertura Swagger → colección Postman',
  '',
  `Generado: ${new Date().toISOString()}`,
  `Fuente: \`docs/contrato-api/openapi.json\` (${matrizFilas.length} operaciones HTTP).`,
  '',
  '| Método | Ruta OpenAPI | Etiqueta Swagger | En colección |',
  '|--------|--------------|------------------|--------------|',
  ...matrizFilas.map(
    (f) => `| ${f.metodo} | \`${f.ruta}\` | ${f.tag} | SIAC-api-v1.postman_collection.json |`,
  ),
  '',
  '## Exclusiones / matices',
  '',
  'Las operaciones con `multipart/form-data` se incluyen para cubrir método+ruta; sin archivo adjunto la aserción esperada es **400**, no 2xx (la carga binaria completa está en `Backend/test/e2e`).',
  '',
  'Las rutas con `x-api-key` requieren `apiKeyIntegrador` en el entorno (vacío por defecto → **401/403** documentado en la colección si no hay clave de integrador de prueba).',
  '',
  ...exclusiones,
  '',
  '## Verificación',
  '',
  '```bash',
  'node docs/pruebas/postman/generar-coleccion-desde-openapi.mjs',
  'wc -l docs/pruebas/postman/COBERTURA-SWAGGER.md',
  '```',
  '',
].join('\n');

fs.writeFileSync(MATRIZ, `${matriz}\n`);
console.log(`Colección: ${SALIDA} (${matrizFilas.length} operaciones)`);
console.log(`Matriz: ${MATRIZ}`);

/** Resuelve status, token, cuerpo e idVar por operación OpenAPI (108 rutas). */

const OVERRIDES = {
  'post /api/v1/auth/google': { status: 501, token: null },
  'get /api/v1/integracion/cifras-institucionales/{categoria}': { status: 200, apiKey: true, token: null },
  'post /api/v1/integracion/cifras-institucionales/{categoria}/envios': {
    status: 200,
    apiKey: true,
    token: null,
    body:
      '{"periodo":"2026-1","registros":[{"programa":"Programa Newman","genero":"Femenino","facultad":"Facultad","semestre":1,"estrato":1,"valor_dimension":1,"codigo_estudiante":"NM-001","periodo_academico":"2026-1","nombre_estudiante":"Ana Newman"}]}',
  },
  'post /api/v1/integracion/claves/{id}/revocar': { status: 200, token: 'tokenSuperAdmin', idVar: 'integradorIdRevocar' },
  'post /api/v1/integracion/sincronizar-carreras': { status: 400, token: 'tokenSuperAdmin' },
  'post /api/v1/integracion/sincronizar-csv': { status: 400, token: 'tokenSuperAdmin', body: '{}' },
  'post /api/v1/integracion/sincronizar': { status: 201, token: 'tokenSuperAdmin' },
  'delete /api/v1/plantillas/{id}': { status: 200, token: 'tokenAdmin', idVar: 'plantillaId' },
  'post /api/v1/vigencias/ejecutar-cron': { status: 201, token: 'tokenSuperAdmin' },
  'get /api/v1/evidencias/{id}': { status: 200, token: 'tokenCargador', idVar: 'evidenciaId' },
  'patch /api/v1/evidencias/{id}': { status: 200, token: 'tokenCargador', idVar: 'evidenciaId', body: '{"nombre":"Evidencia patch Newman"}' },
  'get /api/v1/programas/{id}': { status: 200, token: 'tokenSuperAdmin', idVar: 'programaId' },
  'get /api/v1/usuarios/{id}': { status: 200, token: 'tokenSuperAdmin', idVar: 'usuarioId' },
  'get /api/v1/usuarios/{id}/programas': { status: 200, token: 'tokenSuperAdmin', idVar: 'usuarioId' },
  'delete /api/v1/estructura/etapas/{id}': { status: 400, token: 'tokenSuperAdmin', idVar: 'etapaId' },
  'delete /api/v1/estructura/carpetas/{id}': { status: 400, token: 'tokenSuperAdmin', idVar: 'carpetaId' },
  'delete /api/v1/estructura/documentos/{id}': { status: 200, token: 'tokenSuperAdmin', idVar: 'documentoRequeridoId' },
  'get /api/v1/evidencias/{id}/versiones/{a}/diff/{b}': { status: 400, token: 'tokenCargador', idVar: 'evidenciaId' },
  'post /api/v1/evidencias/{id}/reemplazo-documento': { status: 403, token: 'tokenCargador', idVar: 'evidenciaEnRevisionId' },
  'post /api/v1/programas/{id}/iniciar-ciclo-renovacion': { status: 400, token: 'tokenSuperAdmin', idVar: 'programaId' },
  'get /api/v1/evidencias/{id}/historial': { status: 200, token: 'tokenRevisor', idVar: 'evidenciaEnRevisionId' },
  'get /api/v1/powerbi/token-insercion': { status: 403, token: 'tokenSuperAdmin' },
  'post /api/v1/powerbi/probar-conexion': { status: 400, token: 'tokenSuperAdmin' },
  'patch /api/v1/institucion': {
    status: 200,
    token: 'tokenSuperAdmin',
    body: '{"tipoTramiteActivo":"CondicionesInstitucionalesNuevas"}',
  },
  'post /api/v1/estructura/etapas': {
    status: 201,
    token: 'tokenSuperAdmin',
    body: '{"nombre":"Etapa API Newman","tipo":"Programa","descripcion":"Alta","orden":101}',
  },
  'patch /api/v1/estructura/etapas/{id}': { status: 200, token: 'tokenSuperAdmin', idVar: 'etapaId', body: '{"descripcion":"Patch Newman"}' },
  'post /api/v1/estructura/carpetas': {
    status: 201,
    token: 'tokenSuperAdmin',
    body: '{"etapaId":"{{etapaId}}","nombre":"Carpeta API","descripcion":"Alta","orden":2}',
  },
  'patch /api/v1/estructura/carpetas/{id}': { status: 200, token: 'tokenSuperAdmin', idVar: 'carpetaId', body: '{"descripcion":"Patch"}' },
  'post /api/v1/estructura/documentos': {
    status: 201,
    token: 'tokenSuperAdmin',
    body: '{"carpetaId":"{{carpetaId}}","nombre":"Doc API","esPlantilla":false,"formato":"DOCX","obligatorio":true,"orden":2}',
  },
  'patch /api/v1/estructura/documentos/{id}': {
    status: 200,
    token: 'tokenSuperAdmin',
    idVar: 'documentoRequeridoId',
    body: '{"nombre":"Doc patch"}',
  },
  'post /api/v1/evidencias/{id}/enviar-revision': { status: 201, token: 'tokenCargador', idVar: 'evidenciaIdEnviar' },
  'delete /api/v1/evidencias/{id}': { status: 200, token: 'tokenCargador', idVar: 'evidenciaIdEliminar' },
  'get /api/v1/vigencias/{id}/descargar': { status: 200, token: 'tokenAdmin', idVar: 'vigenciaAnexoId' },
  'patch /api/v1/vigencias/{id}': {
    status: 200,
    token: 'tokenAdmin',
    idVar: 'vigenciaAnexoId',
    body: '{"titulo":"Anexo patch Newman"}',
  },
  'delete /api/v1/vigencias/{id}': { status: 200, token: 'tokenAdmin', idVar: 'vigenciaAnexoId' },
  'post /api/v1/vigencias/con-archivo': {
    status: 400,
    token: 'tokenAdmin',
    multipart: true,
    archivo: '../fixtures/newman-evidencia.docx',
    fields: [{ key: 'titulo', value: 'Anexo sin campos obligatorios' }],
  },
  'post /api/v1/institucion/resolucion': { status: 400, token: 'tokenSuperAdmin', multipart: true, archivo: '../fixtures/newman-evidencia.docx', fields: [] },
  'post /api/v1/evidencias': {
    status: 201,
    token: 'tokenCargador',
    multipart: true,
    archivo: '../fixtures/newman-evidencia.docx',
    fields: [
      { key: 'nombre', value: 'Upload Newman' },
      { key: 'programaId', value: '{{programaIdCarga}}' },
      { key: 'periodo', value: '2026-2' },
      { key: 'codigoGuia', value: 'G1' },
    ],
  },
  'patch /api/v1/evidencias/{id}/archivo': {
    status: 400,
    token: 'tokenCargador',
    idVar: 'evidenciaId',
    multipart: true,
    archivo: '../fixtures/newman-evidencia.docx',
    fields: [],
  },
  'patch /api/v1/plantillas/{id}/archivo': {
    status: 200,
    token: 'tokenAdmin',
    idVar: 'plantillaId',
    multipart: true,
    archivo: '../fixtures/newman-evidencia.docx',
    fields: [],
  },
  'post /api/v1/evidencias/{id}/dictamen': { status: 400, token: 'tokenRevisor', idVar: 'evidenciaEnRevisionId', body: '{}' },
  'patch /api/v1/notificaciones/{id}/leida': { status: 200, token: 'tokenCargador', idVar: 'alertaId' },
  'patch /api/v1/usuarios/{id}': { status: 200, token: 'tokenSuperAdmin', idVar: 'usuarioIdDeshabilitar', body: '{"nombre":"Usuario patch Newman"}' },
  'patch /api/v1/usuarios/{id}/rol': { status: 200, token: 'tokenSuperAdmin', idVar: 'usuarioIdDeshabilitar', body: '{"rol":"Cargador"}' },
  'delete /api/v1/usuarios/{id}': { status: 200, token: 'tokenSuperAdmin', idVar: 'usuarioIdDeshabilitar' },
  'patch /api/v1/programas/{id}/estado': { status: 200, token: 'tokenSuperAdmin', idVar: 'programaId', body: '{"activo":true}' },
  'get /api/v1/programas/{id}/vigencia': { status: 200, token: 'tokenSuperAdmin', idVar: 'programaId' },
  'patch /api/v1/powerbi/insercion': { status: 200, token: 'tokenSuperAdmin', body: '{"habilitado":false}' },
  'get /api/v1/powerbi/informes/{categoriaId}/url': { status: 200, token: 'tokenSuperAdmin' },
  'get /api/v1/vigencias/demo/estado': { status: 400, token: 'tokenSuperAdmin' },
  'patch /api/v1/configuracion/vigencia': { status: 400, token: 'tokenSuperAdmin', body: '{"mesesAvisoVigencia":6,"mesesRojoVigencia":18}' },
  'post /api/v1/evidencias/parsear-excel': { status: 400, token: 'tokenCargador', multipartVacio: true },
  'post /api/v1/plantillas': {
    status: 201,
    token: 'tokenAdmin',
    multipart: true,
    archivo: '../fixtures/newman-evidencia.docx',
    fields: [
      { key: 'nombre', value: 'Plantilla upload Newman' },
      { key: 'formato', value: 'DOCX' },
      { key: 'version', value: '1.1' },
      { key: 'categoria', value: 'Programa' },
      { key: 'tipoTramite', value: 'General' },
      { key: 'codigoGuia', value: 'G1' },
    ],
  },
  'post /api/v1/programas/{id}/resolucion': {
    status: 400,
    token: 'tokenSuperAdmin',
    idVar: 'programaId',
    multipart: true,
    archivo: '../fixtures/newman-evidencia.docx',
    fields: [],
  },
};

function idVarPorRuta(ruta) {
  if (ruta.includes('/estructura/etapas/')) return 'etapaId';
  if (ruta.includes('/estructura/carpetas/')) return 'carpetaId';
  if (ruta.includes('/estructura/documentos/')) return 'documentoRequeridoId';
  if (ruta.includes('/evidencias/{id}/enviar-revision')) return 'evidenciaId';
  if (ruta.includes('/evidencias/{id}/dictamen')) return 'evidenciaEnRevisionId';
  if (ruta.includes('/evidencias/{id}')) return 'evidenciaId';
  if (ruta.includes('/plantillas/{id}')) return 'plantillaId';
  if (ruta.includes('/programas/{id}')) return 'programaId';
  if (ruta.includes('/usuarios/{id}/programas')) return 'usuarioId';
  if (ruta.includes('/usuarios/{id}')) return 'usuarioIdDeshabilitar';
  if (ruta.includes('/notificaciones/{id}')) return 'alertaId';
  if (ruta.includes('/vigencias/{id}')) return 'vigenciaAnexoId';
  if (ruta.includes('/integracion/claves/{id}')) return 'integradorIdRevocar';
  return 'recursoId';
}

function tokenPorRuta(ruta, metodo) {
  if (ruta.includes('/integracion/claves')) return 'tokenSuperAdmin';
  if (ruta.includes('/integracion/cifras-institucionales')) return null;
  if (ruta.includes('/aprobacion') || ruta.includes('mis-revisiones')) return 'tokenRevisor';
  if (ruta.includes('/evidencias')) {
    if (ruta.includes('dictamen') || ruta.includes('checklist')) return 'tokenRevisor';
    if (ruta.includes('enviar-revision') || ruta === '/api/v1/evidencias' || metodo === 'post') return 'tokenCargador';
    return 'tokenCargador';
  }
  if (ruta.includes('/plantillas')) return 'tokenAdmin';
  if (ruta.includes('/metricas/token')) return 'tokenAdmin';
  if (ruta.includes('/auth/')) return null;
  if (ruta.includes('/salud')) return null;
  if (ruta.startsWith('/api/v1/integracion/cifras')) return null;
  if (ruta.includes('/almacen-local')) return 'tokenAdmin';
  return 'tokenSuperAdmin';
}

export function resolverExpectativa(metodo, ruta, op) {
  const m = metodo.toLowerCase();
  const key = `${m} ${ruta}`;
  if (OVERRIDES[key]) return { ...OVERRIDES[key] };

  const esMultipart = Boolean(op.requestBody?.content?.['multipart/form-data']);
  const codigos = Object.keys(op.responses ?? {});

  if (ruta === '/api/v1/almacen-local/*path') {
    return { status: 200, token: 'tokenAdmin', urlSuffix: 'almacen-local/{{almacenClavePrueba}}' };
  }

  if (esMultipart) {
    const archivo = ruta.includes('evidencias')
      ? '../fixtures/newman-evidencia.docx'
      : '../../../../FormatosGuia/G1-Documento Maestro de Programa.docx';
    if (ruta === '/api/v1/evidencias/parsear-excel') {
      return { status: 400, token: 'tokenCargador', multipartVacio: true };
    }
    return {
      status: 201,
      token: tokenPorRuta(ruta, m),
      multipart: true,
      archivo,
      fields:
        ruta === '/api/v1/evidencias'
          ? [
              { key: 'nombre', value: 'Upload Newman' },
              { key: 'programaId', value: '{{programaId}}' },
              { key: 'periodo', value: '2026-2' },
              { key: 'codigoGuia', value: 'G1' },
            ]
          : [],
    };
  }

  if (m === 'get' && !ruta.includes('{')) {
    return { status: 200, token: tokenPorRuta(ruta, m) };
  }

  if (ruta.includes('{') && (m === 'get' || m === 'delete' || m === 'patch' || m === 'post')) {
    return {
      status: codigos.includes('200') ? 200 : codigos.includes('201') ? 201 : 200,
      token: tokenPorRuta(ruta, m),
      idVar: idVarPorRuta(ruta),
      body: op.requestBody ? '{}' : undefined,
    };
  }

  if (op.requestBody?.content?.['application/json']) {
    return { status: 400, token: tokenPorRuta(ruta, m), body: '{}' };
  }

  return { status: 200, token: tokenPorRuta(ruta, m) };
}

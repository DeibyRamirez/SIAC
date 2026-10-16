import { resolverPuerto } from './servidor';

const PREFIJO_URL_PUBLICA_POWERBI = 'https://app.powerbi.com/view?r=';

/**
 * Valida una URL opcional de «Publicar en la web» de Power BI (HU-009).
 * Devuelve la URL limpia si empieza por https://app.powerbi.com/view?r= y trae `r`;
 * en otro caso devuelve '' (sin configurar o inválida).
 */
export function normalizarUrlPublicaPowerBi(valor: string | undefined | null): string {
  const limpia = valor?.trim() ?? '';
  if (!limpia.startsWith(PREFIJO_URL_PUBLICA_POWERBI)) return '';
  try {
    const url = new URL(limpia);
    return url.hostname === 'app.powerbi.com' && url.pathname === '/view' && url.searchParams.get('r')
      ? limpia
      : '';
  } catch {
    return '';
  }
}

export const configuracionEnv = () => {
  const entorno = process.env.NODE_ENV ?? 'development';
  const vigenciaModoPrueba =
    process.env.VIGENCIA_MODO_PRUEBA === 'true' || process.env.VIGENCIA_MODO_PRUEBA === '1';
  /**
   * Bandera explícita para permitir el modo prueba con NODE_ENV=production (solo un despliegue
   * de staging/verificación). Sin ella, el arranque falla si VIGENCIA_MODO_PRUEBA está activo.
   */
  const vigenciaModoPruebaPermitirProduccion =
    process.env.VIGENCIA_MODO_PRUEBA_PERMITIR_PRODUCCION === 'true';
  // §0: el modo prueba (demo acelerada) no arranca en producción salvo la bandera explícita de staging.
  if (entorno === 'production' && vigenciaModoPrueba && !vigenciaModoPruebaPermitirProduccion) {
    throw new Error(
      'VIGENCIA_MODO_PRUEBA no puede estar activo con NODE_ENV=production. Desactive la variable de entorno ' +
        'o, solo en un despliegue de staging, defina VIGENCIA_MODO_PRUEBA_PERMITIR_PRODUCCION=true.',
    );
  }

  return {
  nodeEnv: entorno,
  puerto: resolverPuerto(),
  jwtSecreto: process.env.JWT_SECRETO ?? 'dev-secreto-siac',
  jwtExpiracion: process.env.JWT_EXPIRACION ?? '8h',
  dominioInstitucional: process.env.DOMINIO_INSTITUCIONAL ?? 'uniautonoma.edu.co',
  s3UsarLocal: process.env.S3_USAR_ALMACEN_LOCAL === 'true',
  s3Endpoint: process.env.S3_ENDPOINT,
  s3Region: process.env.S3_REGION ?? 'ca-central-1',
  s3Bucket: process.env.S3_BUCKET ?? 'evidencias',
  s3BucketPlantillas: process.env.S3_BUCKET_PLANTILLAS ?? 'plantillas',
  s3BucketDocumentos: process.env.S3_BUCKET_DOCUMENTOS ?? 'documentos',
  tiApiUrl: process.env.TI_API_URL ?? '',
  tiApiToken: process.env.TI_API_TOKEN ?? '',
  /** T-007.3f: por defecto no se envía correo; desarrollo usa `resend`, producción `smtp`. */
  correoCanal: process.env.CORREO_CANAL ?? 'ninguno',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  correoDesde:
    process.env.CORREO_DESDE ??
    process.env.CORREO_REMITENTE ??
    process.env.SMTP_FROM ??
    '',
  resendCorreoSandbox: process.env.RESEND_CORREO_SANDBOX ?? '',
  /** T-007.3f: lista de destinatarios permitidos en desarrollo (coma); vacía = no se envía nada. */
  correoDestinatariosPermitidos: process.env.CORREO_DESTINATARIOS_PERMITIDOS ?? '',
  /** T-007.3d: reintentos del procesador de salida (backoff base·2^n y máximo de intentos). */
  correoReintentoBaseSegundos: parseInt(process.env.CORREO_REINTENTO_BASE_SEGUNDOS ?? '30', 10),
  correoMaxIntentos: parseInt(process.env.CORREO_MAX_INTENTOS ?? '3', 10),
  /** T-007.3d: lease del reclamo de una fila del outbox (evita envíos duplicados entre ticks/instancias). */
  correoLeaseSegundos: parseInt(process.env.CORREO_LEASE_SEGUNDOS ?? '300', 10),
  /** Opcional: URL pública (Publicar en la web) del informe de Estudiantes. */
  /** Opcional: ID del informe de Estudiantes para App Owns Data (T-009.2). */
  powerbiReportIdEstudiantes: process.env.POWERBI_REPORT_ID_ESTUDIANTES?.trim() ?? '',
  powerbiUrlPublicaEstudiantes: normalizarUrlPublicaPowerBi(process.env.POWERBI_URL_PUBLICA_ESTUDIANTES),
  vigenciaModoPrueba,
  vigenciaModoPruebaPermitirProduccion,
  /** §0: demo acelerada de 300 s (5 min); antes 420 s (7 min). */
  vigenciaDuracionPruebaSeg: parseInt(process.env.VIGENCIA_DURACION_PRUEBA_SEG ?? '300', 10),
  vigenciaIntervaloPruebaSeg: parseInt(process.env.VIGENCIA_INTERVALO_PRUEBA_SEG ?? '10', 10),
  /** T-007.2: zona horaria del cron diario de vigencias (por defecto Colombia). */
  vigenciasCronZona: process.env.VIGENCIAS_CRON_ZONA ?? 'America/Bogota',
  };
};

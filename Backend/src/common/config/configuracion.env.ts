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

export const configuracionEnv = () => ({
  puerto: parseInt(process.env.PUERTO ?? '3001', 10),
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
  correoCanal: process.env.CORREO_CANAL ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  correoDesde:
    process.env.CORREO_DESDE ??
    process.env.CORREO_REMITENTE ??
    process.env.SMTP_FROM ??
    '',
  resendCorreoSandbox: process.env.RESEND_CORREO_SANDBOX ?? '',
  /** Opcional: URL pública (Publicar en la web) del informe de Estudiantes. */
  /** Opcional: ID del informe de Estudiantes para App Owns Data (T-009.2). */
  powerbiReportIdEstudiantes: process.env.POWERBI_REPORT_ID_ESTUDIANTES?.trim() ?? '',
  powerbiUrlPublicaEstudiantes: normalizarUrlPublicaPowerBi(process.env.POWERBI_URL_PUBLICA_ESTUDIANTES),
  vigenciaModoPrueba:
    process.env.VIGENCIA_MODO_PRUEBA === 'true' || process.env.VIGENCIA_MODO_PRUEBA === '1',
  vigenciaDuracionPruebaSeg: parseInt(process.env.VIGENCIA_DURACION_PRUEBA_SEG ?? '420', 10),
  vigenciaIntervaloPruebaSeg: parseInt(process.env.VIGENCIA_INTERVALO_PRUEBA_SEG ?? '10', 10),
});

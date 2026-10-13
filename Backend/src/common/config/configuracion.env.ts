const PREFIJO_URL_PUBLICA_POWERBI = 'https://app.powerbi.com/view?r=';

/**
 * Valida una URL opcional de «Publicar en la web» de Power BI (HU-009).
 * Devuelve la URL limpia si empieza por https://app.powerbi.com/view?r= y trae `r`;
 * en otro caso devuelve '' (sin configurar o inválida → se usa el respaldo Recharts).
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
  cifrasApiKey: process.env.CIFRAS_API_KEY ?? '',
  /** Opcional: URL pública (Publicar en la web) del informe de Estudiantes. */
  powerbiUrlPublicaEstudiantes: normalizarUrlPublicaPowerBi(process.env.POWERBI_URL_PUBLICA_ESTUDIANTES),
});

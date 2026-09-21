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
  tiApiUrl: process.env.TI_API_URL ?? '',
  tiApiToken: process.env.TI_API_TOKEN ?? '',
});

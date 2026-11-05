/** Registra advertencias si el pool de Prisma puede quedar saturado (p. ej. connection_limit=1). */
export function advertirLimiteConexionesBaseDatos(): void {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;

  const parametro = extraerConnectionLimit(url);
  if (parametro === undefined) {
    console.warn(
      '[configuración] DATABASE_URL no incluye connection_limit; conviene definirlo para evitar agotar el pool bajo carga.',
    );
    return;
  }
  if (parametro === '1') {
    console.warn(
      '[configuración] DATABASE_URL usa connection_limit=1: una sola conexión concurrente (riesgo elevado de Prisma P2024).',
    );
  }
}

function extraerConnectionLimit(databaseUrl: string): string | undefined {
  try {
    const normalizada = databaseUrl.replace(/^postgres(ql)?:\/\//i, 'http://');
    const parsed = new URL(normalizada);
    const limite = parsed.searchParams.get('connection_limit');
    return limite ?? undefined;
  } catch {
    const coincidencia = databaseUrl.match(/(?:^|[?&])connection_limit=([^&]+)/i);
    return coincidencia?.[1];
  }
}

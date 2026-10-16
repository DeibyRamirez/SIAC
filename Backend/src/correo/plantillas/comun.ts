/**
 * T-007.3h (C-5): plantillas de correo puras — `(datos) => { asunto, texto, html }`.
 * Español, paleta CUAC, enlace profundo y HTML escapado. Sin dependencias de Nest/Prisma.
 */

export interface PlantillaCorreo {
  asunto: string;
  /** Cuerpo en texto plano (no es HTML: conserva el original sin escapar). */
  texto: string;
  html: string;
}

/** Paleta CUAC usada por todos los correos. */
export const PALETA_CUAC = {
  primary: '#0A3B74',
  esmeralda: '#1CBCA6',
  fondo: '#f4f6f8',
  borde: '#e2e8f0',
  cuerpo: '#334155',
  suave: '#64748b',
} as const;

/** Escapa texto proveniente del usuario antes de insertarlo en HTML (CA2, T-006.3). */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapa un valor para interpolarlo dentro de un atributo HTML entre comillas (p. ej. `href="…"`).
 * Neutraliza `&`, `"`, `'`, `<` y `>` para que el valor no pueda cerrar el atributo.
 */
export function escaparAtributoHtml(valor: string): string {
  return escaparHtml(valor);
}

/** Base pública del frontend para los enlaces de los correos. */
export function urlFrontend(): string {
  return (
    process.env.SIAC_URL_FRONTEND ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000'
  );
}

export interface EnlaceCta {
  href: string;
  texto: string;
}

/** Botón HTML del correo (oculto si no hay enlace). */
export function bloqueCta(enlace: EnlaceCta | null): string {
  if (!enlace) return '';
  return `<p style="margin:24px 0 0"><a href="${escaparAtributoHtml(enlace.href)}" style="display:inline-block;padding:10px 18px;background:${PALETA_CUAC.primary};color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${escaparHtml(enlace.texto)}</a></p>`;
}

/** Enlace profundo en texto plano (se anexa al final del cuerpo). */
export function textoCtaPlano(enlace: EnlaceCta | null): string {
  return enlace ? `\n\n${enlace.texto}: ${enlace.href}` : '';
}

/** Envoltura HTML común con la identidad visual CUAC. */
export function envolverHtml(input: {
  etiqueta: string;
  titulo: string;
  cuerpoHtml: string;
  enlace?: EnlaceCta | null;
  nota?: string;
}): string {
  const etiqueta = escaparHtml(input.etiqueta);
  const nota =
    input.nota ??
    'Este mensaje se envió porque usted tiene un rol activo en el Sistema Interno de Aseguramiento de la Calidad. También puede ver esta alerta en la campana de notificaciones dentro de SIAC.';
  return `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:${PALETA_CUAC.fondo};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${PALETA_CUAC.primary}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;border:1px solid ${PALETA_CUAC.borde}">
    <tr>
      <td style="padding:24px 28px 8px">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${PALETA_CUAC.esmeralda}">SIAC · CUAC</p>
        <h1 style="margin:12px 0 0;font-size:20px;font-weight:700">${escaparHtml(input.titulo)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 0">
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${PALETA_CUAC.primary};color:#fff;font-size:11px;font-weight:600">${etiqueta}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 28px;font-size:15px;line-height:1.55;color:${PALETA_CUAC.cuerpo}">
        ${input.cuerpoHtml}
        ${bloqueCta(input.enlace ?? null)}
        <p style="margin:28px 0 0;font-size:12px;color:${PALETA_CUAC.suave}">${nota}</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/** Convierte un mensaje (texto del usuario) en párrafo HTML escapado con saltos de línea. */
export function parrafoHtml(mensaje: string): string {
  return `<p style="margin:0">${escaparHtml(mensaje).replace(/\n/g, '<br>')}</p>`;
}

/** Formatea una fecha ISO como AAAA-MM-DD (sin zona). */
export function fechaCorta(iso: string): string {
  return iso.slice(0, 10);
}

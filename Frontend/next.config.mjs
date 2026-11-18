/**
 * HU-009: solo se declara `frame-src`. El informe (Publicar en la web y reportEmbed)
 * carga desde app.powerbi.com. reportEmbed con autoAuth puede navegar ese mismo
 * iframe al inicio de sesión de Microsoft; sin estos orígenes el navegador bloquea
 * el login. No se agregan script-src, style-src ni comodines de microsoft.com.
 * El backend no usa Helmet, así que no hay otra CSP que ajustar.
 *
 * - https://app.powerbi.com — documento del informe
 * - https://login.microsoftonline.com y https://*.login.microsoftonline.com — login
 *   de la organización (incluye device.login.microsoftonline.com)
 * - https://login.microsoft.com — redirección de la cuenta Microsoft
 * - https://*.msauth.net y https://*.msftauth.net — el login a veces sustituye
 *   el documento del iframe por estos hosts
 */
const politicaSeguridadContenido = [
  "frame-src 'self'",
  'https://app.powerbi.com',
  'https://login.microsoftonline.com',
  'https://*.login.microsoftonline.com',
  'https://login.microsoft.com',
  'https://*.msauth.net',
  'https://*.msftauth.net',
].join(' ')

/** Build Docker en el servidor: `SIAC_DOCKER_BUILD=true`. Vercel no soporta `output: 'standalone'`. */
const buildDocker = process.env.SIAC_DOCKER_BUILD === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(buildDocker ? { output: 'standalone' } : {}),
  images: {
    unoptimized: true,
  },
  env: {
    // Selector de modo Power BI: `publico` (por defecto) | `embebido` (App Owns Data, bloqueado).
    POWERBI_MODO: process.env.POWERBI_MODO === 'embebido' ? 'embebido' : 'publico',
  },
  experimental: {
    // Respaldo de R-008.4a: si alguna ruta con cuerpo vuelve a pasar por proxy.ts,
    // Next no debe truncar cargas por debajo del máximo que anuncia la UI (20 MB);
    // el margen extra absorbe el overhead de multipart.
    proxyClientMaxBodySize: '25mb',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: politicaSeguridadContenido }],
      },
    ]
  },
}

export default nextConfig

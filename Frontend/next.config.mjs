/**
 * HU-009 (T-009.3): solo se declara `frame-src` para permitir los informes de
 * «Publicar en la web» de Power BI. No se agrega ninguna otra directiva, así que el resto
 * de la política del navegador no cambia (no se relaja nada que existiera).
 */
const politicaSeguridadContenido = "frame-src 'self' https://app.powerbi.com"

/** @type {import('next').NextConfig} */
const nextConfig = {
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

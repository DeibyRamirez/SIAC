/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    // Respaldo de R-008.4a: si alguna ruta con cuerpo vuelve a pasar por proxy.ts,
    // Next no debe truncar cargas por debajo del máximo que anuncia la UI (25 MB).
    proxyClientMaxBodySize: '25mb',
  },
}

export default nextConfig

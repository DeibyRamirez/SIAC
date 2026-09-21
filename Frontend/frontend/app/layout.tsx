import type { Metadata, Viewport } from 'next'

import { ProveedorAlmacen } from '@/components/auth/proveedor-almacen'
import { ProveedorSesion } from '@/components/auth/proveedor-sesion'

import './globals.css'

export const metadata: Metadata = {
  title: 'SIAC | Calidad académica CUAC',
  description:
    'Sistema Interno de Aseguramiento de la Calidad de la Corporación Universitaria Autónoma del Cauca.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#102f55',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <ProveedorSesion>
          <ProveedorAlmacen>{children}</ProveedorAlmacen>
        </ProveedorSesion>
      </body>
    </html>
  )
}

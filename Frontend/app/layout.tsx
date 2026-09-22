import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'

import { ProveedorAlmacen } from '@/components/auth/proveedor-almacen'
import { ProveedorSesion } from '@/components/auth/proveedor-sesion'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700', '800'],
})

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
  themeColor: '#0A3B74',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} fondo-app font-sans antialiased`}>
        <ProveedorSesion>
          <ProveedorAlmacen>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </ProveedorAlmacen>
        </ProveedorSesion>
      </body>
    </html>
  )
}

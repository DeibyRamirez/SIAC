import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | SIAC',
    default: 'SIAC',
  },
  description: 'Sistema Integrado de Aseguramiento de la Calidad — CUAC',
}

export default function LayoutAplicacion({ children }: { children: React.ReactNode }) {
  return children
}

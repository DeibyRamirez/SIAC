import type { AlertaInApp, AnexoVigencia } from '@/lib/tipos'

export const anexosVigenciaSemilla: AnexoVigencia[] = [
  {
    id: 'anx-001',
    titulo: 'Permiso de uso de suelos',
    programaId: 'prog-isw',
    tipo: 'Infraestructura',
    fechaVencimiento: '2026-08-15',
    estado: 'Vencido',
    responsable: 'María Cortés',
  },
  {
    id: 'anx-002',
    titulo: 'Certificado bomberos',
    programaId: 'prog-der',
    tipo: 'Infraestructura',
    fechaVencimiento: '2026-09-10',
    estado: 'Proximo',
    responsable: 'María Cortés',
  },
  {
    id: 'anx-003',
    titulo: 'Registro calificado',
    programaId: 'prog-ade',
    tipo: 'Resolución',
    fechaVencimiento: '2026-12-18',
    estado: 'Vigente',
    responsable: 'Oscar Alvarado',
  },
]

export const alertasSemilla: AlertaInApp[] = [
  {
    id: 'alr-001',
    mensaje: 'El permiso de uso de suelos de Ingeniería de Software venció el 15/08/2026.',
    fecha: '2026-09-02',
    leida: false,
  },
  {
    id: 'alr-002',
    mensaje: 'El certificado de bomberos de Derecho vence el 10/09/2026.',
    fecha: '2026-09-01',
    leida: false,
  },
]

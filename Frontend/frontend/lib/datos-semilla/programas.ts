import type { Programa } from '@/lib/tipos'

export const programasSemilla: Programa[] = [
  {
    id: 'prog-isw',
    nombre: 'Ingeniería de Software',
    codigo: 'ISW-02',
    nivel: 'Pregrado',
    semaforo: 'Rojo',
  },
  {
    id: 'prog-der',
    nombre: 'Derecho',
    codigo: 'DER-01',
    nivel: 'Pregrado',
    semaforo: 'Amarillo',
  },
  {
    id: 'prog-ade',
    nombre: 'Administración de Empresas',
    codigo: 'ADE-03',
    nivel: 'Pregrado',
    semaforo: 'Verde',
  },
  {
    id: 'prog-med',
    nombre: 'Maestría en Educación',
    codigo: 'MED-05',
    nivel: 'Posgrado',
    semaforo: 'Amarillo',
  },
]

export const factoresSemilla = [
  'Factor 1 · Proyecto educativo',
  'Factor 4 · Procesos académicos',
  'Factor 5 · Profesores',
  'Factor 7 · Egresados',
  'Factor 10 · Mejoramiento',
]

export const periodosSemilla = ['2024-2', '2025-1', '2025-2', '2026-1']

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Recharts (ResponsiveContainer) usa ResizeObserver; jsdom no lo implementa.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  })
}

// Descargas con Blob (plantillas): jsdom expone createObjectURL pero espera su propia
// implementación de Blob; se reemplaza por un stub estable para las pruebas.
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  configurable: true,
  value: () => 'blob:vitest',
})
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  configurable: true,
  value: () => {},
})

// Sin `globals: true`, Testing Library no desmonta solo entre pruebas.
afterEach(() => {
  cleanup()
})

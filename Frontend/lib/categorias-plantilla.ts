/** Rutas del módulo Biblioteca de plantillas por rol. */
export function rutaPlantillasPorRol(rol: 'Administrador' | 'Cargador'): string {
  return rol === 'Administrador' ? '/administrador/plantillas' : '/cargador/plantillas'
}

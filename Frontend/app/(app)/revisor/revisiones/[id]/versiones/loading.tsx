import { EsqueletoPaginaApp } from '@/components/siac/esqueletos-paginas'

/** Carga de la ruta: marco de la app y el esqueleto del historial de versiones. */
export default function CargandoHistorialVersiones() {
  return <EsqueletoPaginaApp ruta="/revisor/revisiones/id/versiones" />
}

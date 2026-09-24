import { peticionApi } from './cliente-api';
import type { Plantilla, TipoTramitePlantilla } from '@/lib/tipos';

export async function listarPlantillasApi(
  tipoTramite?: TipoTramitePlantilla,
): Promise<Plantilla[]> {
  const query =
    tipoTramite && tipoTramite !== 'General'
      ? `?tipoTramite=${encodeURIComponent(tipoTramite)}`
      : '';
  return peticionApi<Plantilla[]>(`/plantillas${query}`);
}

export async function crearPlantillaApi(datos: FormData): Promise<Plantilla> {
  return peticionApi<Plantilla>('/plantillas', {
    method: 'POST',
    body: datos,
  });
}

export async function actualizarPlantillaApi(
  id: string,
  cambios: Partial<Plantilla>,
): Promise<Plantilla> {
  return peticionApi<Plantilla>(`/plantillas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
}

export async function eliminarPlantillaApi(id: string): Promise<void> {
  return peticionApi<void>(`/plantillas/${id}`, { method: 'DELETE' });
}

export async function obtenerUrlDescargaPlantillaApi(id: string) {
  return peticionApi<{ url: string; expiraEn: number }>(`/plantillas/${id}/descargar`);
}

export async function subirArchivoPlantillaApi(id: string, archivo: File): Promise<Plantilla> {
  const formData = new FormData();
  formData.append('archivo', archivo);
  return peticionApi<Plantilla>(`/plantillas/${id}/archivo`, {
    method: 'PATCH',
    body: formData,
  });
}

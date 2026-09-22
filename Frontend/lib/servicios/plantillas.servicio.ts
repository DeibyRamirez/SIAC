import { peticionApi } from './cliente-api';
import type { Plantilla } from '@/lib/tipos';

export async function listarPlantillasApi(): Promise<Plantilla[]> {
  return peticionApi<Plantilla[]>('/plantillas');
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

export function urlDescargaPlantilla(id: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
  return `${base}/plantillas/${id}/descargar`;
}

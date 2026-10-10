import { ConfigService } from '@nestjs/config';
import { AlmacenamientoService, TipoBucket } from '../../src/almacenamiento/almacenamiento.service';

/**
 * Doble en memoria de AlmacenamientoService para las pruebas E2E (R-010.5).
 * Conserva la generación de claves real y guarda los archivos en un Map, así la CI
 * no depende de Supabase ni escribe en disco.
 */
export class AlmacenamientoMemoria extends AlmacenamientoService {
  readonly archivos = new Map<string, { buffer: Buffer; tipo: TipoBucket; mimeType?: string }>();
  /** Si se define, la próxima subida falla con este error (simula un fallo de S3). */
  errorSiguienteSubida: Error | null = null;

  constructor() {
    super({
      get: (clave: string) => (clave === 'S3_USAR_ALMACEN_LOCAL' ? 'true' : undefined),
    } as unknown as ConfigService);
  }

  override async subirArchivo(
    buffer: Buffer,
    clave: string,
    tipo: TipoBucket = 'evidencias',
    mimeType?: string,
  ): Promise<{ clave: string; bucket: string }> {
    if (this.errorSiguienteSubida) {
      const error = this.errorSiguienteSubida;
      this.errorSiguienteSubida = null;
      throw error;
    }
    this.archivos.set(clave, { buffer: Buffer.from(buffer), tipo, mimeType });
    return { clave, bucket: 'memoria' };
  }

  override async obtenerBuffer(clave: string): Promise<Buffer> {
    const archivo = this.archivos.get(clave);
    if (!archivo) throw new Error(`Archivo no encontrado en memoria: ${clave}`);
    return archivo.buffer;
  }

  override async generarUrlFirmada(
    clave: string,
    _tipo: TipoBucket = 'evidencias',
    expiraSegundos = 3600,
  ): Promise<{ url: string; expiraEn: number }> {
    return { url: `memoria://${clave}`, expiraEn: expiraSegundos };
  }

  override async eliminarArchivo(clave: string): Promise<void> {
    this.archivos.delete(clave);
  }

  limpiar() {
    this.archivos.clear();
    this.errorSiguienteSubida = null;
  }
}

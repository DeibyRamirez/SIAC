import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { sanitizarSegmentoClaveS3 } from './utilidades-nombre-archivo';

export type TipoBucket = 'evidencias' | 'plantillas' | 'documentos';

@Injectable()
export class AlmacenamientoService {
  private readonly s3Client: S3Client | null;
  private readonly bucketEvidencias: string;
  private readonly bucketPlantillas: string;
  private readonly bucketDocumentos: string;
  private readonly usarLocal: boolean;
  private readonly rutaLocal: string;

  constructor(private readonly config: ConfigService) {
    this.usarLocal = config.get('S3_USAR_ALMACEN_LOCAL') === 'true';
    this.rutaLocal = config.get('ALMACEN_LOCAL_RUTA') ?? './almacen-local';
    this.bucketEvidencias = config.get('S3_BUCKET') ?? 'evidencias';
    this.bucketPlantillas = config.get('S3_BUCKET_PLANTILLAS') ?? 'plantillas';
    this.bucketDocumentos = config.get('S3_BUCKET_DOCUMENTOS') ?? 'documentos';

    if (!this.usarLocal) {
      this.asegurarConfiguracionS3();
      this.s3Client = new S3Client({
        endpoint: config.get('S3_ENDPOINT'),
        region: config.get('S3_REGION') ?? 'ca-central-1',
        credentials: {
          accessKeyId: config.get('S3_ACCESS_KEY') ?? '',
          secretAccessKey: config.get('S3_SECRET_KEY') ?? '',
        },
        forcePathStyle: true,
      });
    } else {
      this.s3Client = null;
      if (!existsSync(this.rutaLocal)) {
        mkdirSync(this.rutaLocal, { recursive: true });
      }
    }
  }

  generarClaveEvidencia(
    evidenciaId: string,
    nombreOriginal: string,
    version = 1,
  ): string {
    const anio = new Date().getFullYear();
    const segmento = sanitizarSegmentoClaveS3(nombreOriginal);
    return `evidencias/${anio}/${evidenciaId}/v${version}/${segmento}`;
  }

  generarClavePlantilla(plantillaId: string, nombreOriginal: string): string {
    const segmento = sanitizarSegmentoClaveS3(nombreOriginal);
    return `plantillas/${plantillaId}/${segmento}`;
  }

  generarClaveDocumento(carpeta: string, nombreOriginal: string): string {
    const carpetaNormalizada = carpeta.trim().toLowerCase().replace(/\s+/g, '-');
    const segmento = sanitizarSegmentoClaveS3(nombreOriginal);
    return `documentos/${carpetaNormalizada}/${randomUUID()}/${segmento}`;
  }

  private resolverBucket(tipo: TipoBucket): string {
    if (tipo === 'plantillas') return this.bucketPlantillas;
    if (tipo === 'documentos') return this.bucketDocumentos;
    return this.bucketEvidencias;
  }

  private asegurarConfiguracionS3(): void {
    const endpoint = this.config.get<string>('S3_ENDPOINT')?.trim();
    const accessKey = this.config.get<string>('S3_ACCESS_KEY')?.trim();
    const secretKey = this.config.get<string>('S3_SECRET_KEY')?.trim();

    if (!endpoint || !accessKey || !secretKey) {
      throw new ServiceUnavailableException(
        'Almacenamiento S3 no configurado. Defina S3_ENDPOINT, S3_ACCESS_KEY y S3_SECRET_KEY en .env, o active S3_USAR_ALMACEN_LOCAL=true.',
      );
    }
  }

  private lanzarErrorS3(accion: string, err: unknown): never {
    const nombre =
      err && typeof err === 'object' && 'name' in err
        ? String((err as { name: string }).name)
        : 'Error';
    const mensaje = err instanceof Error ? err.message : String(err);
    throw new ServiceUnavailableException(
      `No se pudo ${accion} en Supabase Storage (${nombre}): ${mensaje}`,
    );
  }

  private async enviarComandoS3<T>(accion: string, operacion: () => Promise<T>): Promise<T> {
    try {
      return await operacion();
    } catch (err) {
      this.lanzarErrorS3(accion, err);
    }
  }

  async subirArchivo(
    buffer: Buffer,
    clave: string,
    tipo: TipoBucket = 'evidencias',
    mimeType?: string,
  ): Promise<{ clave: string; bucket: string }> {
    const bucket = this.resolverBucket(tipo);
    const claveNormalizada = this.normalizarClave(clave);

    if (this.usarLocal) {
      const rutaCompleta = join(this.rutaLocal, claveNormalizada);
      const dir = dirname(rutaCompleta);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(rutaCompleta, buffer);
      return { clave: claveNormalizada, bucket: 'local' };
    }

    if (!buffer?.length) {
      throw new ServiceUnavailableException(
        'El archivo recibido está vacío o no se pudo leer desde la solicitud multipart.',
      );
    }

    await this.enviarComandoS3('subir el archivo', () =>
      this.s3Client!.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: claveNormalizada,
          Body: buffer,
          ContentType: mimeType,
        }),
      ),
    );

    return { clave: claveNormalizada, bucket };
  }

  async obtenerBuffer(clave: string, tipo: TipoBucket = 'evidencias'): Promise<Buffer> {
    if (this.usarLocal) {
      const ruta = clave.startsWith(this.rutaLocal) ? clave : join(this.rutaLocal, clave);
      return readFileSync(ruta);
    }

    const bucket = this.resolverBucket(tipo);
    const respuesta = await this.enviarComandoS3('descargar el archivo', () =>
      this.s3Client!.send(
        new GetObjectCommand({ Bucket: bucket, Key: this.normalizarClave(clave) }),
      ),
    );

    const bytes = await respuesta.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  /** Corrige claves legacy con prefijo duplicado (evidencias/evidencias/...). */
  private normalizarClave(clave: string): string {
    const limpia = clave.replace(/^\/+/, '');
    if (limpia.startsWith('evidencias/evidencias/')) {
      return limpia.replace(/^evidencias\//, '');
    }
    return limpia;
  }

  async generarUrlFirmada(
    clave: string,
    tipo: TipoBucket = 'evidencias',
    expiraSegundos = 3600,
  ): Promise<{ url: string; expiraEn: number }> {
    if (this.usarLocal) {
      return { url: `/api/v1/almacen-local/${clave}`, expiraEn: expiraSegundos };
    }

    const bucket = this.resolverBucket(tipo);
    const claveNormalizada = this.normalizarClave(clave);
    const comando = new GetObjectCommand({ Bucket: bucket, Key: claveNormalizada });

    const url = await this.enviarComandoS3('generar URL de descarga', () =>
      getSignedUrl(this.s3Client!, comando, { expiresIn: expiraSegundos }),
    );

    return { url, expiraEn: expiraSegundos };
  }

  crearStreamDescarga(clave: string) {
    if (this.usarLocal) {
      const ruta = clave.startsWith(this.rutaLocal) ? clave : join(this.rutaLocal, clave);
      return createReadStream(ruta);
    }
    throw new Error('Stream S3 no implementado — usar generarUrlFirmada u obtenerBuffer');
  }

  obtenerEstadoConexion() {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    return {
      modo: this.usarLocal ? 'local' : 'supabase_s3',
      bucketEvidencias: this.bucketEvidencias,
      bucketPlantillas: this.bucketPlantillas,
      bucketDocumentos: this.bucketDocumentos,
      endpoint: this.usarLocal ? this.rutaLocal : (endpoint ?? 'no_configurado'),
      credencialesConfiguradas: this.usarLocal
        ? true
        : Boolean(
            endpoint?.trim() &&
              this.config.get<string>('S3_ACCESS_KEY')?.trim() &&
              this.config.get<string>('S3_SECRET_KEY')?.trim(),
          ),
    };
  }

  /** Sube y elimina un objeto de prueba para validar credenciales y buckets. */
  async probarConexion(): Promise<{ ok: boolean; mensaje: string }> {
    if (this.usarLocal) {
      return { ok: true, mensaje: 'Modo almacenamiento local activo.' };
    }

    const clave = `_siac/probe/${randomUUID()}.txt`;
    const buffer = Buffer.from('siac-probe', 'utf8');

    try {
      await this.enviarComandoS3('verificar la conexión', () =>
        this.s3Client!.send(
          new PutObjectCommand({
            Bucket: this.bucketEvidencias,
            Key: clave,
            Body: buffer,
            ContentType: 'text/plain',
          }),
        ),
      );
      await this.enviarComandoS3('limpiar la prueba de conexión', () =>
        this.s3Client!.send(
          new DeleteObjectCommand({ Bucket: this.bucketEvidencias, Key: clave }),
        ),
      );
      return { ok: true, mensaje: 'Conexión con Supabase Storage verificada correctamente.' };
    } catch (err) {
      const mensaje =
        err instanceof ServiceUnavailableException
          ? String(err.message)
          : err instanceof Error
            ? err.message
            : String(err);
      return { ok: false, mensaje };
    }
  }

  async eliminarArchivo(clave: string, tipo: TipoBucket = 'evidencias'): Promise<void> {
    if (this.usarLocal) {
      const ruta = clave.startsWith(this.rutaLocal) ? clave : join(this.rutaLocal, clave);
      if (existsSync(ruta)) unlinkSync(ruta);
      return;
    }

    const bucket = this.resolverBucket(tipo);
    await this.enviarComandoS3('eliminar el archivo', () =>
      this.s3Client!.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: this.normalizarClave(clave) }),
      ),
    );
  }
}

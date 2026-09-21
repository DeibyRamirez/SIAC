import { Injectable } from '@nestjs/common';

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

    return `evidencias/${anio}/${evidenciaId}/v${version}/${nombreOriginal}`;

  }



  generarClavePlantilla(plantillaId: string, nombreOriginal: string): string {

    return `plantillas/${plantillaId}/${nombreOriginal}`;

  }



  generarClaveDocumento(carpeta: string, nombreOriginal: string): string {

    const carpetaNormalizada = carpeta.trim().toLowerCase().replace(/\s+/g, '-');

    return `documentos/${carpetaNormalizada}/${randomUUID()}/${nombreOriginal}`;

  }



  private resolverBucket(tipo: TipoBucket): string {

    if (tipo === 'plantillas') return this.bucketPlantillas;

    if (tipo === 'documentos') return this.bucketDocumentos;

    return this.bucketEvidencias;

  }



  async subirArchivo(

    buffer: Buffer,

    clave: string,

    tipo: TipoBucket = 'evidencias',

    mimeType?: string,

  ): Promise<{ clave: string; bucket: string }> {

    const bucket = this.resolverBucket(tipo);



    if (this.usarLocal) {

      const rutaCompleta = join(this.rutaLocal, clave);

      const dir = dirname(rutaCompleta);

      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      writeFileSync(rutaCompleta, buffer);

      return { clave, bucket: 'local' };

    }



    await this.s3Client!.send(

      new PutObjectCommand({

        Bucket: bucket,

        Key: clave,

        Body: buffer,

        ContentType: mimeType,

      }),

    );



    return { clave, bucket };

  }



  async obtenerBuffer(clave: string, tipo: TipoBucket = 'evidencias'): Promise<Buffer> {

    if (this.usarLocal) {

      const ruta = clave.startsWith(this.rutaLocal) ? clave : join(this.rutaLocal, clave);

      return readFileSync(ruta);

    }



    const bucket = this.resolverBucket(tipo);

    const respuesta = await this.s3Client!.send(

      new GetObjectCommand({ Bucket: bucket, Key: this.normalizarClave(clave) }),

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

    const url = await getSignedUrl(this.s3Client!, comando, { expiresIn: expiraSegundos });

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

    return {

      modo: this.usarLocal ? 'local' : 'supabase_s3',

      bucketEvidencias: this.bucketEvidencias,

      bucketPlantillas: this.bucketPlantillas,

      bucketDocumentos: this.bucketDocumentos,

      endpoint: this.usarLocal ? this.rutaLocal : (this.s3Client ? 'configurado' : 'no_configurado'),

    };

  }



  async eliminarArchivo(clave: string, tipo: TipoBucket = 'evidencias'): Promise<void> {

    if (this.usarLocal) {

      const ruta = clave.startsWith(this.rutaLocal) ? clave : join(this.rutaLocal, clave);

      if (existsSync(ruta)) unlinkSync(ruta);

      return;

    }



    const bucket = this.resolverBucket(tipo);

    await this.s3Client!.send(

      new DeleteObjectCommand({ Bucket: bucket, Key: this.normalizarClave(clave) }),

    );

  }

}



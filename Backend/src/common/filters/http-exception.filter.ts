import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

function mapearErrorInterno(
  excepcion: unknown,
): { mensaje: string; codigo?: number } | null {
  if (excepcion instanceof Prisma.PrismaClientKnownRequestError) {
    if (excepcion.code === 'P2022') {
      return {
        mensaje:
          'Esquema de base de datos desactualizado. Ejecute pnpm prisma:deploy en el backend.',
      };
    }
    if (excepcion.code === 'P2003' || excepcion.code === 'P2025') {
      return {
        mensaje:
          'Referencia inválida: el programa, usuario o registro relacionado no existe.',
        codigo: HttpStatus.BAD_REQUEST,
      };
    }
    if (excepcion.code === 'P2002') {
      return {
        mensaje: 'Ya existe un registro con esos datos.',
        codigo: HttpStatus.CONFLICT,
      };
    }
    return { mensaje: `Error de base de datos (${excepcion.code}).` };
  }

  if (excepcion instanceof Error) {
    const texto = excepcion.message.toLowerCase();
    if (texto.includes('nosuchbucket') || texto.includes('bucket does not exist')) {
      return {
        mensaje:
          'Bucket de almacenamiento no encontrado en Supabase. Cree los buckets evidencias y documentos.',
      };
    }
    if (texto.includes('invalidaccesskeyid') || texto.includes('signaturedoesnotmatch')) {
      return {
        mensaje:
          'Credenciales S3 de Supabase inválidas. Verifique S3_ACCESS_KEY y S3_SECRET_KEY.',
      };
    }
    if (texto.includes('credentials')) {
      return {
        mensaje: 'Credenciales de almacenamiento no configuradas correctamente.',
      };
    }
    if (texto.includes('not found in enum')) {
      return {
        mensaje:
          'Datos con estados legacy en la base de datos. Ejecute pnpm prisma:repair-schema en el backend.',
      };
    }
  }

  return null;
}

@Catch()
export class FiltroExcepcionHttp implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepcionHttp.name);

  catch(excepcion: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const respuesta = ctx.getResponse<Response>();

    let codigoEstado = HttpStatus.INTERNAL_SERVER_ERROR;
    let mensaje = 'Error interno del servidor';
    let error = 'Internal Server Error';

    if (excepcion instanceof HttpException) {
      codigoEstado = excepcion.getStatus();
      const cuerpo = excepcion.getResponse();
      if (typeof cuerpo === 'string') {
        mensaje = cuerpo;
      } else if (typeof cuerpo === 'object' && cuerpo !== null) {
        const obj = cuerpo as Record<string, unknown>;
        mensaje = Array.isArray(obj.message)
          ? (obj.message as string[]).join(', ')
          : String(obj.message ?? mensaje);
        error = String(obj.error ?? HttpStatus[codigoEstado] ?? error);
      }
    } else {
      const mapeado = mapearErrorInterno(excepcion);
      if (mapeado) {
        mensaje = mapeado.mensaje;
        if (mapeado.codigo) {
          codigoEstado = mapeado.codigo;
          error = HttpStatus[codigoEstado] ?? error;
        }
      }

      this.logger.error(
        excepcion instanceof Error ? excepcion.stack ?? excepcion.message : String(excepcion),
      );
    }

    const esDesarrollo = process.env.NODE_ENV !== 'production';
    const payload: Record<string, unknown> = {
      statusCode: codigoEstado,
      message: mensaje,
      error,
    };

    if (esDesarrollo && codigoEstado === HttpStatus.INTERNAL_SERVER_ERROR && excepcion instanceof Error) {
      payload.detalle = excepcion.message;
    }

    respuesta.status(codigoEstado).json(payload);
  }
}

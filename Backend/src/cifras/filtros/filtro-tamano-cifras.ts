import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Response } from 'express';
import { MAX_BYTES_XLSX } from '../cifras-importacion.service';

/** Traduce el límite de Multer a un 400 en español. */
@Catch(PayloadTooLargeException)
export class FiltroTamanoCifras implements ExceptionFilter {
  catch(_excepcion: PayloadTooLargeException, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const maxMb = MAX_BYTES_XLSX / (1024 * 1024);
    respuesta.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: `El archivo supera el tamaño máximo de ${maxMb} MB.`,
      error: 'Bad Request',
    });
  }
}

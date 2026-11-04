import { ArgumentsHost, BadRequestException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';

import { FiltroExcepcionHttp } from './http-exception.filter';

describe('FiltroExcepcionHttp', () => {
  it('reenvía el código de negocio de Power BI junto al 503', () => {
    const json = jest.fn();
    const respuesta = { status: jest.fn().mockReturnValue({ json }) };
    const host = {
      switchToHttp: () => ({ getResponse: () => respuesta }),
    } as unknown as ArgumentsHost;
    const filtro = new FiltroExcepcionHttp();

    filtro.catch(
      new ServiceUnavailableException({
        message: 'Power BI no está disponible.',
        codigo: 'POWERBI_NO_DISPONIBLE',
      }),
      host,
    );

    expect(respuesta.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        message: 'Power BI no está disponible.',
        codigo: 'POWERBI_NO_DISPONIBLE',
      }),
    );
  });

  it('reenvía la lista de errores de un lote de cifras', () => {
    const json = jest.fn();
    const respuesta = { status: jest.fn().mockReturnValue({ json }) };
    const host = {
      switchToHttp: () => ({ getResponse: () => respuesta }),
    } as unknown as ArgumentsHost;
    const filtro = new FiltroExcepcionHttp();
    const errores = [{ fila: 1, columna: 'semestre', mensaje: 'El semestre debe estar entre 1 y 12.' }];

    filtro.catch(
      new BadRequestException({
        message: 'El lote tiene filas inválidas.',
        codigo: 'CIFRAS_LOTE_INVALIDO',
        errores,
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        codigo: 'CIFRAS_LOTE_INVALIDO',
        errores,
      }),
    );
  });
});

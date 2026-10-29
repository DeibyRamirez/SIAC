import { ArgumentsHost, HttpStatus, ServiceUnavailableException } from '@nestjs/common';

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
});

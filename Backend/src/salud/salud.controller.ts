import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SaludService } from './salud.service';

/**
 * Health check público para Render (`healthCheckPath: /api/v1/salud`).
 * La API no tiene guard global: cada controlador declara `@UseGuards`. Este no declara
 * ninguno, así que responde sin token. Devuelve 503 si la base de datos no responde,
 * para que Render no promueva un despliegue sin conexión a Supabase.
 */
@ApiTags('Salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly salud: SaludService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estado del servicio y ping a la base de datos (público)' })
  async consultar() {
    const estado = await this.salud.consultar();
    if (estado.baseDatos !== 'ok') {
      throw new ServiceUnavailableException(estado);
    }
    return estado;
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiContrato } from '../openapi/api-contrato';
import { CifrasInstitucionalesService } from './cifras-institucionales.service';
import { ConsultaCifrasDto, EnvioCifrasDto, ResultadoEnvioCifrasDto } from './dto/cifras.dto';
import { GuardiaClaveApi } from './guardia-clave-api';
import { GuardiaTasaCifras } from './guardia-tasa-cifras';

const ESQUEMA_PAGINA = {
  type: 'object' as const,
  required: ['datos', 'total', 'pagina', 'limite'],
  properties: {
    datos: {
      type: 'array' as const,
      items: { type: 'object' as const },
      description: 'Filas sin columnas personales.',
    },
    total: { type: 'integer' as const },
    pagina: { type: 'integer' as const },
    limite: { type: 'integer' as const },
  },
};

@ApiTags('Cifras institucionales')
@Controller('integracion/cifras-institucionales')
@SkipThrottle({ login: true })
@UseGuards(GuardiaTasaCifras, GuardiaClaveApi)
export class CifrasInstitucionalesController {
  constructor(private readonly cifras: CifrasInstitucionalesService) {}

  @Get(':categoria')
  @Throttle({ cifras: { limit: 120, ttl: 60_000 } })
  @ApiContrato({
    resumen: 'Lista las cifras de una categoría',
    roles: ['api-key'],
    claveApi: true,
    tambien: [404, 429],
    esquema: ESQUEMA_PAGINA,
    detalle:
      'pagina por defecto 1 y limite por defecto 20, ambos enteros en texto. limite máximo 500. ' +
      'Filtro periodo en las categorías con periodo, y sede solo en infraestructura. ' +
      'No devuelve nombre_estudiante, codigo_estudiante, nombre_profesor ni nombre_egresado.',
  })
  listar(@Param('categoria') categoria: string, @Query() consulta: ConsultaCifrasDto) {
    return this.cifras.listar(categoria, consulta);
  }

  @Post(':categoria/envios')
  @HttpCode(HttpStatus.OK)
  @Throttle({ cifras: { limit: 30, ttl: 60_000 } })
  @ApiContrato({
    resumen: 'Reemplaza las cifras de un periodo o de una sede',
    roles: ['api-key'],
    claveApi: true,
    respuesta: ResultadoEnvioCifrasDto,
    tambien: [404, 413, 429],
    detalle:
      'Si cualquier fila es inválida, responde 400 con { filasOk, filasError, errores } y no escribe. ' +
      'Si el lote supera 5000 registros, responde 413. ' +
      'Un lote válido sustituye, en una transacción, las filas del mismo periodo o de la misma sede.',
  })
  enviar(
    @Param('categoria') categoria: string,
    @Body() dto: EnvioCifrasDto,
    @Req() req: { integrador: { id: string } },
  ) {
    return this.cifras.enviar(categoria, dto, req.integrador.id);
  }
}

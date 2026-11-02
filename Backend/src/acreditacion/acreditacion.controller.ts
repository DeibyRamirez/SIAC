import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { EstructuraService } from '../estructura/estructura.service';
import { ApiContrato } from '../openapi/api-contrato';

@ApiTags('Acreditación')
@Controller('acreditacion')
@UseGuards(AuthGuard('jwt'))
export class AcreditacionController {
  constructor(private readonly estructuraService: EstructuraService) {}

  @Get('etapas')
  @ApiContrato({
    resumen: 'Lista las etapas de la estructura de acreditación',
    roles: ['autenticado'],
    descripcionRespuesta: 'Árbol de etapas que devuelve EstructuraService.listarEtapas.',
    detalle: 'Alias de lectura de GET /estructura/etapas.',
  })
  listarEtapas() {
    return this.estructuraService.listarEtapas();
  }
}

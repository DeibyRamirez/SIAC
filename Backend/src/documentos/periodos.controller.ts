import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiContrato } from '../openapi/api-contrato';
import { periodoAcademicoEnBogota, ZONA_BOGOTA } from '../dominio/periodo-academico';
import { DocumentosService } from './documentos.service';
import { PeriodoActualDto, PeriodosConDatosDto } from './dto/periodo.dto';

@ApiTags('Evidencias')
@Controller('documentos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PeriodosController {
  constructor(private readonly documentosService: DocumentosService) {}

  /** Tiene que declararse antes de `periodos` por si el enrutador compara por prefijo. */
  @Get('periodos/actual')
  @ApiContrato({
    resumen: 'Periodo académico vigente en America/Bogota',
    roles: ['autenticado'],
    respuesta: PeriodoActualDto,
    detalle:
      'El semestre se calcula en el servidor con la zona America/Bogota (ene–jun = 1, jul–dic = 2). ' +
      'No usa el reloj del navegador.',
  })
  actual(): PeriodoActualDto {
    return { periodo: periodoAcademicoEnBogota(), zonaHoraria: ZONA_BOGOTA };
  }

  @Get('periodos')
  @ApiContrato({
    resumen: 'Lista periodos que tienen documentos visibles',
    roles: ['autenticado'],
    respuesta: PeriodosConDatosDto,
    detalle:
      'Incluye periodos pasados con evidencias. La consulta no borra ni oculta filas. ' +
      'La RLS acota por rol y programa.',
  })
  listar(): Promise<PeriodosConDatosDto> {
    return this.documentosService.listarPeriodosConDatos();
  }
}

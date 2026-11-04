import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiContrato } from '../openapi/api-contrato';
import {
  EsquemaCategoriaCifrasDto,
  PaginaDatosCifrasDto,
  ResultadoEnvioCifrasDto,
} from '../openapi/modelos-respuesta';
import { ClaveIntegracionGuard } from './clave-integracion.guard';
import { ClaveOJwtGuard } from './clave-o-jwt.guard';
import { CifrasInstitucionalesService } from './cifras-institucionales.service';
import { ClaveIntegracionAutenticada } from './claves-integracion.service';
import { ConsultaDatosCifrasDto, EnvioCifrasDto } from './dto/envio-cifras.dto';

@ApiTags('Cifras institucionales')
@Controller('integracion/cifras-institucionales')
export class CifrasInstitucionalesController {
  constructor(private readonly cifras: CifrasInstitucionalesService) {}

  @Get(':categoriaId/esquema')
  @UseGuards(ClaveOJwtGuard)
  @ApiContrato({
    resumen: 'Esquema de columnas de una categoría',
    roles: ['Administrador', 'SuperAdmin', 'integrador'],
    auth: 'jwtOApiKey',
    respuesta: EsquemaCategoriaCifrasDto,
    detalle: 'JWT de Administrador o cabecera x-api-key. Describe tipos, obligatoriedad y campos personales.',
  })
  esquema(@Param('categoriaId') categoriaId: string) {
    return this.cifras.obtenerEsquema(categoriaId);
  }

  @Get(':categoriaId/datos')
  @UseGuards(ClaveOJwtGuard)
  @ApiContrato({
    resumen: 'Lee cifras paginadas sin nombres personales',
    roles: ['Administrador', 'SuperAdmin', 'integrador'],
    auth: 'jwtOApiKey',
    respuesta: PaginaDatosCifrasDto,
    detalle: 'Tope 500 filas por página (por defecto 100). No incluye nombre_estudiante ni equivalentes.',
  })
  datos(@Param('categoriaId') categoriaId: string, @Query() consulta: ConsultaDatosCifrasDto) {
    return this.cifras.listarDatos(categoriaId, consulta.pagina, consulta.tamano, consulta.periodo);
  }

  @Post(':categoriaId/envios')
  @UseGuards(ClaveIntegracionGuard)
  @ApiContrato({
    resumen: 'Reemplaza el lote de un periodo (o sede) con JSON validado',
    roles: ['integrador'],
    auth: 'apiKey',
    respuesta: ResultadoEnvioCifrasDto,
    creacion: true,
    detalle:
      'Si una fila es inválida no se escribe nada. Infraestructura reemplaza por sede; el resto, por periodo.',
  })
  enviar(
    @Param('categoriaId') categoriaId: string,
    @Body() dto: EnvioCifrasDto,
    @Request() req: { claveIntegracion: ClaveIntegracionAutenticada },
  ) {
    return this.cifras.registrarEnvio(categoriaId, dto.periodo, dto.registros, req.claveIntegracion);
  }
}

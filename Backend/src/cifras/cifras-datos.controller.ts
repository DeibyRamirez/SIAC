import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CifrasFeedService } from './cifras-feed.service';
import { FiltrosFeedCifrasQueryDto, RespuestaFeedCifrasDto } from './dto/cifras.dto';
import { CifrasDatosGuard } from './guards/cifras-datos.guard';
import { JwtOpcionalGuard } from './guards/jwt-opcional.guard';

/**
 * Feed plano de cifras para Power BI (S3-03): JWT de Administrador o x-api-key.
 * Sin nombres de persona y paginado (tamaño máximo 5000).
 */
@ApiTags('cifras')
@ApiBearerAuth()
@Controller('cifras')
@UseGuards(JwtOpcionalGuard, CifrasDatosGuard)
export class CifrasDatosController {
  constructor(private readonly cifrasFeedService: CifrasFeedService) {}

  @Get(':categoriaId/datos')
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description: 'Clave de integración (alternativa al token de Administrador).',
  })
  @ApiOkResponse({ type: RespuestaFeedCifrasDto })
  obtenerDatos(
    @Param('categoriaId') categoriaId: string,
    @Query() filtros: FiltrosFeedCifrasQueryDto,
  ) {
    return this.cifrasFeedService.obtenerDatos(categoriaId, filtros);
  }
}

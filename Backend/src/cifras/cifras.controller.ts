import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { CifrasService } from './cifras.service';
import {
  ConsultaCifrasQueryDto,
  RespuestaCategoriasCifrasDto,
  RespuestaCifrasDto,
} from './dto/cifras.dto';

const ROLES_CIFRAS: RolUsuario[] = [RolUsuario.Administrador, RolUsuario.ParAcademico];

@ApiTags('cifras')
@ApiBearerAuth()
@Controller('cifras')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...ROLES_CIFRAS)
export class CifrasController {
  constructor(private readonly cifrasService: CifrasService) {}

  @Get('categorias')
  @ApiOkResponse({ type: RespuestaCategoriasCifrasDto })
  listarCategorias() {
    return this.cifrasService.listarCategorias();
  }

  @Get('estudiantes')
  @ApiOkResponse({ type: RespuestaCifrasDto })
  obtenerEstudiantes(@Query() consulta: ConsultaCifrasQueryDto) {
    return this.cifrasService.obtenerEstudiantes(consulta.periodo);
  }
}

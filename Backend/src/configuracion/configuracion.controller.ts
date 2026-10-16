import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

import { Roles, RolesGuard } from '../common/guards/roles.guard';
import type { UmbralesSemaforoVigencia } from '../dominio/panel-siac';
import { ConfiguracionSiacService } from './configuracion-siac.service';
import { ActualizarUmbralesVigenciaDto } from './dto/actualizar-umbrales-vigencia.dto';

/**
 * T-007.3a: umbrales del semáforo de vigencia configurables desde la UI
 * (`/administrador/vigencias`). GET relee la fila `ConfiguracionSIAC` (sin caché) y PATCH
 * persiste y valida; el siguiente cálculo de semáforo usa los valores nuevos sin redeploy.
 */
@ApiTags('configuracion')
@ApiBearerAuth()
@Controller('configuracion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionSiacService) {}

  @Get('vigencia')
  @Roles(RolUsuario.SuperAdmin, RolUsuario.Administrador)
  @ApiOperation({ summary: 'Consulta los umbrales de vigencia del semáforo (SuperAdmin/Administrador)' })
  async obtenerVigencia(): Promise<UmbralesSemaforoVigencia> {
    return this.soloVigencia(await this.configuracion.cargar());
  }

  @Patch('vigencia')
  @Roles(RolUsuario.SuperAdmin, RolUsuario.Administrador)
  @ApiOperation({
    summary: 'Actualiza los umbrales de vigencia (mesesAvisoVigencia > mesesRojoVigencia ≥ 1)',
    description:
      'Reemplazo completo de los umbrales de vigencia: ambos campos (mesesAvisoVigencia y ' +
      'mesesRojoVigencia) son obligatorios aunque el verbo sea PATCH, porque la regla aviso > rojo ' +
      'se valida entre los dos. El cambio queda registrado en el log con el id del usuario.',
  })
  @ApiBody({ type: ActualizarUmbralesVigenciaDto, required: true })
  async actualizarVigencia(
    @Body() dto: ActualizarUmbralesVigenciaDto,
    @Request() req: { user?: { id?: string } },
  ): Promise<UmbralesSemaforoVigencia> {
    return this.soloVigencia(await this.configuracion.actualizarUmbrales(dto, req.user?.id));
  }

  private soloVigencia(umbrales: UmbralesSemaforoVigencia): UmbralesSemaforoVigencia {
    return {
      aniosVigencia: umbrales.aniosVigencia,
      mesesAvisoVigencia: umbrales.mesesAvisoVigencia,
      mesesRojoVigencia: umbrales.mesesRojoVigencia,
    };
  }
}

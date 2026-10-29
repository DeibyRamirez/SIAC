import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

import { Roles, RolesGuard } from '../common/guards/roles.guard';
import type { UmbralesSemaforoVigencia } from '../dominio/panel-siac';
import { ConfiguracionSiacService } from './configuracion-siac.service';
import { ActualizarUmbralesVigenciaDto } from './dto/actualizar-umbrales-vigencia.dto';
import { ApiContrato } from '../openapi/api-contrato';
import { UmbralesVigenciaDto } from '../openapi/modelos-respuesta';

/**
 * T-007.3a: umbrales del semáforo de vigencia configurables desde la UI
 * (`/administrador/vigencias`). GET relee la fila `ConfiguracionSIAC` (sin caché) y PATCH
 * persiste y valida; el siguiente cálculo de semáforo usa los valores nuevos sin redeploy.
 */
@ApiTags('Configuración')
@Controller('configuracion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionSiacService) {}

  @Get('vigencia')
  @Roles(RolUsuario.SuperAdmin, RolUsuario.Administrador)
  @ApiContrato({
    resumen: 'Consulta los umbrales de vigencia del semáforo',
    roles: ['SuperAdmin', 'Administrador'],
    respuesta: UmbralesVigenciaDto,
    detalle: 'Relee la fila ConfiguracionSIAC. No usa caché de proceso.',
  })
  async obtenerVigencia(): Promise<UmbralesSemaforoVigencia> {
    return this.soloVigencia(await this.configuracion.cargar());
  }

  @Patch('vigencia')
  @Roles(RolUsuario.SuperAdmin, RolUsuario.Administrador)
  @ApiContrato({
    resumen: 'Actualiza los umbrales de vigencia',
    roles: ['SuperAdmin', 'Administrador'],
    respuesta: UmbralesVigenciaDto,
    detalle:
      'Ambos campos son obligatorios aunque el verbo sea PATCH, porque la regla aviso > rojo se valida entre los dos. ' +
      '1 ≤ mesesRojoVigencia < mesesAvisoVigencia ≤ 84. El cambio queda en el log con el id del usuario.',
  })
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

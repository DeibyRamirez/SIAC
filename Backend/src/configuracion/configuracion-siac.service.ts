import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import {
  UMBRALES_SEMAFORO_DEFECTO,
  UmbralesSemaforo,
  validarUmbralesSemaforo,
} from '../dominio/panel-siac';
import { ActualizarUmbralesVigenciaDto } from './dto/actualizar-umbrales-vigencia.dto';
import { ejecutarComoSistema } from '../prisma/contexto-sistema';

/**
 * T-010.2 (R-010.2a): umbrales del semáforo leídos de la tabla `ConfiguracionSIAC`.
 * Se cargan una vez al arrancar; si son incoherentes el backend no arranca.
 * T-007.3a: `cargar()` relee la BD (permite cambiar mesesRojoVigencia sin redeploy) y
 * `actualizarUmbrales()` valida mesesAvisoVigencia > mesesRojoVigencia ≥ 1.
 */
@Injectable()
export class ConfiguracionSiacService {
  private readonly logger = new Logger(ConfiguracionSiacService.name);
  private umbrales: UmbralesSemaforo = UMBRALES_SEMAFORO_DEFECTO;

  constructor(private readonly prisma: PrismaService) {}

  async cargar(): Promise<UmbralesSemaforo> {
    return ejecutarComoSistema(async () => {
      const fila = await this.prisma.configuracionSIAC.findUnique({ where: { id: 'global' } });
      if (!fila) {
        this.logger.warn(
          'No existe la fila "global" en ConfiguracionSIAC; se usan los umbrales por defecto (100/55, 7 años, aviso 12 meses, rojo 6).',
        );
        this.umbrales = UMBRALES_SEMAFORO_DEFECTO;
        return this.umbrales;
      }
      const umbrales: UmbralesSemaforo = {
        minimoVerde: fila.avanceMinimoVerde,
        minimoAmarillo: fila.avanceMinimoAmarillo,
        aniosVigencia: fila.aniosVigencia,
        mesesAvisoVigencia: fila.mesesAvisoVigencia,
        mesesRojoVigencia: fila.mesesRojoVigencia,
      };
      validarUmbralesSemaforo(umbrales);
      this.umbrales = umbrales;
      return umbrales;
    });
  }

  obtener(): UmbralesSemaforo {
    return this.umbrales;
  }

  /**
   * Actualiza la fila global con los nuevos umbrales de vigencia, previa validación
   * (mesesAvisoVigencia > mesesRojoVigencia ≥ 1 y aviso < vigencia completa).
   * Sin módulo de auditoría: el cambio queda en el log con el id del usuario y los valores
   * anterior/nuevo (sin otros datos personales).
   */
  async actualizarUmbrales(
    dto: ActualizarUmbralesVigenciaDto,
    usuarioId?: string,
  ): Promise<UmbralesSemaforo> {
    const actuales = await this.cargar();
    const propuestos: UmbralesSemaforo = {
      ...actuales,
      ...(dto.mesesAvisoVigencia !== undefined ? { mesesAvisoVigencia: dto.mesesAvisoVigencia } : {}),
      ...(dto.mesesRojoVigencia !== undefined ? { mesesRojoVigencia: dto.mesesRojoVigencia } : {}),
    };
    try {
      validarUmbralesSemaforo(propuestos);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    await this.prisma.configuracionSIAC.upsert({
      where: { id: 'global' },
      update: {
        mesesAvisoVigencia: propuestos.mesesAvisoVigencia,
        mesesRojoVigencia: propuestos.mesesRojoVigencia,
      },
      create: {
        id: 'global',
        avanceMinimoVerde: propuestos.minimoVerde,
        avanceMinimoAmarillo: propuestos.minimoAmarillo,
        aniosVigencia: propuestos.aniosVigencia,
        mesesAvisoVigencia: propuestos.mesesAvisoVigencia,
        mesesRojoVigencia: propuestos.mesesRojoVigencia,
      },
    });
    this.umbrales = propuestos;
    this.logger.log(
      `Umbrales de vigencia actualizados por el usuario ${usuarioId ?? 'desconocido'}: ` +
        `mesesAvisoVigencia ${actuales.mesesAvisoVigencia} → ${propuestos.mesesAvisoVigencia}, ` +
        `mesesRojoVigencia ${actuales.mesesRojoVigencia} → ${propuestos.mesesRojoVigencia}.`,
    );
    return propuestos;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import {
  UMBRALES_SEMAFORO_DEFECTO,
  UmbralesSemaforo,
  validarUmbralesSemaforo,
} from '../dominio/panel-siac';

/**
 * T-010.2 (R-010.2a): umbrales del semáforo leídos de la tabla `ConfiguracionSIAC`.
 * Se cargan una vez al arrancar; si son incoherentes el backend no arranca.
 */
@Injectable()
export class ConfiguracionSiacService {
  private readonly logger = new Logger(ConfiguracionSiacService.name);
  private umbrales: UmbralesSemaforo = UMBRALES_SEMAFORO_DEFECTO;

  constructor(private readonly prisma: PrismaService) {}

  async cargar(): Promise<UmbralesSemaforo> {
    const fila = await this.prisma.configuracionSIAC.findUnique({ where: { id: 'global' } });
    if (!fila) {
      this.logger.warn(
        'No existe la fila "global" en ConfiguracionSIAC; se usan los umbrales por defecto (100/55, 7 años, aviso 12 meses).',
      );
      this.umbrales = UMBRALES_SEMAFORO_DEFECTO;
      return this.umbrales;
    }
    const umbrales: UmbralesSemaforo = {
      minimoVerde: fila.avanceMinimoVerde,
      minimoAmarillo: fila.avanceMinimoAmarillo,
      aniosVigencia: fila.aniosVigencia,
      mesesAvisoVigencia: fila.mesesAvisoVigencia,
    };
    validarUmbralesSemaforo(umbrales);
    this.umbrales = umbrales;
    return umbrales;
  }

  obtener(): UmbralesSemaforo {
    return this.umbrales;
  }
}

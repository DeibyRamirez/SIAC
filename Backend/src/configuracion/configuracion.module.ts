import { Global, Module } from '@nestjs/common';
import { ConfiguracionSiacService } from './configuracion-siac.service';

/** Umbrales configurables del SIAC (T-010.2), disponibles para cualquier módulo. */
@Global()
@Module({
  providers: [ConfiguracionSiacService],
  exports: [ConfiguracionSiacService],
})
export class ConfiguracionModule {}

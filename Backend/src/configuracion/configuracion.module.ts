import { Global, Module } from '@nestjs/common';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionSiacService } from './configuracion-siac.service';
import { IntegracionModule } from '../integracion/integracion.module';

/** Umbrales configurables del SIAC (T-010.2/T-007.3a), disponibles para cualquier módulo. */
@Global()
@Module({
  imports: [IntegracionModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionSiacService],
  exports: [ConfiguracionSiacService],
})
export class ConfiguracionModule {}

import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CifrasInstitucionalesController } from './cifras-institucionales.controller';
import { CifrasInstitucionalesService } from './cifras-institucionales.service';
import { ClavesIntegracionController } from './claves/claves-integracion.controller';
import { ClavesIntegracionService } from './claves/claves-integracion.service';
import { GuardiaClaveApi } from './guardia-clave-api';
import { GuardiaTasaCifras } from './guardia-tasa-cifras';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'cifras', ttl: 60_000, limit: 120 }],
      errorMessage: 'Demasiadas solicitudes para esta clave. Intente de nuevo en un minuto.',
    }),
  ],
  controllers: [CifrasInstitucionalesController, ClavesIntegracionController],
  providers: [
    CifrasInstitucionalesService,
    ClavesIntegracionService,
    GuardiaClaveApi,
    GuardiaTasaCifras,
  ],
})
export class CifrasInstitucionalesModule {}

import { Module } from '@nestjs/common';
import { CifrasInstitucionalesController } from './cifras-institucionales.controller';
import { CifrasInstitucionalesService } from './cifras-institucionales.service';
import { ClavesIntegracionController } from './claves/claves-integracion.controller';
import { ClavesIntegracionService } from './claves/claves-integracion.service';
import { GuardiaClaveApi } from './guardia-clave-api';
import { GuardiaTasaCifras } from './guardia-tasa-cifras';

@Module({
  controllers: [CifrasInstitucionalesController, ClavesIntegracionController],
  providers: [
    CifrasInstitucionalesService,
    ClavesIntegracionService,
    GuardiaClaveApi,
    GuardiaTasaCifras,
  ],
})
export class CifrasInstitucionalesModule {}

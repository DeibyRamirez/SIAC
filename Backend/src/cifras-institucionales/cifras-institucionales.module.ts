import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CifrasInstitucionalesController } from './cifras-institucionales.controller';
import { CifrasInstitucionalesService } from './cifras-institucionales.service';
import { ClaveIntegracionGuard } from './clave-integracion.guard';
import { ClaveOJwtGuard } from './clave-o-jwt.guard';
import { ClavesIntegracionController } from './claves-integracion.controller';
import { ClavesIntegracionService } from './claves-integracion.service';

@Module({
  imports: [AuthModule],
  controllers: [ClavesIntegracionController, CifrasInstitucionalesController],
  providers: [
    ClavesIntegracionService,
    CifrasInstitucionalesService,
    ClaveIntegracionGuard,
    ClaveOJwtGuard,
  ],
  exports: [ClavesIntegracionService, CifrasInstitucionalesService],
})
export class CifrasInstitucionalesModule {}

import { Module } from '@nestjs/common';
import { CifrasController } from './cifras.controller';
import { CifrasSemillaService } from './cifras-semilla.service';
import { CifrasService } from './cifras.service';
import { PROVEEDOR_CIFRAS } from './proveedor-cifras.interface';

@Module({
  controllers: [CifrasController],
  providers: [
    CifrasSemillaService,
    CifrasService,
    {
      provide: PROVEEDOR_CIFRAS,
      useExisting: CifrasSemillaService,
    },
  ],
  exports: [CifrasService],
})
export class CifrasModule {}

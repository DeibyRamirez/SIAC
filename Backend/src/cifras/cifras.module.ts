import { Module } from '@nestjs/common';
import { CifrasImportacionService } from './cifras-importacion.service';
import { CifrasController } from './cifras.controller';
import { CifrasPrismaService } from './cifras-prisma.service';
import { CifrasSemillaService } from './cifras-semilla.service';
import { CifrasRepositorio } from './cifras.repositorio';
import { CifrasService } from './cifras.service';
import { PROVEEDOR_CIFRAS } from './proveedor-cifras.interface';

@Module({
  controllers: [CifrasController],
  providers: [
    CifrasSemillaService,
    CifrasRepositorio,
    CifrasImportacionService,
    CifrasPrismaService,
    CifrasService,
    {
      provide: PROVEEDOR_CIFRAS,
      useExisting: CifrasPrismaService,
    },
  ],
  exports: [CifrasService],
})
export class CifrasModule {}

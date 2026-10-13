import { Module } from '@nestjs/common';
import { CifrasAgregacionService } from './cifras-agregacion.service';
import { CifrasDatosController } from './cifras-datos.controller';
import { CifrasFeedService } from './cifras-feed.service';
import { CifrasImportacionService } from './cifras-importacion.service';
import { CifrasController } from './cifras.controller';
import { CifrasPrismaService } from './cifras-prisma.service';
import { CifrasRegistrosRepositorio } from './cifras-registros.repositorio';
import { CifrasSemillaService } from './cifras-semilla.service';
import { CifrasRepositorio } from './cifras.repositorio';
import { CifrasService } from './cifras.service';
import { PROVEEDOR_CIFRAS } from './proveedor-cifras.interface';

@Module({
  controllers: [CifrasController, CifrasDatosController],
  providers: [
    CifrasSemillaService,
    CifrasRepositorio,
    CifrasRegistrosRepositorio,
    CifrasImportacionService,
    CifrasAgregacionService,
    CifrasFeedService,
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

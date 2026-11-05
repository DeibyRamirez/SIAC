import { Module } from '@nestjs/common';
import { IntegracionController } from './integracion.controller';
import { IntegracionService } from './integracion.service';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';
import { CatalogoCuacPersistenciaService } from './catalogo-cuac-persistencia.service';
import { RevalidadorCatalogoCuacService } from './revalidador-catalogo-cuac.service';
import { CacheConsultasProgramasService } from './cache-consultas-programas.service';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';

@Module({
  imports: [AlmacenamientoModule],
  controllers: [IntegracionController],
  providers: [
    IntegracionService,
    ClienteCarrerasCuacService,
    CatalogoCuacPersistenciaService,
    RevalidadorCatalogoCuacService,
    CacheConsultasProgramasService,
  ],
  exports: [
    IntegracionService,
    ClienteCarrerasCuacService,
    CatalogoCuacPersistenciaService,
    RevalidadorCatalogoCuacService,
    CacheConsultasProgramasService,
  ],
})
export class IntegracionModule {}

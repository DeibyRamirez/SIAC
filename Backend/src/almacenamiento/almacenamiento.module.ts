import { Global, Module } from '@nestjs/common';
import { AlmacenamientoLocalController } from './almacenamiento-local.controller';
import { AlmacenamientoService } from './almacenamiento.service';

@Global()
@Module({
  controllers: [AlmacenamientoLocalController],
  providers: [AlmacenamientoService],
  exports: [AlmacenamientoService],
})
export class AlmacenamientoModule {}

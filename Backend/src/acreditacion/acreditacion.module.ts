import { Module } from '@nestjs/common';
import { AcreditacionController } from './acreditacion.controller';
import { EstructuraModule } from '../estructura/estructura.module';

@Module({
  imports: [EstructuraModule],
  controllers: [AcreditacionController],
})
export class AcreditacionModule {}

import { Module } from '@nestjs/common';
import { EstructuraController } from './estructura.controller';
import { EstructuraService } from './estructura.service';

@Module({
  controllers: [EstructuraController],
  providers: [EstructuraService],
  exports: [EstructuraService],
})
export class EstructuraModule {}

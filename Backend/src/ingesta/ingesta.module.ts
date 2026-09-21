import { Module } from '@nestjs/common';
import { IngestaController } from './ingesta.controller';
import { IngestaService } from './ingesta.service';

@Module({
  controllers: [IngestaController],
  providers: [IngestaService],
})
export class IngestaModule {}

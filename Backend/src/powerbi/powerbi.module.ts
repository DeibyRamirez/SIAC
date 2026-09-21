import { Module } from '@nestjs/common';
import { PowerBiController } from './powerbi.controller';
import { PowerBiService } from './powerbi.service';

@Module({
  controllers: [PowerBiController],
  providers: [PowerBiService],
  exports: [PowerBiService],
})
export class PowerBiModule {}

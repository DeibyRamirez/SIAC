import { Module } from '@nestjs/common';
import { MetricasController } from './metricas.controller';
import { PowerBiModule } from '../powerbi/powerbi.module';

@Module({
  imports: [PowerBiModule],
  controllers: [MetricasController],
})
export class MetricasModule {}

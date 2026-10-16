import { Module } from '@nestjs/common';
import { PowerBiController } from './powerbi.controller';
import { PowerBiService } from './powerbi.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PowerBiController],
  providers: [PowerBiService],
  exports: [PowerBiService],
})
export class PowerBiModule {}

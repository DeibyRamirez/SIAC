import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EstructuraService } from '../estructura/estructura.service';

@Controller('acreditacion')
@UseGuards(AuthGuard('jwt'))
export class AcreditacionController {
  constructor(private readonly estructuraService: EstructuraService) {}

  @Get('etapas')
  listarEtapas() {
    return this.estructuraService.listarEtapas();
  }
}

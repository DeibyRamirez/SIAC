import { Module } from '@nestjs/common';
import { GuardAlcancePrograma } from './guard-alcance-programa';
import { ServicioAlcancePrograma } from './servicio-alcance-programa';

@Module({
  providers: [ServicioAlcancePrograma, GuardAlcancePrograma],
  exports: [ServicioAlcancePrograma, GuardAlcancePrograma],
})
export class AlcanceProgramaModule {}

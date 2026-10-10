import { Module } from '@nestjs/common';
import { UsuariosModule } from '../../usuarios/usuarios.module';
import { GuardAlcancePrograma } from './guard-alcance-programa';
import { ServicioAlcancePrograma } from './servicio-alcance-programa';

@Module({
  imports: [UsuariosModule],
  providers: [ServicioAlcancePrograma, GuardAlcancePrograma],
  exports: [ServicioAlcancePrograma, GuardAlcancePrograma],
})
export class AlcanceProgramaModule {}

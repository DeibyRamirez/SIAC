import { Module } from '@nestjs/common';
import { UsuarioRepositorio } from './usuario.repositorio';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  controllers: [UsuariosController],
  providers: [UsuarioRepositorio, UsuariosService],
  exports: [UsuarioRepositorio, UsuariosService],
})
export class UsuariosModule {}

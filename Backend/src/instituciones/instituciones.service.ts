import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import {
  InstitucionRepositorio,
  SIGLA_INSTITUCION_PRINCIPAL,
} from './institucion.repositorio';

/**
 * HU-010: la institución (CUAC) es la dueña de los trámites de condiciones institucionales.
 * Hay un único registro; el modelo admite más para no cerrar la puerta a sedes o convenios.
 */
@Injectable()
export class InstitucionesService {
  constructor(private readonly repo: InstitucionRepositorio) {}

  listar() {
    return this.repo.listar();
  }

  async obtenerPorId(id: string) {
    const institucion = await this.repo.buscarPorId(id);
    if (!institucion) throw new NotFoundException('Institución no encontrada.');
    return institucion;
  }

  /** Registro único de la CUAC (por sigla; si no existe, el primero creado). */
  async obtenerPrincipal() {
    const institucion =
      (await this.repo.buscarPorSigla(SIGLA_INSTITUCION_PRINCIPAL)) ??
      (await this.repo.buscarPrimera());
    if (!institucion) {
      throw new NotFoundException(
        'No hay una institución registrada. Aplique las migraciones y la semilla.',
      );
    }
    return institucion;
  }

  async actualizar(id: string, dto: ActualizarInstitucionDto) {
    await this.obtenerPorId(id);

    const datos: Prisma.InstitucionUpdateInput = {};
    if (dto.nombre !== undefined) datos.nombre = dto.nombre.trim();
    if (dto.sigla !== undefined) datos.sigla = dto.sigla.trim().toUpperCase();
    if (dto.urlImagen !== undefined) datos.urlImagen = dto.urlImagen.trim() || null;
    if (dto.tipoTramiteActivo !== undefined) datos.tipoTramiteActivo = dto.tipoTramiteActivo;

    try {
      return await this.repo.actualizar(id, datos);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una institución con esa sigla.');
      }
      throw error;
    }
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { PlantillaRepositorio } from './plantilla.repositorio';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { CrearPlantillaDto, ActualizarPlantillaDto } from './dto/plantilla.dto';

@Injectable()
export class PlantillasService {
  constructor(
    private readonly plantillaRepo: PlantillaRepositorio,
    private readonly almacenamiento: AlmacenamientoService,
  ) {}

  listar(rol: RolUsuario) {
    const soloVigentes = rol === RolUsuario.Cargador || rol === RolUsuario.ParAcademico;
    return this.plantillaRepo.listar(soloVigentes);
  }

  async crear(dto: CrearPlantillaDto, archivo?: Express.Multer.File) {
    await this.plantillaRepo.marcarAnterioresNoVigentes(dto.factor);

    const plantilla = await this.plantillaRepo.crear({
      ...dto,
      vigente: true,
    });

    if (archivo) {
      const clave = this.almacenamiento.generarClavePlantilla(
        plantilla.id,
        archivo.originalname,
      );
      await this.almacenamiento.subirArchivo(
        archivo.buffer,
        clave,
        'plantillas',
        archivo.mimetype,
      );
      return this.plantillaRepo.actualizar(plantilla.id, {
        nombreArchivo: archivo.originalname,
        rutaArchivo: clave,
      });
    }

    return plantilla;
  }

  async actualizar(id: string, dto: ActualizarPlantillaDto, rol: RolUsuario) {
    if (rol === RolUsuario.Cargador || rol === RolUsuario.ParAcademico) {
      throw new ForbiddenException('No tiene permiso para editar plantillas.');
    }

    const plantilla = await this.plantillaRepo.buscarPorId(id);
    if (!plantilla) throw new NotFoundException('Plantilla no encontrada.');

    return this.plantillaRepo.actualizar(id, dto);
  }

  async deshabilitar(id: string, rol: RolUsuario) {
    if (rol !== RolUsuario.Revisor && rol !== RolUsuario.Administrador) {
      throw new ForbiddenException('No tiene permiso para deshabilitar plantillas.');
    }

    const plantilla = await this.plantillaRepo.buscarPorId(id);
    if (!plantilla) throw new NotFoundException('Plantilla no encontrada.');

    return this.plantillaRepo.actualizar(id, { vigente: false });
  }

  async obtenerUrlDescarga(id: string) {
    const plantilla = await this.plantillaRepo.buscarPorId(id);
    if (!plantilla?.rutaArchivo) {
      throw new NotFoundException('Archivo de plantilla no disponible.');
    }

    return this.almacenamiento.generarUrlFirmada(plantilla.rutaArchivo, 'plantillas');
  }
}

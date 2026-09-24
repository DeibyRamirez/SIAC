import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FormatoArchivo, RolUsuario } from '@prisma/client';
import { PlantillaRepositorio } from './plantilla.repositorio';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { CrearPlantillaDto, ActualizarPlantillaDto } from './dto/plantilla.dto';

@Injectable()
export class PlantillasService {
  constructor(
    private readonly plantillaRepo: PlantillaRepositorio,
    private readonly almacenamiento: AlmacenamientoService,
  ) {}

  listar(rol: RolUsuario, tipoTramite?: import('@prisma/client').TipoTramitePlantilla) {
    const soloVigentes = rol === RolUsuario.Cargador || rol === RolUsuario.ParAcademico;
    return this.plantillaRepo.listar(soloVigentes, tipoTramite);
  }

  async crear(dto: CrearPlantillaDto, archivo?: Express.Multer.File) {
    if (archivo) {
      this.validarArchivoDocx(archivo);
    }

    const nombreFinal = archivo
      ? this.nombreDesdeArchivo(archivo.originalname)
      : dto.nombre;

    await this.plantillaRepo.marcarAnterioresNoVigentes(dto.factor);

    const plantilla = await this.plantillaRepo.crear({
      ...dto,
      nombre: nombreFinal,
      formato: FormatoArchivo.DOCX,
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

  async obtenerContenidoArchivo(id: string) {
    const plantilla = await this.plantillaRepo.buscarPorId(id);
    if (!plantilla?.rutaArchivo) {
      throw new NotFoundException('Archivo de plantilla no disponible.');
    }
    const buffer = await this.almacenamiento.obtenerBuffer(
      plantilla.rutaArchivo,
      'plantillas',
    );
    return {
      buffer,
      nombreArchivo: plantilla.nombreArchivo ?? `${plantilla.nombre}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  async reemplazarArchivo(id: string, archivo: Express.Multer.File, rol: RolUsuario) {
    if (rol === RolUsuario.Cargador || rol === RolUsuario.ParAcademico) {
      throw new ForbiddenException('No tiene permiso para editar plantillas.');
    }
    this.validarArchivoDocx(archivo);
    const plantilla = await this.plantillaRepo.buscarPorId(id);
    if (!plantilla) throw new NotFoundException('Plantilla no encontrada.');

    const clave = this.almacenamiento.generarClavePlantilla(id, archivo.originalname);
    await this.almacenamiento.subirArchivo(
      archivo.buffer,
      clave,
      'plantillas',
      archivo.mimetype,
    );
    return this.plantillaRepo.actualizar(id, {
      nombreArchivo: archivo.originalname,
      rutaArchivo: clave,
      formato: FormatoArchivo.DOCX,
    });
  }

  private validarArchivoDocx(archivo: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('Se requiere un archivo .docx.');
    const extension = archivo.originalname.split('.').pop()?.toLowerCase();
    if (extension !== 'docx') {
      throw new BadRequestException('Solo se permiten plantillas en formato .docx.');
    }
  }

  private nombreDesdeArchivo(nombreArchivo: string): string {
    return nombreArchivo.replace(/\.docx$/i, '').replace(/[_-]+/g, ' ').trim();
  }
}

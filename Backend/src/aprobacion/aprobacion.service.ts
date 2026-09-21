import { Injectable } from '@nestjs/common';
import { EstadoEvidencia } from '@prisma/client';
import { EvidenciaRepositorio } from '../documentos/evidencia.repositorio';

/** @deprecated Usar DocumentosService.dictaminar — mantiene compatibilidad con ruta /aprobacion */
@Injectable()
export class AprobacionService {
  constructor(private readonly evidenciaRepo: EvidenciaRepositorio) {}

  async listarPendientes() {
    const [datos, total] = await this.evidenciaRepo.listar({
      estado: EstadoEvidencia.EnRevision,
      limite: 100,
    });
    return { datos, total };
  }
}

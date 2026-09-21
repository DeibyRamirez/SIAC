import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.module';
import { OrigenDato, RolUsuario } from '@prisma/client';

interface ProgramaExterno {
  idExterno: string;
  codigo: string;
  nombre: string;
  nivel: string;
  modalidad?: string;
  codigoSnies?: string;
}

interface UsuarioExterno {
  idExterno: string;
  correo: string;
  nombre: string;
  cargo?: string;
  dependencia?: string;
  codigoInstitucional?: string;
  activo?: boolean;
}

interface VinculoExterno {
  usuarioIdExterno: string;
  programaCodigo: string;
}

@Injectable()
export class IntegracionService {
  private readonly logger = new Logger(IntegracionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sincronizarDesdeTi(): Promise<{
    programas: number;
    usuarios: number;
    vinculos: number;
    origen: OrigenDato;
  }> {
    const urlTi = this.config.get<string>('TI_API_URL');

    if (!urlTi) {
      return this.sincronizarDesdeDatosLocales();
    }

    try {
      const token = this.config.get<string>('TI_API_TOKEN');
      const respuesta = await fetch(urlTi, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!respuesta.ok) {
        throw new Error(`API TI respondió ${respuesta.status}`);
      }

      const datos = (await respuesta.json()) as {
        programas?: ProgramaExterno[];
        usuarios?: UsuarioExterno[];
        vinculos?: VinculoExterno[];
      };

      const programas = await this.upsertProgramas(datos.programas ?? [], OrigenDato.API);
      const usuarios = await this.upsertUsuarios(datos.usuarios ?? [], OrigenDato.API);
      const vinculos = await this.upsertVinculos(datos.vinculos ?? []);

      return { programas, usuarios, vinculos, origen: OrigenDato.API };
    } catch (error) {
      this.logger.error('Fallo sincronización TI', error);
      throw new BadGatewayException(
        'No se pudo sincronizar con el sistema institucional. Se mantiene la última copia local.',
      );
    }
  }

  async sincronizarDesdeCsv(contenido: string): Promise<{
    programas: number;
    usuarios: number;
    vinculos: number;
    origen: OrigenDato;
  }> {
    const lineas = contenido.trim().split('\n').slice(1);
    const programas: ProgramaExterno[] = [];

    for (const linea of lineas) {
      const [codigo, nombre, nivel, modalidad] = linea.split(',').map((c) => c.trim());
      if (!codigo || !nombre) continue;
      programas.push({
        idExterno: codigo,
        codigo,
        nombre,
        nivel: nivel ?? 'Pregrado',
        modalidad,
      });
    }

    const count = await this.upsertProgramas(programas, OrigenDato.CSV);
    return { programas: count, usuarios: 0, vinculos: 0, origen: OrigenDato.CSV };
  }

  private async sincronizarDesdeDatosLocales() {
    const programas = await this.prisma.programa.count();
    const usuarios = await this.prisma.usuario.count();
    const vinculos = await this.prisma.usuarioPrograma.count();
    return { programas, usuarios, vinculos, origen: OrigenDato.Manual };
  }

  private async upsertProgramas(items: ProgramaExterno[], origen: OrigenDato): Promise<number> {
    let count = 0;
    const ahora = new Date();

    for (const item of items) {
      await this.prisma.programa.upsert({
        where: { codigo: item.codigo },
        update: {
          nombre: item.nombre,
          nivel: item.nivel,
          modalidad: item.modalidad,
          codigoSnies: item.codigoSnies,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
        },
        create: {
          codigo: item.codigo,
          nombre: item.nombre,
          nivel: item.nivel,
          modalidad: item.modalidad,
          codigoSnies: item.codigoSnies,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
        },
      });
      count++;
    }

    return count;
  }

  private async upsertUsuarios(items: UsuarioExterno[], origen: OrigenDato): Promise<number> {
    let count = 0;
    const ahora = new Date();

    for (const item of items) {
      await this.prisma.usuario.upsert({
        where: { correo: item.correo },
        update: {
          nombre: item.nombre,
          cargo: item.cargo,
          dependencia: item.dependencia,
          codigoInstitucional: item.codigoInstitucional,
          activo: item.activo ?? true,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
        },
        create: {
          correo: item.correo,
          nombre: item.nombre,
          contrasena: '$2a$10$placeholder.sin.login.ti',
          rol: RolUsuario.Cargador,
          cargo: item.cargo,
          dependencia: item.dependencia,
          codigoInstitucional: item.codigoInstitucional,
          activo: item.activo ?? true,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
        },
      });
      count++;
    }

    return count;
  }

  private async upsertVinculos(items: VinculoExterno[]): Promise<number> {
    let count = 0;

    for (const item of items) {
      const usuario = await this.prisma.usuario.findFirst({
        where: { idExterno: item.usuarioIdExterno },
      });
      const programa = await this.prisma.programa.findUnique({
        where: { codigo: item.programaCodigo },
      });

      if (!usuario || !programa) continue;

      const existente = await this.prisma.usuarioPrograma.findFirst({
        where: { usuarioId: usuario.id, programaId: programa.id },
      });

      if (!existente) {
        await this.prisma.usuarioPrograma.create({
          data: { usuarioId: usuario.id, programaId: programa.id },
        });
        count++;
      }
    }

    return count;
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { normalizarUrlPublicaPowerBi } from '../common/config/configuracion.env';

export interface EmbedTokenRespuesta {
  embedUrl: string;
  embedToken: string | null;
  reportId: string;
  categoriaId: string | null;
  fallback: boolean;
  mensaje?: string;
}

const REPORT_ID_ESTUDIANTES_DEFECTO = 'ee3e7c91-76df-4f35-90b6-2e4f67ed6567';

const CATEGORIAS_EMBED = new Set(['estudiantes']);

@Injectable()
export class PowerBiService {
  constructor(private readonly config: ConfigService) {}

  async obtenerEmbedToken(categoriaId?: string): Promise<EmbedTokenRespuesta> {
    const categoria = categoriaId?.trim() || null;

    if (categoria && !CATEGORIAS_EMBED.has(categoria)) {
      throw new BadRequestException(
        `La categoría «${categoria}» aún no tiene informe Power BI configurado.`,
      );
    }

    if (categoria === 'estudiantes') {
      return this.obtenerEmbedEstudiantes();
    }

    const reportId = this.config.get('POWERBI_REPORT_ID') ?? 'demo-report';
    const workspaceId = this.config.get('POWERBI_WORKSPACE_ID') ?? 'demo-workspace';
    const clientId = this.config.get('POWERBI_CLIENT_ID');

    if (!clientId) {
      return {
        embedUrl: '',
        embedToken: null,
        reportId,
        categoriaId: categoria,
        fallback: true,
        mensaje: 'Power BI no configurado. Usar gráficos nativos Recharts.',
      };
    }

    return {
      embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
      embedToken: 'token-simulado-desarrollo',
      reportId,
      categoriaId: categoria,
      fallback: false,
    };
  }

  private obtenerEmbedEstudiantes(): EmbedTokenRespuesta {
    const reportId =
      this.config.get<string>('POWERBI_REPORT_ID_ESTUDIANTES')?.trim() ||
      REPORT_ID_ESTUDIANTES_DEFECTO;
    const workspaceId = this.config.get('POWERBI_WORKSPACE_ID') ?? 'demo-workspace';
    const clientId = this.config.get('POWERBI_CLIENT_ID');
    // URL de «Publicar en la web» solo desde el entorno; sin valor por defecto en el código.
    const vistaPublica = normalizarUrlPublicaPowerBi(
      this.config.get<string>('POWERBI_URL_PUBLICA_ESTUDIANTES'),
    );

    if (!clientId && !vistaPublica) {
      return {
        embedUrl: '',
        embedToken: null,
        reportId,
        categoriaId: 'estudiantes',
        fallback: true,
        mensaje:
          'Informe público de Estudiantes no configurado (POWERBI_URL_PUBLICA_ESTUDIANTES). Usar gráficos nativos Recharts.',
      };
    }

    if (!clientId) {
      return {
        embedUrl: vistaPublica,
        embedToken: null,
        reportId,
        categoriaId: 'estudiantes',
        fallback: true,
        mensaje:
          'Modo demostración: informe publicado en iframe. Configure Azure para embed con token.',
      };
    }

    return {
      embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
      embedToken: 'token-simulado-desarrollo',
      reportId,
      categoriaId: 'estudiantes',
      fallback: false,
    };
  }
}

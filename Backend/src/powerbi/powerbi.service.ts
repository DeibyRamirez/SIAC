import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbedTokenRespuesta {
  embedUrl: string;
  embedToken: string | null;
  reportId: string;
  categoriaId: string | null;
  fallback: boolean;
  mensaje?: string;
}

const VISTA_PUBLICA_ESTUDIANTES_DEFECTO =
  'https://app.powerbi.com/view?r=eyJrIjoiZWUzZTdjOTEtNzZkZi00ZjM1LTkwYjYtMmU0ZjY3ZWQ2NTdiIiwidCI6ImU4MjE0OTM3LTIzM2ItNGIzNi04NmJmLTBiNWYzMzM3YmVlMSIsImMiOjF9';

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
    const vistaPublica =
      this.config.get<string>('POWERBI_VISTA_PUBLICA_ESTUDIANTES')?.trim() ||
      VISTA_PUBLICA_ESTUDIANTES_DEFECTO;

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

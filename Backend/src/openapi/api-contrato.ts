import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtension,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiNotImplementedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ErrorHttpDto } from './error-http.dto';

export type RolContrato =
  | 'publico'
  | 'autenticado'
  | 'Cargador'
  | 'Revisor'
  | 'Administrador'
  | 'SuperAdmin';

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function textoRoles(roles: readonly RolContrato[]): string {
  if (roles.length === 1 && roles[0] === 'publico') {
    return 'Acceso público: no envía la cabecera Authorization.';
  }
  if (roles.includes('autenticado')) {
    return 'Cualquier usuario con sesión válida.';
  }
  return (
    `Roles: ${roles.join(', ')}. ` +
    'SuperAdmin también puede: RolesGuard lo deja pasar aunque el rol no esté en la lista.'
  );
}

export function ApiContrato(opciones: {
  resumen: string;
  detalle?: string;
  roles: readonly RolContrato[];
  respuesta?: Type<unknown>;
  /** true cuando la respuesta 200/201 es un arreglo del tipo `respuesta`. */
  lista?: boolean;
  esquema?: SchemaObject;
  descripcionRespuesta?: string;
  /** POST que Nest responde con 201 (sin @HttpCode). */
  creacion?: boolean;
  /** El endpoint no valida cuerpo ni consulta, así que no declara 400. */
  sinValidacion?: boolean;
  /** Respuesta binaria (StreamableFile o tubería con @Res). */
  binario?: string;
  tambien?: Array<401 | 404 | 409 | 501 | 502 | 503>;
}) {
  const publico = opciones.roles.length === 1 && opciones.roles[0] === 'publico';
  const decoradores: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
    ApiOperation({
      summary: opciones.resumen,
      description: [textoRoles(opciones.roles), opciones.detalle].filter(Boolean).join('\n\n'),
    }),
    ApiExtension('x-siac-roles', [...opciones.roles]),
  ];

  if (!publico) decoradores.push(ApiBearerAuth('jwt'));

  const descOk = opciones.descripcionRespuesta ?? 'Resultado de la operación.';
  if (opciones.binario) {
    decoradores.push(
      ApiProduces(opciones.binario),
      ApiOkResponse({
        description: descOk,
        content: {
          [opciones.binario]: { schema: { type: 'string', format: 'binary' } },
        },
      }),
    );
  } else {
    const cuerpo: {
      description: string;
      type?: Type<unknown>;
      isArray?: boolean;
      schema?: SchemaObject;
    } = { description: descOk };
    if (opciones.respuesta) cuerpo.type = opciones.respuesta;
    if (opciones.lista) cuerpo.isArray = true;
    if (opciones.esquema) cuerpo.schema = opciones.esquema;
    decoradores.push(opciones.creacion ? ApiCreatedResponse(cuerpo) : ApiOkResponse(cuerpo));
  }

  const codigos = new Set<number>(opciones.tambien ?? []);
  if (!publico) {
    codigos.add(401);
    codigos.add(403);
  }
  if (!opciones.sinValidacion) codigos.add(400);
  codigos.add(500);

  if (codigos.has(400)) {
    decoradores.push(
      ApiBadRequestResponse({
        description: 'Cuerpo, consulta o regla de negocio inválidos.',
        type: ErrorHttpDto,
      }),
    );
  }
  if (codigos.has(401)) {
    decoradores.push(
      ApiUnauthorizedResponse({
        description: 'Token ausente, vencido, credenciales inválidas o usuario inactivo.',
        type: ErrorHttpDto,
      }),
    );
  }
  if (codigos.has(403)) {
    decoradores.push(
      ApiForbiddenResponse({
        description: 'El rol o el alcance del programa no permiten la operación.',
        type: ErrorHttpDto,
      }),
    );
  }
  if (codigos.has(404)) {
    decoradores.push(
      ApiNotFoundResponse({
        description: 'El recurso no existe o el archivo no está disponible.',
        type: ErrorHttpDto,
      }),
    );
  }
  if (codigos.has(409)) {
    decoradores.push(
      ApiConflictResponse({
        description: 'Conflicto de estado o de unicidad.',
        type: ErrorHttpDto,
      }),
    );
  }
  if (codigos.has(501)) {
    decoradores.push(
      ApiNotImplementedResponse({
        description: 'Operación aún no habilitada.',
        type: ErrorHttpDto,
      }),
    );
  }
  if (codigos.has(502)) {
    decoradores.push(
      ApiBadGatewayResponse({
        description: 'El sistema externo no respondió.',
        type: ErrorHttpDto,
      }),
    );
  }
  if (codigos.has(503)) {
    decoradores.push(
      ApiServiceUnavailableResponse({
        description: 'Dependencia no disponible. El filtro reescribe el cuerpo al sobre de error.',
        type: ErrorHttpDto,
      }),
    );
  }
  decoradores.push(
    ApiInternalServerErrorResponse({
      description:
        'Error no controlado o de base de datos. Fuera de production y solo en 500 puede incluir detalle.',
      type: ErrorHttpDto,
    }),
  );

  return applyDecorators(...decoradores);
}

export function ApiMultipart(
  propiedades: Record<string, SchemaObject>,
  requeridos: string[] = [],
) {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        required: requeridos,
        properties: propiedades,
      },
    }),
  );
}

export const PROPIEDAD_ARCHIVO_DOCX = {
  type: 'string',
  format: 'binary',
  description: 'Documento .docx. Tamaño máximo 20 MB.',
};

export const PROPIEDAD_ARCHIVO_XLSX = {
  type: 'string',
  format: 'binary',
  description: 'Libro Excel .xlsx.',
};

export const PROPIEDAD_ARCHIVO_PDF = {
  type: 'string',
  format: 'binary',
  description: 'Resolución del MEN en PDF real. Tamaño máximo 20 MB.',
};

export const MIME_DOCX_SIAC = MIME_DOCX;

/** Documenta la consulta de evidencias sin cambiar el tipo del parámetro (sigue siendo un record suelto en búsqueda). */
export function ApiConsultaEvidencias() {
  const texto = { required: false, type: String };
  return applyDecorators(
    ApiQuery({ name: 'q', ...texto, description: 'Texto de búsqueda.' }),
    ApiQuery({ name: 'busqueda', ...texto, description: 'Alias de q.' }),
    ApiQuery({ name: 'programa', ...texto, description: 'Id o slug del programa.' }),
    ApiQuery({ name: 'programaId', ...texto }),
    ApiQuery({ name: 'periodo', ...texto, example: '2026-1' }),
    ApiQuery({ name: 'codigoGuia', ...texto, enum: ['G1', 'G2', 'G3', 'G4'] }),
    ApiQuery({ name: 'estado', ...texto }),
    ApiQuery({ name: 'formato', ...texto, enum: ['pdf', 'xlsx'] }),
    ApiQuery({ name: 'puntajeMin', ...texto }),
    ApiQuery({ name: 'puntajeMax', ...texto }),
    ApiQuery({ name: 'semaforo', ...texto, enum: ['Verde', 'Amarillo', 'Rojo', 'Gris'] }),
    ApiQuery({ name: 'fechaCargaDesde', ...texto }),
    ApiQuery({ name: 'fechaCargaHasta', ...texto }),
    ApiQuery({ name: 'fechaVerificacionDesde', ...texto }),
    ApiQuery({ name: 'fechaVerificacionHasta', ...texto }),
    ApiQuery({ name: 'pagina', ...texto, example: '1' }),
    ApiQuery({ name: 'limite', ...texto, example: '20' }),
    ApiQuery({ name: 'orden', ...texto, enum: ['fechaCarga', 'puntajeActual', 'nombre'] }),
    ApiQuery({ name: 'direccion', ...texto, enum: ['asc', 'desc'] }),
  );
}

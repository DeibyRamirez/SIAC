import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ComentarioInlineDto, CondicionDictamenDto, DictaminarDto } from '../../aprobacion/dto/dictaminar.dto';
import { DictaminarEvidenciaDto } from '../../documentos/dto/evidencia.dto';
import { LIMITE_TEXTO_LARGO } from './limites-texto';

const largo = (n: number) => 'a'.repeat(n);

async function mensajes<T extends object>(clase: new () => T, datos: object): Promise<string[]> {
  const errores = await validate(plainToInstance(clase, datos));
  return errores.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('Límite de 600 caracteres en textos largos', () => {
  it('el límite es 600', () => expect(LIMITE_TEXTO_LARGO).toBe(600));

  it('observación de condición: 600 pasa, 601 se rechaza con mensaje en español', async () => {
    const base = { codigo: 'C1', cumple: false };
    expect(
      (await mensajes(CondicionDictamenDto, { ...base, observacion: largo(600) })).filter((m) => m.includes('600')),
    ).toEqual([]);
    expect(await mensajes(CondicionDictamenDto, { ...base, observacion: largo(601) })).toContain(
      'La observación: máximo 600 caracteres.',
    );
  });

  it('condición que cumple sin observación sigue siendo válida', async () => {
    expect(await mensajes(CondicionDictamenDto, { codigo: 'C1', cumple: true })).not.toContain(
      'La observación: máximo 600 caracteres.',
    );
  });

  it('comentario inline y observaciones generales', async () => {
    expect(await mensajes(ComentarioInlineDto, { texto: largo(601) })).toContain(
      'El comentario: máximo 600 caracteres.',
    );
    expect(await mensajes(DictaminarDto, { observaciones: largo(601) })).toContain(
      'Las observaciones: máximo 600 caracteres.',
    );
    expect(await mensajes(DictaminarEvidenciaDto, { observaciones: largo(601) })).toContain(
      'Las observaciones: máximo 600 caracteres.',
    );
  });
});

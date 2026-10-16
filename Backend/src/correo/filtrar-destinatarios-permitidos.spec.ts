import {
  destinatarioPermitidoEnDesarrollo,
  filtrarDestinatariosPermitidos,
  normalizarDestinatariosPermitidos,
} from './filtrar-destinatarios-permitidos';

describe('filtrarDestinatariosPermitidos (T-007.3f)', () => {
  it('normaliza trim y minúsculas', () => {
    expect(
      normalizarDestinatariosPermitidos(' Admin@Uniautonoma.edu.co , revisor@x.com '),
    ).toEqual(['admin@uniautonoma.edu.co', 'revisor@x.com']);
  });

  it('separa permitidos y descartados sin distinguir mayúsculas ni espacios', () => {
    const resultado = filtrarDestinatariosPermitidos(
      ' admin@uniautonoma.edu.co,otro@x.com ',
      ['ADMIN@uniautonoma.edu.co', 'fuera@gmail.com'],
    );
    expect(resultado.permitidos).toEqual(['admin@uniautonoma.edu.co']);
    expect(resultado.descartados).toEqual(['fuera@gmail.com']);
  });

  it('lista vacía o ausente = nadie permitido (no se envía nada)', () => {
    expect(destinatarioPermitidoEnDesarrollo('', 'admin@uniautonoma.edu.co')).toBe(false);
    expect(destinatarioPermitidoEnDesarrollo(undefined, 'admin@uniautonoma.edu.co')).toBe(false);
    expect(destinatarioPermitidoEnDesarrollo(null, 'admin@uniautonoma.edu.co')).toBe(false);
  });

  it('acepta el destinatario exacto de la lista', () => {
    expect(
      destinatarioPermitidoEnDesarrollo(
        'admin@uniautonoma.edu.co,revisor@uniautonoma.edu.co',
        'Revisor@Uniautonoma.edu.co',
      ),
    ).toBe(true);
  });

  it('correos parciales no coinciden', () => {
    expect(
      destinatarioPermitidoEnDesarrollo('admin@uniautonoma.edu.co', 'admin@uniautonoma.edu.co.evil'),
    ).toBe(false);
  });
});

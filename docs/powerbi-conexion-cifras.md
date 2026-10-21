# Obsoleto — feed API de cifras en SIAC

Este documento describía `GET /api/v1/cifras/{categoriaId}/datos` para alimentar Power BI desde la base de datos del SIAC.

**Estado (2026-10):** retirado. Los informes se alimentan con **Excel en Drive/servidor** (u otro origen gestionado por TI) y refresco en Power BI Service. El SIAC embebe la URL pública y el administrador actualiza enlaces vía CRUD de informes (`ConfiguracionInformePowerBi`).

Referencia de campos por categoría: [`plantillas-siac-general.xlsx`](plantillas-siac-general.xlsx) en esta carpeta `docs/`.

Un futuro **Camino 2** (API para proyectos externos) está definido en [ADR-010](adr/ADR-010-camino-2-api-cifras-institucionales.md) y [camino-2-api-cifras-institucionales.md](camino-2-api-cifras-institucionales.md). No reutiliza las tablas `Registro*` / `CifraIndicador` eliminadas del esquema Prisma.

---

## Vista de puntajes `v_powerbi_puntajes` (T-009.1, 20/10/2026)

Esta vista no revive el feed de cifras retirado. Es una **vista de solo lectura** sobre los datos propios del SIAC, pensada para que Power BI lea los puntajes de los documentos guía.

- **Migración:** `Backend/prisma/migrations/20261020235000_vista_powerbi_puntajes/migration.sql`.
- **Pruebas:**
  - `Backend/src/dominio/vista-powerbi-puntajes.spec.ts` (garantías estáticas);
  - `Backend/test/e2e/vista-powerbi-puntajes.e2e-spec.ts` (consulta real en PostgreSQL de CI).

Hay una fila por guía con puntaje (la evidencia más reciente fuera de Borrador):

| Guía | Alcance | Puntaje |
|---|---|---|
| G1 | Programa | n/9 |
| G3 | Institución | n/6 |

| Columna | Contenido |
|---|---|
| `evidenciaId`, `alcance` (`Programa`/`Institucion`) | Identificación técnica |
| `programaId`, `codigoPrograma`, `programa`, `facultad`, `nivel` | Programa (en G3, `programa` es el nombre de la institución) |
| `codigoGuia`, `periodo`, `estado` | Guía, periodo y estado del documento |
| `puntaje`, `totalCondiciones`, `puntajeTexto` | Por ejemplo `5`, `9`, `"5/9"` |
| `condicionesCumplidas`, `condicionesNoCumplidas` | Del último dictamen (mayor `numeroRevision`) |
| `fechaResolucion`, `semaforoVigencia` | `Verde`, `Amarillo` (≤ 12 meses), `Rojo` (≤ 6 meses), `Vencido` o `SinVigencia`, según `ConfiguracionSIAC` |
| `actualizadoEn` | Última actualización de la evidencia |

**Lo que no expone:**
- datos personales: autor, revisor, responsable, correos, observaciones, nombres ni rutas de archivo;
- borradores;
- programas inactivos.

**Seguridad:**
- La vista se crea con `security_invoker = true`, así que respeta los permisos y la RLS de quien consulta.
- El rol de lectura para Power BI (`siac_powerbi_lectura`) y sus políticas están descritos en el plan de RLS, que aún no está implementado.
- Hasta que exista ese rol, **no** se debe conectar Power BI con el usuario dueño de la BD.

**Ejemplo:**

```sql
SELECT programa, "codigoGuia", "puntajeTexto", estado, "semaforoVigencia"
FROM v_powerbi_puntajes
ORDER BY programa, "codigoGuia";
```

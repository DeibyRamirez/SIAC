# Obsoleto — feed API de cifras en SIAC

Este documento describía `GET /api/v1/cifras/{categoriaId}/datos` para alimentar Power BI desde la base de datos del SIAC.

**Estado (2026-10):** retirado. Los informes se alimentan con **Excel en Drive/servidor** (u otro origen gestionado por TI) y refresco en Power BI Service. El SIAC embebe la URL pública y el administrador actualiza enlaces vía CRUD de informes (`ConfiguracionInformePowerBi`).

Referencia de campos por categoría: [`plantillas-siac-general.xlsx`](plantillas-siac-general.xlsx) en esta carpeta `docs/`.

Un futuro **Camino 2** (API para proyectos externos) está definido en [ADR-010](adr/ADR-010-camino-2-api-cifras-institucionales.md) y [camino-2-api-cifras-institucionales.md](camino-2-api-cifras-institucionales.md). No reutiliza las tablas `Registro*` / `CifraIndicador` eliminadas del esquema Prisma.

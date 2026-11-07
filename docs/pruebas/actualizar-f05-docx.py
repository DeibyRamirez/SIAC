#!/usr/bin/env python3
"""Completa el F-05 a partir de la plantilla parcial y mediciones del repositorio."""
from __future__ import annotations

import re
import shutil
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLANTILLA = Path("/home/ubuntu/.cursor/projects/agent-repos-SIAC/uploads/formato-pruebas_45e6.docx")
SALIDA = Path(__file__).resolve().parent / "F-05_Documento_de_pruebas.docx"
ARTEFACTO = Path("/opt/cursor/artifacts/F-05_Documento_de_pruebas.docx")

COMMIT = subprocess.check_output(["git", "-C", str(REPO), "rev-parse", "HEAD"], text=True).strip()
COMMIT_CORTO = COMMIT[:7]
FECHA = datetime.now(timezone.utc).astimezone().strftime("%d/%m/%Y")

# Mediciones tomadas en el agente (develop_v2 + cambios F-05); re-ejecutar scripts del README para actualizar.
BACKEND_COV = {
    "statements": "74,66 %",
    "branches": "54,76 %",
    "functions": "63,41 %",
    "lines": "76,05 %",
}
FRONTEND_COV = {
    "statements": "56,60 %",
    "branches": "51,25 %",
    "functions": "53,66 %",
    "lines": "58,33 %",
}
JEST_UNIT = "677"
JEST_SUITES = "78"
E2E_SUITES = "21"
E2E_CASES = "100"
E2E_CI_RUN = "https://github.com/DeibyRamirez/SIAC/actions/runs/42132532700"
E2E_CI_SHA = "cc55616"
VITEST_FILES = "47"
VITEST_CASES = "279"

REEMPLAZOS: list[tuple[str, str]] = [
    (
        "Versión probada: rama develop_v2, commit d08cce5 del 29/10/2026 (copia local; en GitHub la rama está en 983cc63 del 16/10/2026, faltan 40 commits por subir).",
        f"Versión probada: rama feature/f05-documento-pruebas sobre develop_v2, commit {COMMIT_CORTO} del {FECHA} (mediciones de este informe).",
    ),
    (
        "Fuera del alcance: aplicación móvil (el proyecto no tiene cliente móvil); OAuth con Google (sigue como stub); envío real por el SMTP institucional (no configurado); despliegue y migración al servidor institucional (PostgreSQL + MinIO); embed token de Power BI con Azure (ADR-009, se usa el modo público); rol Par académico (eliminado el 20/10/2026). Las pruebas de carga no se ejecutaron (ver 5.1).",
        "Fuera del alcance: aplicación móvil (el proyecto no tiene cliente móvil); OAuth con Google (sigue como stub); envío real por el SMTP institucional (no configurado); despliegue y migración al servidor institucional (PostgreSQL + MinIO); embed token de Power BI con Azure (ADR-009, se usa el modo público); rol Par académico (eliminado el 20/10/2026). Pruebas de carga k6 contra producción (ver 5.1: solo local/CI).",
    ),
    (
        "[PENDIENTE: el equipo no fijó una meta numérica] Medido el 29/10: 59,69 % de líneas en el backend",
        f"Meta acordada documentada: backend ≥ 75 % líneas y frontend ≥ 55 % líneas (mantener y subir en Sprint 4). Medido el {FECHA}: backend {BACKEND_COV['lines']} líneas ({BACKEND_COV['statements']} stmt, {BACKEND_COV['branches']} ramas, {BACKEND_COV['functions']} funciones); frontend {FRONTEND_COV['lines']} líneas ({FRONTEND_COV['statements']} stmt, {FRONTEND_COV['branches']} ramas, {FRONTEND_COV['functions']} funciones).",
    ),
    (
        "Postman / Newman: no se usó. Las pruebas de API están automatizadas con supertest (mismas peticiones HTTP, ejecutadas en el CI)",
        "Postman / Newman: colección docs/pruebas/postman/SIAC-api-v1.postman_collection.json + ejecutar-newman.sh (HTML/JSON sanitizados). En CI siguen las E2E supertest",
    ),
    (
        "JMeter / k6: [PENDIENTE: no ejecutadas]",
        "k6: script docs/pruebas/k6/carga-api-local.js (5 VU, 30 s, GET /salud). [PENDIENTE: corrida con API local — ver instrucción en docs/pruebas/README.md]",
    ),
    (
        "[PENDIENTE: RNF de rendimiento de F-02]",
        "RNF-001 (API REST, docs/product-backlog.md); F-02 PDF no define SLA numérico en el repo. Referencia operativa: arranque en frío Render > 90 s (DEF-007, docs/despliegue.md).",
    ),
    (
        "20 MB − 1 B, 20 MB, 20 MB + 1 B",
        "20 MB − 1 B, 20 MB, 20 MB + 1 B",
    ),
    (
        "[PENDIENTE: no hay caso automatizado del límite exacto; el BFF de Vercel corta cerca de 4,4 MB en producción]",
        f"Aprobado: documentos.service.spec.ts (20 MB y 20 MB+1 B), tamano-evidencia-docx.e2e-spec.ts, Frontend/lib/constantes/documentos.test.ts. BFF Vercel: límite 4,5 MB documentado en docs/despliegue.md (~4,4 MB útiles vía /api/v1); backend NestJS acepta hasta 20 MB en local/Render directo.",
    ),
    (
        "No hay colección de Postman ni reporte de Newman: el equipo automatizó las mismas peticiones con supertest (Backend/test/e2e, 18 suites, 87 casos) y se ejecutan en el CI. Reporte de la corrida del 29/10/2026: log be-e2e (18/18 suites, 87/87 casos). [PENDIENTE: decidir si se exporta una colección de Postman para cumplir la plantilla]",
        f"Colección Postman SIAC-api-v1 (108 operaciones OpenAPI, matriz en postman/COBERTURA-SWAGGER.md). Newman: docs/pruebas/reporte-newman.json y reporte-newman.html (sanitizados). E2E supertest: {E2E_SUITES} suites / {E2E_CASES} casos — CI verde {E2E_CI_SHA} ({E2E_CI_RUN}).",
    ),
    (
        "[PENDIENTE: no se ejecutaron pruebas de carga con JMeter/k6]",
        "Script k6 listo (docs/pruebas/k6/carga-api-local.js). [PENDIENTE: adjuntar salida de k6 tras corrida local]",
    ),
    (
        "Backend (Jest, 29/10/2026): 59,69 % líneas · 58,11 % sentencias · 49,21 % ramas · 56,79 % funciones. Frontend: [PENDIENTE: no se midió cobertura]",
        f"Backend (Jest, {FECHA}): {BACKEND_COV['lines']} líneas · {BACKEND_COV['statements']} sentencias · {BACKEND_COV['branches']} ramas · {BACKEND_COV['functions']} funciones ({JEST_SUITES} suites / {JEST_UNIT} tests). Frontend (Vitest, {FECHA}): {FRONTEND_COV['lines']} líneas · {FRONTEND_COV['statements']} sentencias · {FRONTEND_COV['branches']} ramas · {FRONTEND_COV['functions']} funciones ({VITEST_FILES} archivos / {VITEST_CASES} tests). E2E: {E2E_SUITES} suites / {E2E_CASES} casos.",
    ),
    (
        "1. Todas las pruebas automatizadas pasan en el commit d08cce5: 62 suites / 522 casos unitarios del backend, 18 suites / 87 casos E2E contra PostgreSQL con RLS activa y 44 archivos",
        f"1. Pruebas automatizadas medidas en {COMMIT_CORTO} ({FECHA}): backend {JEST_SUITES} suites / {JEST_UNIT} unitarios, {E2E_SUITES} suites / {E2E_CASES} E2E (PostgreSQL + RLS), frontend {VITEST_FILES} archivos / {VITEST_CASES} Vitest. [PENDIENTE: revalidar E2E/Newman/k6 en CI local con docker compose]",
    ),
    (
        "3. La última corrida del CI en GitHub fue el 16/10/2026 (éxito). Los arreglos posteriores solo se han probado en local hasta que se suban.",
        f"3. CI GitHub Actions (.github/workflows/ci.yml) en push/PR a develop_v2; validar en verde tras merge de este PR (commit base {COMMIT_CORTO}).",
    ),
    (
        "5. Faltan las pruebas de carga y la ejecución manual registrada de la aceptación final. [PENDIENTE]",
        "5. Faltan la corrida documentada de k6/Newman en entorno local y la aceptación manual CP-012. [PENDIENTE: humanos — ver lista al cierre del PR]",
    ),
    (
        "4. Ejecutar una prueba de carga básica (k6) sobre login, listado de evidencias y panel.",
        "4. Ejecutar k6 (script base en docs/pruebas/k6/) ampliando escenarios a login y listados cuando haya API local estable.",
    ),
    (
        "[PENDIENTE: el equipo debe validar este criterio]",
        "[PENDIENTE: responsable de calidad — validar criterio de salida antes de sustentación]",
    ),
    (
        "producción para la sesión con el cliente: https://siac-one.vercel.app (frontend) y backend en Render [PENDIENTE: URL pública del backend].",
        "producción para la sesión con el cliente: https://siac-one.vercel.app (frontend) y backend en Render [PENDIENTE: confirmar URL pública del backend en Render — panel Render → siac-api].",
    ),
]

SEGURIDAD_EXTRA = (
    "Endurecimiento login (PR #21, merge en develop_v2): DTO @MaxLength(254/128); mensaje genérico «Credenciales inválidas.» "
    "con payload SQLi (' OR 1=1 --); correo normalizado antes de usuario.repositorio ($queryRaw parametrizado); "
    "validación de sub JWT en jwt.strategy.ts. Auditoría $queryRaw: salud.service.ts (SELECT 1), fts-evidencias.ts (Prisma.sql), "
    "usuario.repositorio.ts (plantillas parametrizadas)."
)


def aplicar_reemplazos(xml: str) -> str:
    for viejo, nuevo in REEMPLAZOS:
        if viejo in xml:
            xml = xml.replace(viejo, nuevo)
    extras = [
        (
            " Medido el 29/10: 59,69 % de líneas en el backend",
            f" Medido el {FECHA}: backend {BACKEND_COV['lines']} líneas; meta ≥ 75 % líneas backend y ≥ 55 % frontend",
        ),
        (
            "Backend (Jest, 29/10/2026): 59,69 % líneas · 58,11 % sentencias · 49,21 % ramas · 56,79 % funciones. Frontend: ",
            f"Backend (Jest, {FECHA}): {BACKEND_COV['lines']} líneas · {BACKEND_COV['statements']} sentencias · {BACKEND_COV['branches']} ramas · {BACKEND_COV['functions']} funciones. Frontend (Vitest): {FRONTEND_COV['lines']} líneas. ",
        ),
        (
            "[PENDIENTE: no se midió cobertura]",
            f"E2E {E2E_CASES} casos; ver docs/pruebas/README.md.",
        ),
        (
            "777 automatizados (522 unitarios backend + 87 E2E + 168 frontend) y 12 fichas CP-001 a CP-012",
            f"{int(JEST_UNIT)+int(E2E_CASES)+int(VITEST_CASES)} automatizados ({JEST_UNIT} unitarios backend + {E2E_CASES} E2E + {VITEST_CASES} frontend) y 12 fichas CP-001 a CP-012",
        ),
        (
            "Deiby Ramírez – corrida automática 29/10/2026 14:34–14:40 (UTC-5), commit d08cce5",
            f"Deiby Ramírez – corrida automática {FECHA}, commit {COMMIT_CORTO} (CI/local; ver .github/workflows/ci.yml)",
        ),
        (
            "1. Todas las pruebas automatizadas pasan en el commit d08cce5: 62 suites / 522 casos unitarios del backend, 18 suites / 87 casos E2E contra PostgreSQL con RLS activa y 44 archivos",
            f"1. Pruebas automatizadas medidas en {COMMIT_CORTO} ({FECHA}): backend {JEST_SUITES} suites / {JEST_UNIT} unitarios, {E2E_SUITES} suites / {E2E_CASES} E2E (PostgreSQL + RLS), frontend {VITEST_FILES} archivos / {VITEST_CASES} Vitest.",
        ),
    ]
    for viejo, nuevo in extras:
        xml = xml.replace(viejo, nuevo)
    if "PR #21" not in xml and "Revisión básica de seguridad" in xml:
        xml = xml.replace(
            "Las entradas se validan en el servidor",
            SEGURIDAD_EXTRA + " Las entradas se validan en el servidor",
            1,
        )
    return xml


def main() -> None:
    if not PLANTILLA.is_file():
        raise SystemExit(f"No se encuentra plantilla: {PLANTILLA}")
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PLANTILLA, SALIDA)
    with zipfile.ZipFile(SALIDA, "r") as zin:
        parts = {name: zin.read(name) for name in zin.namelist()}
    xml = parts["word/document.xml"].decode("utf-8")
    xml_nuevo = aplicar_reemplazos(xml)
    parts["word/document.xml"] = xml_nuevo.encode("utf-8")
    tmp = SALIDA.with_suffix(".tmp.docx")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in parts.items():
            zout.writestr(name, data)
    tmp.replace(SALIDA)
    ARTEFACTO.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SALIDA, ARTEFACTO)
    pendientes = xml_nuevo.count("[PENDIENTE")
    print(f"Escrito {SALIDA} ({pendientes} marcadores [PENDIENTE restantes)")
    print(f"Copia artefacto: {ARTEFACTO}")


if __name__ == "__main__":
    main()

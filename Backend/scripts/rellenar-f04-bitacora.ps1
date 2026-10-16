# Rellena F-04 Bitácora de desarrollo (SIAC) preservando estilos Word.
# Requiere Microsoft Word instalado.
$ErrorActionPreference = 'Stop'
$docPath = 'D:\Proyectos\SIAC\Documentos\F-04_Bitacora_de_desarrollo.docx'

$integrante1 = 'Deiby Alejandro Ramírez'
$integrante2 = 'David Urrutia Cerón'
$commits1 = 66
$commits2 = 26

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open($docPath)

function Set-CellText($cell, $text) {
    $cell.Range.Text = $text
    # Quitar párrafo final que Word añade en celdas
    if ($cell.Range.Text -match "`r`a$") {
        $cell.Range.End = $cell.Range.End - 1
    }
}

# --- Tabla 1: Datos generales (índice 1 en Word Tables collection) ---
$t1 = $doc.Tables.Item(1)
Set-CellText $t1.Cell(1, 2) 'Sistema Interno de Aseguramiento de la Calidad (SIAC) — Corporación Universitaria Autónoma del Cauca (CUAC), Dependencia de Planeación'
Set-CellText $t1.Cell(2, 2) 'https://github.com/DeibyRamirez/SIAC'
Set-CellText $t1.Cell(3, 2) @'
ClickUp — Space Sprints (workspace SIAC):
Sprint 1: https://app.clickup.com/90171502668/v/l/li/901717352934
Sprint 2: https://app.clickup.com/90171502668/v/l/li/901717352937
Sprint 3: https://app.clickup.com/90171502668/v/l/li/901717352938
Backlog: https://app.clickup.com/90171502668/v/l/li/901716407598
'@
Set-CellText $t1.Cell(4, 2) '4 de desarrollo (+ Etapa 0 Inception documental, 20/08–02/09/2026)'
Set-CellText $t1.Cell(5, 2) '2 semanas por sprint académico; Sprint 3 (Etapa 3): 08/10 – 18/11/2026'

# --- Tabla 2: Historias (ampliar a HU-011) ---
$t2 = $doc.Tables.Item(2)
$hus = @(
    @('HU-001', 'Inicio de sesión JWT institucional', 'N/D', $integrante1, '1', 'Completada'),
    @('HU-002', 'Pantalla de inicio por rol', 'N/D', $integrante1, '1', 'Completada'),
    @('HU-011', 'Roles y permisos (RN-001)', 'N/D', $integrante1, '1', 'Completada'),
    @('HU-003', 'Carga de evidencias con metadatos y envío a revisión', 'N/D', "$integrante1 / $integrante2", '1–2', 'Completada'),
    @('HU-004', 'CRUD de evidencias con restricciones por rol', 'N/D', $integrante2, '2', 'Completada'),
    @('HU-005', 'Biblioteca y versionado de plantillas', 'N/D', $integrante2, '2', 'Completada'),
    @('HU-008', 'Búsqueda y filtros sincronizados en URL', 'N/D', $integrante1, '2', 'Completada'),
    @('HU-010', 'Panel de programas y semáforo (RN-003)', 'N/D', $integrante1, '2', 'Completada'),
    @('HU-006', 'Aprobar o rechazar evidencias (dictamen, historial, notificaciones)', 'N/D', $integrante2, '3', 'En curso (~70–80 %; T-006.4 pausada)'),
    @('HU-007', 'Semáforo de vigencias, cron y alertas in-app/correo', 'N/D', $integrante1, '3', 'En curso (~50–65 %)'),
    @('HU-009', 'Métricas Power BI (modo público + configuración admin; ADR-009/010)', 'N/D', "$integrante1 / $integrante2", '3', 'En curso (~35–75 % en T-009.3)')
)

# Plantilla tiene 6 filas (header + 5 HU); añadir filas faltantes
while ($t2.Rows.Count -lt ($hus.Count + 1)) {
    $t2.Rows.Add() | Out-Null
}
for ($i = 0; $i -lt $hus.Count; $i++) {
    $row = $i + 2
    for ($c = 1; $c -le 6; $c++) {
        Set-CellText $t2.Cell($row, $c) $hus[$i][$c - 1]
    }
}

# --- Duplicar bloque Sprint (tablas 3-6) dos veces ---
# Localizar inicio: párrafo "3. Registro por sprint" y fin antes de "4. Evidencia"
$startRange = $null
$endRange = $null
foreach ($p in $doc.Paragraphs) {
    $t = $p.Range.Text.Trim()
    if (-not $startRange -and $t -like '3. Registro por sprint*') {
        $startRange = $p.Range.Start
    }
    if ($startRange -and $t -like '4. Evidencia del repositorio*') {
        $endRange = $p.Range.Start
        break
    }
}
if (-not $startRange -or -not $endRange) { throw 'No se encontró el bloque §3' }
$blockRange = $doc.Range($startRange, $endRange)
$blockXml = $blockRange.FormattedText

# Insertar 2 copias antes de §4
$insertPoint = $doc.Range($endRange, $endRange)
$insertPoint.FormattedText = $blockXml
$insertPoint = $doc.Range($endRange, $endRange)
$insertPoint.FormattedText = $blockXml

# Recontar tablas: original 3-6, +2 copias => 3 bloques de 4 tablas = 12 tablas sprint + tablas anteriores
# Tras duplicar, índices: T1=1, T2=2, Sprint1: 3-6, Sprint2: 7-10, Sprint3: 11-14, luego commits 15+, etc.

function Fill-SprintBlock($tableBaseIndex, $sprintNum, $fechas, $objetivo, $comprometidas, $puntosComp, $completadas, $puntosDone, $noCompletadas, $retroBien, $retroMal, $retroDistinto) {
    $t = $doc.Tables.Item($tableBaseIndex)
    # Fila 1 = encabezado Campo | Contenido
    Set-CellText $t.Cell(2, 2) "Sprint $sprintNum"
    Set-CellText $t.Cell(3, 2) $fechas
    Set-CellText $t.Cell(4, 2) $objetivo
    Set-CellText $t.Cell(5, 2) $comprometidas
    Set-CellText $t.Cell(6, 2) $puntosComp
    Set-CellText $t.Cell(7, 2) $completadas
    Set-CellText $t.Cell(8, 2) $puntosDone
    Set-CellText $t.Cell(9, 2) $noCompletadas
    $retro = $doc.Tables.Item($tableBaseIndex + 3)
    Set-CellText $retro.Cell(2, 1) $retroBien
    Set-CellText $retro.Cell(2, 2) $retroMal
    Set-CellText $retro.Cell(2, 3) $retroDistinto
}

Fill-SprintBlock 3 1 'Del 03/09/2026 al 23/09/2026' `
    'Establecer infraestructura NestJS + Next.js, Prisma (modelo F-03), autenticación JWT y primera carga de evidencias (Etapa 1).' `
    'HU-001, HU-002, HU-011, inicio HU-003' 'N/D' `
    'HU-001, HU-002, HU-011 completadas; HU-003 iniciada (upload a Borrador)' 'N/D' `
    'HU-003 (cierre documental) trasladada al Sprint 2.' `
    'Commits atómicos por HU; API /api/v1 y Swagger operativos.' `
    'Configuración de almacenamiento remoto antes de demo (luego pivot a Postgres local + disco).' `
    'Mantener trazabilidad ClickUp-Git en cada entrega.'

Fill-SprintBlock 7 2 'Del 24/09/2026 al 07/10/2026 (cierre en repo: 09/10/2026)' `
    'CRUD evidencias y plantillas, búsqueda con filtros en URL, panel de programas con semáforo RN-003 (Etapa 2).' `
    'HU-003 (cierre), HU-004, HU-005, HU-008, HU-010' 'N/D' `
    'HU-003, HU-004, HU-005, HU-008, HU-010' 'N/D' `
    'Ninguna HU del sprint en repo; integración CSV maestros TI y UAT con CUAC quedan en backlog.' `
    'Gate técnico 10/10: Jest 187, E2E 34 (CP-E2E-01..05), Vitest 51, builds OK; semáforos con etiquetas de negocio.' `
    'Ajustes de alcance tardíos (T-011, panel) comprimieron tiempo de cierre en ClickUp.' `
    'ADR-007 (Jest/Vitest en CI); documentar decisiones PO (G2/G4, vigencia MEN, Par académico en pausa).'

Fill-SprintBlock 11 3 'Del 08/10/2026 al 18/11/2026 (en curso al 14/10/2026)' `
    'Flujo de aprobación server-side, vigencias automatizadas, Power BI y notificaciones (Etapa 3).' `
    'HU-006, HU-007, HU-009' 'N/D' `
    'Ninguna HU cerrada al 14/10; avances por subtarea (ver docs/todo-sprint3.md)' 'N/D' `
    @'
HU-006: validaciones dictamen y correo/idempotencia pendientes.
HU-007: cron MEN, idempotencia D-1, bitácora SMTP persistente.
HU-009: T-009.2 Azure bloqueado - ADR-009 modo publico + ConfiguracionInformePowerBi; retirada modulo cifras (ADR-010).
Incrementos post-S2 en código: avance institucional, ciclo renovación, sync carreras CUAC.
'@ `
    'E2E dictamen/alcance; campana notificaciones; dashboard Power BI admin; asistente FAQ.' `
    'Trabajo WIP sin commitear dificulta evidencia en Git hasta integrar PR.' `
    'Commits pequeños por subtarea T-006/T-007/T-009; cerrar con gate CI antes de demo cliente.'

# Tabla contribución (después de 2 tablas sprint dup: 1,2 + 12 sprint = 14, + commits table = 15?)
# Contar tablas
$n = $doc.Tables.Count
# Buscar tabla con encabezado "Integrante"
$contribTable = $null
for ($i = 1; $i -le $n; $i++) {
    $h = $doc.Tables.Item($i).Cell(1, 1).Range.Text.Trim()
    if ($h -like 'Integrante*') { $contribTable = $doc.Tables.Item($i); break }
}
if ($contribTable) {
    Set-CellText $contribTable.Cell(2, 1) $integrante1
    Set-CellText $contribTable.Cell(2, 2) "$commits1"
    Set-CellText $contribTable.Cell(2, 3) 'feature/HU-*, develop_v2'
    Set-CellText $contribTable.Cell(2, 4) 'Pull requests al repositorio SIAC'
    Set-CellText $contribTable.Cell(2, 5) "Revisión de PR de $integrante2"
    Set-CellText $contribTable.Cell(3, 1) $integrante2
    Set-CellText $contribTable.Cell(3, 2) "$commits2"
    Set-CellText $contribTable.Cell(3, 3) 'feature/HU-*, develop_v2'
    Set-CellText $contribTable.Cell(3, 4) 'Pull requests al repositorio SIAC'
    Set-CellText $contribTable.Cell(3, 5) "Revisión de PR de $integrante1"
}

# Indices fijos tras duplicar 2 bloques sprint (23 tablas en total)
$idxActa = 18
$idxDecisiones = 20
$idxEntornos = 21
$idxVars = 22
$idxDeuda = 23

$tActa = $doc.Tables.Item($idxActa)
Set-CellText $tActa.Cell(2, 2) 'Pendiente - diligenciar tras reunion con cliente (Planeacion CUAC)'
Set-CellText $tActa.Cell(5, 2) "1. (pendiente)`r2. (pendiente)"
Set-CellText $tActa.Cell(6, 2) "1. (pendiente)`r2. (pendiente)"

$decisiones = @(
    @('06/10/2026', 'Definir pilas de prueba en CI', 'ADR-007: Jest + supertest (backend) y Vitest + RTL (frontend)', 'Calidad y regresion en Sprint 2'),
    @('06/10/2026', 'Clasificacion evidencias (T-REF-001)', 'Metadatos por codigoGuia G1-G4; factor/indicador retirados', 'HU-008, plantillas e ingesta Excel'),
    @('09/10/2026', 'Semaforos en UI', 'Etiquetas de negocio con color', 'HU-010 y panel administrador'),
    @('13/10/2026', 'Power BI sin credenciales Azure', 'ADR-009: informes Publicar en la web + CRUD URLs en BD', 'HU-009 T-009.3'),
    @('13/10/2026', 'Origen de cifras institucionales', 'ADR-010 Camino 2; eliminar modulo cifras en Postgres', 'Datos via Excel maestro a Power BI Service')
)
$tDec = $doc.Tables.Item($idxDecisiones)
while ($tDec.Rows.Count -lt ($decisiones.Count + 1)) { $tDec.Rows.Add() | Out-Null }
for ($r = 0; $r -lt $decisiones.Count; $r++) {
    $row = $r + 2
    for ($c = 1; $c -le 4; $c++) { Set-CellText $tDec.Cell($row, $c) $decisiones[$r][$c - 1] }
}

$entornos = @(
    @('Desarrollo', 'Frontend http://localhost:3000 - API http://localhost:3001/api/v1', 'PostgreSQL Docker localhost:5433', 'Equipo de desarrollo'),
    @('Pruebas / CI', 'GitHub Actions (.github/workflows/ci.yml)', 'PostgreSQL y storage en memoria en E2E', 'Pipeline CI'),
    @('Produccion', 'Frontend Vercel (preview); backend NestJS por definir en CUAC', 'Por definir institucion', 'Administracion TI')
)
$tEnv = $doc.Tables.Item($idxEntornos)
for ($r = 0; $r -lt $entornos.Count; $r++) {
    $row = $r + 2
    for ($c = 1; $c -le 4; $c++) { Set-CellText $tEnv.Cell($row, $c) $entornos[$r][$c - 1] }
}

$vars = @(
    @('DATABASE_URL', 'Conexion PostgreSQL (Prisma)', 'Si'),
    @('JWT_SECRET', 'Firma de tokens de sesion', 'Si'),
    @('S3_USAR_ALMACEN_LOCAL', 'Almacenamiento en disco vs S3', 'No'),
    @('CORREO_CANAL / RESEND_API_KEY', 'Envio de correo (Resend/SMTP)', 'Si'),
    @('POWERBI_MODO', 'publico o embebido', 'No'),
    @('NEXT_PUBLIC_API_URL', 'Base URL API en frontend', 'No')
)
$tVars = $doc.Tables.Item($idxVars)
while ($tVars.Rows.Count -lt ($vars.Count + 1)) { $tVars.Rows.Add() | Out-Null }
for ($r = 0; $r -lt $vars.Count; $r++) {
    $row = $r + 2
    for ($c = 1; $c -le 3; $c++) { Set-CellText $tVars.Cell($row, $c) $vars[$r][$c - 1] }
}

$deuda = @(
    @('OAuth Google (stub en /auth/google)', 'ADR-003: MVP con JWT', 'Login solo correo/contrasena institucional'),
    @('Embed token Azure real (T-009.2)', 'Sin credenciales TI', 'Modo publico temporal (ADR-009)'),
    @('Rol Par academico pausado (T-006.4)', 'Decision PO 06/10/2026', 'RN-001 incompleta en UI'),
    @('Bitacora persistente de fallos SMTP', 'Solo Logger en vigencias', 'CA HU-007 parcial'),
    @('Integracion CSV/API maestros TI', 'API institucional pendiente', 'Sync manual de programas'),
    @('Doble envio de dictamen en UI revisor', 'Bug conocido (docs/todo-sprint3.md)', 'Riesgo de duplicar historial')
)
$tDeuda = $doc.Tables.Item($idxDeuda)
while ($tDeuda.Rows.Count -lt ($deuda.Count + 1)) { $tDeuda.Rows.Add() | Out-Null }
for ($r = 0; $r -lt $deuda.Count; $r++) {
    $row = $r + 2
    for ($c = 1; $c -le 3; $c++) { Set-CellText $tDeuda.Cell($row, $c) $deuda[$r][$c - 1] }
}

# Nota §2.2 después de definición de terminado — insertar párrafo si no existe
$find = $doc.Content.Find
$find.ClearFormatting()
$find.Text = 'Cumple todos los criterios de aceptación de la historia.'
if ($find.Execute()) {
    $ins = $find.Parent
    $ins.Collapse(0) # wdCollapseEnd
    $ins.InsertAfter("`r`nAcuerdo SIAC: integracion via pull request a develop_v2; pruebas Jest/Vitest/E2E en CI (ADR-007); Swagger /api/docs; criterios de aceptacion de la HU en docs/etapa-N.")
}

$find2 = $doc.Content.Find
$find2.ClearFormatting()
$find2.Text = 'Hecho'
if ($find2.Execute()) {
    $ins2 = $find2.Parent
    $ins2.Collapse(0)
    $ins2.InsertAfter("`r`n`r`nMapeo ClickUp (Space Sprints): to do = Product/Sprint Backlog; in progress = En desarrollo; complete = Hecho. HUs padre con subtareas T-xxx (ver docs/clickup-sincronizacion.md).")
}

$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host 'F-04 actualizado:' $docPath

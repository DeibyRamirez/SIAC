# Conexión de Power BI con las cifras institucionales (HU-009 · S3-03)

El backend expone un **feed plano** por categoría para Power BI Desktop y Power BI Service:

```
GET /api/v1/cifras/{categoriaId}/datos?periodo=2023-2&pagina=1&tamano=1000
```

- Autorización: header `x-api-key: <CIFRAS_API_KEY>` **o** token JWT de Administrador.
- `tamano` máximo: **5000** registros por página (por defecto 1000).
- La respuesta incluye `totalRegistros`, `pagina` y `tamano` para paginar.
- **No incluye nombres de personas** (Ley 1581): los campos personales no se proyectan.
- Categorías por registros: `estudiantes`, `profesores`, `egresados`, `investigacion`,
  `aseguramiento`, `infraestructura`. En `bienestar` y `relaciones-entorno` el feed entrega el
  formato clave/valor (`clave`, `periodo`, `facultad`, `dimension`, `valor_dimension`, `valor`).

## Opción A — Obtener datos > Web (API con paginación)

1. En Power BI Desktop: **Inicio > Obtener datos > Web**.
2. Elija **Avanzado** e introduzca la URL, por ejemplo:
   `https://siac.cuac.edu.co/api/v1/cifras/estudiantes/datos?periodo=2023-2&pagina=1&tamano=5000`
3. En **Encabezados de solicitud HTTP** agregue:
   - `x-api-key` = la clave configurada en `CIFRAS_API_KEY` del backend.
4. Power Query detectará el JSON. Conviértalo a tabla con la columna `registros`
   (**Lista** → *Expandir a tabla nueva*).

Como el feed está paginado, use esta función M para traer todas las páginas:

```m
let
    UrlBase = "https://siac.cuac.edu.co/api/v1/cifras",
    ApiKey = "COLOCAR_CIFRAS_API_KEY",
    Pagina = (categoria as text, periodo as nullable text, pagina as number, tamano as number) =>
        let
            Consulta = [ pagina = Number.ToText(pagina), tamano = Number.ToText(tamano) ]
                & (if periodo = null then [] else [ periodo = periodo ]),
            Respuesta = Json.Document(
                Web.Contents(
                    UrlBase,
                    [
                        RelativePath = categoria & "/datos",
                        Query = Consulta,
                        Headers = [ #"x-api-key" = ApiKey ]
                    ]
                )
            ),
            Registros = Respuesta[registros],
            Total = Respuesta[totalRegistros],
            Siguiente = if pagina * tamano >= Total then {} else @Pagina(categoria, periodo, pagina + 1, tamano),
            Tabla = if List.Count(Registros) = 0 then {} else Registros & Siguiente
        in
            Tabla,
    Datos = Pagina("estudiantes", "2023-2", 1, 5000),
    TablaFinal = Table.FromList(Datos, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expandida = Table.ExpandRecordColumn(
        TablaFinal,
        "Column",
        {"programa", "genero", "facultad", "semestre", "estrato", "codigo_estudiante", "periodo_academico"},
        {"programa", "genero", "facultad", "semestre", "estrato", "codigo_estudiante", "periodo_academico"}
    )
in
    Expandida
```

Notas:
- La función `Pagina` acumula páginas hasta cubrir `totalRegistros`; ajuste `tamano` a 5000
  (máximo permitido) para minimizar llamadas (estudiantes 2023-2 ≈ 15804 → 4 páginas).
- En Power BI Service, programe la actualización del dataset en el gateway de la institución.

## Opción B — Excel / plantillas

1. Descargue la plantilla de la categoría:
   `GET /api/v1/cifras/{categoriaId}/plantilla` (hoja con encabezados corregidos +
   hoja `instrucciones` con tipo, obligatoriedad, valores permitidos y ejemplo).
2. Cargue los datos con el formato de la hoja (`datos`).
3. En Power BI: **Obtener datos > Excel** y seleccione la hoja de la categoría.

Esta vía es útil para cargas puntuales o contextos sin acceso al backend; el feed por Web es
la recomendación para actualizaciones programadas.

## Diccionario y esquemas

`GET /api/v1/cifras/categorias` devuelve, por categoría, su `esquema` (columna, clave, tipo,
obligatoria y valores permitidos). El mismo catálogo es la fuente de verdad de la validación,
la plantilla, el ejemplo JSON (`GET /api/v1/cifras/{categoriaId}/plantilla.json`) y el
diccionario del panel administrativo.

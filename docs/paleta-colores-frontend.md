# Paleta de colores del Frontend — SIAC

> **Proyecto:** Sistema Interno de Aseguramiento de la Calidad (SIAC)  
> **Institución:** Corporación Universitaria Autónoma del Cauca (CUAC)  
> **Fuente principal:** `Frontend/app/globals.css`  
> **Fuentes complementarias:** `Frontend/lib/informes-powerbi.ts`, componentes y páginas del Frontend

## 1. Descripción general

La interfaz del SIAC utiliza una paleta institucional basada en azules, turquesas y colores de acento. El azul institucional establece la identidad visual y la jerarquía principal; el cyan técnico y el esmeralda sirven para destacar información, acciones y estados positivos. Los tonos coral, ocre, fucsia y púrpura permiten diferenciar categorías, indicadores y alertas.

La paleta se implementa mediante variables CSS globales y tokens compatibles con Tailwind CSS y shadcn. Esto permite mantener consistencia entre las vistas de Cargador, Revisor, Administrador y SuperAdmin.

## 2. Colores institucionales

| Nombre | Código HEX | Uso principal | Descripción |
|---|---|---|---|
| Azul institucional | `#0A3B74` | Identidad principal, navegación, botones primarios, títulos y pie institucional | Es el color base de la interfaz. Comunica confianza, formalidad, estabilidad y pertenencia institucional. |
| Azul profundo | `#0D4A8C` | Transiciones de degradados, barra lateral y tarjetas destacadas | Variante más luminosa del azul institucional que aporta profundidad visual sin perder sobriedad. |
| Cyan técnico | `#1D70B8` | Anillos de enfoque, gráficos, bordes de énfasis y acciones técnicas | Refuerza la dimensión tecnológica del sistema y facilita la identificación de elementos interactivos o informativos. |
| Esmeralda | `#1CBCA6` | Indicadores positivos, etiquetas de sección, categorías y gráficos | Representa avance, disponibilidad, cumplimiento y resultados favorables. Aporta contraste fresco frente a los azules. |
| Coral | `#F25C30` | Categorías, gráficos y degradados de informes | Se utiliza como acento cálido para diferenciar métricas, categorías y elementos que requieren atención visual. |
| Ocre | `#C28B10` | Indicadores de advertencia, categorías y gráficos | Representa prevención, revisión y estados que requieren seguimiento. |
| Fucsia | `#D82B5A` | Estados destructivos, alertas y categorías | Se reserva para rechazos, acciones destructivas o situaciones que requieren atención prioritaria. |
| Púrpura | `#904179` | Categorías, informes y combinaciones de degradado | Añade variedad cromática para diferenciar módulos o grupos de información sin competir con el azul institucional. |

## 3. Colores de texto

| Nombre | Código HEX | Variable CSS | Uso y descripción |
|---|---|---|---|
| Texto principal | `#333333` | `--texto-principal`, `--foreground` | Texto general de la aplicación. Es un gris oscuro que facilita la lectura y evita la dureza del negro puro. |
| Texto secundario | `#555555` | `--texto-secundario`, `--muted-foreground` | Descripciones, metadatos, textos auxiliares y contenido de menor jerarquía. |
| Blanco | `#FFFFFF` | `--primary-foreground` y usos directos | Texto sobre fondos oscuros, botones primarios, navegación institucional y etiquetas de alto contraste. |

## 4. Fondos y superficies

| Nombre | Código HEX | Variable CSS | Uso y descripción |
|---|---|---|---|
| Fondo general | `#FFF8F6` | `--background` | Base clara y cálida de la aplicación. Reduce la sensación de pantalla completamente blanca. |
| Blanco de superficie | `#FFFFFF` | `--card`, `--popover` | Tarjetas, paneles, menús emergentes, tablas y formularios. Genera separación visual sobre el fondo general. |
| Fondo secundario | `#E8F4F8` | `--secondary` | Fondos auxiliares y superficies secundarias asociadas a la identidad azul-cyan. |
| Fondo atenuado | `#EEF6F8` | `--muted` | Estados neutros, zonas de apoyo y elementos visuales de baja prioridad. |
| Acento claro | `#E8F6F6` | `--accent` | Resaltados suaves, fondos de énfasis y variaciones asociadas al color esmeralda. |
| Coral claro | `#FFF2EE` | Uso en degradados | Tono cálido utilizado como inicio de los fondos degradados generales. |
| Azul muy claro | `#EEF4FA` | Uso en degradados | Tono final de los degradados generales; mantiene una apariencia ligera y tecnológica. |

## 5. Bordes, controles y estados semánticos

| Nombre | Código HEX | Variable CSS | Uso y descripción |
|---|---|---|---|
| Borde | `#C5D8E8` | `--border` | Bordes de tarjetas, tablas, campos y separadores. Es visible sin dominar el contenido. |
| Borde de entrada | `#B8CCD9` | `--input` | Contorno por defecto de campos de entrada y controles de formulario. |
| Anillo de enfoque | `#1D70B8` | `--ring` | Indicador visual de foco para navegación mediante teclado y controles activos. |
| Estado destructivo | `#D82B5A` | `--destructive` | Acciones o estados de riesgo, como eliminar, rechazar o indicar una situación crítica. |
| Advertencia clara | `#FFFBEB` | Clase Tailwind `bg-amber-50` | Fondo suave para observaciones y mensajes de advertencia. |
| Advertencia | `#92400E` | Clase Tailwind `text-amber-800` | Texto de advertencia con contraste sobre fondos claros. |
| Error claro | `#FEF2F2` | Clase Tailwind `bg-red-50` | Fondo para errores de validación o mensajes de fallo. |
| Error | `#B91C1C` | Clase Tailwind `text-red-700` | Texto asociado a errores de validación o solicitudes no exitosas. |

## 6. Colores para gráficos e informes

Los gráficos y las tarjetas de informes reutilizan la paleta institucional para mantener continuidad entre los datos y la interfaz.

| Serie | Código HEX | Aplicación |
|---|---|---|
| Serie 1 | `#0A3B74` | Azul institucional para la serie principal o de referencia. |
| Serie 2 | `#1CBCA6` | Esmeralda para avances y resultados positivos. |
| Serie 3 | `#1D70B8` | Cyan técnico para datos complementarios. |
| Serie 4 | `#C28B10` | Ocre para seguimiento o advertencias. |
| Serie 5 | `#F25C30` | Coral para diferenciación de categorías. |
| Apoyo neutro | `#94A3B8` | Datos secundarios o elementos sin énfasis. |

En los informes Power BI simulados también se utilizan combinaciones de degradado con los colores institucionales, por ejemplo:

- Azul institucional → Cyan técnico: `#0A3B74` → `#1D70B8`.
- Esmeralda → Azul institucional: `#1CBCA6` → `#0A3B74`.
- Púrpura → Fucsia: `#904179` → `#D82B5A`.
- Ocre → Coral: `#C28B10` → `#F25C30`.
- Cyan técnico → Esmeralda: `#1D70B8` → `#1CBCA6`.

## 7. Degradados de la interfaz

| Degradado | Colores | Uso |
|---|---|---|
| Fondo general | `#FFF2EE` → `#E8F6F6` → `#EEF4FA` | Fondo global del `body` y de `.fondo-app`. Crea una transición cálida, fresca y tecnológica. |
| Hero institucional | `#0A3B74` → `#0D4A8C` → `#1D70B8` | Tarjetas hero y bloques destacados. Refuerza la identidad institucional y la jerarquía visual. |
| Barra lateral | `#0A3B74` → `#0D4A8C` → `#FFFFFF` | Encabezado y transición de la navegación lateral hacia el contenido claro. |

## 8. Colores de integración externa

El logotipo de Google utilizado en la pantalla de inicio de sesión conserva los colores oficiales de la marca. Estos tonos no forman parte de la paleta institucional del SIAC:

| Color | Código HEX | Uso |
|---|---|---|
| Azul Google | `#4285F4` | Segmento del logotipo de Google. |
| Verde Google | `#34A853` | Segmento del logotipo de Google. |
| Amarillo Google | `#FBBC05` | Segmento del logotipo de Google. |
| Rojo Google | `#EA4335` | Segmento del logotipo de Google. |

## 9. Recomendaciones de uso

1. Utilizar `#0A3B74` como color principal de identidad y para acciones primarias.
2. Utilizar `#1D70B8` para estados de foco, elementos técnicos y acciones secundarias destacadas.
3. Utilizar `#1CBCA6` para avances, cumplimiento y resultados positivos.
4. Reservar `#D82B5A` para estados destructivos, rechazos y alertas prioritarias.
5. Mantener los fondos claros para conservar la legibilidad y la jerarquía del contenido.
6. Preferir las variables CSS institucionales (`--institucional`, `--esmeralda`, `--coral`, entre otras) frente a repetir códigos HEX directamente.
7. Verificar siempre el contraste entre texto y fondo cuando se incorporen nuevos componentes o estados.

## 10. Referencias de implementación

- Variables y tokens globales: `Frontend/app/globals.css`.
- Colores de informes y degradados: `Frontend/lib/informes-powerbi.ts`.
- Gráfico de tendencia: `Frontend/components/siac/grafico-tendencia.tsx`.
- Gráfico de distribución: `Frontend/components/siac/grafico-distribucion.tsx`.
- Tema de la aplicación: `Frontend/app/layout.tsx`.

# Logo de PetGrooming

Archivos fuente de la identidad visual. Todos son **vectoriales**: se amplían a
cualquier tamaño sin perder nitidez.

| Archivo | Cuándo usarlo |
|---|---|
| `petgrooming-horizontal.svg` | Uso principal: encabezados, portadas, documentos |
| `petgrooming-isotipo.svg` | Solo el distintivo: favicon, avatar, sellos, espacios pequeños |
| `petgrooming-monocromo.svg` | Impresión a una tinta, fotocopias, grabados |

## Para imprimir

Ejecuta el generador y obtendrás el manual de marca en PDF, con el logo en
grande, las variantes, la paleta con sus códigos y las reglas de uso:

```bash
node docs/build-logo.mjs
```

Queda en `Descargas/PetGrooming_Logo.pdf`. Ese PDF es el que se lleva a la
imprenta: al ser vectorial sirve igual para una tarjeta de presentación que para
un pendón, y usa Helvetica —una de las fuentes estándar del formato PDF— así que
el texto se ve igual en cualquier equipo de impresión.

## Paleta

| Color | Código | Uso |
|---|---|---|
| Azul de marca | `#2563eb` | Distintivo, botones |
| Azul oscuro | `#1e40af` | Títulos y la palabra "Pet" |
| Amarillo | `#facc15` | Solo detalles, nunca superficies grandes |
| Tinta | `#111827` | Versión de una tinta y texto |

Son los mismos colores que usa la aplicación, definidos en
`frontend/tailwind.config.js`. Si cambias uno, cámbialo en ambos sitios.

## Nota sobre la tipografía en los SVG

Los archivos SVG referencian la fuente Nunito con alternativas del sistema. Si
vas a enviar un SVG a un tercero que no tenga esa fuente instalada, usa mejor el
PDF: allí el texto ya está resuelto y no depende de fuentes externas.

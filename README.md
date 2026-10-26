# Monte Azul · Pedidos de hielo

Una aplicación para anotar pedidos durante las llamadas y compartir un PDF claro, organizado por lugar de entrega. La identidad usa azul intenso, celeste, blanco y un icono de montaña inspirado en la referencia de Monte Azul.

HTML, CSS y JavaScript, sin cuenta para el usuario ni pasos de compilación. Incluye jsPDF 4.2.1 en `vendor`, con su licencia MIT. La aplicación no depende de fuentes, imágenes ni bibliotecas alojadas en servicios externos para funcionar.

## Cómo se usa

1. Revisa la fecha. Cada día empieza sin clientes, lugares escritos, placa ni conductor. Los datos de un día no se copian a otro.
2. Escribe el lugar de entrega. Usa **Agregar otro lugar de entrega** si hay varias paradas. Se admiten hasta 20 lugares por pedido.
3. Completa la placa y el nombre del conductor para ese pedido.
4. Conforme llamas a cada persona, toca **Agregar cliente**. Escribe nombre, bultos, bolsas, lugar y una nota opcional en una sola ventana. Si solo hay un lugar se asigna a ese; con varios debes elegirlo.
5. Revisa las cantidades generales y los subtotales de cada lugar. Las notas y los viajes no se suman a las cantidades.
6. Toca **Compartir PDF** o **Descargar PDF**. El PDF A4 agrupa clientes por lugar, incluye subtotales, total general, vehículo, conductor y páginas numeradas.

Los clientes sin confirmar se identifican como pendientes. **Sin pedido** confirma que una persona no lleva; si ya tenía cantidades, se pide confirmar antes de ponerlas en cero.

Toca el lugar que aparece en la tarjeta de un cliente para cambiar su entrega. Quitar un lugar con clientes requiere confirmación: los clientes y sus cantidades se conservan, pero quedan sin lugar asignado. Debes reasignarlos antes de crear el PDF. También debes completar los nombres de los lugares, evitar lugares duplicados y escribir vehículo y conductor.

En dispositivos que permiten compartir archivos, **Compartir PDF** abre las opciones del sistema para elegir WhatsApp, correo o Archivos. Si no está disponible o falla, se prepara la descarga. Cancelar el menú no descarga nada ni envía el pedido.

## Publicar con GitHub Pages

Repositorio indicado: https://github.com/CamiloOliva/FabricaHielo

1. Sube a la raíz `index.html`, `styles.css`, `core.js`, `pdf.js`, `app.js`, `sw.js`, `manifest.webmanifest`, `.nojekyll` y las carpetas `icons` y `vendor` completas. Puedes incluir `README.md`, `tests` y `scripts`. No subas `.qa`, archivos ZIP ni copias de pedidos.
2. En GitHub, entra a **Settings → Pages**.
3. En **Source**, elige **Deploy from a branch**.
4. Selecciona **main → /(root) → Save**.
5. Cuando termine la publicación, la dirección prevista es **https://camilooliva.github.io/FabricaHielo/**. Esta URL solo funcionará tras publicar; es distinta al enlace del repositorio terminado en `.git`.

No se necesita un servidor propio ni instalar paquetes. Documentación: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) y [configurar la publicación](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## En el iPhone

Abre el enlace publicado en Safari con internet y espera a que cargue. En **Compartir → Agregar a pantalla de inicio**, activa **Abrir como app web** si aparece y toca **Agregar**. El icono se llama **Monte Azul**. [Guía de Apple](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios).

Después de una primera carga completa y de preparar la caché puedes anotar, consultar y crear PDF sin conexión. Enviarlos por WhatsApp o correo requiere internet. Si no se pudo preparar el modo sin conexión se muestra un aviso.

## Guardado, copias y actualizaciones

Los pedidos se guardan automáticamente en este navegador y dispositivo. No se envían a GitHub ni se sincronizan entre celulares. Abre siempre desde el mismo icono. Borrar datos del sitio puede borrar el historial; en navegación privada el guardado puede ser temporal.

Descarga una copia JSON desde el pie de página o **Ayuda**. En **Ayuda → Recuperar una copia** puedes recuperarla en otro dispositivo. Se valida antes de aceptarla y se pide confirmación porque reemplaza todos los pedidos locales. **Historial** permite abrir y corregir otros días.

Se mantiene la clave de almacenamiento `mi-hielo-v1` para conservar los datos instalados. El formato actual de las copias es versión 2: cada pedido tiene `destinations`, cada cliente su `destinationId` y no existen preferencias que rellenen próximos pedidos. Las copias válidas de versión 1 se convierten sin perder nombres, cantidades, notas ni entregas anteriores. Solo se limpia la lista original de ejemplo cuando está completamente intacta; también se limpian sus datos de entrega originales si el pedido no tiene información digitada.

Para actualizar, sube los archivos nuevos y cambia `VERSION` en `sw.js`. Cierra todas las ventanas de la aplicación y vuelve a abrir con internet para activar la versión nueva. El historial está separado de los archivos en caché.

## Probar en Windows

Desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\serve.ps1
```

Abre http://127.0.0.1:4173/. El servidor solo escucha en este equipo; se detiene con Ctrl+C. También puedes abrir `index.html` directamente para revisar la interfaz, aunque el funcionamiento completo sin conexión necesita HTTP local o HTTPS.

Pruebas de lógica: http://127.0.0.1:4173/tests/core.test.html. Pruebas de PDF: http://127.0.0.1:4173/tests/pdf.test.html. Los datos de `tests/fixtures.js` son ficticios y nunca se cargan en la aplicación.

En el iPhone real conviene comprobar el guardado tras cerrar y abrir, compartir y descargar un PDF, recuperar una copia y abrir el pedido en modo avión después de la primera carga.

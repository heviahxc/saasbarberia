# Invitaciones al equipo

## Recorrido

1. Iniciar sesión como administrador y abrir Negocios → Mis negocios → Mi equipo.
2. Crear el profesional si todavía no existe. Esto no crea una cuenta de usuario.
3. Seleccionar un profesional activo y sin membresía, indicar el correo y generar el enlace.
4. Copiarlo y compartirlo por el canal elegido. La aplicación no envía correos automáticamente.
5. La persona invitada abre el enlace, se registra o inicia sesión con ese correo y acepta explícitamente.
6. Su cuenta queda vinculada como MIEMBRO del negocio y del profesional seleccionado.

Las pantallas usan la misma cuenta y los componentes y estilos de la aplicación. Crear perfiles de profesionales y aceptar invitaciones son acciones distintas. Los servicios y horarios conservan sus endpoints existentes.

## Reglas

- Enlace aleatorio de 256 bits, válido durante 72 horas y consumible una sola vez.
- Solo se almacena SHA-256 del token. El token se devuelve únicamente al generar el enlace; las listas no lo exponen.
- El enlace usa el fragmento `#invitacion=…` para evitar enviarlo en la URL de las peticiones al servidor. La aceptación lo envía en el cuerpo de una petición autenticada.
- El correo autenticado debe coincidir con el invitado. El token debe compartirse únicamente con la persona invitada.
- Solo administradores activos gestionan invitaciones. Al aceptar también se revisa que el creador conserve ese acceso y que el profesional siga activo.
- Una invitación nueva revoca las pendientes para el mismo profesional o correo dentro del negocio.
- No se reemplazan, degradan ni reactivan membresías existentes mediante invitaciones.
- Creación, revocación y aceptación bloquean la fila de la barbería durante la transacción. Dos aceptaciones simultáneas producen una membresía y un rechazo.
- La agenda de un MIEMBRO se filtra por su profesional usando la membresía del servidor; un miembro sin profesional no ve citas. El administrador conserva la agenda completa.
- Las invitaciones aceptadas no pueden revocarse como invitaciones. La gestión posterior de acceso de miembros es otro flujo.

## Archivos

Backend: `src/equipo/`, modelo `InvitacionEquipo` y migración `20261110180000_agregar_invitaciones_equipo`.
Frontend: `src/features/equipo/` (componentes, API, tipos y estilos). Entrada desde MisNegocios y lectura del enlace en App.

## Verificación

Desde backend: `npm run test:e2e -- invitaciones-equipo permisos-barberias`.
Las pruebas requieren la base local `barber_saas_test` y limpian únicamente sus propios registros.
Se comprueban permisos entre negocios, correo incorrecto, datos inválidos, caducidad, revocación, reemplazo, aceptación simultánea, membresías existentes y agenda propia.

El entorno automatizado puede bloquear la caché nativa de SWC. Para esta implementación se ejecutaron los mismos tests compilados previamente con TypeScript en `.tmp/`, usando Vitest y una carpeta temporal local; no se modificó el comando habitual ni se cambiaron dependencias.

En desarrollo, un enlace con localhost funciona en el equipo donde corre la aplicación. Para compartirlo con otros equipos, la aplicación debe estar accesible mediante una dirección común.

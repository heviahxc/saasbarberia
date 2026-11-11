# Servicios del negocio

## Uso

En Negocios → Mis negocios → Servicios, el administrador puede crear, editar y activar o desactivar servicios. El listado permite filtrar todos, activos e inactivos.

El mismo formulario se usa para creación y edición. Campos: nombre (máximo 100 caracteres), duración entera entre 1 y 1440 minutos y precio entre 0 y 99999999,99 con hasta dos decimales. El precio se escribe sin separadores de miles; el formulario admite coma o punto decimal y envía una cadena decimal normalizada al backend.

No se borran servicios. Desactivarlos los oculta del catálogo para nuevas reservas; reactivarlos conserva sus asignaciones. Editar un servicio inactivo no lo reactiva. Las reservas existentes conservan su nombre, duración, precio acordado y horario.

Crear un servicio no lo asigna automáticamente a un profesional. Las asignaciones y horarios se gestionan por separado.

## Arquitectura

- Frontend: `src/features/servicios/`, con API, tipos, componentes y estilos propios. Reutiliza el contexto de sesión, el cliente HTTP, los estados de contenido y el formato de precios compartidos.
- Backend: módulo existente `src/servicios/`. El nuevo DTO de actualización hereda las validaciones de creación.
- No requiere migraciones ni dependencias nuevas.

## API

- `GET /barberias/:barberiaId/servicios`: lista todos los servicios del negocio para miembros autorizados.
- `POST /barberias/:barberiaId/servicios`: crea un servicio activo, solo administradores.
- `PATCH /barberias/:barberiaId/servicios/:servicioId`: guarda juntos `nombre`, `duracionMinutos` y `precio`, solo administradores. No admite cambiar el negocio ni el estado mediante este cuerpo.
- `PATCH /barberias/:barberiaId/servicios/:servicioId/estado`: recibe `activo` como booleano, solo administradores.
- Los endpoints previos de duración y servicios disponibles se conservan.

Las escrituras se limitan por el ID del servicio y el ID del negocio; no basta con conocer un ID ajeno. Ante un resultado incierto de red, el formulario pide comprobar el listado antes de repetir la escritura.

## Pruebas

Desde backend: `npm run test:e2e -- servicios-negocio permisos-barberias`.
El entorno exige PostgreSQL local `barber_saas_test`. Las pruebas crean y eliminan exclusivamente sus propios registros.
Se comprueban creación y edición, normalización, precio decimal, validaciones, permisos, aislamiento entre negocios, activación/desactivación y conservación de reservas previas.

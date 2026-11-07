type OpcionesApi = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
  signal?: AbortSignal;
};

type ManejadorSesionInvalida = (token: string) => void;

const manejadoresSesionInvalida = new Set<ManejadorSesionInvalida>();

export function escucharSesionInvalida(
  manejador: ManejadorSesionInvalida,
): () => void {
  manejadoresSesionInvalida.add(manejador);

  return () => {
    manejadoresSesionInvalida.delete(manejador);
  };
}

function notificarSesionInvalida(token: string) {
  manejadoresSesionInvalida.forEach((manejador) => {
    manejador(token);
  });
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function obtenerMensajeError(datos: unknown): string | undefined {
  if (typeof datos !== "object" || datos === null || !("message" in datos)) {
    return undefined;
  }

  const mensaje = datos.message;

  if (typeof mensaje === "string" && mensaje.trim()) {
    return mensaje;
  }

  if (Array.isArray(mensaje)) {
    const mensajes = mensaje.filter(
      (elemento): elemento is string =>
        typeof elemento === "string" && elemento.trim().length > 0,
    );

    return mensajes.length > 0 ? mensajes.join(". ") : undefined;
  }

  return undefined;
}

export async function api<T>(
  ruta: string,
  opciones: OpcionesApi = {},
): Promise<T> {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (opciones.token) {
    headers.set("Authorization", `Bearer ${opciones.token}`);
  }

  if (opciones.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const respuesta = await fetch(`/api${ruta}`, {
    method: opciones.method ?? "GET",
    headers,
    body:
      opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
    signal: opciones.signal,
  });
  if (respuesta.status === 401 && opciones.token) {
    notificarSesionInvalida(opciones.token);
  }
  if (!respuesta.ok) {
    const datos: unknown = await respuesta.json().catch(() => null);

    const mensaje =
      obtenerMensajeError(datos) ??
      `No se pudo completar la solicitud (${respuesta.status}).`;

    throw new ApiError(mensaje, respuesta.status);
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }

  return (await respuesta.json()) as T;
}

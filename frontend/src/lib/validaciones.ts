const PATRON_NOMBRE =
  /^\p{L}[\p{L}\p{M}]*(?:[ '’-]\p{L}[\p{L}\p{M}]*)*$/u;
export function normalizarNombre(valor: string): string {
  return valor
    .normalize('NFC')
    .trim()
    .replace(/\s+/gu, ' ');
}

export function validarNombre(
  valor: string,
  etiqueta: string,
  opcional = false,
): string | undefined {
  const nombre = normalizarNombre(valor);

  if (!nombre) {
    return opcional ? undefined : `${etiqueta} es obligatorio.`;
  }

  if (Array.from(nombre).length > 100) {
    return `${etiqueta} no puede superar los 100 caracteres.`;
  }

  if (!PATRON_NOMBRE.test(nombre)) {
    return `${etiqueta} debe contener letras y puede incluir espacios, guiones o apóstrofes entre palabras.`;
  }

  return undefined;
}

export function validarTelefono(
  valor: string,
): string | undefined {
  const telefono = valor.trim();

  if (!telefono) {
    return 'El teléfono es obligatorio.';
  }

  if (!/^\+[1-9]\d{7,14}$/.test(telefono)) {
    return 'Incluye el prefijo internacional, sin espacios. Ejemplo: +56912345678.';
  }

  return undefined;
}
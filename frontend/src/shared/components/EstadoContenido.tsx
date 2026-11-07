type Props = {
  tipo: 'cargando' | 'error' | 'vacio';
  mensaje: string;
  onReintentar?: () => void;
};

export default function EstadoContenido({
  tipo,
  mensaje,
  onReintentar,
}: Props) {
  return (
    <div
      className={`estado-contenido estado-contenido-${tipo}`}
      aria-busy={tipo === 'cargando'}
    >
      <p role={tipo === 'error' ? 'alert' : 'status'}>
        {mensaje}
      </p>

      {tipo === 'error' && onReintentar && (
        <button
          type="button"
          className="boton-secundario"
          onClick={onReintentar}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
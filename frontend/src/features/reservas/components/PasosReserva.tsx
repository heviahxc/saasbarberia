type Props = {
  pasoActual: 1 | 2 | 3 | 4;
};

const pasos = [
  'Barbería',
  'Servicio',
  'Profesional',
  'Horario',
];

export default function PasosReserva({ pasoActual }: Props) {
  return (
    <ol className="pasos-reserva" aria-label="Progreso de la reserva">
      {pasos.map((nombre, indice) => {
        const numero = indice + 1;
        const completado = numero < pasoActual;
        const actual = numero === pasoActual;

        return (
          <li
            key={nombre}
            className={[
              'paso-reserva',
              completado ? 'paso-completado' : '',
              actual ? 'paso-actual' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={actual ? 'step' : undefined}
          >
            <span className="paso-numero" aria-hidden="true">
              {completado ? '✓' : numero}
            </span>

            <span>
              <span className="solo-lectores">
                {completado
                  ? 'Completado: '
                  : actual
                    ? 'Paso actual: '
                    : 'Pendiente: '}
              </span>
              {nombre}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
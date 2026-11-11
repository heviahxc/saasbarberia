import type { DatosNegocio } from '../types.js';

type Props = {
  datos: DatosNegocio;
  disabled: boolean;
  onCambiar: (campo: keyof DatosNegocio, valor: string) => void;
};

export default function CamposNegocio({ datos, disabled, onCambiar }: Props) {
  return <>
    {([
      { campo: 'nombre', etiqueta: 'Nombre comercial', max: 100, autocomplete: 'organization' },
      { campo: 'ciudad', etiqueta: 'Ciudad', max: 100, autocomplete: 'address-level2' },
      { campo: 'direccion', etiqueta: 'Dirección', max: 250, autocomplete: 'street-address' },
    ] as const).map(({ campo, etiqueta, max, autocomplete }) => (
      <div className="campo" key={campo}>
        <label htmlFor={`negocio-${campo}`}>{etiqueta}</label>
        <input id={`negocio-${campo}`} type="text" required maxLength={max}
          autoComplete={autocomplete} value={datos[campo]} disabled={disabled}
          onChange={evento => onCambiar(campo, evento.target.value)} />
      </div>
    ))}
  </>;
}

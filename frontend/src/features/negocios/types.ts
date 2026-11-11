export type MembresiaNegocio = {
  rol: 'ADMINISTRADOR' | 'MIEMBRO';
  profesionalId: number | null;
  barberia: {
    id: number;
    nombre: string;
    ciudad: string;
  };
};

export type DatosNegocio = { nombre: string; ciudad: string; direccion: string };
export type Negocio = Omit<DatosNegocio, 'direccion'> & {
  id: number;
  direccion: string | null;
  zonaHoraria: string;
  intervaloReservasMinutos: 15 | 30;
};

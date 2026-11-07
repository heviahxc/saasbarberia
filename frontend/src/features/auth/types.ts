export type Sesion = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: {
    id: number;
    nombre: string;
    email: string;
  };
};

export type UsuarioRegistrado = {
  id: number;
  nombre: string;
  email: string;
  creadoEn: string;
};
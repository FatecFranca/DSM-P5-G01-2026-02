/** Erro de API que carrega o status HTTP, para distinguir sessão expirada (401) de falta de rede. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export const isUnauthorized = (error: unknown): boolean => error instanceof ApiError && error.status === 401;

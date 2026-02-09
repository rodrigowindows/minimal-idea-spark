/**
 * Logger: em dev loga no console; em produção pode ser no-op ou enviar só erros.
 * Não expor dados sensíveis (tokens, PII) em nenhum ambiente.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};

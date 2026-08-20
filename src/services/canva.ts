// Cliente HTTP compartilhado para a Canva Connect API.
//
// A Canva Connect API usa OAuth 2.0 (Authorization Code + PKCE). Para fins
// didáticos, este servidor assume que um access token válido já foi obtido
// e está disponível na variável de ambiente CANVA_ACCESS_TOKEN.
// Veja o README.md deste projeto para o passo a passo de como gerar esse token.

import axios, { AxiosError } from "axios";
import { CANVA_API_BASE_URL } from "../constants.js";

export async function canvaApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: unknown,
  params?: Record<string, unknown>
): Promise<T> {
  const token = process.env.CANVA_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "CANVA_ACCESS_TOKEN não está definido. Gere um access token seguindo o README.md e exporte a variável de ambiente."
    );
  }

  const response = await axios({
    method,
    url: `${CANVA_API_BASE_URL}/${endpoint}`,
    data,
    params,
    timeout: 30000,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  return response.data as T;
}

/** Converte erros da API do Canva em mensagens claras e acionáveis para o agente. */
export function handleCanvaError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string; code?: string }>;
    if (err.response) {
      const apiMessage = err.response.data?.message;
      switch (err.response.status) {
        case 401:
          return "Erro: token inválido ou expirado. Gere um novo CANVA_ACCESS_TOKEN (veja o README.md).";
        case 403:
          return "Erro: permissão negada. Verifique se o token tem os escopos (scopes) necessários para essa operação.";
        case 404:
          return "Erro: recurso não encontrado. Confirme se o design_id ou asset_id está correto.";
        case 429:
          return "Erro: limite de requisições excedido. Aguarde um pouco antes de tentar novamente.";
        default:
          return `Erro: a API do Canva retornou status ${err.response.status}${apiMessage ? ` — ${apiMessage}` : ""}`;
      }
    }
    if (err.code === "ECONNABORTED") {
      return "Erro: a requisição excedeu o tempo limite. Tente novamente.";
    }
  }
  return `Erro inesperado: ${error instanceof Error ? error.message : String(error)}`;
}

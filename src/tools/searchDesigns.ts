// Ferramenta: buscar designs existentes na conta do Canva.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { canvaApiRequest, handleCanvaError } from "../services/canva.js";
import { CHARACTER_LIMIT } from "../constants.js";

const SearchDesignsInputSchema = z
  .object({
    query: z
      .string()
      .min(1, "Informe um termo de busca")
      .max(200)
      .describe("Termo para buscar nos títulos dos designs (ex: 'poster aula IA')"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Número máximo de resultados a retornar"),
  })
  .strict();

type SearchDesignsInput = z.infer<typeof SearchDesignsInputSchema>;

interface CanvaDesignSummary {
  id: string;
  title?: string;
  urls?: { edit_url?: string; view_url?: string };
  thumbnail?: { url?: string };
}

interface CanvaDesignListResponse {
  items: CanvaDesignSummary[];
  continuation?: string;
}

export function registerSearchDesignsTool(server: McpServer): void {
  server.registerTool(
    "canva_search_designs",
    {
      title: "Buscar Designs no Canva",
      description: `Busca designs existentes na conta conectada do Canva por título.

Não cria nem modifica nada — apenas lista designs já existentes.

Args:
  - query (string): termo de busca, comparado com o título dos designs
  - limit (number): máximo de resultados (padrão 20, máx 100)

Retorna uma lista de designs com id, título e links de edição/visualização.

Exemplos:
  - "Encontre os designs sobre 'workshop de IA'" -> query="workshop de IA"
  - Não use para criar um design novo (use canva_create_design)`,
      inputSchema: SearchDesignsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: SearchDesignsInput) => {
      try {
        const data = await canvaApiRequest<CanvaDesignListResponse>(
          "designs",
          "GET",
          undefined,
          { query: params.query, limit: params.limit }
        );

        const items = data.items ?? [];
        if (!items.length) {
          return {
            content: [
              { type: "text" as const, text: `Nenhum design encontrado para '${params.query}'.` },
            ],
          };
        }

        const output = {
          count: items.length,
          designs: items.map((d) => ({
            id: d.id,
            title: d.title ?? "(sem título)",
            edit_url: d.urls?.edit_url,
            view_url: d.urls?.view_url,
            thumbnail_url: d.thumbnail?.url,
          })),
        };

        let text = JSON.stringify(output, null, 2);
        if (text.length > CHARACTER_LIMIT) {
          text = text.slice(0, CHARACTER_LIMIT) + "\n... (resposta truncada)";
        }

        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleCanvaError(error) }] };
      }
    }
  );
}

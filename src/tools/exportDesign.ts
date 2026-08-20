// Ferramenta: exportar um design do Canva como imagem/PDF.
//
// A Canva Connect API exporta de forma assíncrona: criamos um "export job" e
// fazemos polling até ele concluir. Isso é um bom exemplo em aula de como um
// MCP tool pode encapsular um fluxo assíncrono da API por trás de uma única
// chamada síncrona para o agente.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { canvaApiRequest, handleCanvaError } from "../services/canva.js";

const EXPORT_FORMATS = ["png", "jpg", "pdf", "pptx", "gif", "mp4"] as const;

const ExportDesignInputSchema = z
  .object({
    design_id: z.string().min(1).describe("ID do design a exportar (retornado por canva_search_designs ou canva_create_design)"),
    format: z.enum(EXPORT_FORMATS).default("png").describe("Formato de exportação"),
  })
  .strict();

type ExportDesignInput = z.infer<typeof ExportDesignInputSchema>;

interface CanvaExportJobResponse {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    urls?: string[];
    error?: { message?: string };
  };
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function registerExportDesignTool(server: McpServer): void {
  server.registerTool(
    "canva_export_design",
    {
      title: "Exportar Design do Canva",
      description: `Exporta um design do Canva para um arquivo (PNG, JPG, PDF, PPTX, GIF ou MP4).

Cria um job de exportação assíncrono e aguarda (com polling, até ~30s) a conclusão antes de retornar.

Args:
  - design_id (string): id do design a exportar
  - format (enum): png | jpg | pdf | pptx | gif | mp4 (padrão: png)

Retorna a(s) URL(s) de download do arquivo exportado.

Exemplos:
  - "Exporte o design X como PDF" -> design_id="X", format="pdf"

Erros:
  - Se o job falhar ou exceder o tempo de espera, retorna uma mensagem explicando o que houve.`,
      inputSchema: ExportDesignInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: ExportDesignInput) => {
      try {
        const created = await canvaApiRequest<CanvaExportJobResponse>("exports", "POST", {
          design_id: params.design_id,
          format: { type: params.format },
        });

        let job = created.job;
        let attempts = 0;
        while (job.status === "in_progress" && attempts < MAX_POLL_ATTEMPTS) {
          await sleep(POLL_INTERVAL_MS);
          const polled = await canvaApiRequest<CanvaExportJobResponse>(`exports/${job.id}`);
          job = polled.job;
          attempts += 1;
        }

        if (job.status === "failed") {
          return {
            content: [
              {
                type: "text" as const,
                text: `Erro: exportação falhou — ${job.error?.message ?? "motivo desconhecido"}`,
              },
            ],
          };
        }

        if (job.status !== "success") {
          return {
            content: [
              {
                type: "text" as const,
                text: `Exportação ainda em andamento após ${attempts} tentativas (job id: ${job.id}). Tente consultar novamente em instantes.`,
              },
            ],
          };
        }

        const output = { design_id: params.design_id, format: params.format, urls: job.urls ?? [] };
        return {
          content: [
            {
              type: "text" as const,
              text: `Exportação concluída (${params.format}):\n${(job.urls ?? []).join("\n")}`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleCanvaError(error) }] };
      }
    }
  );
}

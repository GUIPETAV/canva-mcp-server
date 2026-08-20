// Ferramenta: criar um design novo no Canva a partir de um preset (tipo + dimensões).

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { canvaApiRequest, handleCanvaError } from "../services/canva.js";

const DESIGN_TYPE_PRESETS = [
  "presentation",
  "doc",
  "poster",
  "instagram_post",
  "instagram_story",
  "facebook_post",
  "logo",
  "flyer",
] as const;

const CreateDesignInputSchema = z
  .object({
    title: z
      .string()
      .min(1, "Título é obrigatório")
      .max(200)
      .describe("Título do novo design (ex: 'Poster - Aula Mídias Criativas com IA')"),
    design_type: z
      .enum(DESIGN_TYPE_PRESETS)
      .describe(
        "Tipo de preset de design a criar: presentation, doc, poster, instagram_post, instagram_story, facebook_post, logo, flyer"
      ),
  })
  .strict();

type CreateDesignInput = z.infer<typeof CreateDesignInputSchema>;

interface CanvaCreateDesignResponse {
  design: {
    id: string;
    title?: string;
    urls?: { edit_url?: string; view_url?: string };
  };
}

export function registerCreateDesignTool(server: McpServer): void {
  server.registerTool(
    "canva_create_design",
    {
      title: "Criar Design no Canva",
      description: `Cria um novo design em branco no Canva a partir de um preset de tipo/tamanho.

Esta é uma ferramenta de escrita: cria um recurso novo e persistente na conta do Canva do usuário.

Args:
  - title (string): título do design
  - design_type (enum): um dos presets suportados (presentation, doc, poster, instagram_post, instagram_story, facebook_post, logo, flyer)

Retorna o id do design criado e o link de edição no Canva.

Exemplos:
  - "Crie uma apresentação chamada 'Aula 1 - Introdução'" -> title="Aula 1 - Introdução", design_type="presentation"
  - Não use para gerar conteúdo com IA a partir de um prompt de texto — esta ferramenta cria apenas um design em branco`,
      inputSchema: CreateDesignInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateDesignInput) => {
      try {
        const data = await canvaApiRequest<CanvaCreateDesignResponse>("designs", "POST", {
          design_type: { type: "preset", name: params.design_type },
          title: params.title,
        });

        const output = {
          id: data.design.id,
          title: data.design.title ?? params.title,
          edit_url: data.design.urls?.edit_url,
          view_url: data.design.urls?.view_url,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `Design criado: "${output.title}" (id: ${output.id})\nEditar: ${output.edit_url ?? "N/A"}`,
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

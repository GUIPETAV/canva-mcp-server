#!/usr/bin/env node
/**
 * Servidor MCP educacional para a Canva Connect API.
 *
 * Projeto de exemplo para aula de mídias criativas com IA: mostra como um
 * MCP server expõe ferramentas (tools) que um agente de IA pode chamar para
 * buscar, criar e exportar designs no Canva.
 *
 * Transporte: stdio (uso local, ideal para rodar via Claude Desktop / Claude Code).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSearchDesignsTool } from "./tools/searchDesigns.js";
import { registerCreateDesignTool } from "./tools/createDesign.js";
import { registerExportDesignTool } from "./tools/exportDesign.js";

const server = new McpServer({
  name: "canva-mcp-server",
  version: "1.0.0",
});

registerSearchDesignsTool(server);
registerCreateDesignTool(server);
registerExportDesignTool(server);

async function main(): Promise<void> {
  if (!process.env.CANVA_ACCESS_TOKEN) {
    console.error(
      "AVISO: CANVA_ACCESS_TOKEN não está definido. As ferramentas vão falhar até você configurar essa variável (veja README.md)."
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("canva-mcp-server rodando via stdio");
}

main().catch((error) => {
  console.error("Erro fatal ao iniciar o servidor:", error);
  process.exit(1);
});

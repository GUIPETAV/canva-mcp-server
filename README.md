# canva-mcp-server

Servidor MCP (Model Context Protocol) educacional que conecta um agente de IA à **Canva Connect API**. Feito como material de aula sobre mídias criativas com IA — mostra na prática como um MCP server é estruturado.

## O que ele faz

Expõe 3 ferramentas (tools) que um agente de IA (Claude, etc.) pode chamar:

| Ferramenta | O que faz |
|---|---|
| `canva_search_designs` | Busca designs existentes na conta do Canva por título |
| `canva_create_design` | Cria um design novo em branco (poster, apresentação, post de Instagram, etc.) |
| `canva_export_design` | Exporta um design como PNG, JPG, PDF, PPTX, GIF ou MP4 |

## Estrutura do projeto

```
canva-mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # ponto de entrada, registra as ferramentas
│   ├── constants.ts
│   ├── services/canva.ts     # cliente HTTP + tratamento de erros da API
│   └── tools/                # uma ferramenta por arquivo
│       ├── searchDesigns.ts
│       ├── createDesign.ts
│       └── exportDesign.ts
```

## 1. Instalar dependências

```bash
cd canva-mcp-server
npm install
```

## 2. Obter um Access Token do Canva

A Canva Connect API usa OAuth 2.0 (Authorization Code + PKCE). Passo a passo:

1. Acesse o [Canva Developer Portal](https://www.canva.com/developers/) e crie um app (tipo "Connect API integration").
2. Anote o **Client ID** e o **Client Secret**.
3. Configure um Redirect URI (para testes locais, algo como `http://127.0.0.1:3333/callback`).
4. Defina os **scopes** necessários, no mínimo: `design:content:read`, `design:content:write`, `design:meta:read`, `asset:read`.
5. Siga o fluxo OAuth do Canva (autorização no navegador → troca do `code` por `access_token`) — o guia oficial está em https://www.canva.dev/docs/connect/authentication/. Para uma aula, o mais simples é usar o **Postman/Insomnia** com o fluxo OAuth2 embutido, ou o script de exemplo do próprio Canva Developer Portal.
6. Guarde o `access_token` obtido (ele expira — para reuso contínuo, seria necessário implementar o refresh token; fica como exercício avançado para a turma).

## 3. Configurar a variável de ambiente

```bash
export CANVA_ACCESS_TOKEN="seu_access_token_aqui"
```

## 4. Build e execução

```bash
npm run build
npm start
```

Para desenvolvimento com reload automático:

```bash
npm run dev
```

## 5. Conectar ao Claude Code / Claude Desktop

Adicione ao seu `mcp` config (ex: `.claude/settings.json` do projeto, ou `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "canva": {
      "command": "node",
      "args": ["/caminho/absoluto/para/canva-mcp-server/dist/index.js"],
      "env": {
        "CANVA_ACCESS_TOKEN": "seu_access_token_aqui"
      }
    }
  }
}
```

## 6. Testar com o MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Isso abre uma interface web para chamar as ferramentas manualmente e ver os resultados — ótimo para demonstrar em aula antes de conectar a um agente de verdade.

## Ideias para exercícios da turma

- Adicionar uma ferramenta `canva_list_brand_templates` (usar templates de marca).
- Implementar refresh automático do access token.
- Adicionar suporte a `response_format` (markdown vs JSON) como no guia de boas práticas de MCP.
- Trocar o transporte de stdio para Streamable HTTP e rodar como serviço remoto.



## Integração Evolution API — Plano de Implementação

### Visão Geral

Criar uma integração com a Evolution API para envio automático de mensagens WhatsApp. A implementação será feita em 3 etapas: armazenar credenciais, criar edge function proxy, e adicionar configuração na tela Empresa.

### Etapa 1 — Armazenar Credenciais

Solicitar ao usuário dois secrets via ferramenta `add_secret`:
- **EVOLUTION_API_URL** — URL base da instância (ex: `https://sua-instancia.com`)
- **EVOLUTION_API_KEY** — Token de autenticação da API

### Etapa 2 — Edge Function `evolution-api`

Criar `supabase/functions/evolution-api/index.ts`:
- Proxy seguro que recebe requisições do frontend e repassa para a Evolution API
- Endpoints suportados:
  - `send-message` — enviar mensagem de texto
  - `check-connection` — verificar status da conexão/instância
- Validação JWT para garantir que apenas usuários autenticados possam enviar
- CORS headers padrão

### Etapa 3 — Configuração na tela Empresa

Adicionar nova seção "Integração WhatsApp (Evolution API)" na página `src/pages/Empresa.tsx`:
- Campo para **nome da instância** (salvo na tabela `empresa_config` — novo campo via migration)
- Botão "Testar Conexão" que chama o endpoint `check-connection`
- Toggle para ativar/desativar envio automático

### Migration SQL

Adicionar colunas na tabela `empresa_config`:
```sql
ALTER TABLE empresa_config
  ADD COLUMN evolution_instance_name text,
  ADD COLUMN evolution_auto_send boolean DEFAULT false;
```

### Etapa 4 — Substituir links `wa.me` por envio via API

Criar um utilitário `src/utils/evolutionApi.ts` com função `enviarMensagemWhatsApp(numero, mensagem)` que:
1. Verifica se Evolution API está configurada (busca `empresa_config`)
2. Se sim, envia via edge function
3. Se não, mantém comportamento atual (abre link `wa.me`)

Atualizar os pontos de envio existentes:
- **Pet Pronto** (Agendamentos.tsx) — envio direto via API
- **Clientes em Risco** (ClientesEmRisco.tsx) — envio direto via API
- **Confirmação de agendamento** (Agendamentos.tsx) — envio direto via API

### Ordem de Execução

1. Solicitar os 2 secrets ao usuário (EVOLUTION_API_URL e EVOLUTION_API_KEY)
2. Criar migration para novos campos em `empresa_config`
3. Criar edge function `evolution-api`
4. Adicionar seção de configuração em Empresa.tsx
5. Criar utilitário `evolutionApi.ts`
6. Atualizar pontos de envio para usar o novo utilitário


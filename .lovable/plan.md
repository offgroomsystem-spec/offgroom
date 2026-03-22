

## Integração WhatsApp via Evolution API — QR Code na Página Empresa

### Visao Geral

Criar uma seção completa de integração WhatsApp na página `/empresa`, acima de "Dados Fiscais", permitindo que administradores conectem seu WhatsApp via QR Code usando a Evolution API. Inclui criação de instância, exibição de QR Code em tempo real, monitoramento de status, e desconexão.

### Etapa 1 — Migration: Tabela `whatsapp_instances`

Nova tabela para persistir dados da instância por empresa (multi-tenant):

```sql
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  session_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(instance_name)
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own whatsapp instances"
  ON public.whatsapp_instances FOR ALL
  TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));
```

### Etapa 2 — Edge Function `evolution-api`

Criar `supabase/functions/evolution-api/index.ts` com as seguintes ações:

- **create-instance**: Cria instância na Evolution API (`/instance/create`) com o `instanceName` e `number`
- **get-qrcode**: Busca QR Code (`/instance/connect/{instanceName}`)
- **check-status**: Verifica status da conexão (`/instance/connectionState/{instanceName}`)
- **disconnect**: Encerra sessão e deleta instância (`/instance/logout/{instanceName}` + `/instance/delete/{instanceName}`)

Todas as chamadas autenticadas via JWT, usando os secrets `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.

### Etapa 3 — Componente `WhatsAppIntegration`

Novo componente `src/components/empresa/WhatsAppIntegration.tsx`:

**Card principal (sempre visivel para admins):**
- Titulo: "WhatsApp para envios de mensagens automaticas"
- Indicador de status com icone colorido (verde=Conectado, vermelho=Desconectado, amarelo=Conectando)
- Botao "Configurar WhatsApp" (quando desconectado) ou "Desconectar" (quando conectado)
- Numero conectado exibido quando ativo

**Modal de configuracao (ao clicar "Configurar"):**
- Campo "Nome da instancia" (texto, unico)
- Campo "Numero do WhatsApp" com validacao E.164 (deve iniciar com 55, apenas digitos, 12-13 chars)
- Validacao em tempo real com mensagem de erro
- Botao "Criar e Conectar"

**Modal de QR Code (apos criacao):**
- Mensagem: "Mantenha o WhatsApp aberto enquanto carregamos as mensagens"
- QR Code exibido como imagem (base64 da Evolution API)
- Polling a cada 5s para verificar status
- Auto-refresh do QR se expirar
- Fecha automaticamente quando status = CONNECTED
- Loading spinner durante carregamento

**Controle de acesso:**
- Somente `isAdministrador` ve e interage com a secao
- Funcionarios (staff) herdam a conexao sem ver a UI de config

### Etapa 4 — Integrar na pagina Empresa

Inserir o componente `<WhatsAppIntegration />` entre `<SubscriptionInfoCard />` e o card "Dados Fiscais" (linha ~389 do Empresa.tsx). Condicionar exibicao a `isAdministrador`.

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar tabela `whatsapp_instances` |
| `supabase/functions/evolution-api/index.ts` | Criar edge function proxy |
| `src/components/empresa/WhatsAppIntegration.tsx` | Novo componente completo |
| `src/pages/Empresa.tsx` | Importar e renderizar o componente |

### Tratamento de erros

- Instancia ja existente: mensagem amigavel + sugestao de novo nome
- QR Code expirado: auto-refresh com contador de tentativas (max 3)
- Falha de conexao com API: toast de erro + botao "Tentar novamente"
- Numero invalido: validacao client-side antes de enviar
- Timeout: cancelar polling apos 2 minutos sem conexao

### Seguranca

- RLS por `user_id` com `get_effective_user_id`
- JWT validado na edge function
- Secrets protegidos server-side
- Isolamento multi-tenant via `UNIQUE(user_id)`


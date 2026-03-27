

## Plano: Corrigir inconsistencia de dados nas mensagens WhatsApp agendadas

### Causa raiz identificada

A tabela `agendamentos_pacotes` armazena `nome_cliente` e `whatsapp` como **campos de texto desnormalizados**, sem referencia (`cliente_id`) a tabela `clientes`. O pacote `63a64ffe` foi criado com:
- `nome_cliente`: "Alan Henrique"
- `whatsapp`: 61991531020

Porem, na tabela `clientes`, o numero `61991531020` pertence a **"Mara"**. "Alan Henrique" nem existe como cliente cadastrado para este usuario. O sistema usa corretamente os dados do pacote para gerar mensagens, resultando em mensagens com "Oi, Alan!" enviadas para o numero da Mara.

Isso acontece porque o formulario de pacotes permite digitar um nome de cliente manualmente sem validar contra o cadastro real. O whatsapp eh preenchido automaticamente com base no primeiro cliente encontrado com o nome digitado, mas se o usuario alterar o nome depois, o whatsapp permanece do cliente anterior.

### Solucao em 3 frentes

**1. Validacao pre-envio na Edge Function (whatsapp-scheduler)**

No Stage B, apos extrair dados do pacote (linhas 327-374), adicionar validacao cruzada:
- Buscar o cliente real na tabela `clientes` usando `user_id` + `numero_whatsapp` (normalizado)
- Se o `nome_cliente` do pacote **divergir** do `nome_cliente` do cadastro:
  - Usar o nome do cadastro como fonte de verdade para gerar a mensagem
  - Registrar a divergencia no campo `erro` como aviso (sem bloquear envio)
- Se nenhum cliente for encontrado pelo numero, usar os dados do pacote como fallback

Mesma validacao para agendamentos avulsos (linhas 286-326): buscar cliente por `cliente_id` ou por `whatsapp` quando `cliente_id` for null.

```text
// Pseudocodigo apos extrair dados do pacote:
const { data: clienteReal } = await supabase
  .from("clientes")
  .select("nome_cliente")
  .eq("user_id", msg.user_id)
  .eq("whatsapp", pacoteAtual.whatsapp) // numero original
  .limit(1);

if (clienteReal && clienteReal.nome_cliente.trim() !== pacoteAtual.nome_cliente.trim()) {
  // Usar nome do cadastro
  extracted.nomeCliente = clienteReal.nome_cliente;
}
```

**2. Validacao no frontend ao criar/editar pacotes**

No `Agendamentos.tsx`, funcao `handlePacoteSubmit` (linha 1420):
- Antes de inserir, verificar se `pacoteFormData.nomeCliente` corresponde a um cliente existente no array `clientes` com o mesmo `whatsapp`
- Se houver divergencia, exibir `toast.error` e bloquear a criacao

No `handleAtualizarAgendamento` (linha 2372):
- Mesma validacao ao editar

**3. Correcao em massa dos registros pendentes**

Via SQL (insert tool), atualizar mensagens pendentes existentes:
- Buscar todas as mensagens pendentes ligadas a `agendamentos_pacotes`
- Para cada uma, cruzar o `numero_whatsapp` com a tabela `clientes`
- Se o nome no texto da mensagem divergir do cadastro, regenerar a mensagem com os dados corretos

```text
-- Identificar mensagens com divergencia:
SELECT wm.id, wm.mensagem, ap.nome_cliente as pacote_nome, c.nome_cliente as cadastro_nome
FROM whatsapp_mensagens_agendadas wm
JOIN agendamentos_pacotes ap ON ap.id = wm.agendamento_pacote_id
JOIN clientes c ON c.user_id = wm.user_id 
  AND regexp_replace(c.whatsapp, '\D','','g') = regexp_replace(ap.whatsapp, '\D','','g')
WHERE wm.status = 'pendente'
  AND trim(ap.nome_cliente) <> trim(c.nome_cliente);
```

As mensagens divergentes terao suas `mensagem` regeneradas pela edge function na proxima execucao (pois o Stage B ja regenera o texto com dados atuais — agora usando o nome correto do cadastro).

### Alteracoes por arquivo

**`supabase/functions/whatsapp-scheduler/index.ts`**
- Stage B: Adicionar busca do cliente real por `whatsapp` + `user_id` antes de construir `extracted`
- Substituir `nomeCliente` do pacote/agendamento pelo nome do cadastro quando houver divergencia
- Aplica-se tanto para agendamentos avulsos (quando `cliente_id` eh null) quanto para pacotes

**`src/pages/Agendamentos.tsx`**
- `handlePacoteSubmit`: Validar que `pacoteFormData.nomeCliente` + `pacoteFormData.whatsapp` correspondem a um cliente real no array `clientes`
- `handleSubmit` (agendamento simples): Mesma validacao
- Exibir erro claro caso haja inconsistencia

### Resultado

- Mensagens pendentes com dados inconsistentes serao automaticamente corrigidas na proxima execucao do scheduler
- Novos agendamentos/pacotes so serao criados se os dados do cliente forem consistentes com o cadastro
- O nome exibido nas mensagens sempre refletira o cadastro oficial do cliente, nao o texto digitado manualmente


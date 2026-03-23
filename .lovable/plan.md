

## Enviar Mensagem WhatsApp via Evolution API ao Clicar no Ícone

### O que será feito

Substituir o comportamento atual do ícone do WhatsApp na tabela de agendamentos do dia (que abre `wa.me` em nova aba) por envio direto via Evolution API, com fila de 10 segundos entre mensagens e feedback visual ao usuário.

### Alterações — Arquivo: `src/pages/Agendamentos.tsx`

**1. Armazenar `instance_name` no state**

Ao carregar o status do WhatsApp no `loadRelatedData`, salvar também o `instance_name` num state `whatsappInstanceName`.

**2. Nova função `enviarWhatsAppDireto`**

Função que:
- Recebe o agendamento da tabela (tipo simples ou pacote)
- Monta a mensagem conforme os 3 templates (avulso, pacote não-último, pacote último) com as regras de sexo do pet (`do/da`, concordância)
- Busca o sexo do pet na lista de clientes carregada
- Formata o número no padrão E.164 (55 + dígitos)
- Verifica se WhatsApp está conectado; se não, mostra toast de erro
- Controla fila com intervalo de 10s entre envios (variável `lastSendTime` em ref)
- Se a última mensagem foi enviada há menos de 10s, agenda o envio com `setTimeout` e mostra toast "Mensagem na fila"
- Chama `supabase.functions.invoke("evolution-api", { body: { action: "send-message", instanceName, number, text } })`
- Mostra toast de sucesso/erro

**3. Templates de mensagem (3 variantes):**

- **Avulso**: `Oi, [PrimeiroNome]! ... *Pacote de serviços:* Sem Pacote 😕 ... *[Bordão]*`
- **Pacote (não último)**: `Oi, [PrimeiroNome]! ... *N° do Pacote:* [numero] ... *[Bordão]*`
- **Pacote (último)**: Mesmo + texto de renovação: "Notei que hoje finalizamos o pacote atual..."

Todos com concordância de sexo do pet (`do/da`).

**4. Substituir `onClick` dos botões WhatsApp (linhas 3946-3968)**

Trocar `abrirWhatsApp(gerarUrlWhatsApp...)` por `enviarWhatsAppDireto(agendamento)`.

**5. Fallback**

Se WhatsApp não estiver conectado (`whatsappConnected === false`), manter o comportamento atual de abrir `wa.me` como fallback, com toast informando que o envio automático não está disponível.

### Detalhes técnicos

- Usar `useRef` para controlar `lastSendTimestamp` e a fila de envios pendentes
- A fila é local (em memória), processada com `setTimeout` de 10s
- A mensagem é enviada server-side via edge function `evolution-api` action `send-message`
- Nenhuma alteração de banco de dados necessária


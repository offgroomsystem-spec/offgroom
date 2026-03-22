

## Corrigir Status WhatsApp + Enviar Mensagem de Teste

### Problema Identificado

A edge function `evolution-api` usa `supabase.auth.getClaims(token)` para validar o JWT, mas esse método pode não estar disponível na versão do Supabase JS usada no runtime do Deno. Resultado: todas as chamadas do frontend retornam 401, o status nunca atualiza no banco (ficou travado em "connecting"), e a UI mostra "Conectando..." eternamente.

Confirmação: ao chamar a edge function diretamente com service role, a Evolution API retorna `state: "open"` (conectado). O problema é exclusivamente na autenticação do JWT na edge function.

### Sobre a mensagem de teste

Não encontrei um agendamento da pet Cruela para o dia 23/03/2026. Os últimos agendamentos da Cruela (cliente Daniela, WhatsApp 61993167416) são de 27/01/2026. Após corrigir o status e confirmar o funcionamento, posso enviar uma mensagem de teste para esse número com o conteúdo que desejar, ou você pode criar o agendamento primeiro.

### Alterações

**1. Edge Function `supabase/functions/evolution-api/index.ts`**

Substituir `supabase.auth.getClaims(token)` por `supabase.auth.getUser(token)`, que é o método padrão e confiável para validar JWTs:

```typescript
// ANTES (linha ~50-53):
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return jsonResponse({ error: "Unauthorized" }, 401);
}

// DEPOIS:
const { data: userData, error: userError } = await supabase.auth.getUser(token);
if (userError || !userData?.user) {
  return jsonResponse({ error: "Unauthorized" }, 401);
}
```

**2. Componente `WhatsAppIntegration.tsx`**

Adicionar log de erro no `checkLiveStatus` para facilitar debug futuro, e garantir que ao carregar a página, se o status no DB for "connecting", ele força uma verificação live imediata (já faz isso, mas o catch silencia o erro).

**3. Atualizar status no banco**

Após o fix do edge function, o `checkLiveStatus` vai funcionar e automaticamente atualizar o status de "connecting" para "connected" no banco e na UI.

### Resultado esperado

- Ao acessar /empresa, o card mostrará "Conectado" com ícone verde
- A edge function aceitará chamadas autenticadas do frontend
- O envio de mensagens de teste ficará funcional


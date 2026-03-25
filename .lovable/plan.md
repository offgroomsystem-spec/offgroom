

## Plano: Enviar mensagem WhatsApp diretamente via Evolution API ao clicar no botao

### Resumo

Alterar o botao de WhatsApp na tabela de Clientes em Risco para enviar a mensagem automaticamente via Evolution API (em vez de abrir link wa.me). Seguir o mesmo padrao ja usado em `Agendamentos.tsx`.

### Alteracoes

**Arquivo: `src/components/relatorios/clientes/ClientesEmRisco.tsx`**

1. Adicionar estados para controlar a instancia WhatsApp:
   - `whatsappInstanceName` e `whatsappConnected` (carregados no `useEffect` inicial)
   - `enviandoWhatsApp` (string | null) para indicar qual cliente esta enviando

2. No `useEffect` de carregamento, buscar a instancia WhatsApp do usuario:
   - Query `whatsapp_instances` pelo `ownerId`
   - Verificar status via `supabase.functions.invoke("evolution-api", { action: "check-status" })`

3. Substituir `abrirWhatsAppAgrupado` por `enviarWhatsAppDireto`:
   - Se instancia conectada: chamar `supabase.functions.invoke("evolution-api", { action: "send-message", instanceName, number, text })`
   - Se nao conectada: fallback para link wa.me (comportamento atual)
   - Mostrar toast de sucesso/erro
   - Setar estado `enviandoWhatsApp` com o id do cliente durante o envio (spinner no botao)

4. Atualizar o botao na tabela:
   - Mostrar `Loader2` spinner enquanto envia
   - Desabilitar botao durante envio

### Detalhes tecnicos

Padrao de envio (mesmo de Agendamentos.tsx):
```typescript
const res = await supabase.functions.invoke("evolution-api", {
  body: { action: "send-message", instanceName, number: numeroCompleto, text: mensagem }
});
```

Numero formatado: remover nao-digitos, prefixar "55" se necessario.


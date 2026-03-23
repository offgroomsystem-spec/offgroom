

## Corrigir Status WhatsApp na Página de Agendamentos

### Problema

A página `/agendamentos` lê o status do WhatsApp diretamente do banco de dados (`whatsapp_instances.status`), sem verificar o status real na Evolution API. A página `/empresa` faz uma verificação live (via edge function `evolution-api`) e atualiza o banco. Se o usuário abre `/agendamentos` antes de `/empresa`, ou se o banco ficou com valor desatualizado, o indicador mostra "Desconectado" mesmo estando conectado.

### Solução

Adicionar verificação live do status na página `/agendamentos`, similar ao que já é feito em `WhatsAppIntegration.tsx`:

**Arquivo: `src/pages/Agendamentos.tsx`**

1. Após ler o `whatsapp_instances` do banco, se houver instância com `instance_name`, chamar a edge function `evolution-api` com `action: "check-status"` para obter o status real
2. Mapear o estado retornado (`open` → `connected`, `close` → `disconnected`)
3. Atualizar o banco com o status correto (para que futuras leituras também estejam certas)
4. Atualizar o state `whatsappConnected` com o valor real

Trecho da lógica a adicionar no `loadRelatedData`:

```typescript
const { data: whatsappData } = await supabase
  .from("whatsapp_instances")
  .select("status, instance_name")
  .eq("user_id", ownerId)
  .maybeSingle();

if (whatsappData?.instance_name) {
  // Verificação live via Evolution API
  try {
    const res = await supabase.functions.invoke("evolution-api", {
      body: { action: "check-status", instanceName: whatsappData.instance_name }
    });
    const state = res.data?.instance?.state || res.data?.state || "disconnected";
    const isConnected = state === "open" || state === "connected";
    setWhatsappConnected(isConnected);
    // Atualizar banco se mudou
    const newStatus = isConnected ? "connected" : "disconnected";
    if (whatsappData.status !== newStatus) {
      await supabase.from("whatsapp_instances")
        .update({ status: newStatus })
        .eq("user_id", ownerId);
    }
  } catch {
    setWhatsappConnected(whatsappData?.status === "connected");
  }
} else {
  setWhatsappConnected(false);
}
```

### Resultado

O indicador na página de Agendamentos refletirá o status real da Evolution API, sincronizado com o que aparece na página `/empresa`.


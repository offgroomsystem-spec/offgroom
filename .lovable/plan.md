

## Plano: Unificar mensagens de lembrete 30min para multiplos pets do mesmo cliente

### Problema atual

A chave de agrupamento no edge function inclui `servicoNumero` na composicao. Isso impede a unificacao quando um pet eh avulso (`null`) e outro eh pacote (`"1/4"`), pois geram chaves diferentes. O `buildUnifiedReminderMessage` ja existe e ja gera o texto correto com plural, mas a separacao por `servicoNumero` impede que os pets sejam agrupados.

### Alteracoes

**Arquivo: `supabase/functions/whatsapp-scheduler/index.ts`**

1. **Ajustar chave de agrupamento (linha 404)**: Para mensagens do tipo `30min`, excluir `servicoNumero` e `taxiDog` da chave, agrupando apenas por `userId|numeroWhatsapp|tipoMensagem|data`. Isso garante que todos os pets do mesmo cliente no mesmo dia sejam unificados no lembrete.

```text
// Antes (todas as mensagens):
key = userId|numeroWhatsapp|tipoMensagem|data|servicoNumero|taxiDog

// Depois (30min):
key = userId|numeroWhatsapp|30min|data

// Depois (demais tipos):
key = userId|numeroWhatsapp|tipoMensagem|data|servicoNumero|taxiDog
```

**Arquivo: `src/utils/whatsappScheduler.ts`**

2. **Atualizar `buildReminderMessage` para aceitar multiplos pets**: Mesma logica de concatenacao de nomes e genero plural que ja existe no edge function, para consistencia caso a mensagem seja pre-visualizada no frontend.

### Formato da mensagem (ja implementado no `buildUnifiedReminderMessage`, sem alteracao)

**1 pet:**
```text
Oi Rodrygo! 😄

Não esqueça de trazer o Rex hoje às 08:00.

Esse horário estamos por aqui prontos para receber ele! 🐾💙
```

**2+ pets:**
```text
Oi Rodrygo! 😄

Não esqueça de trazer o Rex e Luna hoje às 08:00.

Esse horário estamos por aqui prontos para receber eles! 🐾💙
```

### Resultado

Ao ter dois ou mais pets do mesmo cliente agendados para o mesmo dia com Taxi Dog "Nao", o lembrete de 30min sera enviado como uma unica mensagem unificada listando todos os nomes dos pets.


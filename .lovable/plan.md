

## Plano: Unificar mensagens com servicos diferentes listando servico por pet

### Resumo

Alterar a logica de agrupamento para agrupar por `userId + numeroWhatsapp + tipoMensagem + data + servicoNumero + taxiDog` (removendo `servico` da chave). Quando os servicos forem diferentes, listar cada servico por pet. Quando iguais, manter linha unica.

### Alteracoes

**Arquivo: `supabase/functions/whatsapp-scheduler/index.ts`**

1. **Mudar chave de agrupamento** (linha 395): remover `servico` da chave composta, agrupando apenas por `userId|numeroWhatsapp|tipoMensagem|data|servicoNumero|taxiDog`

2. **Atualizar `buildUnifiedConfirmationMessage`** para receber `petInfos` com servico por pet:
   - Novo tipo: `Array<{nome: string, sexo: string, servico: string}>`
   - Se todos os servicos iguais → linha unica `*Serviço:* BANHO...`
   - Se servicos diferentes → uma linha por pet: `*Serviço Cachorro grande 2:* Taxi dog\n*Serviço Teste Grande:* BANHO...`

3. **Atualizar `buildUnifiedReminderMessage`** — sem mudanca no formato (nao menciona servico)

4. **Ajustar chamada no loop de grupos** (linhas 416-441): passar servico de cada pet no `petInfos` array, e adaptar a chamada da funcao

### Formato da mensagem

**Servicos diferentes (avulso):**
```text
Oi, Rodrygo! Passando apenas para confirmar o agendamento do Cachorro grande 2 e Teste Grande com a gente.

*Dia:* 25/03/2026
*Horario:* 08:00
*Serviço Cachorro grande 2:* Taxi dog
*Serviço Teste Grande:* BANHO PORTE GRANDE BULDOG
*Pacote de serviços:* Sem Pacote 😕
*Taxi Dog:* Não

*Seu Pet é mais feliz com Denguinho*
```

**Servicos iguais (avulso):**
```text
Oi, Rodrygo! ...

*Dia:* 25/03/2026
*Horario:* 08:00
*Serviço:* BANHO PORTE GRANDE BULDOG
*Pacote de serviços:* Sem Pacote 😕
*Taxi Dog:* Não

*Seu Pet é mais feliz com Denguinho*
```

Mesma logica para pacotes (com `*N° do Pacote:*` em vez de `*Pacote de serviços:*`).

### Tambem atualizar `whatsappScheduler.ts` (frontend)

Aplicar a mesma logica nas funcoes `buildConfirmationMessage` e `buildUnifiedConfirmationMessage` do frontend para manter consistencia caso mensagens sejam pre-visualizadas.


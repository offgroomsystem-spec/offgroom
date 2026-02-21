

## Plano: Corrigir status "processando" e rejeicao da NFe

### Problemas identificados

1. **Status preso em "processando"**: O mapeamento de status na edge function usa `"rejeitada"` mas a API retorna `"rejeitado"` (masculino). O valor nao e encontrado no map e cai no fallback "processando".

2. **Mensagem de erro nao aparece**: O codigo busca `nfeData.motivo_rejeicao`, mas o campo real na resposta da API e `nfeData.autorizacao.motivo_status`.

3. **NFe rejeitada (codigo 719)**: A SEFAZ rejeitou porque o bloco `dest` foi omitido quando o cliente nao tem CPF/CNPJ. A SEFAZ exige o bloco `dest` mesmo sem documento -- basta enviar `xNome` junto com `idEstrangeiro` vazio ou usar uma estrutura minima aceita.

---

### Correcoes

#### 1. Edge function `supabase/functions/nuvem-fiscal/index.ts`

**statusMap** - Adicionar as variantes masculinas retornadas pela API:
- `"rejeitado"` -> `"rejeitada"`
- `"autorizado"` -> `"autorizada"`
- `"cancelado"` -> `"cancelada"`
- Manter tambem as femininas para compatibilidade

**mensagem_erro** - Buscar o motivo de rejeicao no caminho correto:
- Tentar `nfeData.autorizacao?.motivo_status` primeiro
- Fallback para `nfeData.motivo_rejeicao`

Aplicar as mesmas correcoes no bloco `consultar_nfse`.

#### 2. Frontend `src/pages/ControleFinanceiro.tsx`

**Bloco `dest` sem CPF/CNPJ** - Quando o usuario clica "Nao" no modal (sem documento), em vez de omitir `dest` inteiramente, enviar o bloco com a estrutura minima que a SEFAZ aceita. Conforme o schema XML da NFe, o campo `dest` exige ao menos um de: `CNPJ`, `CPF` ou `idEstrangeiro`. Usar `idEstrangeiro` vazio (string vazia) como indicador de consumidor final sem identificacao, seguido de `xNome` e `indIEDest: 9`.

---

### Detalhes tecnicos

**Arquivo: `supabase/functions/nuvem-fiscal/index.ts`**

Bloco `consultar_nfe` (linhas 211-217):
```typescript
const statusMap: Record<string, string> = {
  autorizada: "autorizada",
  autorizado: "autorizada",
  rejeitada: "rejeitada",
  rejeitado: "rejeitada",
  cancelada: "cancelada",
  cancelado: "cancelada",
  processando: "processando",
};
```

Mensagem de erro (linha 226):
```typescript
const autorizacao = nfeData.autorizacao as Record<string, unknown> | undefined;
mensagem_erro: autorizacao?.motivo_status as string 
  || nfeData.motivo_rejeicao as string 
  || null,
```

Mesmas alteracoes para o bloco `consultar_nfse`.

**Arquivo: `src/pages/ControleFinanceiro.tsx`**

Quando nao ha CPF/CNPJ, montar `dest` com `idEstrangeiro` vazio:
```typescript
// Sem documento: usar idEstrangeiro vazio para consumidor final
destObj.idEstrangeiro = "";
destObj.xNome = clienteData.nome_cliente;
destObj.indIEDest = 9;
```

#### 3. Correcao imediata no banco

Atualizar o registro existente que esta preso em "processando" para refletir o status real de "rejeitada" com a mensagem de erro correta.


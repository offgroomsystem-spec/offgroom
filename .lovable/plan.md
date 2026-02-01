
# Plano: Resetar Leads e Adicionar Filtro por DDD

## Resumo do Pedido

O usuário precisa de duas funcionalidades:

1. **Resetar todos os leads** que têm mensagens enviadas ("Enviou Mensagem: Sim") para o estado inicial:
   - Tentativa: 0/5
   - Enviou Mensagem: Não
   - Status: Novo
   - Próximo Passo: Recalculado

2. **Novo filtro por DDD** ao lado do botão "Sem Contato":
   - Permite selecionar múltiplos DDDs
   - Lista todos os DDDs disponíveis no banco
   - Se nenhum DDD selecionado, não filtra
   - Botão para limpar seleção

---

## Parte 1: Resetar Leads (Operação Única no Banco)

### Dados Atuais do Banco

| Situação | Quantidade |
|----------|------------|
| Leads com tentativa > 0 | 350 |
| Registros em crm_mensagens | 351 |

### Ações Necessárias

1. **Atualizar tabela `crm_leads`**:
   - SET `tentativa = 0`
   - SET `status = 'Novo'`
   - SET `proximo_passo` = data de hoje (lead novo volta à primeira abordagem)
   - WHERE `tentativa > 0`

2. **Limpar tabela `crm_mensagens`**:
   - DELETE todos os registros (histórico de mensagens enviadas)

### SQL a Executar via Migração

```sql
-- Resetar todos os leads com mensagens enviadas
UPDATE crm_leads 
SET 
  tentativa = 0,
  status = 'Novo',
  proximo_passo = CURRENT_DATE,
  updated_at = NOW()
WHERE tentativa > 0;

-- Limpar histórico de mensagens
DELETE FROM crm_mensagens;
```

---

## Parte 2: Novo Filtro por DDD

### DDDs Disponíveis (dados reais do banco)

| DDD | Cidade/Região | Total de Leads |
|-----|---------------|----------------|
| 11 | São Paulo | 2.335 |
| 19 | Campinas | 117 |
| 61 | Brasília | 24 |
| 67 | Campo Grande | 13 |
| 12 | Vale do Paraíba | 6 |
| 51 | Porto Alegre | 5 |
| 21 | Rio de Janeiro | 4 |
| + outros | ... | ... |

### Implementação no Código

#### 1. Novo Estado para DDDs Selecionados

```typescript
const [selectedDDDs, setSelectedDDDs] = useState<string[]>([]);
```

#### 2. Calcular DDDs Disponíveis (useMemo)

```typescript
const availableDDDs = useMemo(() => {
  const dddCount = new Map<string, number>();
  
  leads.forEach(lead => {
    const phone = lead.telefone_empresa || '';
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length >= 10) {
      const ddd = digits.substring(0, 2);
      dddCount.set(ddd, (dddCount.get(ddd) || 0) + 1);
    }
  });
  
  // Ordenar por quantidade de leads (maior primeiro)
  return Array.from(dddCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([ddd, count]) => ({ ddd, count }));
}, [leads]);
```

#### 3. Componente de Seleção Multi-DDD

Vou criar um Popover com checkboxes para cada DDD, similar ao padrão do Popover já usado no projeto:

```text
┌────────────────────────────────────────────────────────────────────┐
│  Tipo de contato: [Todos] [Celular] [Fixo] [Sem Contato]  [DDD ▼]  │
│                                                           ─────── │
│                                                           Badge   │
└────────────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
                                               ┌─────────────────────┐
                                               │ ☑ 11 - 2.335 leads  │
                                               │ ☐ 19 - 117 leads    │
                                               │ ☐ 61 - 24 leads     │
                                               │ ☐ 67 - 13 leads     │
                                               │ ...                 │
                                               │ ─────────────────── │
                                               │ [Limpar Seleção]    │
                                               └─────────────────────┘
```

#### 4. Adicionar Filtro no `filteredLeads`

```typescript
// Filtro: DDD selecionados
if (selectedDDDs.length > 0) {
  result = result.filter(lead => {
    const phone = lead.telefone_empresa || '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return false;
    const ddd = digits.substring(0, 2);
    return selectedDDDs.includes(ddd);
  });
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/CRMOffgroom.tsx` | Adicionar estado `selectedDDDs`, useMemo `availableDDDs`, Popover de seleção de DDDs, filtro no `filteredLeads` |
| Migração SQL | Resetar leads (tentativa=0, status='Novo') e limpar crm_mensagens |

---

## Detalhes da Interface do Filtro DDD

### Posicionamento

O botão ficará à **direita** do botão "Sem Contato", na mesma linha:

```text
Tipo de contato: [Todos] [Celular] [Fixo] [Sem Contato] [Filtrar DDD (3)]
```

### Comportamento

1. **Nenhum DDD selecionado**: Não filtra por DDD (mostra todos)
2. **Um ou mais DDDs selecionados**: Mostra apenas leads com DDDs selecionados
3. **Badge**: Mostra quantidade de DDDs selecionados
4. **Botão Limpar**: Dentro do Popover, limpa toda a seleção

### Exemplo de Uso

- Usuário quer enviar mensagens apenas para leads de São Paulo (11):
  1. Clica em "Filtrar DDD"
  2. Marca checkbox "11 - 2.335 leads"
  3. Lista mostra apenas leads com DDD 11

- Usuário quer enviar para São Paulo e Campinas:
  1. Marca checkboxes "11" e "19"
  2. Lista mostra leads de ambos os DDDs

---

## Resumo das Alterações

### Migração (SQL)
- UPDATE `crm_leads` SET tentativa=0, status='Novo', proximo_passo=CURRENT_DATE WHERE tentativa > 0
- DELETE FROM `crm_mensagens`

### Código (CRMOffgroom.tsx)
- Novo estado: `selectedDDDs`
- Novo useMemo: `availableDDDs`
- Novo componente: Popover com checkboxes de DDDs
- Modificação: `filteredLeads` para incluir filtro por DDD
- Adicionar import: `MapPin` do lucide-react para ícone do DDD

---

## Testes a Realizar

1. **Após migração:**
   - Verificar que todos os leads estão com tentativa = 0
   - Verificar que todos os leads estão com status = "Novo"
   - Verificar que crm_mensagens está vazia

2. **Filtro DDD:**
   - Selecionar DDD 11 → mostra apenas leads de SP
   - Selecionar DDDs 11 e 19 → mostra leads de SP e Campinas
   - Limpar seleção → mostra todos novamente
   - Verificar que o badge mostra quantidade correta

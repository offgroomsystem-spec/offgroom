

## Plano: Corrigir Relatório "Clientes em Risco"

### Problemas Confirmados

**1. Limite de 1000 linhas (BUG CRITICO)**
As queries buscam no maximo 1000 registros. Clientes antigos (os de maior risco) sao cortados. Precisa de paginacao.

**2. Chave por nome ao inves de ID**
A chave `${cliente}_${pet}` pode mesclar dados de clientes diferentes com nomes iguais. Usar `cliente_id` quando disponivel.

### O que NAO muda (conforme sua observacao)

- O status do agendamento NAO e considerado na logica — apenas a data. Isso esta correto e sera mantido.
- O fallback para `data_venda` nos pacotes sera mantido como esta.

### Alteracoes

**Arquivo: `src/components/relatorios/clientes/ClientesEmRisco.tsx`**

1. **Paginacao nas queries**: Buscar `agendamentos` e `agendamentos_pacotes` em blocos de 1000 ate esgotar os dados, garantindo que todos os registros sejam analisados.

2. **Chave com `cliente_id`**: Alterar a chave do mapa para `${a.cliente_id || a.cliente}_${a.pet}` nos agendamentos simples, evitando colisao entre clientes com nomes identicos.

### Resumo

| Item | Acao |
|---|---|
| Limite 1000 linhas | Adicionar loop de paginacao |
| Chave duplicada | Usar `cliente_id` quando disponivel |
| Status "concluido" | Manter como esta (nao usado) |
| Fallback `data_venda` | Manter como esta |


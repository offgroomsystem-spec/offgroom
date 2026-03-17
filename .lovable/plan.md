

## Correção: Remover duplicatas de cliente+pet no relatório de Pacotes Expirados

### Problema

O loop itera sobre cada `agendamentos_pacotes` individualmente. Quando um mesmo cliente+pet possui múltiplos pacotes expirados (ex: Charles/Nick com 3 pacotes vendidos), cada um gera uma entrada separada na lista, resultando em duplicatas.

### Solução

Após montar a lista `pacotesExpiradosLista`, aplicar uma deduplicação por chave `nomeCliente+nomePet` (normalizada em lowercase/trim). Para cada combinação duplicada, manter apenas a entrada com a data de último agendamento mais recente.

### Alteração em `PacotesExpirados.tsx`

Após o loop `for...of` que popula `pacotesExpiradosLista` (antes do `setPacotes`), adicionar lógica de deduplicação:

- Criar um `Map<string, PacoteExpirado>` com chave `cliente_pet` normalizada
- Para cada item, se a chave já existe no Map, manter o que tem `dataUltimoAgendamento` mais recente
- Converter o Map de volta para array e passar para `setPacotes`

Isso garante que cada combinação cliente+pet apareça apenas uma vez, com as informações mais atualizadas.


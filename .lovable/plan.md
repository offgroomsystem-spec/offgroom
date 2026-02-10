

# Adicionar Filtro "Descricao 2" e Reposicionar "Fornecedor"

## Resumo

Duas alteracoes na area de filtros do Controle Financeiro:
1. Adicionar o listbox "Descricao 2" com logica condicional (depende de Tipo e Descricao 1)
2. Mover o listbox "Fornecedor" para ficar ao lado esquerdo de "Data do Pagamento"

---

## Alteracoes no arquivo `src/pages/ControleFinanceiro.tsx`

### 1. Estado dos filtros (~linha 650)

Adicionar `descricao2: ""` ao objeto `filtros`.

### 2. Limpar filtros (~linha 1121)

Adicionar `descricao2: ""` ao `limparFiltros`.

### 3. Logica de filtragem (~linha 1189)

Adicionar apos o filtro de `descricao1`:

```typescript
if (filtros.descricao2) {
  resultado = resultado.filter((l) => l.descricao2 === filtros.descricao2);
}
```

### 4. Reset condicional dos filtros dependentes

Quando o usuario trocar o valor de `tipo` no filtro, limpar `descricao1` e `descricao2`. Quando trocar `descricao1`, limpar `descricao2`. Isso sera feito nos `onValueChange` dos respectivos Selects.

### 5. Reordenar campos na grid de filtros (~linhas 1981-2156)

A nova ordem dos campos na grid sera:

1. Nome do Pet
2. Nome do Cliente
3. Tipo
4. Descricao 1
5. **Descricao 2** (novo - condicional, habilitado somente se `descricao1` estiver preenchido, opcoes vindas de `categoriasDescricao2[filtros.descricao1]`)
6. **Fornecedor** (movido - antes estava no final)
7. Data do Pagamento
8. Banco
9. Foi Pago

### 6. Campo "Descricao 2" - UI

Select condicional que:
- Fica desabilitado se `filtros.descricao1` estiver vazio
- Exibe as opcoes de `categoriasDescricao2[filtros.descricao1]` quando preenchido
- Placeholder "Selecione desc. 1" quando desabilitado, "Selecione" quando habilitado

---

## Detalhes Tecnicos

| Aspecto | Detalhe |
|---------|---------|
| Arquivo modificado | `src/pages/ControleFinanceiro.tsx` |
| Banco de dados | Nenhuma alteracao necessaria |
| Componente Descricao 2 | Select padrao (mesmo estilo de Descricao 1) |
| Logica condicional | `categoriasDescricao2` ja existe no codigo (linha 122) e sera reutilizado |
| Posicao Fornecedor | Movido para antes de "Data do Pagamento" na grid |




# Sincronizar categorias Descrição 1 e Descrição 2 do Fluxo de Caixa com o Controle Financeiro

## Problema

As listas de opcoes de "Descricao 1" e "Descricao 2" no FluxoDeCaixa.tsx estao diferentes do ControleFinanceiro.tsx. Exemplos:

| Campo | ControleFinanceiro (correto) | FluxoDeCaixa (incorreto) |
|-------|------------------------------|--------------------------|
| Descricao 1 (Despesa) | Despesa Fixa, **Despesa Operacional**, Despesa Nao Operacional | Despesa Fixa, **Despesa Variavel**, Despesa Nao Operacional |
| Despesa Operacional | Combustivel, Contador, Freelancer, Telefonia e internet, Energia eletrica, Agua e esgoto, Publicidade e marketing, Produtos para Banho, Material de Limpeza, Outras Despesas Operacionais | *(nao existe — usa "Despesa Variavel" com opcoes diferentes)* |
| Despesa Nao Operacional | Manutencao, Reparos, **Retirada Caixa**, **Retirada Socio**, Outras Despesas Nao Operacionais | Manutencao, Reparos, Outras Despesas Nao Operacionais |

## Solucao

Substituir os objetos `categoriasDescricao1` e `categoriasDescricao2` no FluxoDeCaixa.tsx (linhas 138-156) pelos valores identicos do ControleFinanceiro.tsx.

## Arquivo: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

### Alteracao unica (linhas 138-156)

Substituir por:

```typescript
const categoriasDescricao1 = {
  Receita: ["Receita Operacional", "Receita Não Operacional"],
  Despesa: ["Despesa Fixa", "Despesa Operacional", "Despesa Não Operacional"],
};

const categoriasDescricao2: { [key: string]: string[] } = {
  "Receita Operacional": ["Serviços", "Venda", "Outras Receitas Operacionais"],
  "Receita Não Operacional": ["Venda de Ativo", "Outras Receitas Não Operacionais"],
  "Despesa Fixa": ["Aluguel", "Salários", "Impostos Fixos", "Outras Despesas Fixas"],
  "Despesa Operacional": [
    "Combustível",
    "Contador",
    "Freelancer",
    "Telefonia e internet",
    "Energia elétrica",
    "Água e esgoto",
    "Publicidade e marketing",
    "Produtos para Banho",
    "Material de Limpeza",
    "Outras Despesas Operacionais",
  ],
  "Despesa Não Operacional": [
    "Manutenção",
    "Reparos",
    "Retirada Caixa",
    "Retirada Sócio",
    "Outras Despesas Não Operacionais",
  ],
};
```

Apenas 1 arquivo alterado, 1 bloco de codigo substituido. Nenhuma alteracao no banco de dados.


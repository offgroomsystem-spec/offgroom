

## Plano: Toggle Dedução/Juros nos Formulários Financeiros

### Resumo
Adicionar um toggle (Dedução | Juros) nos formulários de Lançar e Editar Financeiro, tanto em `/controle-financeiro` quanto no Fluxo de Caixa (`/relatorios`). Quando "Juros" estiver selecionado, o valor soma ao total em vez de subtrair. Ambos exigem preenchimento do motivo/tipo quando valor >= 0.01.

### Alterações no Banco de Dados

**Migração**: Adicionar 3 colunas na tabela `lancamentos_financeiros`:
- `valor_juros` (numeric, default 0) — valor do juros
- `tipo_juros` (text, nullable) — motivo do juros  
- `modo_ajuste` (text, default 'deducao') — indica se o lançamento usa dedução ou juros

### Alterações nos Arquivos

**1. `src/pages/ControleFinanceiro.tsx`** (4 seções de mudança):

- **Interface/Estado**: Adicionar `valorJuros`, `tipoJuros`, `modoAjuste` ao formData e interface `Lancamento`
- **Validação (criar e editar)**: Se `modoAjuste === 'deducao'` e `valorDeducao >= 0.01`, exigir `tipoDeducao`. Se `modoAjuste === 'juros'` e `valorJuros >= 0.01`, exigir `tipoJuros`. Ajustar cálculo do valor total: `subtotal - deducao + juros` (apenas um ativo por vez)
- **Salvamento (criar e editar)**: Incluir `valor_juros`, `tipo_juros`, `modo_ajuste` no insert/update
- **UI (Lançar e Editar)**: Substituir o bloco de dedução por:
  - Toggle com 2 opções: "Dedução" (esquerda) e "Juros" (direita)
  - Quando Dedução: campos atuais (Valor da Dedução + Tipo de Dedução com opções Tarifa Bancária/Desconto)
  - Quando Juros: "Valor do Juros" (input numérico) + "Motivo do Juros" (select com opções como "Juros de Mora", "Multa", "Correção Monetária")
  - Valor Total recalculado: `subtotal + juros` quando modo juros, `subtotal - dedução` quando modo dedução
  - Detalhamento abaixo mostrando o cálculo

**2. `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`** (mesmas 4 seções):
- Mesma lógica aplicada nos formulários de Lançar e Editar do Fluxo de Caixa

### Detalhes Técnicos

- O toggle será implementado com dois botões estilizados lado a lado (não um componente Toggle do radix, para manter visual compacto e consistente)
- Estado `modoAjuste`: `'deducao' | 'juros'`, default `'deducao'`
- Ao trocar o toggle, zerar os valores do modo anterior (`valorDeducao=0, tipoDeducao=''` ou `valorJuros=0, tipoJuros=''`)
- Cálculo do valor total: `subtotal - (modoAjuste === 'deducao' ? valorDeducao : 0) + (modoAjuste === 'juros' ? valorJuros : 0)`
- Ao carregar lançamento existente para edição, definir `modoAjuste` baseado nos dados salvos


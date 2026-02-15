

# Emissao Automatica de Notas Fiscais a partir de Lancamentos Financeiros

## Resumo

Adicionar botoes de emissao de NFe e NFSe diretamente no formulario de edicao de lancamentos financeiros em `ControleFinanceiro.tsx`, com logica condicional baseada no tipo de receita, status de pagamento e itens do lancamento.

---

## Logica de Exibicao dos Botoes

O sistema analisara os itens (`itensLancamento`) do lancamento em edicao para determinar quais botoes exibir:

- **Condicoes gerais**: `formData.tipo === "Receita"` E `formData.pago === true`
- **Botao "Emitir NFS-e"**: quando existem itens com `descricao2 === "Servicos"`
- **Botao "Emitir NF-e"**: quando existem itens com `descricao2 === "Venda"`
- **Ambos os botoes**: quando o lancamento tem itens de ambos os tipos
- **Nenhum botao**: quando o lancamento e despesa, nao esta pago, ou nao tem itens de servicos/venda

---

## Verificacao de Nota Ja Emitida

Antes de exibir os botoes, o sistema consulta a tabela `notas_fiscais` para verificar se ja existe uma nota vinculada ao `lancamento_id` do lancamento em edicao. Se ja foi emitida, exibe um badge de status ("Emitida", "Processando") ao inves do botao.

---

## Fluxo de Emissao

1. Usuario clica em "Emitir NFS-e" ou "Emitir NF-e"
2. AlertDialog de confirmacao aparece: "Tem certeza que deseja gerar a NFS-e/NF-e?"
3. Ao confirmar:
   - Busca dados da empresa (`empresa_config`) e do cliente (`clientes`) 
   - Filtra itens do lancamento conforme o tipo (servicos ou venda)
   - Monta o payload da API Nuvem Fiscal
   - Chama a edge function `nuvem-fiscal` com a acao correspondente
   - Registra na tabela `notas_fiscais` com `lancamento_id` vinculado
   - Consulta o status e baixa o PDF automaticamente
   - Abre o PDF em nova janela do navegador

---

## Alteracoes Tecnicas

### 1. `src/pages/ControleFinanceiro.tsx`

**Novos imports**: `FileText` do lucide-react, `useNotasFiscais` e `callNuvemFiscal`

**Novos estados**:
- `emitindoNota` (boolean) -- loading durante emissao
- `notaEmitidaInfo` -- informacao de nota ja emitida para o lancamento atual
- `confirmEmissaoTipo` -- tipo de nota sendo confirmada ('NFe' | 'NFSe' | null)

**Nova logica no formulario de edicao** (linhas ~2823, area dos botoes):
- Calcular `temServicos` e `temVenda` a partir de `itensLancamento`
- Verificar se nota ja foi emitida para o `lancamentoSelecionado.id`
- Renderizar botoes condicionalmente a esquerda do "Cancelar"

**AlertDialog de confirmacao de emissao**:
- Texto dinamico conforme tipo (NFe/NFSe)
- Ao confirmar, executa funcao `handleEmitirNota(tipo)`

**Funcao `handleEmitirNota(tipo: 'NFe' | 'NFSe')`**:
- Busca `empresa_config` do usuario
- Busca dados completos do cliente via `clientes` (CPF/CNPJ, endereco)
- Filtra itens: servicos para NFSe, venda para NFe
- Para cada item de servico, busca dados fiscais de `servicos` (codigo municipal, aliquota ISS)
- Para cada item de produto, busca dados fiscais de `produtos` (NCM, CFOP, unidade, origem)
- Monta payload conforme API Nuvem Fiscal
- Chama edge function
- Insere registro em `notas_fiscais` com `lancamento_id`
- Aguarda processamento, baixa PDF e abre em nova janela via `window.open`

### 2. `src/hooks/useNotasFiscais.ts`

**Adicionar funcao exportada**: `callNuvemFiscal` (ja existe, apenas exportar)

**Modificar `baixarPdf`**: em vez de fazer download, abrir em nova janela com `window.open` para compatibilidade com impressao fiscal

### 3. Edge function `supabase/functions/nuvem-fiscal/index.ts`

Sem alteracoes necessarias -- ja suporta todas as acoes requeridas (emitir_nfe, emitir_nfse, baixar_pdf_nfe, baixar_pdf_nfse, consultar)

---

## Posicionamento dos Botoes no Layout

```text
[ Emitir NFS-e ] [ Emitir NF-e ]          [ Cancelar ] [ Atualizar ]
```

Os botoes de emissao ficam a esquerda, com `variant="outline"` e icone `FileText`, em cor verde para NFSe e azul para NFe. O "Cancelar" e "Atualizar" permanecem a direita com `justify-between` no container.

---

## Prevencao de Emissao Duplicada

Ao abrir o dialog de edicao (`abrirEdicao`), o sistema consulta `notas_fiscais` filtrando por `lancamento_id` e `tipo` para verificar se ja existe nota emitida. Se existir com status `autorizada` ou `processando`, o botao correspondente e substituido por um badge informativo.


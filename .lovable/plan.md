

## Plano: Modal de CPF/CNPJ opcional na emissão de NF-e

### O que será feito

Quando o usuário clicar em "Emitir NF-e", o sistema verificará se o cliente possui CPF/CNPJ cadastrado. Se não possuir, um modal será exibido perguntando se deseja informar o documento, com campo de digitação validado. O usuário poderá prosseguir com ou sem o documento.

### Fluxo

1. Clique em "Emitir NF-e" abre o dialog de confirmacao atual
2. Ao confirmar ("Sim, Emitir"), o sistema verifica se o cliente tem CPF/CNPJ
3. **Se tem**: emite normalmente com o documento
4. **Se nao tem**: abre modal intermediario perguntando se quer inserir CPF/CNPJ
   - Campo aceita somente numeros (11 para CPF, 14 para CNPJ)
   - Botao "Sim": exige que o campo tenha exatamente 11 ou 14 digitos, e prossegue com emissao incluindo o documento
   - Botao "Nao": prossegue sem documento (dest sem CPF/CNPJ, apenas xNome)

---

### Detalhes tecnicos

**Arquivo**: `src/pages/ControleFinanceiro.tsx`

1. **Novos estados**:
   - `showCpfCnpjModal` (boolean) - controla visibilidade do modal
   - `cpfCnpjManual` (string) - valor digitado no campo
   - `pendingNfeTipo` (string) - armazena o tipo pendente para continuar apos o modal

2. **Alteracao no fluxo `handleEmitirNota`**:
   - Antes de montar o payload NFe, verificar se o cliente tem `cpf_cnpj`
   - Se nao tem, abrir o modal e interromper (return)
   - Criar funcao `handleCpfCnpjModalConfirm(comDocumento: boolean)` que continua a emissao

3. **Alteracao no bloco `dest`**:
   - Aceitar um parametro opcional `cpfCnpjOverride` que vem do modal
   - Se fornecido, usar esse valor; senao, usar `clienteData.cpf_cnpj`
   - Se nenhum documento disponivel (usuario clicou "Nao"), montar `dest` apenas com `xNome` e `indIEDest` (sem CPF/CNPJ) -- ou omitir `dest` se o schema exigir

4. **Novo Dialog** (usando componentes Dialog existentes):
   - Titulo: "Gostaria de inserir o numero de CPF/CNPJ na NF-e?"
   - Campo Input: `type="text"`, filtra para somente numeros, maxLength 14
   - Validacao: aceita exatamente 11 ou 14 digitos
   - Botoes "Sim" (valida e prossegue) e "Nao" (prossegue sem documento)


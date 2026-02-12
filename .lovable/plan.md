

# Corrigir ListBox do Pet que nao fecha apos selecao

## Problema

O mesmo comportamento de loop que existia no campo "Nome do Cliente" esta ocorrendo no campo "Nome do Pet". Ao selecionar um pet, o `useEffect` de filtragem detecta a mudanca no valor de `petSearch` / `simplePetSearch` e re-executa a busca, reabrindo a lista.

## Solucao

Aplicar a mesma estrategia de refs de controle ja utilizada com sucesso no campo de cliente.

## Arquivo: `src/pages/Agendamentos.tsx`

### 1. Criar duas novas refs (junto as refs existentes, linha ~539)

- `simplePetJustSelected = useRef(false)` -- para o formulario de Agendamento Simples
- `petJustSelected = useRef(false)` -- para o formulario de Pacotes

### 2. Marcar as refs nos handlers de selecao

- Em `handleSimplePetSelect` (linha 843): antes de `setSimplePetSearch(nomePet)`, setar `simplePetJustSelected.current = true`
- Em `handlePetSelect` (linha 713): antes de `setPetSearch(nomePet)`, setar `petJustSelected.current = true`

### 3. Verificar as refs nos useEffects de filtragem de pet

- No useEffect de busca de pets do Pacotes (linha 627): no inicio, verificar se `petJustSelected.current` e `true`. Se sim, resetar para `false` e retornar sem filtrar
- No useEffect de busca de pets do Agendamento Simples (linha 664): mesma logica com `simplePetJustSelected.current`

## Resultado

Ao selecionar um pet, o campo de texto sera preenchido com o nome, mas o useEffect nao reabrira a lista naquele ciclo. Na proxima digitacao do usuario, a ref ja estara resetada e a busca funcionara normalmente -- comportamento identico ao ajuste ja feito para o campo de cliente.


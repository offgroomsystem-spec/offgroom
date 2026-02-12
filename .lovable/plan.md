
# Corrigir ListBox do Cliente que nao fecha apos selecao

## Problema

Ao selecionar um cliente na ListBox (tanto em "Novo Agendamento" quanto em "Novo Pacote"), a lista nao fecha. Isso acontece porque:

1. O handler `handleSimpleClienteSelect` define `setSimpleClienteSearch("Juliana")` e `setSimpleFilteredClientes([])`
2. Porem, existe um `useEffect` que observa `simpleClienteSearch` -- quando o valor muda para "Juliana", o useEffect roda novamente, filtra os clientes e reabre a lista com o resultado encontrado
3. O mesmo ocorre no formulario de Pacotes com `handleClienteSelect`, `clienteSearch` e `filteredClientes`

## Solucao

Adicionar uma variavel de controle (ref) que indica quando uma selecao foi feita, para que o `useEffect` de filtragem ignore a mudanca no campo de busca nesse momento.

## Arquivo: `src/pages/Agendamentos.tsx`

### 1. Criar refs de controle (junto aos outros estados, por volta da linha 535)

Criar dois `useRef<boolean>`:
- `simpleClienteJustSelected` -- para o formulario de Agendamento Simples
- `clienteJustSelected` -- para o formulario de Pacotes

### 2. Marcar a ref como `true` nos handlers de selecao

- Em `handleSimpleClienteSelect` (linha 800): antes de `setSimpleClienteSearch(nomeCliente)`, setar `simpleClienteJustSelected.current = true`
- Em `handleClienteSelect` (linha 671): antes de `setClienteSearch(nomeCliente)`, setar `clienteJustSelected.current = true`

### 3. Verificar a ref nos useEffects de filtragem

- No useEffect de busca de clientes do Agendamento Simples (linha 638): no inicio, verificar se `simpleClienteJustSelected.current` e `true`. Se sim, resetar para `false` e retornar sem filtrar
- No useEffect de busca de clientes do Pacotes (linha 605): mesma logica com `clienteJustSelected.current`

## Resultado

Ao selecionar um cliente, o campo de texto e preenchido com o nome, mas o `useEffect` nao reabrira a lista pois a ref de controle impede a filtragem naquele ciclo. Na proxima digitacao do usuario, a ref ja estara resetada e a busca funcionara normalmente.

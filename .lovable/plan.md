

# Plano: Correção de Seleção Cliente/Pet e Lançamento Financeiro de Pacotes

## Diagnóstico dos Problemas Identificados

### Problema 1: Dropdown de Pets Não Mostra Todos os Pets de Clientes com Mesmo Nome

**Causa raiz:** Quando você seleciona "Jessica" no campo "Nome do Cliente", o código usa `clientes.find()` (linha 666), que retorna **apenas o primeiro cliente** com esse nome. Como existem duas clientes chamadas "Jessica":
- Jessica 1 (ID: `e6c5...`) → dono do **Pingo**
- Jessica 2 (ID: `9daa...`) → dona de **Amora** e **Pompom**

O sistema só encontra a primeira Jessica e mostra apenas o pet dela (Pingo).

**Solução:** Modificar `petsFormulario` para usar `clientes.filter()` em vez de `clientes.find()`, coletando **todos os clientes** com o mesmo nome e retornando **todos os pets** associados a eles.

---

### Problema 2: Botão "+ Pet" Aparece Incorretamente

**Causa raiz:** A lógica do botão "+ Pet" (linhas 1292-1373) depende de encontrar o cliente correto. Como usa a mesma lógica quebrada do problema 1, quando você seleciona "Pingo" (Jessica 1), o sistema encontra a Jessica correta e vê que ela só tem 1 pet, mas o botão aparece porque a lógica não está filtrando corretamente.

**Solução:** Ajustar a lógica para encontrar o **cliente específico** dono do pet selecionado (não qualquer cliente com o mesmo nome), e só mostrar o botão se esse cliente tiver mais de 1 pet.

---

### Problema 3: Erro "Cliente/Pet não encontrado ou não correspondem"

**Causa raiz:** Quando você:
1. Procura primeiro pelo pet "Pompom"
2. O sistema auto-preenche o cliente "Jessica" (da Jessica 2)
3. Ao salvar, a validação (linha 762) usa `clientes.find()` que retorna a **primeira Jessica** (Jessica 1)
4. Como Pompom pertence à Jessica 2, e não à Jessica 1, a validação `p.clienteId === cliente?.id` falha

**Solução:** Modificar a lógica de validação no `handleSubmit` para:
1. Encontrar **todos os clientes** com o nome selecionado
2. Procurar o pet em **qualquer um deles**
3. Usar o cliente correto (dono do pet encontrado)

---

### Problema 4: Lançamento Financeiro Automático para Pacotes

**Status:** O código **JÁ ESTÁ IMPLEMENTADO** na linha 1274 do `Agendamentos.tsx`:
```typescript
criarLancamentoFinanceiroPacote({
  nomeCliente: pacoteFormData.nomeCliente,
  nomePet: pacoteFormData.nomePet,
  nomePacote: pacoteFormData.nomePacote,
  dataVenda: pacoteFormData.dataVenda,
  primeiraDataServico: primeiraDataServico,
  ownerId: ownerId || "",
});
```

**Possível causa de falha:** A função `criarLancamentoFinanceiroPacote` pode estar falhando silenciosamente se:
- O cliente não for encontrado pelo nome (mesmo problema dos clientes duplicados)
- O pacote não for encontrado pelo nome
- A conta bancária não existir

**Solução:** Adicionar logging/toast para confirmar execução e revisar a função para lidar com clientes de mesmo nome (usando o pet para desambiguar).

---

## Implementação Detalhada

### Arquivo 1: `src/pages/ControleFinanceiro.tsx`

#### Alteração 1.1: Corrigir `petsFormulario` (linhas 659-671)

**De:**
```typescript
const petsFormulario = useMemo(() => {
  if (!formData.nomeCliente) {
    return [...new Set(pets.map((p) => p.nomePet))];
  }
  // Encontrar o ID do cliente selecionado
  const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
  if (!clienteSelecionado) return [];

  // Retornar apenas os pets deste cliente
  return pets.filter((p) => p.clienteId === clienteSelecionado.id).map((p) => p.nomePet);
}, [formData.nomeCliente, clientes, pets]);
```

**Para:**
```typescript
const petsFormulario = useMemo(() => {
  if (!formData.nomeCliente) {
    return [...new Set(pets.map((p) => p.nomePet))];
  }
  // Encontrar TODOS os clientes com o mesmo nome
  const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
  if (clientesComMesmoNome.length === 0) return [];

  // Retornar os pets de TODOS os clientes com esse nome
  const petsDoCliente = pets.filter((p) => 
    clientesComMesmoNome.some((c) => c.id === p.clienteId)
  );
  return [...new Set(petsDoCliente.map((p) => p.nomePet))];
}, [formData.nomeCliente, clientes, pets]);
```

#### Alteração 1.2: Corrigir validação no `handleSubmit` (linhas 761-779)

**De:**
```typescript
if (clientePetObrigatorios) {
  const cliente = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
  const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente?.id);

  if (!pet || !cliente) {
    toast.error("Cliente/Pet não encontrado ou não correspondem!");
    return;
  }
  clienteId = cliente.id;
}
```

**Para:**
```typescript
if (clientePetObrigatorios) {
  // Encontrar TODOS os clientes com o mesmo nome
  const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
  
  // Procurar o pet em qualquer um desses clientes
  let clienteEncontrado = null;
  let petEncontrado = null;
  
  for (const cliente of clientesComMesmoNome) {
    const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
    if (pet) {
      clienteEncontrado = cliente;
      petEncontrado = pet;
      break;
    }
  }

  if (!petEncontrado || !clienteEncontrado) {
    toast.error("Cliente/Pet não encontrado ou não correspondem!");
    return;
  }
  clienteId = clienteEncontrado.id;
}
```

#### Alteração 1.3: Corrigir mesma lógica em `handleEditar` (linhas 919-937)

Aplicar a mesma correção da Alteração 1.2.

#### Alteração 1.4: Corrigir lógica do petIds (linhas 787-790)

**De:**
```typescript
const cliente = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
const petPrincipal = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente?.id);
```

**Para:**
```typescript
// Encontrar o cliente correto baseado no pet selecionado
const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
let clienteCorreto = null;
let petPrincipal = null;

for (const cliente of clientesComMesmoNome) {
  const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
  if (pet) {
    clienteCorreto = cliente;
    petPrincipal = pet;
    break;
  }
}
```

#### Alteração 1.5: Corrigir lógica do botão "+ Pet" (linhas 1304-1327)

Verificar se a lógica já está correta. Analisando o código existente, a lógica do botão JÁ usa `clientes.filter()` corretamente (linha 1307), então deve funcionar após as outras correções.

---

### Arquivo 2: `src/hooks/useCriarLancamentoAutomatico.ts`

#### Alteração 2.1: Melhorar `criarLancamentoFinanceiroPacote` para lidar com clientes duplicados

A função atual busca o cliente apenas pelo nome e pega o primeiro encontrado. Precisamos ajustar para:
1. Primeiro encontrar o pet pelo nome
2. Usar o `cliente_id` do pet encontrado para garantir o cliente correto

**De:** (linhas 145-176)
```typescript
// 1. Buscar cliente_id pelo nome
const { data: clientesData } = await supabase
  .from("clientes")
  .select("id")
  .eq("user_id", ownerId)
  .ilike("nome_cliente", nomeCliente)
  .limit(1);

const clienteId = clientesData?.[0]?.id || null;

// 2. Buscar pet_id pelo nome e cliente_id
let petId: string | null = null;
if (clienteId) {
  const { data: petsData } = await supabase
    .from("pets")
    .select("id")
    .eq("user_id", ownerId)
    .eq("cliente_id", clienteId)
    .ilike("nome_pet", nomePet)
    .limit(1);
  
  petId = petsData?.[0]?.id || null;
}
```

**Para:**
```typescript
// 1. Primeiro buscar o pet pelo nome (pode retornar múltiplos)
const { data: petsData } = await supabase
  .from("pets")
  .select("id, cliente_id")
  .eq("user_id", ownerId)
  .ilike("nome_pet", nomePet);

// 2. Buscar todos os clientes com o nome fornecido
const { data: clientesData } = await supabase
  .from("clientes")
  .select("id")
  .eq("user_id", ownerId)
  .ilike("nome_cliente", nomeCliente);

// 3. Encontrar o pet que pertence a um cliente com o nome correto
let petId: string | null = null;
let clienteId: string | null = null;

if (petsData && clientesData) {
  const clienteIds = clientesData.map((c: any) => c.id);
  const petDoCliente = petsData.find((p: any) => clienteIds.includes(p.cliente_id));
  
  if (petDoCliente) {
    petId = petDoCliente.id;
    clienteId = petDoCliente.cliente_id;
  }
}

// Fallback: se não encontrou combinação, usar o primeiro de cada
if (!clienteId && clientesData && clientesData.length > 0) {
  clienteId = clientesData[0].id;
}
if (!petId && petsData && petsData.length > 0) {
  petId = petsData[0].id;
}
```

#### Alteração 2.2: Adicionar logging para debug

```typescript
console.log(`Lançamento financeiro de pacote - Cliente: ${nomeCliente}, Pet: ${nomePet}, Pacote: ${nomePacote}, Valor: R$ ${valorPacote}`);
```

---

## Resumo das Alterações

| Arquivo | Alteração | Descrição |
|---------|-----------|-----------|
| `ControleFinanceiro.tsx` | `petsFormulario` | Usar `filter()` para encontrar todos os clientes com mesmo nome |
| `ControleFinanceiro.tsx` | `handleSubmit` validação | Loop por todos os clientes para encontrar o par cliente/pet correto |
| `ControleFinanceiro.tsx` | `handleEditar` validação | Mesma correção do `handleSubmit` |
| `ControleFinanceiro.tsx` | `petIds` preparação | Encontrar cliente correto baseado no pet |
| `useCriarLancamentoAutomatico.ts` | `criarLancamentoFinanceiroPacote` | Buscar pet primeiro, depois encontrar cliente correspondente |

---

## Testes a Realizar Após Implementação

1. **Teste de dropdown de pets:**
   - Selecionar "Jessica" no campo Cliente
   - Verificar se aparecem Pingo, Amora e Pompom no dropdown de Pets

2. **Teste do botão "+ Pet":**
   - Selecionar "Jessica" e depois "Pingo" → botão NÃO deve aparecer
   - Selecionar "Jessica" e depois "Amora" → botão DEVE aparecer

3. **Teste de validação pet primeiro:**
   - Procurar "Pompom" no campo Pet
   - Verificar que "Jessica" é preenchida automaticamente
   - Clicar em "Salvar" → deve funcionar SEM erro

4. **Teste de lançamento de pacote:**
   - Agendar um novo pacote
   - Verificar se o lançamento financeiro foi criado em Controle Financeiro


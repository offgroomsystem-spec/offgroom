

# Plano: Corrigir Loop Infinito na Seleção de Cliente/Pet com Nomes Duplicados

## Diagnóstico do Problema

### Causa Raiz Identificada

O loop infinito ocorre porque **ambos os handlers** (`onChange` do Cliente e `onChange` do Pet) usam `clientes.find()` que sempre retorna a **primeira** Jessica (dona do Pingo), mas a Amora e Pompom pertencem à **segunda** Jessica.

**Fluxo do bug:**

```text
┌──────────────────────────────────────────────────────────────────┐
│  1. Usuário seleciona Cliente "Jessica"                         │
│     → find() retorna Jessica 1 (ID: e6c5..., dona do Pingo)     │
│     → Pet atual = "Pompom" (pertence à Jessica 2)               │
│     → petAtual.clienteId !== novoCliente.id = TRUE              │
│     → Executa: setFormData(..., nomePet: "")  ← LIMPA PET!     │
├──────────────────────────────────────────────────────────────────┤
│  2. Re-render → Usuário tenta selecionar Pet "Pompom"           │
│     → Cliente selecionado = "Jessica"                            │
│     → find() retorna Jessica 1 (ID: e6c5...)                    │
│     → Pompom não pertence à Jessica 1                            │
│     → petSelecionado = undefined                                 │
│     → Executa: setFormData(..., nomeCliente: "") ← LIMPA CLIENTE│
├──────────────────────────────────────────────────────────────────┤
│  3. Re-render → Loop infinito!                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Solução

Modificar **ambos os handlers** para usar `clientes.filter()` e fazer a validação **correta** considerando todos os clientes com o mesmo nome.

---

## Implementação Detalhada

### Arquivo: `src/pages/ControleFinanceiro.tsx`

#### Alteração 1: Handler `onChange` do Cliente (linhas 1317-1329)

**Problema atual:**
```typescript
onChange={(value) => {
  if (formData.tipo === "Despesa") return;
  const novoCliente = clientes.find((c) => c.nomeCliente === value);
  if (novoCliente && formData.nomePet) {
    const petAtual = pets.find((p) => p.nomePet === formData.nomePet);
    if (petAtual && petAtual.clienteId !== novoCliente.id) {
      setFormData({ ...formData, nomeCliente: value, nomePet: "" }); // LIMPA PET!
    } else {
      setFormData({ ...formData, nomeCliente: value });
    }
  } else {
    setFormData({ ...formData, nomeCliente: value });
  }
}}
```

**Solução:**
```typescript
onChange={(value) => {
  if (formData.tipo === "Despesa") return;
  
  // Buscar TODOS os clientes com o mesmo nome
  const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === value);
  
  if (clientesComMesmoNome.length > 0 && formData.nomePet) {
    // Verificar se o pet atual pertence a ALGUM cliente com esse nome
    const petAtual = pets.find((p) => p.nomePet === formData.nomePet);
    const petPertenceAoCliente = petAtual && clientesComMesmoNome.some(c => c.id === petAtual.clienteId);
    
    if (!petPertenceAoCliente) {
      // Pet não pertence a nenhum cliente com esse nome, limpar
      setFormData({ ...formData, nomeCliente: value, nomePet: "", petsSelecionados: [] });
    } else {
      // Pet pertence a um dos clientes com esse nome, manter
      setFormData({ ...formData, nomeCliente: value });
    }
  } else {
    setFormData({ ...formData, nomeCliente: value });
  }
}}
```

#### Alteração 2: Handler `onChange` do Pet (linhas 1455-1466)

**Problema atual:**
```typescript
} else {
  const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
  const petSelecionado = pets.find(
    (p) => p.nomePet === value && p.clienteId === clienteSelecionado?.id,
  );

  if (petSelecionado) {
    setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
  } else {
    setFormData({ ...formData, nomePet: value, nomeCliente: "", petsSelecionados: [] }); // LIMPA CLIENTE!
  }
}
```

**Solução:**
```typescript
} else {
  // Buscar TODOS os clientes com o mesmo nome
  const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
  
  // Verificar se o pet pertence a ALGUM cliente com esse nome
  const petPertenceAAlgum = pets.find(
    (p) => p.nomePet === value && clientesComMesmoNome.some(c => c.id === p.clienteId)
  );

  if (petPertenceAAlgum) {
    // Pet pertence a um dos clientes com esse nome, manter cliente
    setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
  } else {
    // Pet não pertence a nenhum cliente com esse nome
    // Buscar o dono real do pet e atualizar o cliente
    const petReal = pets.find((p) => p.nomePet === value);
    if (petReal) {
      const donoReal = clientes.find((c) => c.id === petReal.clienteId);
      if (donoReal) {
        setFormData({ ...formData, nomePet: value, nomeCliente: donoReal.nomeCliente, petsSelecionados: [] });
      } else {
        setFormData({ ...formData, nomePet: value, nomeCliente: "", petsSelecionados: [] });
      }
    } else {
      setFormData({ ...formData, nomePet: value, nomeCliente: "", petsSelecionados: [] });
    }
  }
}
```

---

## Resumo das Alterações

| Local | Linha | Problema | Solução |
|-------|-------|----------|---------|
| onChange Cliente | 1317-1329 | `find()` retorna só o primeiro cliente | Usar `filter()` e verificar se pet pertence a **algum** cliente com esse nome |
| onChange Pet | 1455-1466 | `find()` retorna só o primeiro cliente | Usar `filter()` e verificar se pet pertence a **algum** cliente com esse nome |

---

## Testes a Realizar Após Implementação

1. **Testar seleção Cliente → Pet:**
   - Selecionar "Jessica" no Cliente
   - Selecionar "Pompom" no Pet
   - **Esperado:** Ambos permanecem selecionados, SEM loop

2. **Testar seleção Pet → Cliente:**
   - Selecionar "Amora" no Pet (sem cliente selecionado)
   - **Esperado:** Cliente "Jessica" é preenchido automaticamente

3. **Testar cliente com pet único:**
   - Selecionar "Jessica" e depois "Pingo"
   - **Esperado:** Funciona normalmente, sem loop

4. **Testar troca de pet entre clientes diferentes:**
   - Selecionar Jessica → Pompom
   - Depois selecionar outro cliente (ex: "Maria")
   - **Esperado:** Pet deve ser limpo (porque Pompom não pertence a Maria)


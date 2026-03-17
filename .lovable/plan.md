

## Correção: Filtragem de serviços por porte do pet no agendamento

### Problema reportado
Ao selecionar um pet com raça "Buldogue" e porte "grande", a listbox de serviços não exibe apenas os serviços de porte grande como esperado.

### Análise

Inspecionei o código de filtragem em `servicosFiltradosPorPorte` (linhas 479-503 de `Agendamentos.tsx`). A lógica busca o pet nos clientes comparando `p.nome === formData.pet && p.raca === formData.raca`, obtém o `porte` do pet, e filtra os serviços via `normalizarPorte`.

Dados no banco:
- Pet "Argus" → `porte: "grande"`, `raca: "BULDOGUE"`
- Serviços de porte grande → `porte: "Grande"`
- `normalizarPorte` converte ambos para `"grande"` → deveria funcionar

**Possível causa raiz**: O `useMemo` depende de `[formData.pet, formData.raca, servicos, clientes]`, mas a busca do pet dentro do memo não filtra pelo cliente selecionado. Se houver múltiplos pets com o mesmo nome em clientes diferentes (ou se `formData.cliente` estiver vazio nesse momento), o primeiro pet encontrado na iteração pode ter um porte diferente do esperado.

Outra possibilidade: quando `handleSimplePetSelect` auto-define a raça (linha 882), o estado pode não ter sido atualizado no render em que o combobox de serviços é aberto.

### Solução proposta

**Arquivo**: `src/pages/Agendamentos.tsx`

1. **Melhorar a busca do pet no `servicosFiltradosPorPorte`** — adicionar `formData.cliente` como critério de busca para encontrar o pet correto quando o cliente já está selecionado:

```typescript
const servicosFiltradosPorPorte = useMemo(() => {
    if (!formData.raca || !formData.pet) {
      return servicos;
    }
    
    let portePet = "";
    
    // Se o cliente está selecionado, buscar apenas nos pets desse cliente
    if (formData.cliente) {
      const clientesComMesmoNome = clientes.filter(c => c.nomeCliente === formData.cliente);
      for (const cliente of clientesComMesmoNome) {
        const pet = cliente.pets.find(
          (p) => p.nome === formData.pet && p.raca === formData.raca
        );
        if (pet) {
          portePet = pet.porte;
          break;
        }
      }
    } else {
      // Fallback: buscar em todos os clientes
      for (const cliente of clientes) {
        const pet = cliente.pets.find(
          (p) => p.nome === formData.pet && p.raca === formData.raca
        );
        if (pet) {
          portePet = pet.porte;
          break;
        }
      }
    }
    
    if (!portePet) {
      return servicos;
    }
    
    const porteNormalizado = normalizarPorte(portePet);
    return servicos.filter(
      (s) => normalizarPorte(s.porte) === porteNormalizado
    );
}, [formData.pet, formData.raca, formData.cliente, servicos, clientes]);
```

2. **Adicionar `formData.cliente` à lista de dependências do useMemo** para garantir que a filtragem seja recalculada quando o cliente muda.

### Observação

A mudança principal é adicionar `formData.cliente` tanto na lógica de busca quanto nas dependências do useMemo, garantindo que o pet correto seja encontrado mesmo quando existem pets com nomes/raças iguais em clientes diferentes.


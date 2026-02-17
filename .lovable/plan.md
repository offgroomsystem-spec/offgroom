
# Prevencao de Cliques Duplicados no Botao Salvar

## Problema

Os formularios "Novo Agendamento" e "Agendar Pacote de Servicos" nao possuem protecao contra cliques multiplos. Quando o usuario clica repetidamente no botao "Salvar" ou "Agendar Pacote", cada clique dispara um novo insert no banco, criando registros duplicados.

## Correcao

### Arquivo: `src/pages/Agendamentos.tsx`

**1. Adicionar estado de loading:**

Criar um estado `salvando` (boolean) para controlar se uma operacao de salvamento esta em andamento.

```typescript
const [salvando, setSalvando] = useState(false);
```

**2. Proteger `handleSubmit` (Servico Avulso - linha 999):**

- Adicionar `if (salvando) return;` no inicio da funcao
- Envolver o bloco try/catch com `setSalvando(true)` antes e `setSalvando(false)` no finally

**3. Proteger `handlePacoteSubmit` (Pacote - linha 1231):**

- Mesma logica: guard no inicio + setSalvando no try/finally

**4. Desabilitar botao "Salvar" (linha 2373):**

```typescript
<Button type="submit" className="h-8 text-xs" disabled={salvando}>
  {salvando ? "Salvando..." : "Salvar"}
</Button>
```

**5. Desabilitar botao "Agendar Pacote" (linha 2660):**

```typescript
<Button type="submit" className="h-8 text-xs" disabled={salvando}>
  {salvando ? "Salvando..." : "Agendar Pacote"}
</Button>
```

Essa abordagem simples e suficiente: o estado `salvando` bloqueia tanto a logica da funcao (guard clause) quanto a interacao visual (botao desabilitado), impedindo duplicidades mesmo com cliques rapidos.

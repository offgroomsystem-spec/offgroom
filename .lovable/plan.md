
# Ajustar Ordenacao da Tabela de Agendamentos

## Problema

A ordenacao atual esta invertida nos criterios:
- **Atual**: Horario (crescente) como criterio principal, Data como secundario
- **Desejado**: Data do Agendamento (decrescente) como criterio principal, Horario (crescente) como secundario

## Alteracao

**Arquivo:** `src/pages/Agendamentos.tsx` (linha ~1682-1690)

Inverter a logica de ordenacao no `useMemo` de `agendamentosFiltrados`:

```typescript
// Ordenacao: primeiro por Data (decrescente), depois por Horario (crescente)
return filtrados.sort((a, b) => {
  // Primeiro criterio: Data do Agendamento (decrescente)
  const dataCompare = b.data.localeCompare(a.data);
  if (dataCompare !== 0) return dataCompare;

  // Segundo criterio: Horario (crescente)
  return a.horarioInicio.localeCompare(b.horarioInicio);
});
```

## Resultado

Para uma mesma data (ex: 06/01/2026), os horarios aparecerao em ordem crescente (08:10, 08:30, 08:45), e as datas serao agrupadas da mais recente para a mais antiga.

Apenas 1 arquivo sera alterado, sem impacto em banco de dados.

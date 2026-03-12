

## Correção: Sincronizar "Data da Venda" com "Data do Agendamento"

### Problema
O `useEffect` na linha 955 só preenche `dataVenda` quando está vazio (`!formData.dataVenda`). Após o primeiro preenchimento automático, alterar a data do agendamento não atualiza mais a data da venda.

### Solução
Adicionar um state `dataVendaManual` (boolean) para rastrear se o usuário alterou manualmente a data da venda. A lógica será:

1. **Novo state**: `const [dataVendaManual, setDataVendaManual] = useState(false);`
2. **useEffect (linha ~955)**: Alterar condição para `if (formData.data && !dataVendaManual)` — sempre sincroniza, exceto se o usuário editou manualmente
3. **onChange do input "Data da Venda" (linha ~2337)**: Adicionar `setDataVendaManual(true)` para marcar que o usuário alterou manualmente
4. **onChange do input "Data do Agendamento" (linha ~2093)**: Adicionar `setDataVendaManual(false)` para resetar a flag quando a data do agendamento muda (assim a sincronização automática volta a funcionar)
5. **Reset do form** (linhas ~1097 e ~1121): Resetar `setDataVendaManual(false)`

### Arquivo
`src/pages/Agendamentos.tsx` — 5 pontos de alteração


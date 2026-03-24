

## Plano: Filtrar Serviços Extras por Porte do Pacote + Busca com Lupa

### Problema
O código atual já contém a lógica de filtragem por porte na seção "+ Serviços" do agendamento de pacotes (linhas 3231-3256), mas o servidor perdeu a conexão durante o build anterior ("server connection lost"), então as alterações provavelmente não foram aplicadas na preview. O usuário continua vendo todos os serviços sem filtro.

### Solução
Reescrever a seção do popover "+ Serviços" no agendamento de pacotes para garantir que:

1. **Filtragem por porte**: Ao abrir o popover de serviços extras, buscar o porte do pacote selecionado e filtrar os serviços para mostrar apenas:
   - Serviços com o mesmo porte do pacote (ex: "Grande")
   - Serviços cadastrados como "Todos" (para todos os portes)

2. **Campo de busca com lupa**: Usar o componente `Command` + `CommandInput` para incluir um campo de busca com ícone de lupa, permitindo localizar serviços rapidamente por nome.

### Arquivo alterado
- `src/pages/Agendamentos.tsx` — Seção do `PopoverContent` do botão "+ Serviços" (linhas ~3228-3256)

### Detalhes técnicos
- A lógica usa `normalizarPorte()` para comparação case-insensitive e sem acentos
- `pacotes.find(p => p.nome === pacoteFormData.nomePacote)` busca o pacote atual para extrair o porte
- `servicos.filter(s => normalizarPorte(s.porte) === normalizarPorte(portePacote) || normalizarPorte(s.porte) === "todos")` aplica o filtro
- O componente `Command`/`CommandInput`/`CommandGroup` do shadcn/ui fornece a busca integrada com ícone de lupa

A implementação é essencialmente a mesma que já está no código, mas será reaplicada para garantir que compile e funcione corretamente.


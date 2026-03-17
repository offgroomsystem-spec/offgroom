

## Adicionar coluna "Pronto" na tabela de agendamentos do dia

### Resumo
Adicionar uma nova coluna "Pronto" à direita da coluna "Whatsapp" na tabela de agendamentos diários, com cor de fundo `#B9DFAE`, contendo um ícone clicável que abre o WhatsApp com mensagem personalizada de "pet pronto" baseada no sexo do pet e status do Taxi Dog.

### Alterações

**Arquivo: `src/pages/Agendamentos.tsx`**

1. **Interface `Pet`** (linha 97): adicionar `sexo: string`

2. **Mapeamento de pets** (linha 358): incluir `sexo: pet.sexo || ""` ao montar os pets

3. **Função `gerarMensagemPronto`** (nova): criar função que recebe o agendamento do dia e gera a URL do WhatsApp com a lógica:
   - Buscar o pet nos clientes para obter o campo `sexo`
   - Se `sexo` vazio/null → tratar como "Macho"
   - Se `taxiDog === "Sim"`:
     ```
     Oii [PrimeiroNome]!

     Passando para avisar que [a/o] [NomePet] já está [pronta/pronto]!

     Já já o Taxi Dog chega e [ela/ele] estará indo de volta pra casa!
     ```
   - Se `taxiDog !== "Sim"`:
     ```
     Oii [PrimeiroNome]!

     Passando para avisar que [a/o] [NomePet] já está [pronta/pronto] para ir para casa!

     [Ela/Ele] está [ansiosa/ansioso] te esperando para [buscá-la/buscá-lo]!
     ```
   - URL: `https://api.whatsapp.com/send/?phone=55{numero}&text={mensagem}`

4. **Cabeçalho da tabela** (após linha 3551): adicionar `<th>` com título "Pronto" e fundo `#B9DFAE`

5. **Corpo da tabela** (após linha 3600): adicionar `<td>` com fundo `#B9DFAE` contendo ícone `fi fi-tr-comment-alt-check` clicável que chama `abrirWhatsApp` com a URL gerada pela função acima

6. **Busca do WhatsApp**: para agendamentos simples usar `agendamento.agendamentoOriginal.whatsapp`, para pacotes usar `agendamento.agendamentoPacote.whatsapp`


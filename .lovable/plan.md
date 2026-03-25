

## Plano: Unificar mensagens "Pet Pronto" para multiplos pets do mesmo cliente

### Problema
A funcao `handlePetProntoConfirm` (linha 1964) monta e envia a mensagem apenas para o pet clicado, sem buscar outros pets do mesmo cliente agendados para o mesmo dia.

### Alteracao

**Arquivo: `src/pages/Agendamentos.tsx` (linhas 1999-2021)**

Substituir a logica de montagem da mensagem "Pet Pronto" por:

1. **Buscar todos os pets do mesmo cliente no dia**: Filtrar `agendamentosDia` pelo mesmo `cliente` (nome do cliente) e mesmo `whatsapp`, coletando `{nome, sexo}` de cada pet encontrado.

2. **Nova funcao `buildPetProntoMessage`** que recebe `primeiroNome`, `pets: Array<{nome: string, sexo: string}>`, `taxiDog: string`:
   - **Concatenacao dos nomes**: 1 pet = "Rex"; 2 pets = "Rex e Luna"; 3+ = "Rex, Luna e Mel"
   - **Genero**: se todos femea → feminino plural; se misto ou todos macho → masculino plural; se 1 pet → singular conforme sexo
   - **Singular (1 pet):**
     - Taxi Sim: `Oii [Nome]!\nPassando para avisar que [o/a] [Pet] já está [pronto/pronta]!\nJá já o Taxi Dog chega e [ele/ela] estará indo de volta pra casa!`
     - Taxi Nao: `Oii [Nome]!\nPassando para avisar que [o/a] [Pet] já está [pronto/pronta] para ir para casa!\n[Ele/Ela] está [ansioso/ansiosa] te esperando para [buscá-lo/buscá-la]! 😌`
   - **Plural (2+ pets):**
     - Taxi Sim: `Oii [Nome]!\nPassando para avisar que [o/a] [Pet1 e Pet2] estão [prontos/prontas]!\nJá já o Taxi Dog chega e [eles/elas] estarão indo de volta pra casa!`
     - Taxi Nao: `Oii [Nome]!\nPassando para avisar que [o/a] [Pet1 e Pet2] estão [prontos/prontas] para ir para casa!\n[Eles/Elas] estão [ansiosos/ansiosas] te esperando para [buscá-los/buscá-las]! 😌`

3. O artigo antes dos nomes segue a regra: "o" se primeiro pet macho ou misto, "a" se primeiro pet femea (e todos femea).

4. **Sem alteracao** na logica de atualizacao de horario — continua atualizando apenas o agendamento clicado.

### Resultado
Ao clicar "Pet Pronto" para qualquer pet da Geane (por exemplo), o sistema encontra todos os pets dela no dia e envia uma unica mensagem unificada.


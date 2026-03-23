

## Corrigir Espaçamento das Mensagens WhatsApp

### Problema

As mensagens enviadas via Evolution API (manual e automática) usam `\n\n` (duas quebras de linha) entre cada campo, criando espaçamento duplo. O usuário quer apenas `\n` (uma quebra de linha) entre os campos, mantendo `\n\n` somente após a saudação inicial e antes do bordão/texto de renovação.

### Formato correto desejado

```text
Oi, [Nome]! Passando apenas para confirmar o agendamento [do/da] [Pet] com a gente.
\n
*Dia:* [Data]
*Horario:* [Hora]
*Serviço:* [Serviços]
*N° do Pacote:* [Numero]  (ou *Pacote de serviços:* Sem Pacote 😕)
*Taxi Dog:* [Sim/Não]
\n
[Texto renovação se último pacote]
\n
*[Bordão]*
```

Ou seja: `\n\n` após saudação, `\n` entre campos, `\n\n` antes de texto extra e bordão.

### Arquivos a alterar

**1. `src/pages/Agendamentos.tsx` — função `enviarWhatsAppDireto` (linhas ~1836-1843)**

Trocar `\n\n` entre campos por `\n`:

- Avulso: `...\n\n*Dia:*...\n*Horario:*...\n*Serviço:*...\n*Pacote de serviços:* Sem Pacote 😕\n*Taxi Dog:*...\n\n*[Bordão]*`
- Pacote (não último): `...\n\n*Dia:*...\n*Horario:*...\n*Serviço:*...\n*N° do Pacote:*...\n*Taxi Dog:*...\n\n*[Bordão]*`
- Pacote (último): `...\n\n*Dia:*...\n*Horario:*...\n*Serviço:*...\n*N° do Pacote:*...\n*Taxi Dog:*...\n\nNotei que hoje...\n\n*[Bordão]*`

**2. `src/utils/whatsappScheduler.ts` — função `buildConfirmationMessage` (linhas ~46-58)**

Aplicar a mesma correção nos 3 templates do scheduler automático.

**3. `src/utils/whatsappScheduler.ts` — variável `bordaoLine` (linha ~43)**

Alterar de `\n*${params.bordao}*` para `\n\n*${params.bordao}*` para manter separação antes do bordão.


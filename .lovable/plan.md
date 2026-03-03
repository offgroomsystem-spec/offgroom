

## Revisao Completa do Fluxo Fiscal - NFC-e/NFS-e

### Problemas Identificados

**1. RESEND_API_KEY nao configurada**
O secret `RESEND_API_KEY` nao existe no projeto. A edge function `enviar-nf-email` depende dele para funcionar. O envio automatico de email esta inoperante.

**2. Nao existe layout de impressao termica (80mm)**
Nenhum componente `DanfeNfce` ou layout de impressao termica foi encontrado no projeto. O PDF e aberto via `window.open` em nova aba, sem formatacao para 80mm.

**3. Botao "Emitir NF-e" ausente no dialog "Lançar Financeiro" (novo lancamento)**
Os botoes de emissao fiscal so aparecem no dialog "Editar Lançamento" (linhas 3228-3276). O dialog "Lançar Financeiro" (novo) nao tem botoes de NF — termina apenas com "Cancelar" e "Salvar Lançamento" (linha 2215-2222). O plano original pedia que aparecesse reativamente no cadastro novo tambem.

**4. Ambiente fixo em homologacao**
Ambos os payloads (NFe e NFSe) usam `ambiente: "homologacao"` e `tpAmb: 2` hardcoded. Nao ha configuracao para alternar para producao.

**5. Sem validacao de certificado digital**
Nao ha nenhuma verificacao de certificado digital (A1/A3) antes da emissao. O sistema depende da Nuvem Fiscal para isso, mas nao valida localmente se o certificado foi cadastrado na plataforma.

**6. Sem prevencao de emissao duplicada**
Nao ha verificacao se ja existe uma NF para o mesmo lancamento (`lancamento_id`) antes de emitir nova nota. O usuario pode clicar duas vezes e gerar duplicatas.

**7. Autenticacao OAuth e integracao Nuvem Fiscal funcionais**
O token OAuth usa `client_credentials` com cache em memoria e refresh automatico. A autenticacao esta correta.

**8. Status mapping funcional**
O mapeamento de status (autorizado/autorizada, rejeitado/rejeitada, cancelado/cancelada) esta implementado corretamente em `consultar_nfe` e `consultar_nfse`.

**9. Trigger de email apos autorizacao implementado**
Apos `consultar_nfe`/`consultar_nfse` detectar `autorizada`, a funcao dispara `enviar-nf-email` automaticamente. O fluxo owner/staff via `get_effective_user_id` esta correto.

**10. Cleanup de PDF implementado**
A edge function `cleanup-danfe-pdfs` e o cron job estao configurados. O cache de 3 dias esta funcional.

**11. Bug: `loadLancamentos` usa `user.id` em vez de `ownerId`**
Linha 438: `.eq("user_id", user.id)` deveria ser `.eq("user_id", ownerId)` — violando a regra de usar `ownerId` para staff.

---

### Plano de Implementacao

#### Tarefa 1: Configurar RESEND_API_KEY
Solicitar ao usuario a chave da API do Resend para habilitar o envio de emails fiscais.

#### Tarefa 2: Criar componente DanfeNfce para impressao termica 80mm
- Novo arquivo `src/components/fiscal/DanfeNfce.tsx`
- Layout fixo 80mm, margens zero, `@media print`
- QR Code centralizado (usando URL da chave de acesso)
- Chave de acesso formatada
- Dados obrigatorios: emitente, itens, totais, forma de pagamento
- Funcao `window.print()` automatica

#### Tarefa 3: Adicionar botoes de emissao NF no dialog "Lançar Financeiro"
- Replicar a logica reativa dos botoes (tipo=Receita, pago=sim, itens com Servicos/Venda) no dialog de novo lancamento
- O botao aparecera em tempo real conforme os campos sao preenchidos
- Ao clicar, salvar o lancamento primeiro, depois emitir a NF

#### Tarefa 4: Prevenir emissao duplicada
- Antes de emitir, verificar se ja existe registro em `notas_fiscais` com o mesmo `lancamento_id` e `tipo` e status diferente de `rejeitada`/`cancelada`
- Se existir, bloquear e exibir toast informativo

#### Tarefa 5: Corrigir bug de `user.id` vs `ownerId`
- Linha 438 de `ControleFinanceiro.tsx`: trocar `.eq("user_id", user.id)` por `.eq("user_id", ownerId)`

#### Tarefa 6: Configuracao de ambiente (homologacao/producao)
- Adicionar campo `ambiente_fiscal` na tabela `empresa_config` (valores: "homologacao" ou "producao")
- Usar esse campo nos payloads de emissao em vez do valor hardcoded
- Adicionar campo editavel na pagina `/empresa`

#### Tarefa 7: Validacao de certificado digital
- Antes de emitir, consultar `GET /empresas/{cnpj}/nfe` na Nuvem Fiscal para verificar se a configuracao existe
- Se nao existir, bloquear emissao e orientar o usuario a configurar via pagina Empresa

#### Tarefa 8: Tratamento de falha de email com log
- Na edge function `enviar-nf-email`, registrar falhas em uma tabela ou em logs detalhados
- Manter `email_enviado = false` em caso de falha para permitir reenvio futuro

---

### Detalhes Tecnicos

**Layout termico 80mm (CSS critico):**
```text
@media print {
  @page { size: 80mm auto; margin: 0; }
  body { width: 80mm; margin: 0; padding: 0; }
  font-size: 9px;
  QR Code: 120x120px centralizado
}
```

**Prevencao de duplicata (SQL):**
```text
SELECT id FROM notas_fiscais 
WHERE lancamento_id = ? AND tipo = ? 
AND status NOT IN ('rejeitada', 'cancelada')
LIMIT 1
```

**Novo campo na empresa_config:**
```text
ALTER TABLE empresa_config ADD COLUMN IF NOT EXISTS ambiente_fiscal text DEFAULT 'homologacao';
```

### Dependencia Critica
O envio automatico de email so funcionara apos a configuracao do `RESEND_API_KEY`. Tudo mais pode ser implementado imediatamente.


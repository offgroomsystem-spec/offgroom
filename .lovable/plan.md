

## Envio automatico de NF por email + cache de PDF com expiracao de 3 dias

### Situacao atual
- PDFs das DANFEs **nao sao armazenados** no banco. Sao buscados sob demanda da API Nuvem Fiscal via actions `baixar_pdf_nfe`/`baixar_pdf_nfse`.
- Nao existe nenhum mecanismo de envio de email no sistema.
- O campo `email_fiscal` ja existe na tabela `empresa_config` e e editavel na pagina `/empresa`.

### Alteracoes

#### 1. Coluna para cache de PDF na tabela `notas_fiscais`
**Migration SQL:**
- Adicionar `danfe_pdf_base64 text` (armazena o PDF em base64 temporariamente)
- Adicionar `danfe_pdf_cached_at timestamptz` (data em que o PDF foi cacheado)
- Adicionar `email_enviado boolean default false` (controle de envio)

#### 2. Edge function `cleanup-danfe-pdfs`
**Novo arquivo: `supabase/functions/cleanup-danfe-pdfs/index.ts`**
- Executada via cron job diario (pg_cron)
- Faz `UPDATE notas_fiscais SET danfe_pdf_base64 = NULL, danfe_pdf_cached_at = NULL WHERE danfe_pdf_cached_at < now() - interval '3 days'`
- Remove PDFs com mais de 3 dias corridos

#### 3. Cron job para limpeza diaria
- SQL via insert tool para registrar cron schedule chamando a edge function `cleanup-danfe-pdfs` uma vez por dia

#### 4. Edge function `enviar-nf-email`
**Novo arquivo: `supabase/functions/enviar-nf-email/index.ts`**
- Recebe `nota_id` como parametro
- Busca a nota fiscal no banco
- Busca o `email_fiscal` do **owner** (administrador) via `get_effective_user_id` — garantindo que staff envia para o email do admin
- Baixa o PDF da Nuvem Fiscal (se ainda nao cacheado)
- Salva o PDF em `danfe_pdf_base64` + `danfe_pdf_cached_at = now()`
- Envia o email com o PDF anexado usando Resend (necessita RESEND_API_KEY)
- Marca `email_enviado = true`

#### 5. Integracao no fluxo de emissao (edge function `nuvem-fiscal`)
- Apos emitir NFe/NFSe com sucesso e o status ser `autorizada` (na consulta), invocar automaticamente `enviar-nf-email`
- Alternativa: invocar no momento da consulta (`consultar_nfe`/`consultar_nfse`) quando o status muda para `autorizada`

#### 6. Logica de email do owner (staff → admin)
- Na edge function `enviar-nf-email`, usar `get_effective_user_id` para obter o `owner_id`
- Buscar `email_fiscal` da tabela `empresa_config` usando o `owner_id` (nao o user_id do staff)
- Isso garante que NFs geradas por funcionarios vao para o email do administrador

### Dependencia: API de envio de email
O sistema nao possui servico de email configurado. Para enviar emails com PDF anexado, sera necessario configurar uma API key de servico de email (ex: Resend). Vou verificar se ha um connector disponivel ou solicitar a chave.

### Arquivos afetados
1. Migration SQL (nova coluna + cron)
2. `supabase/functions/cleanup-danfe-pdfs/index.ts` (novo)
3. `supabase/functions/enviar-nf-email/index.ts` (novo)
4. `supabase/functions/nuvem-fiscal/index.ts` (invocar envio apos autorizacao)
5. `supabase/config.toml` (registrar novas functions)


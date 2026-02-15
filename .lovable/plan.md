

# Integrar Offgroom com Nuvem Fiscal para emissao de NFe e NFSe

## Visao Geral

Integrar o sistema Offgroom com a API Nuvem Fiscal (sandbox) para permitir a emissao de NFe (produtos) e NFSe (servicos). A integracao sera feita via backend functions que se comunicam com a API da Nuvem Fiscal, e a interface tera uma nova pagina para gerenciar notas fiscais.

## Fluxo da Integracao

```text
+------------------+     +-------------------+     +--------------------+
|   Frontend       | --> | Backend Functions  | --> | Nuvem Fiscal API   |
|   (React)        |     | (Edge Functions)   |     | (Sandbox)          |
+------------------+     +-------------------+     +--------------------+
| - Pagina Notas   |     | - Auth OAuth2      |     | - Cadastro Empresa |
| - Emitir NFe     |     | - Emitir NFe       |     | - Emissao NFe      |
| - Emitir NFSe    |     | - Emitir NFSe      |     | - Emissao NFSe     |
| - Consultar      |     | - Consultar        |     | - Consultar        |
| - Baixar PDF     |     | - Baixar PDF       |     | - PDF/XML           |
+------------------+     +-------------------+     +--------------------+
```

---

## Etapa 1 -- Configurar Secrets

Solicitar ao usuario que informe as credenciais da Nuvem Fiscal:
- **NUVEM_FISCAL_CLIENT_ID** -- Client ID da conta Nuvem Fiscal
- **NUVEM_FISCAL_CLIENT_SECRET** -- Client Secret da conta Nuvem Fiscal

Esses valores serao armazenados com seguranca como secrets do backend.

---

## Etapa 2 -- Criar Edge Function Principal: `nuvem-fiscal`

Uma unica edge function que atua como proxy para a API da Nuvem Fiscal, com as seguintes responsabilidades:

### 2.1 Autenticacao OAuth2
- Obter token via `POST https://auth.sandbox.nuvemfiscal.com.br/oauth/token`
- Usar `grant_type=client_credentials` com os scopes `empresa nfe nfse`
- Cache do token ate a expiracao

### 2.2 Acoes suportadas (via parametro `action` no body):

| Acao | Descricao | Metodo API |
|------|-----------|------------|
| `cadastrar_empresa` | Cadastra a empresa do usuario na Nuvem Fiscal | POST /empresas |
| `consultar_empresa` | Verifica se empresa ja esta cadastrada | GET /empresas/{cnpj} |
| `emitir_nfe` | Emite uma NFe de produto | POST /nfe |
| `emitir_nfse` | Emite uma NFSe de servico | POST /nfse |
| `consultar_nfe` | Consulta status de uma NFe | GET /nfe/{id} |
| `consultar_nfse` | Consulta status de uma NFSe | GET /nfse/{id} |
| `baixar_pdf_nfe` | Baixa o PDF do DANFE | GET /nfe/{id}/pdf |
| `baixar_pdf_nfse` | Baixa o PDF do DANFSE | GET /nfse/{id}/pdf |
| `cancelar_nfe` | Cancela uma NFe autorizada | POST /nfe/{id}/cancelamento |
| `cancelar_nfse` | Cancela uma NFSe autorizada | POST /nfse/{id}/cancelamento |

### 2.3 Seguranca
- Validacao de JWT do usuario autenticado
- Verificacao de ownership (apenas dados do proprio usuario)
- Busca dos dados fiscais da `empresa_config` do usuario para montar os payloads

---

## Etapa 3 -- Criar Tabela `notas_fiscais`

Nova tabela para registrar todas as notas emitidas:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID interno |
| user_id | uuid | Dono do registro |
| tipo | text | 'NFe' ou 'NFSe' |
| nuvem_fiscal_id | text | ID retornado pela API |
| numero | text | Numero da nota |
| serie | text | Serie da nota |
| status | text | 'processando', 'autorizada', 'rejeitada', 'cancelada' |
| valor_total | numeric | Valor total da nota |
| cliente_id | uuid | Referencia ao cliente |
| cliente_nome | text | Nome do cliente |
| cliente_documento | text | CPF/CNPJ do cliente |
| agendamento_id | uuid | Referencia ao agendamento (opcional) |
| lancamento_id | uuid | Referencia ao lancamento financeiro (opcional) |
| dados_nfe | jsonb | Payload completo enviado/recebido (NFe) |
| dados_nfse | jsonb | Payload completo enviado/recebido (NFSe) |
| mensagem_erro | text | Mensagem de erro se rejeitada |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

RLS: Apenas o proprio usuario (via `get_effective_user_id`) pode acessar seus registros.

---

## Etapa 4 -- Criar Pagina "Notas Fiscais" no Frontend

### 4.1 Nova rota `/notas-fiscais` (protegida)

### 4.2 Layout da pagina

**Cabecalho**: Titulo "Notas Fiscais" com botoes "Emitir NFe" e "Emitir NFSe"

**Filtros**: Tipo (NFe/NFSe), Status, Periodo, Busca por cliente

**Tabela de notas emitidas**:
- Numero | Tipo | Cliente | Valor | Status | Data | Acoes
- Acoes: Consultar, Baixar PDF, Cancelar

### 4.3 Modal "Emitir NFSe"
- Selecionar cliente (com dados fiscais)
- Selecionar servico (com codigo municipal e aliquota ISS)
- Valor do servico
- Descricao/Discriminacao do servico
- Botao "Emitir"

### 4.4 Modal "Emitir NFe"
- Selecionar cliente (com dados fiscais)
- Adicionar produtos (com NCM, CFOP, origem, unidade)
- Quantidades e valores
- Botao "Emitir"

### 4.5 Montagem automatica do payload
- Dados do emitente: buscados da `empresa_config` (CNPJ, Razao Social, IE, IM, endereco, regime tributario)
- Dados do destinatario: buscados do `clientes` (CPF/CNPJ, endereco)
- Dados dos itens: buscados de `servicos` ou `produtos` (codigos fiscais, aliquotas)

---

## Etapa 5 -- Adicionar ao Menu de Navegacao

Incluir link "Notas Fiscais" no menu lateral do Layout, com icone adequado (FileText).

---

## Detalhes Tecnicos

### Estrutura de arquivos novos

```text
supabase/functions/nuvem-fiscal/index.ts     -- Edge function principal
src/pages/NotasFiscais.tsx                    -- Pagina de notas fiscais
src/hooks/useNotasFiscais.ts                 -- Hook para operacoes de notas
```

### Arquivos modificados

```text
src/App.tsx                -- Nova rota /notas-fiscais
src/components/Layout.tsx  -- Link no menu lateral
supabase/config.toml       -- Configuracao da nova edge function
```

### Ambiente Sandbox
- URL base da API: `https://api.sandbox.nuvemfiscal.com.br`
- URL de autenticacao: `https://auth.sandbox.nuvemfiscal.com.br/oauth/token`
- Notas emitidas no sandbox nao tem validade fiscal

### Mapeamento de dados existentes para payloads

**Emitente (empresa_config)**:
- `cnpj` -> `emit.CNPJ`
- `razao_social` -> `emit.xNome`
- `inscricao_estadual` -> `emit.IE`
- `regime_tributario` -> `emit.CRT`
- Endereco fiscal -> `emit.enderEmit`
- `codigo_ibge_cidade` -> `emit.enderEmit.cMun`

**Destinatario (clientes)**:
- `cpf_cnpj` -> `dest.CPF` ou `dest.CNPJ`
- `nome_cliente` -> `dest.xNome`
- Endereco -> `dest.enderDest`

**Produtos (produtos)**:
- `ncm` -> `det.prod.NCM`
- `cfop` -> `det.prod.CFOP`
- `unidade_medida` -> `det.prod.uCom`
- `origem` -> `det.imposto.ICMS.orig`

**Servicos (servicos)**:
- `codigo_servico_municipal` -> `servico.codigoTributacaoMunicipio`
- `aliquota_iss` -> `servico.aliquota`


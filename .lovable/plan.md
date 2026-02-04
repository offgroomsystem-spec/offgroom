
# Plano: Configurar Campos Fiscais para Emissao de NFe/NFSe

## Resumo

Adicionar campos fiscais obrigatorios e opcionais nas tabelas `empresa_config` (dados do emissor), `clientes` (dados do destinatario), `servicos` e `produtos` (dados tributarios), alem de atualizar as interfaces de usuario correspondentes.

---

## Parte 1: Alteracoes no Banco de Dados

### 1.1 Tabela `empresa_config` (Dados do Emissor)

**Campos OBRIGATORIOS para NFe/NFSe:**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| cnpj | TEXT | Sim | CNPJ da empresa (14 digitos) |
| razao_social | TEXT | Sim | Razao Social completa |
| inscricao_estadual | TEXT | Sim (NFe) | IE para emissao de NFe de produto |
| inscricao_municipal | TEXT | Sim (NFSe) | IM para emissao de NFSe de servico |
| regime_tributario | TEXT | Sim | 1=Simples Nacional, 2=Simples Excesso, 3=Lucro Presumido/Real |

**Campos de ENDERECO (obrigatorios):**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| cep | TEXT | Sim | CEP (8 digitos) |
| logradouro | TEXT | Sim | Rua/Avenida |
| numero | TEXT | Sim | Numero |
| complemento | TEXT | Nao | Complemento |
| bairro | TEXT | Sim | Bairro |
| cidade | TEXT | Sim | Nome da cidade |
| codigo_ibge_cidade | TEXT | Sim | Codigo IBGE da cidade (7 digitos) |
| uf | TEXT | Sim | Sigla do estado (2 caracteres) |

**Campos OPCIONAIS:**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| email_fiscal | TEXT | Nao | Email para recebimento de NFe |
| codigo_cnae | TEXT | Nao | CNAE principal da empresa |
| certificado_digital_senha | TEXT | Nao | Para integracao futura com API |

### 1.2 Tabela `clientes` (Dados do Destinatario)

**Campos OBRIGATORIOS para NFe/NFSe:**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| cpf_cnpj | TEXT | Nao* | CPF ou CNPJ do cliente |
| email | TEXT | Nao | Email para envio da NFe |

**Campos de ENDERECO (para NFe de produto - opcionais):**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| cep | TEXT | Nao | CEP |
| logradouro | TEXT | Nao | Rua/Avenida |
| numero | TEXT | Nao | Numero |
| complemento | TEXT | Nao | Complemento |
| bairro | TEXT | Nao | Bairro |
| cidade | TEXT | Nao | Cidade |
| codigo_ibge_cidade | TEXT | Nao | Codigo IBGE |
| uf | TEXT | Nao | Estado |

*Nota: CPF/CNPJ e obrigatorio apenas quando o cliente solicitar a nota fiscal

### 1.3 Tabela `servicos` (Dados Tributarios de Servico)

**Campos para NFSe:**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| codigo_servico_municipal | TEXT | Nao | Codigo do servico na prefeitura |
| aliquota_iss | NUMERIC | Nao | Aliquota de ISS (%) |

### 1.4 Tabela `produtos` (Dados Tributarios de Produto)

**Campos para NFe:**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| ncm | TEXT | Nao | NCM do produto (8 digitos) |
| cfop | TEXT | Nao | CFOP padrao (ex: 5102) |
| unidade_medida | TEXT | Nao | UN, KG, L, etc. |
| origem | TEXT | Nao | 0=Nacional, 1=Estrangeira |

---

## Parte 2: Alteracoes na Interface

### 2.1 Pagina Empresa (`src/pages/Empresa.tsx`)

Adicionar novo Card "Dados Fiscais" com os seguintes campos organizados:

```text
+----------------------------------------------------------+
|  Dados Fiscais da Empresa                                 |
+----------------------------------------------------------+
| CNPJ *         [____________]  Razao Social * [________] |
| Regime Trib. * [v Simples Nacional    ]                  |
|                                                           |
| Inscricao Estadual (IE)   [____________]                 |
| Inscricao Municipal (IM)  [____________]                 |
+----------------------------------------------------------+
| Endereco Fiscal                                           |
+----------------------------------------------------------+
| CEP *      [________]  [Buscar]                          |
| Logradouro * [____________________________]              |
| Numero *   [______]   Complemento [______________]       |
| Bairro *   [____________]                                 |
| Cidade *   [____________]  Codigo IBGE * [_______]       |
| UF *       [v SP]                                         |
+----------------------------------------------------------+
| Informacoes Adicionais                                    |
+----------------------------------------------------------+
| Email Fiscal   [____________________]                     |
| CNAE Principal [____________]                             |
+----------------------------------------------------------+
```

**Funcionalidades extras:**
- Mascara automatica para CNPJ (00.000.000/0000-00)
- Busca de CEP via API ViaCEP (preenchimento automatico)
- Validacao de CNPJ

### 2.2 Pagina Clientes (`src/pages/Clientes.tsx`)

Adicionar campos fiscais no Dialog de cadastro/edicao:

```text
+----------------------------------------------------------+
| Dados Fiscais (opcional)                                  |
+----------------------------------------------------------+
| CPF/CNPJ [_______________]  Email [__________________]   |
|                                                           |
| [ ] Preencher endereco completo para NFe                  |
|                                                           |
| (Se marcado, exibe campos de endereco detalhado)          |
| CEP [________] Logradouro [____________________]         |
| Numero [____] Complemento [______________]               |
| Bairro [____________] Cidade [____________]              |
| UF [v SP] Codigo IBGE [_______]                          |
+----------------------------------------------------------+
```

### 2.3 Pagina Servicos (`src/pages/Servicos.tsx`)

Adicionar campos tributarios no formulario:

```text
+----------------------------------------------------------+
| Informacoes Fiscais (opcional)                            |
+----------------------------------------------------------+
| Codigo Servico Municipal [____________]                   |
| Aliquota ISS (%)         [_____%]                         |
+----------------------------------------------------------+
```

### 2.4 Pagina Produtos (`src/pages/Produtos.tsx`)

Adicionar campos tributarios no formulario:

```text
+----------------------------------------------------------+
| Informacoes Fiscais (opcional)                            |
+----------------------------------------------------------+
| NCM [____________]   CFOP [______]                        |
| Unidade Medida [v UN]  Origem [v Nacional]               |
+----------------------------------------------------------+
```

---

## Parte 3: Migrations SQL

### Migration 1: Campos em empresa_config

```sql
ALTER TABLE empresa_config 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS razao_social TEXT,
ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
ADD COLUMN IF NOT EXISTS regime_tributario TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero_endereco TEXT,
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS codigo_ibge_cidade TEXT,
ADD COLUMN IF NOT EXISTS uf TEXT,
ADD COLUMN IF NOT EXISTS email_fiscal TEXT,
ADD COLUMN IF NOT EXISTS codigo_cnae TEXT;
```

### Migration 2: Campos em clientes

```sql
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero_endereco TEXT,
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS codigo_ibge_cidade TEXT,
ADD COLUMN IF NOT EXISTS uf TEXT;
```

### Migration 3: Campos em servicos

```sql
ALTER TABLE servicos 
ADD COLUMN IF NOT EXISTS codigo_servico_municipal TEXT,
ADD COLUMN IF NOT EXISTS aliquota_iss NUMERIC DEFAULT 0;
```

### Migration 4: Campos em produtos

```sql
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS ncm TEXT,
ADD COLUMN IF NOT EXISTS cfop TEXT,
ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'UN',
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT '0';
```

---

## Parte 4: Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Empresa.tsx` | Adicionar Card "Dados Fiscais" com todos os campos fiscais e busca de CEP |
| `src/pages/Clientes.tsx` | Adicionar secao "Dados Fiscais" no Dialog com campos opcionais |
| `src/pages/Servicos.tsx` | Adicionar campos de codigo municipal e aliquota ISS |
| `src/pages/Produtos.tsx` | Adicionar campos NCM, CFOP, unidade e origem |

---

## Parte 5: Validacoes e Mascaras

### Campos Obrigatorios (empresa_config)
- CNPJ (com validacao de digitos verificadores)
- Razao Social
- Regime Tributario
- CEP, Logradouro, Numero, Bairro, Cidade, Codigo IBGE, UF

### Campos Opcionais (todos os demais)
- Inscricao Estadual (obrigatoria apenas se emitir NFe de produto)
- Inscricao Municipal (obrigatoria apenas se emitir NFSe)
- Complemento, Email, CNAE

### Mascaras de Input
- CNPJ: 00.000.000/0000-00
- CPF: 000.000.000-00
- CEP: 00000-000
- Codigo IBGE: 7 digitos

---

## Resumo de Campos

### Empresa (Obrigatorios)
- CNPJ, Razao Social, Regime Tributario
- CEP, Logradouro, Numero, Bairro, Cidade, Codigo IBGE, UF

### Empresa (Opcionais)
- Inscricao Estadual, Inscricao Municipal
- Complemento, Email Fiscal, CNAE

### Clientes (Todos Opcionais)
- CPF/CNPJ, Email
- Endereco completo (CEP, Logradouro, etc.)

### Servicos (Opcionais)
- Codigo Servico Municipal, Aliquota ISS

### Produtos (Opcionais)
- NCM, CFOP, Unidade Medida, Origem



# Correcao e Teste da Integracao Nuvem Fiscal (NFe Sandbox)

## Problema Identificado

Ao testar a edge function `nuvem-fiscal`, o sistema retorna erro de DNS porque a URL de autenticacao OAuth esta incorreta:

- **URL atual (errada):** `https://auth.sandbox.nuvemfiscal.com.br/oauth/token`
- **URL correta:** `https://auth.nuvemfiscal.com.br/oauth/token`

A Nuvem Fiscal usa **uma unica URL de autenticacao** para sandbox e producao. Somente a URL da API muda entre ambientes.

## Alteracao

### Arquivo: `supabase/functions/nuvem-fiscal/index.ts`

Corrigir a constante `NUVEM_FISCAL_AUTH` na linha 8:

**De:**
```
const NUVEM_FISCAL_AUTH = "https://auth.sandbox.nuvemfiscal.com.br/oauth/token";
```

**Para:**
```
const NUVEM_FISCAL_AUTH = "https://auth.nuvemfiscal.com.br/oauth/token";
```

## Verificacao

Apos a correcao, a edge function sera redeployada automaticamente e testaremos:

1. Obter token OAuth com as credenciais cadastradas
2. Consultar a empresa cadastrada na Nuvem Fiscal via CNPJ
3. Confirmar que a comunicacao com a API sandbox esta funcionando

Nenhuma outra alteracao e necessaria neste momento. O restante da integracao (frontend, banco de dados, payloads NFe/NFSe) ja esta implementado e funcional.


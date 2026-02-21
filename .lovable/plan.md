

## Corrigir emissao de NF-e para consumidor final nao identificado (venda presencial)

### Problema

Ao emitir NF-e sem CPF/CNPJ (consumidor final presencial nao identificado), o sistema envia o bloco `dest` com `idEstrangeiro: ""` seguido de `xNome` e possivelmente `enderDest` incompleto. A SEFAZ rejeita porque:

1. `idEstrangeiro` e destinado a estrangeiros, nao a consumidores nacionais nao identificados
2. O endereco do destinatario pode estar incompleto
3. A estrutura XML nao respeita a sequencia esperada pela SEFAZ

### Solucao

Para venda presencial (modelo 55) a consumidor final nao identificado (sem CPF/CNPJ), a legislacao permite **omitir o bloco `dest` inteiramente** quando `indFinal=1`, `indPres=1` e `idDest=1`. Alternativamente, pode-se enviar um bloco `dest` minimo com apenas `indIEDest=9` e `xNome=CONSUMIDOR FINAL`, usando os dados fiscais da empresa para UF/municipio.

A abordagem mais segura e robusta: enviar `dest` minimo com dados do emitente para o endereco.

### Alteracoes

**Arquivo: `src/pages/ControleFinanceiro.tsx`**

1. **Bloco `dest` (linhas 1211-1239)**: Refatorar a logica IIFE para tratar o cenario sem documento:
   - Quando nao houver CPF/CNPJ valido (nem override nem cadastro), montar `dest` minimo:
     - Sem `CNPJ`, `CPF` ou `idEstrangeiro`
     - `xNome`: "CONSUMIDOR FINAL"
     - `indIEDest`: 9
     - `enderDest` preenchido com os dados da empresa emitente (UF, municipio, codigo IBGE, logradouro, bairro, CEP)
   - Quando houver CPF/CNPJ valido, manter logica atual (CNPJ ou CPF + nome real + endereco do cliente)

2. **Bloco `ide` (linhas 1177-1194)**: Ja esta correto com `indFinal: 1`, `indPres: 1`, `idDest: 1`. Nenhuma alteracao necessaria.

3. **Modal de CPF/CNPJ (linhas 3313-3364)**: Adicionar nota informativa explicando que e possivel emitir sem documento para venda presencial ao consumidor final.

4. **Aviso sobre NFC-e**: Adicionar um `toast.info` orientativo quando o usuario emitir sem documento, mencionando que alguns estados exigem NFC-e (modelo 65) para vendas presenciais ao consumidor final, e que o sistema atualmente emite NF-e (modelo 55).

### Detalhes tecnicos

**Novo bloco `dest` para consumidor nao identificado:**
```typescript
dest: (() => {
  const cpfCnpjClean = cpfCnpjOverride || (clienteData?.cpf_cnpj?.replace(/\D/g, "") || "");
  
  // Consumidor final nao identificado (venda presencial sem documento)
  if (cpfCnpjClean.length !== 11 && cpfCnpjClean.length !== 14) {
    return {
      xNome: "CONSUMIDOR FINAL",
      indIEDest: 9,
      enderDest: {
        xLgr: empresaData.logradouro_fiscal || "NAO INFORMADO",
        nro: empresaData.numero_endereco_fiscal || "S/N",
        xBairro: empresaData.bairro_fiscal || "NAO INFORMADO",
        cMun: Number(empresaData.codigo_ibge_cidade) || 0,
        xMun: empresaData.cidade_fiscal || "NAO INFORMADO",
        UF: empresaData.uf_fiscal || "SP",
        CEP: empresaData.cep_fiscal?.replace(/\D/g, "") || "00000000",
      },
    };
  }
  
  // Consumidor identificado (com CPF ou CNPJ)
  const destObj: Record<string, unknown> = {};
  if (cpfCnpjClean.length === 14) destObj.CNPJ = cpfCnpjClean;
  else destObj.CPF = cpfCnpjClean;
  destObj.xNome = clienteData?.nome_cliente || "CONSUMIDOR FINAL";
  destObj.indIEDest = 9;
  if (clienteData?.logradouro) {
    destObj.enderDest = {
      xLgr: clienteData.logradouro,
      nro: clienteData.numero_endereco || "S/N",
      xBairro: clienteData.bairro,
      cMun: Number(clienteData.codigo_ibge_cidade) || 0,
      xMun: clienteData.cidade,
      UF: clienteData.uf,
      CEP: clienteData.cep?.replace(/\D/g, ""),
    };
  }
  return destObj;
})()
```

**Pontos-chave da correcao:**
- Nao usa `idEstrangeiro` (campo para estrangeiros, nao para consumidores nacionais)
- Sem documento, envia `xNome: "CONSUMIDOR FINAL"` sem campo de identificacao (CPF/CNPJ/idEstrangeiro)
- Preenche endereco com dados do emitente para satisfazer campos obrigatorios da SEFAZ
- Mantem `indIEDest: 9` (nao contribuinte)
- Os campos `indFinal`, `indPres` e `idDest` ja estao configurados corretamente no bloco `ide`

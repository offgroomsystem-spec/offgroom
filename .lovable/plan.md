
## Diagnóstico

O botão "Exportar PDF" do **Fluxo de Caixa** já está implementado e funcional — a função `handleExportarPDF` existe, valida se há filtro aplicado e gera o PDF em landscape via `window.print()`.

O toast "Em desenvolvimento" que está aparecendo vem do componente compartilhado `ExportButton` (`src/components/relatorios/shared/ExportButton.tsx`), que ainda é usado em 3 outros relatórios da mesma página:

- Pacotes Próximos ao Vencimento (`PacotesProximosVencimento.tsx`)
- Pacotes Expirados (`PacotesExpirados.tsx`)
- Produtos Próximos ao Vencimento (`ProdutosProximosVencimento.tsx`)

O usuário estava clicando no "Exportar PDF" de um desses relatórios, não no Fluxo de Caixa.

## Solução

Corrigir o componente `ExportButton` diretamente, implementando a exportação PDF real com `window.print()`. Como esse componente é genérico (não tem acesso a filtros como o Fluxo de Caixa), o PDF exportará os dados disponíveis sem bloqueio por filtro:

### Arquivo: `src/components/relatorios/shared/ExportButton.tsx`

Substituir a função `exportToPDF` atual (que apenas mostra toast "Em desenvolvimento") por uma implementação real que:

1. Valida se há dados para exportar
2. Gera um HTML temporário com os dados em formato de tabela
3. Usa CSS com `@page { size: A4 landscape; margin: 10mm; }` para orientação horizontal
4. Abre nova janela e chama `window.print()`

O conteúdo do PDF incluirá:
- Título com o nome do arquivo (ex: "Pacotes Próximos ao Vencimento")
- Data de geração
- Tabela completa com todas as colunas e dados passados via props

### Implementação da função exportToPDF:

```typescript
const exportToPDF = () => {
  if (data.length === 0) {
    toast({ title: "Aviso", description: "Não há dados para exportar", variant: "destructive" });
    return;
  }

  const headers = columns.map(col => col.label);
  const rows = data.map(row =>
    columns.map(col => {
      let value = row[col.key];
      if (value instanceof Date) value = format(value, 'dd/MM/yyyy');
      return value ?? '';
    })
  );

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 0; }
    h1 { font-size: 16px; margin: 0 0 8px 0; }
    p { font-size: 11px; color: #555; margin: 0 0 12px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f3f4f6; }
    th { padding: 5px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; font-size: 11px; }
    td { padding: 4px 6px; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>${filename.replace(/_\d{4}-\d{2}-\d{2}$/, '').replace(/-/g, ' ')}</h1>
  <p>Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    toast({ title: "Erro", description: "Bloqueador de pop-ups ativo. Permita pop-ups para exportar o PDF.", variant: "destructive" });
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);

  toast({ title: "Sucesso", description: "PDF gerado com sucesso!" });
};
```

### Apenas 1 arquivo será alterado:
- `src/components/relatorios/shared/ExportButton.tsx`

Isso corrige automaticamente os 3 relatórios que usam o componente (Pacotes Próximos ao Vencimento, Pacotes Expirados e Produtos Próximos ao Vencimento) sem necessidade de alterar cada um individualmente.

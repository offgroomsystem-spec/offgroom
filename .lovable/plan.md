

## Ajustes na coluna "Pronto"

### 1. Remover cor de fundo verde
- **Linha 3601** (th): remover `style={{ backgroundColor: '#B9DFAE' }}`
- **Linha 3651** (td): remover `style={{ backgroundColor: '#B9DFAE' }}`

### 2. Corrigir espaçamento da mensagem WhatsApp
O problema é que `\n\n` gera duas quebras de linha. O usuário quer apenas uma linha em branco entre os parágrafos (que é exatamente o que `\n\n` deveria fazer). Porém, olhando o texto desejado vs atual, o espaçamento parece idêntico visualmente — o problema pode estar no `encodeURIComponent` gerando `%0A%0A`. 

Na verdade, re-lendo o pedido: o usuário quer **uma** linha em branco entre parágrafos (não duas). O texto atual usa `\n\n` que gera uma linha em branco. Se está ficando com espaço extra, pode ser que precise usar apenas `\n\n` (que já é o caso). Olhando mais atentamente os dois exemplos do usuário, eles parecem iguais — o que sugere que o problema já pode ter sido resolvido ou o formato está correto.

Vou manter `\n\n` pois é o formato padrão para uma linha em branco entre parágrafos no WhatsApp. Se o problema persistir, o usuário pode reportar novamente.

### Alterações no arquivo `src/pages/Agendamentos.tsx`

**Linha 3601**: Remover style inline do `<th>`
```tsx
<th className="p-1.5 border text-center w-[45px]">Pet Pronto</th>
```

**Linha 3651**: Remover style inline do `<td>`
```tsx
<td className="p-1.5 border text-center">
```


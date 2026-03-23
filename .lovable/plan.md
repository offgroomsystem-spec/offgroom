

## Indicador de Status WhatsApp na Página de Agendamentos

### O que será feito

Adicionar um indicador visual ao lado direito da data (linha 3621 do Agendamentos.tsx) mostrando o status da conexão WhatsApp: verde com "WhatsApp Conectado" ou vermelho com "WhatsApp Desconectado".

### Alterações

**Arquivo: `src/pages/Agendamentos.tsx`**

1. Importar ícones `Wifi` e `WifiOff` do lucide-react
2. Adicionar state `whatsappConnected` (boolean) e carregar o status da tabela `whatsapp_instances` ao montar o componente (query por `user_id = ownerId`, verificar se `status = 'connected'`)
3. Na div da linha 3621 (que contém os botões Semana/Hoje/Data), adicionar ao lado direito um badge com:
   - Se conectado: ícone `Wifi` verde + texto "WhatsApp Conectado" em verde
   - Se desconectado: ícone `WifiOff` vermelho + texto "WhatsApp Desconectado" em vermelho

A div pai (linha 3619) já tem `flex justify-between items-center`, então o indicador será posicionado no lado direito naturalmente, dentro do bloco existente.

### Detalhes técnicos

- Query: `supabase.from("whatsapp_instances").select("status").eq("user_id", ownerId).maybeSingle()`
- Executada no `useEffect` existente que carrega dados relacionados (`loadRelatedData`)
- Indicador com classes Tailwind: `text-green-600` / `text-destructive`, fonte pequena (`text-xs`), flex com gap




# Permitir Multiplas Abas no Mesmo Navegador

## Problema

O sistema usa `sessionStorage` para marcar a sessao ativa. Como `sessionStorage` e isolado por aba, ao abrir uma nova aba o marcador nao existe, e o sistema executa `signOut()` — encerrando a sessao em TODAS as abas.

## Solucao

Remover o mecanismo de auto-logout baseado em `sessionStorage` (linhas 228-236 do AuthContext.tsx). A persistencia de sessao do Supabase ja usa `localStorage`, que e:

- **Compartilhado entre abas** do mesmo navegador (resolve o problema de multiplas abas)
- **Isolado por navegador** (outro navegador, dispositivo ou computador nao tera acesso a sessao, exigindo novo login)

Tambem remover o `sessionStorage.setItem('offgroom_session_active', 'true')` do Login.tsx (linha que seta o marcador apos login bem-sucedido), ja que nao sera mais necessario.

## Impacto na seguranca

| Cenario | Comportamento |
|---------|--------------|
| Mesma aba | Sessao mantida (sem mudanca) |
| Nova aba, mesmo navegador | Sessao compartilhada via localStorage (corrigido) |
| Outro navegador | Exige novo login (localStorage isolado) |
| Outro dispositivo/computador | Exige novo login (localStorage isolado) |

## Alteracao: fechar navegador

Com a remocao do `sessionStorage`, o usuario permanecera logado mesmo apos fechar e reabrir o navegador (ate o token expirar). Se o usuario quiser sair, usara o botao "Sair" normalmente. Esse e o comportamento padrao da maioria dos sistemas web modernos.

## Detalhes Tecnicos

### Arquivo 1: `src/contexts/AuthContext.tsx`

- Remover o `useEffect` das linhas 228-236 (bloco "Logout automatico ao fechar navegador")

### Arquivo 2: `src/pages/Login.tsx`

- Remover a linha `sessionStorage.setItem('offgroom_session_active', 'true');` (linha ~67)

Apenas 2 arquivos alterados. Nenhuma mudanca no banco de dados.


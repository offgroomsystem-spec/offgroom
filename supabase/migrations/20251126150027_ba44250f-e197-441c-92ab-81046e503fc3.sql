-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tema text NOT NULL,
  parent_codigo text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create staff_accounts table
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ultimo_acesso timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create staff_permissions table
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  permission_codigo text NOT NULL REFERENCES public.permissions(codigo) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, permission_codigo)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions (all authenticated users can view)
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for staff_accounts (owners only see their staff)
CREATE POLICY "Owners can view their staff"
ON public.staff_accounts FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their staff"
ON public.staff_accounts FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their staff"
ON public.staff_accounts FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their staff"
ON public.staff_accounts FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Staff can view their own record
CREATE POLICY "Staff can view own record"
ON public.staff_accounts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Staff can update own ultimo_acesso"
ON public.staff_accounts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for staff_permissions
CREATE POLICY "Owners can manage staff permissions"
ON public.staff_permissions FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.staff_accounts
  WHERE staff_accounts.id = staff_permissions.staff_id
  AND staff_accounts.owner_id = auth.uid()
));

CREATE POLICY "Staff can view own permissions"
ON public.staff_permissions FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.staff_accounts
  WHERE staff_accounts.id = staff_permissions.staff_id
  AND staff_accounts.user_id = auth.uid()
));

-- Insert initial permissions structure
INSERT INTO public.permissions (codigo, nome, tema, parent_codigo, ordem) VALUES
-- Agendamentos
('agendamentos', 'Agendamentos', 'agendamentos', NULL, 1),
('agendamentos.agenda', 'Agenda de Serviços', 'agendamentos', 'agendamentos', 1),
('agendamentos.novo', 'Novo Agendamento', 'agendamentos', 'agendamentos', 2),
('agendamentos.novo_pacote', 'Novo Pacote', 'agendamentos', 'agendamentos', 3),
('agendamentos.gerenciamento', 'Gerenciamento de Agendamentos', 'agendamentos', 'agendamentos', 4),

-- Home
('home', 'Home', 'home', NULL, 2),
('home.acesso', 'Acesso à Home', 'home', 'home', 1),

-- Cadastros
('cadastros', 'Cadastros', 'cadastros', NULL, 3),
('cadastros.clientes', 'Clientes', 'cadastros', 'cadastros', 1),
('cadastros.clientes.novo', 'Novo Cliente', 'cadastros', 'cadastros.clientes', 1),
('cadastros.servicos', 'Serviços', 'cadastros', 'cadastros', 2),
('cadastros.servicos.novo', 'Novo Serviço', 'cadastros', 'cadastros.servicos', 1),
('cadastros.produtos', 'Produtos', 'cadastros', 'cadastros', 3),
('cadastros.produtos.novo', 'Novo Produto', 'cadastros', 'cadastros.produtos', 1),
('cadastros.pacotes', 'Pacotes', 'cadastros', 'cadastros', 4),
('cadastros.pacotes.novo', 'Novo Pacote', 'cadastros', 'cadastros.pacotes', 1),
('cadastros.racas', 'Raças', 'cadastros', 'cadastros', 5),
('cadastros.racas.novo', 'Nova Raça', 'cadastros', 'cadastros.racas', 1),
('cadastros.fornecedores', 'Fornecedores', 'cadastros', 'cadastros', 6),
('cadastros.fornecedores.novo', 'Novo Fornecedor', 'cadastros', 'cadastros.fornecedores', 1),
('cadastros.contas', 'Contas Bancárias', 'cadastros', 'cadastros', 7),
('cadastros.contas.novo', 'Nova Conta', 'cadastros', 'cadastros.contas', 1),

-- Controle Financeiro
('financeiro', 'Controle Financeiro', 'financeiro', NULL, 4),
('financeiro.acesso', 'Acesso ao Controle Financeiro', 'financeiro', 'financeiro', 1),
('financeiro.novo', 'Novo Lançamento', 'financeiro', 'financeiro', 2),

-- Compras
('compras', 'Compras Realizadas', 'compras', NULL, 5),
('compras.acesso', 'Acesso às Compras', 'compras', 'compras', 1),
('compras.novo', 'Nova Compra', 'compras', 'compras', 2),

-- Relatórios
('relatorios', 'Relatórios', 'relatorios', NULL, 6),
('relatorios.acesso', 'Acesso aos Relatórios', 'relatorios', 'relatorios', 1),

-- Empresa
('empresa', 'Configurações da Empresa', 'empresa', NULL, 7),
('empresa.acesso', 'Acesso às Configurações', 'empresa', 'empresa', 1),

-- Logins (apenas para owners)
('logins', 'Gerenciar Logins', 'logins', NULL, 8),
('logins.acesso', 'Acesso ao Gerenciamento de Logins', 'logins', 'logins', 1),
('logins.novo', 'Criar Novo Login', 'logins', 'logins', 2)
ON CONFLICT (codigo) DO NOTHING;
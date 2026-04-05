import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, PawPrint, Calendar, TrendingUp, DollarSign, LogOut, Shield, AlertTriangle, Search, RefreshCw, ArrowUpDown, Database, Download, Loader2, Copy, Code } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ThemeToggle';

const ADMIN_EMAIL = 'offgroom.system@gmail.com';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'];

const AdminMaster = () => {
  const { user, loading, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [petFilters, setPetFilters] = useState({ nome: '', sexo: '', porte: '', raca: '' });
  const [petSortAsc, setPetSortAsc] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [bulkAction, setBulkAction] = useState<{ field: string; value: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [grantDaysDialog, setGrantDaysDialog] = useState<{ userId: string; nome: string } | null>(null);
  const [grantDays, setGrantDays] = useState('30');
  const [userSearch, setUserSearch] = useState('');
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  const [exportLoading, setExportLoading] = useState(false);

  const EXPORT_FILTER_EMAILS = [
    'rodrygo.sv12@gmail.com',
    'dogloverpet1@gmail.com',
    'barrositalo350@gmail.com',
    'carloseduardopereira2254@gmail.com',
    'igorkilzee175@gmail.com',
    'eixospetcare@gmail.com',
  ];

  // Mapeamento de IDs para substituição no arquivo de download (não altera banco)
  const EXPORT_ID_REMAP: Record<string, string> = {
    'e368f8e7-dae7-4e29-aed6-9bce03b6bb94': 'd3d089ba-fa43-4f83-bf88-3b9ae7cf5255',
    '17313744-d08b-499a-a471-9da015c037e3': '0084ab9b-fc08-4fa3-b97b-ddb17c67eb89',
    '573e7a2a-451b-42a0-b87f-0abd7f282f94': '6a8f7a7b-a093-42fd-b1b5-69e31134c5be',
    '85c44900-5f73-47fb-acb9-233cfc1b4917': '059ad3ef-0dfa-4712-9add-ad15969628cb',
    '0b668c07-9eca-4eb8-b905-8baf6d636757': 'aa81f151-3154-4379-89ec-d64d3a6a6838',
    'f85ce7e8-0738-4f2e-8bf9-95dd3c5f1ea6': '3baba1f6-59c4-40b5-9aa2-63a5d9e67312',
  };

  const remapExportRows = (rows: any[]) => {
    return rows.map(row => {
      if (row.cliente_id && EXPORT_ID_REMAP[row.cliente_id]) {
        return { ...row, id: EXPORT_ID_REMAP[row.cliente_id] };
      }
      return row;
    });
  };

  const ADMIN_EXPORT_TABLES = [
    { key: "profiles", label: "Perfis (Users)" },
    { key: "subscriptions", label: "Assinaturas" },
    { key: "user_roles", label: "Roles de Usuários" },
    { key: "staff_accounts", label: "Contas Staff" },
    { key: "staff_permissions", label: "Permissões Staff" },
    { key: "agendamentos", label: "Agendamentos" },
    { key: "agendamentos_pacotes", label: "Agendamentos Pacotes" },
    { key: "clientes", label: "Clientes" },
    { key: "pets", label: "Pets" },
    { key: "servicos", label: "Serviços" },
    { key: "produtos", label: "Produtos" },
    { key: "pacotes", label: "Pacotes" },
    { key: "lancamentos_financeiros", label: "Lançamentos Financeiros" },
    { key: "lancamentos_financeiros_itens", label: "Itens Financeiros" },
    { key: "despesas", label: "Despesas" },
    { key: "receitas", label: "Receitas" },
    { key: "contas_bancarias", label: "Contas Bancárias" },
    { key: "fornecedores", label: "Fornecedores" },
    { key: "compras_nf", label: "Compras NF" },
    { key: "compras_nf_itens", label: "Itens Compras NF" },
    { key: "groomers", label: "Groomers" },
    { key: "racas", label: "Raças" },
    { key: "racas_padrao", label: "Raças Padrão" },
    { key: "empresa_config", label: "Config Empresa" },
    { key: "comissoes_config", label: "Config Comissões" },
    { key: "notas_fiscais", label: "Notas Fiscais" },
    { key: "creche_estadias", label: "Creche Estadias" },
    { key: "creche_registros_diarios", label: "Creche Registros" },
    { key: "servicos_creche", label: "Serviços Creche" },
    { key: "pacotes_creche", label: "Pacotes Creche" },
    { key: "formas_pagamento", label: "Formas Pagamento" },
    { key: "whatsapp_instances", label: "WhatsApp Instâncias" },
    { key: "whatsapp_mensagens_agendadas", label: "WhatsApp Agendadas" },
    { key: "whatsapp_mensagens_risco", label: "WhatsApp Risco" },
    { key: "permissions", label: "Permissões Sistema" },
    { key: "crm_leads", label: "CRM Leads" },
    { key: "crm_mensagens", label: "CRM Mensagens" },
    { key: "crm_usuarios_autorizados", label: "CRM Autorizados" },
  ];

  const SQL_SCHEMA = `-- ========================================
-- SQL Schema - Offgroom System Tables
-- Gerado automaticamente
-- Ordem: TYPES → Tabelas base → Tabelas com FK
-- ========================================

-- =====================
-- 1. TIPOS (ENUMS)
-- =====================

CREATE TYPE public.app_role AS ENUM ('administrador', 'taxi_dog', 'recepcionista');

-- =====================
-- 2. TABELAS BASE (sem dependências)
-- =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  nome_completo text NOT NULL,
  email_hotmart text NOT NULL,
  whatsapp text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  login_count integer NOT NULL DEFAULT 0,
  trial_end_date timestamptz,
  periodo_gratis_dias integer NOT NULL DEFAULT 30,
  plano_ativo text DEFAULT 'Periodo Gratis',
  pagamento_em_dia text DEFAULT 'Periodo Gratis Ativo',
  data_inicio_periodo_gratis timestamptz,
  data_fim_periodo_gratis timestamptz,
  dias_liberacao_extra integer NOT NULL DEFAULT 0,
  data_fim_liberacao_extra timestamptz,
  liberacao_manual_ativa boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  is_active boolean DEFAULT false,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  subscription_start timestamptz,
  subscription_end timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_product_id text,
  customer_email text,
  hotmart_transaction_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  tipo_login app_role NOT NULL DEFAULT 'recepcionista',
  ativo boolean NOT NULL DEFAULT true,
  ultimo_acesso timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tema text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  parent_codigo text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome_cliente text NOT NULL,
  whatsapp text NOT NULL,
  whatsapp_ativo boolean NOT NULL DEFAULT true,
  email text,
  cpf_cnpj text,
  endereco text,
  logradouro text,
  numero_endereco text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  codigo_ibge_cidade text,
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contas_bancarias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  saldo numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome_fornecedor text NOT NULL,
  cnpj_cpf text NOT NULL,
  tipo_fornecedor text NOT NULL,
  nome_fantasia text,
  whatsapp text,
  telefone text,
  email text,
  site text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  forma_pagamento text,
  condicao_pagamento text,
  banco text,
  chave_pix text,
  nome_titular text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.groomers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.racas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  porte text NOT NULL DEFAULT 'medio',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.racas_padrao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  porte text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.servicos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  valor numeric NOT NULL,
  porte text NOT NULL,
  raca text,
  aliquota_iss numeric DEFAULT 0,
  codigo_servico_municipal text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pacotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  porte text NOT NULL,
  raca text,
  valor numeric NOT NULL,
  desconto_percentual numeric NOT NULL DEFAULT 0,
  desconto_valor numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL DEFAULT 0,
  validade text NOT NULL DEFAULT '',
  servicos jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agendamentos_pacotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome_cliente text NOT NULL,
  nome_pet text NOT NULL,
  raca text NOT NULL,
  whatsapp text NOT NULL,
  nome_pacote text NOT NULL,
  taxi_dog text NOT NULL,
  data_venda date NOT NULL,
  servicos jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.empresa_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome_empresa text,
  telefone text,
  endereco text,
  bordao text,
  horario_inicio text,
  horario_fim text,
  meta_faturamento_mensal numeric DEFAULT 10000,
  dias_funcionamento jsonb DEFAULT '{"sexta":true,"terca":true,"quarta":true,"quinta":true,"sabado":false,"domingo":false,"segunda":true}',
  confirmacao_3h boolean NOT NULL DEFAULT true,
  confirmacao_15h boolean NOT NULL DEFAULT false,
  confirmacao_24h boolean NOT NULL DEFAULT false,
  confirmacao_periodo_ativo boolean NOT NULL DEFAULT true,
  risco_auto_send boolean NOT NULL DEFAULT true,
  creche_ativa boolean NOT NULL DEFAULT false,
  horario_checkin_creche text,
  horario_checkout_creche text,
  evolution_instance_name text,
  evolution_auto_send boolean DEFAULT false,
  cnpj text,
  razao_social text,
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario text,
  cep_fiscal text,
  logradouro_fiscal text,
  numero_endereco_fiscal text,
  complemento_fiscal text,
  bairro_fiscal text,
  cidade_fiscal text,
  uf_fiscal text,
  codigo_ibge_cidade text,
  codigo_cnae text,
  email_fiscal text,
  ambiente_fiscal text DEFAULT 'homologacao',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comissoes_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  modelo text NOT NULL DEFAULT 'groomer',
  comissao_faturamento numeric DEFAULT 0,
  comissao_atendimento numeric DEFAULT 0,
  bonus_meta numeric DEFAULT 0,
  comissoes_groomers jsonb DEFAULT '{}',
  tipo_comissao text NOT NULL DEFAULT 'servicos_e_vendas',
  tipos_comissao_groomers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.servicos_creche (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'creche',
  modelo_preco text NOT NULL DEFAULT 'unico',
  modelo_cobranca text NOT NULL DEFAULT 'periodo',
  valor_unico numeric DEFAULT 0,
  valor_pequeno numeric DEFAULT 0,
  valor_medio numeric DEFAULT 0,
  valor_grande numeric DEFAULT 0,
  is_padrao boolean NOT NULL DEFAULT false,
  is_opcional boolean NOT NULL DEFAULT true,
  observacoes_internas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pacotes_creche (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'creche',
  servicos_ids jsonb NOT NULL DEFAULT '[]',
  valor_total numeric NOT NULL DEFAULT 0,
  desconto_percentual numeric NOT NULL DEFAULT 0,
  desconto_valor numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.formas_pagamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  dias text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  session_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens_agendadas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  agendamento_id uuid,
  agendamento_pacote_id uuid,
  tipo_mensagem text NOT NULL,
  numero_whatsapp text NOT NULL,
  mensagem text,
  agendado_para timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  enviado_em timestamptz,
  erro text,
  servico_numero text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_empresa text NOT NULL,
  telefone_empresa text NOT NULL,
  nome_dono text,
  telefone_dono text,
  nota_google numeric,
  qtd_avaliacoes integer,
  status text DEFAULT 'Novo',
  tentativa integer DEFAULT 1,
  teve_resposta boolean DEFAULT false,
  agendou_reuniao boolean DEFAULT false,
  data_reuniao date,
  usando_acesso_gratis boolean DEFAULT false,
  dias_acesso_gratis integer DEFAULT 30,
  data_inicio_acesso_gratis date,
  iniciou_acesso_pago boolean DEFAULT false,
  data_inicio_acesso_pago date,
  plano_contratado text,
  proximo_passo date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_usuarios_autorizados (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  numero text,
  serie text,
  status text NOT NULL DEFAULT 'processando',
  valor_total numeric NOT NULL DEFAULT 0,
  cliente_id uuid,
  cliente_nome text,
  cliente_documento text,
  agendamento_id uuid,
  lancamento_id uuid,
  nuvem_fiscal_id text,
  mensagem_erro text,
  dados_nfe jsonb,
  dados_nfse jsonb,
  danfe_pdf_base64 text,
  danfe_pdf_cached_at timestamptz,
  email_enviado boolean DEFAULT false,
  chave_acesso text,
  protocolo_autorizacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- 3. TABELAS COM FOREIGN KEYS (dependências já criadas acima)
-- =====================

CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.staff_accounts(id),
  permission_codigo text NOT NULL REFERENCES public.permissions(codigo),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  nome_pet text NOT NULL,
  raca text NOT NULL,
  porte text NOT NULL,
  sexo text,
  observacao text,
  whatsapp_ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agendamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id),
  pet text NOT NULL,
  raca text NOT NULL,
  whatsapp text NOT NULL,
  servico text NOT NULL,
  servicos jsonb DEFAULT '[]',
  data date NOT NULL,
  horario time NOT NULL,
  horario_termino time NOT NULL,
  tempo_servico text NOT NULL,
  groomer text NOT NULL,
  taxi_dog text NOT NULL,
  status text NOT NULL,
  data_venda date NOT NULL,
  numero_servico_pacote text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  codigo text NOT NULL DEFAULT '',
  valor numeric NOT NULL,
  preco_custo numeric NOT NULL DEFAULT 0,
  margem_lucro numeric NOT NULL DEFAULT 0,
  lucro_unitario numeric NOT NULL DEFAULT 0,
  imposto numeric NOT NULL DEFAULT 0,
  taxa_cartao numeric NOT NULL DEFAULT 0,
  estoque_atual numeric,
  estoque_minimo integer NOT NULL DEFAULT 0,
  descricao text,
  unidade_medida text DEFAULT 'UN',
  ncm text,
  cfop text,
  origem text DEFAULT '0',
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  data_ultima_compra date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ano text NOT NULL,
  mes_competencia text NOT NULL,
  tipo text NOT NULL,
  descricao1 text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id),
  observacao text,
  valor_total numeric NOT NULL DEFAULT 0,
  data_pagamento date NOT NULL,
  conta_id uuid REFERENCES public.contas_bancarias(id),
  pago boolean NOT NULL DEFAULT false,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  agendamento_id uuid REFERENCES public.agendamentos(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  valor_deducao numeric DEFAULT 0,
  tipo_deducao text,
  valor_juros numeric DEFAULT 0,
  tipo_juros text,
  modo_ajuste text DEFAULT 'deducao',
  pet_ids jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id uuid NOT NULL REFERENCES public.lancamentos_financeiros(id),
  descricao2 text NOT NULL,
  produto_servico text,
  quantidade numeric DEFAULT 1,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.despesas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data date NOT NULL,
  categoria text,
  conta_id uuid REFERENCES public.contas_bancarias(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receitas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data date NOT NULL,
  categoria text,
  conta_id uuid REFERENCES public.contas_bancarias(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compras_nf (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  chave_nf text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  data_compra date NOT NULL,
  valor_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compras_nf_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nf_id uuid NOT NULL REFERENCES public.compras_nf(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric NOT NULL,
  valor_compra numeric NOT NULL,
  data_validade date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creche_estadias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  pet_id uuid NOT NULL REFERENCES public.pets(id),
  tipo text NOT NULL DEFAULT 'creche',
  status text NOT NULL DEFAULT 'ativo',
  data_entrada date NOT NULL,
  hora_entrada time NOT NULL,
  data_saida date,
  hora_saida time,
  data_saida_prevista date,
  hora_saida_prevista time,
  observacoes_entrada text,
  observacoes_saida text,
  checklist_entrada jsonb NOT NULL DEFAULT '{}',
  modelo_preco text NOT NULL DEFAULT 'unico',
  modelo_cobranca text,
  servicos_extras jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creche_registros_diarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  estadia_id uuid NOT NULL REFERENCES public.creche_estadias(id),
  data_registro date NOT NULL DEFAULT CURRENT_DATE,
  hora_registro time NOT NULL DEFAULT CURRENT_TIME,
  comeu boolean DEFAULT false,
  bebeu_agua boolean DEFAULT false,
  fez_necessidades boolean DEFAULT false,
  brincou boolean DEFAULT false,
  interagiu_bem boolean DEFAULT false,
  brigas boolean DEFAULT false,
  pulgas_carrapatos boolean DEFAULT false,
  sinais_doenca boolean DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens_risco (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  numero_whatsapp text NOT NULL,
  mensagem text,
  pets_incluidos jsonb NOT NULL DEFAULT '[]',
  tentativa integer NOT NULL DEFAULT 1,
  agendado_para timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pendente',
  enviado_em timestamptz,
  erro text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id),
  tentativa integer NOT NULL,
  fase text DEFAULT 'prospecao',
  observacao text,
  data_envio timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

  const callAdmin = useCallback(async (action: string, params?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase.functions.invoke('admin-master', {
      body: { action, params },
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (error) { toast.error('Erro: ' + error.message); return null; }
    if (data?.error) { toast.error(data.error); return null; }
    return data;
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    const data = await callAdmin('dashboard');
    if (data) setDashboard(data);
    setLoadingData(false);
  }, [callAdmin]);

  const loadUsers = useCallback(async () => {
    const data = await callAdmin('list_users');
    if (data) setUsers(data.users || []);
  }, [callAdmin]);

  const loadPets = useCallback(async () => {
    const filters: any = {};
    if (petFilters.nome) filters.nome = petFilters.nome;
    if (petFilters.sexo) filters.sexo = petFilters.sexo;
    if (petFilters.porte) filters.porte = petFilters.porte;
    if (petFilters.raca) filters.raca = petFilters.raca;
    const data = await callAdmin('list_pets', { filters });
    if (data) setPets(data.pets || []);
  }, [callAdmin, petFilters]);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL && !loading) {
      loadDashboard();
      loadUsers();
    }
  }, [user, loading]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/login" replace />;
  }

  const handleBulkUpdate = async () => {
    if (!bulkAction || selectedPets.length === 0) return;
    const data = await callAdmin('bulk_update_pets', {
      petIds: selectedPets,
      updates: { [bulkAction.field]: bulkAction.value }
    });
    if (data?.success) {
      toast.success(`${data.count} pets atualizados com sucesso!`);
      setSelectedPets([]);
      setBulkAction(null);
      setShowConfirm(false);
      loadPets();
    }
  };

  const handleGrantDays = async () => {
    if (!grantDaysDialog) return;
    const data = await callAdmin('grant_extra_days', {
      userId: grantDaysDialog.userId,
      days: parseInt(grantDays)
    });
    if (data?.success) {
      toast.success(`${grantDays} dias liberados para ${grantDaysDialog.nome}`);
      setGrantDaysDialog(null);
      loadUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    u.nome_completo?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email_hotmart?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const pieData = dashboard ? [
    { name: 'Pagos', value: dashboard.paidUsers },
    { name: 'Gratuitos', value: dashboard.freeUsers }
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">OFFGROOM CONTROL CENTER</h1>
            <Badge variant="destructive" className="text-xs">MASTER ADMIN</Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => { signOut(); }}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Tabs defaultValue="dashboard">
           <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="users">👥 Usuários</TabsTrigger>
            <TabsTrigger value="pets">🐶 Pets</TabsTrigger>
            <TabsTrigger value="plans">💰 Planos</TabsTrigger>
            <TabsTrigger value="export">📦 Exportar</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Dashboard Executivo</h2>
              <Button variant="outline" size="sm" onClick={loadDashboard} disabled={loadingData}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingData ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </div>

            {dashboard && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Total Usuários</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.totalUsers}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Ativos (30d)</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.activeUsers}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><PawPrint className="h-4 w-4" /> Total Pets</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.totalPets}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><Calendar className="h-4 w-4" /> Agendamentos</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.totalAgendamentos}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="h-4 w-4" /> Pagos</div>
                    <p className="text-3xl font-bold mt-1 text-green-600">{dashboard.paidUsers}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Gratuitos</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.freeUsers}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Novos (mês)</div>
                    <p className="text-3xl font-bold mt-1 text-primary">{dashboard.newUsersMonth}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Conversão</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.totalUsers > 0 ? ((dashboard.paidUsers / dashboard.totalUsers) * 100).toFixed(1) : 0}%</p>
                  </CardContent></Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Crescimento de Usuários</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dashboard.growthData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                          <YAxis className="text-xs fill-muted-foreground" />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Pagos vs Gratuitos</CardTitle></CardHeader>
                    <CardContent className="flex justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Insights */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">🧠 Insights Inteligentes</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.totalUsers - dashboard.activeUsers > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>{dashboard.totalUsers - dashboard.activeUsers} usuários inativos há mais de 30 dias</span>
                      </div>
                    )}
                    {dashboard.freeUsers > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span>{dashboard.freeUsers} usuários no plano gratuito — potencial de conversão</span>
                      </div>
                    )}
                    {dashboard.newUsersMonth > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-green-500" />
                        <span>{dashboard.newUsersMonth} novos cadastros este mês</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Gestão de Usuários</h2>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou e-mail..." className="pl-9" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={loadUsers}><RefreshCw className="h-4 w-4 mr-1" /> Atualizar</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Logins</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome_completo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email_hotmart}</TableCell>
                        <TableCell className="text-sm">{u.whatsapp || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={u.hasActivePlan ? 'default' : 'secondary'}>
                            {u.hasActivePlan ? u.subscription?.plan_name || 'Pago' : u.plano_ativo || 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell className="text-sm">{u.login_count}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => setGrantDaysDialog({ userId: u.id, nome: u.nome_completo })}>
                            Liberar dias
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PETS */}
          <TabsContent value="pets" className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Gestão de Pets</h2>
              <Button variant="outline" size="sm" onClick={loadPets}><Search className="h-4 w-4 mr-1" /> Buscar</Button>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Input placeholder="Nome do pet" value={petFilters.nome} onChange={e => setPetFilters(p => ({ ...p, nome: e.target.value }))} />
                  <Select value={petFilters.sexo} onValueChange={v => setPetFilters(p => ({ ...p, sexo: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Sexo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Fêmea">Fêmea</SelectItem>
                      <SelectItem value="sem_sexo">Sem Sexo Definido</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={petFilters.porte} onValueChange={v => setPetFilters(p => ({ ...p, porte: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Porte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pequeno">Pequeno</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Raça" value={petFilters.raca} onChange={e => setPetFilters(p => ({ ...p, raca: e.target.value }))} />
                  <Button variant="secondary" onClick={() => { setPetFilters({ nome: '', sexo: '', porte: '', raca: '' }); setPets([]); }}>Limpar</Button>
                </div>
              </CardContent>
            </Card>

            {selectedPets.length > 0 && (
              <Card className="border-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Badge>{selectedPets.length} selecionados</Badge>
                    <Select onValueChange={v => setBulkAction({ field: 'sexo', value: v })}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Alterar sexo para..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Macho">Macho</SelectItem>
                        <SelectItem value="Fêmea">Fêmea</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select onValueChange={v => setBulkAction({ field: 'porte', value: v })}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Alterar porte para..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pequeno">Pequeno</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="grande">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                    {bulkAction && (
                      <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
                        Aplicar alteração
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {pets.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedPets.length === pets.length && pets.length > 0}
                            onCheckedChange={c => setSelectedPets(c ? pets.map(p => p.id) : [])}
                          />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Nome
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPetSortAsc(prev => !prev)}>
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableHead>
                        <TableHead>Raça</TableHead>
                        <TableHead>Porte</TableHead>
                        <TableHead>Sexo</TableHead>
                        <TableHead>Tutor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...pets].sort((a, b) => petSortAsc ? (a.nome_pet || '').localeCompare(b.nome_pet || '') : 0).map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedPets.includes(p.id)}
                              onCheckedChange={c => setSelectedPets(prev => c ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{p.nome_pet}</TableCell>
                          <TableCell>{p.raca}</TableCell>
                          <TableCell><Badge variant="outline">{p.porte}</Badge></TableCell>
                          <TableCell>{p.sexo || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.clientes?.nome_cliente || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PLANS */}
          <TabsContent value="plans" className="space-y-4">
            <h2 className="text-2xl font-bold">Gestão de Planos</h2>

            {dashboard && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Free</p>
                  <p className="text-3xl font-bold">{dashboard.freeUsers}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Pagos</p>
                  <p className="text-3xl font-bold text-green-600">{dashboard.paidUsers}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Conversão</p>
                  <p className="text-3xl font-bold">{dashboard.totalUsers > 0 ? ((dashboard.paidUsers / dashboard.totalUsers) * 100).toFixed(1) : 0}%</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{dashboard.totalUsers}</p>
                </CardContent></Card>
              </div>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm">Usuários com Liberação Manual Ativa</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Dias extras</TableHead>
                      <TableHead>Fim liberação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => u.liberacao_manual_ativa).map(u => (
                      <TableRow key={u.id}>
                        <TableCell>{u.nome_completo}</TableCell>
                        <TableCell>{u.email_hotmart}</TableCell>
                        <TableCell>{u.dias_liberacao_extra}</TableCell>
                        <TableCell>{u.data_fim_liberacao_extra ? new Date(u.data_fim_liberacao_extra).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {users.filter(u => u.liberacao_manual_ativa).length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXPORT */}
          <TabsContent value="export" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Database className="h-6 w-6" /> Exportar Dados do Sistema</h2>
            </div>
            <p className="text-sm text-muted-foreground">Selecione as tabelas para exportar. Os dados são filtrados apenas para os clientes autorizados.</p>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={exportSelected.size === ADMIN_EXPORT_TABLES.length}
                      onCheckedChange={() => {
                        if (exportSelected.size === ADMIN_EXPORT_TABLES.length) {
                          setExportSelected(new Set());
                        } else {
                          setExportSelected(new Set(ADMIN_EXPORT_TABLES.map(t => t.key)));
                        }
                      }}
                    />
                    <span className="text-sm font-semibold">Selecionar Todos ({exportSelected.size}/{ADMIN_EXPORT_TABLES.length})</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={exportLoading || exportSelected.size === 0}
                      onClick={async () => {
                        setExportLoading(true);
                        const dateStr = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
                        let ok = 0, err = 0;
                        for (const key of exportSelected) {
                          try {
                            const resp = await callAdmin('export_table', { table: key, user_emails: EXPORT_FILTER_EMAILS });
                            if (resp?.rows && resp.rows.length > 0) {
                              const remapped = remapExportRows(resp.rows);
                              const XLSX = (await import('xlsx')).default || await import('xlsx');
                              const ws = XLSX.utils.json_to_sheet(remapped);
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, key.slice(0, 31));
                              XLSX.writeFile(wb, `${key}_${dateStr}.xlsx`);
                              ok++;
                            }
                          } catch { err++; }
                        }
                        setExportLoading(false);
                        if (ok > 0) toast.success(`${ok} tabela(s) exportada(s)`);
                        if (err > 0) toast.error(`${err} tabela(s) com erro`);
                      }}
                    >
                      {exportLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Exportando...</> : <><Download className="h-4 w-4 mr-1" /> Exportar {exportSelected.size} tabela(s)</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={exportLoading || exportSelected.size === 0}
                      onClick={async () => {
                        setExportLoading(true);
                        const dateStr = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
                        let ok = 0, err = 0;
                        for (const key of exportSelected) {
                          try {
                            const resp = await callAdmin('export_table', { table: key, user_emails: EXPORT_FILTER_EMAILS });
                            if (resp?.rows && resp.rows.length > 0) {
                              const remapped = remapExportRows(resp.rows);
                              const headers = Object.keys(remapped[0]);
                              const escape = (v: any) => {
                                if (v === null || v === undefined) return '';
                                const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
                                return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
                              };
                              const csvRows = resp.rows.map((r: any) => headers.map(h => escape(r[h])).join(','));
                              const csv = [headers.join(','), ...csvRows].join('\n');
                              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                              const link = document.createElement('a');
                              link.href = URL.createObjectURL(blob);
                              link.download = `${key}_supabase_import_${dateStr}.csv`;
                              link.click();
                              URL.revokeObjectURL(link.href);
                              ok++;
                            }
                          } catch { err++; }
                        }
                        setExportLoading(false);
                        if (ok > 0) toast.success(`${ok} CSV(s) para importação gerado(s)`);
                        if (err > 0) toast.error(`${err} tabela(s) com erro`);
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" /> Exportar {exportSelected.size} CSV
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ADMIN_EXPORT_TABLES.map(t => (
                    <div key={t.key} className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/50 cursor-pointer" onClick={() => {
                      const next = new Set(exportSelected);
                      if (next.has(t.key)) next.delete(t.key); else next.add(t.key);
                      setExportSelected(next);
                    }}>
                      <Checkbox checked={exportSelected.has(t.key)} />
                      <span className="text-xs">{t.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SQL Schema */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Code className="h-5 w-5" /> SQL das Tabelas (CREATE TABLE)</CardTitle>
                <p className="text-xs text-muted-foreground">Copie o SQL abaixo para migrar a estrutura das tabelas do sistema.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => {
                    const el = document.getElementById('sql-schema-textarea') as HTMLTextAreaElement;
                    if (el) {
                      navigator.clipboard.writeText(el.value);
                      toast.success('SQL copiado para a área de transferência!');
                    }
                  }}>
                    <Copy className="h-4 w-4 mr-1" /> Copiar SQL
                  </Button>
                </div>
                <Textarea
                  id="sql-schema-textarea"
                  readOnly
                  className="font-mono text-[11px] min-h-[400px] bg-muted/30"
                  value={SQL_SCHEMA}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirm bulk dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Confirmar alteração em massa</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Você está prestes a alterar <strong>{selectedPets.length}</strong> registros.</p>
          {bulkAction && <p className="text-sm">Campo: <strong>{bulkAction.field}</strong> → Novo valor: <strong>{bulkAction.value}</strong></p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkUpdate}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant days dialog */}
      <Dialog open={!!grantDaysDialog} onOpenChange={() => setGrantDaysDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar dias extras</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Liberar acesso para: <strong>{grantDaysDialog?.nome}</strong></p>
          <Input type="number" value={grantDays} onChange={e => setGrantDays(e.target.value)} placeholder="Dias" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDaysDialog(null)}>Cancelar</Button>
            <Button onClick={handleGrantDays}>Liberar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMaster;

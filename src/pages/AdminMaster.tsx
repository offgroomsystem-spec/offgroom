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
  const [csvPreview, setCsvPreview] = useState('');

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

  const EXCLUDED_AGENDAMENTO_IDS = new Set([
    '7746e024-2f2d-4b0e-a775-3e6ceeb13438','df4877e5-2161-4c3f-90d2-dbd3ea67cccf',
    'c1b5e969-c33e-4f44-a419-64ed31a3bf17','c9dbdade-3b6c-4cab-86dc-4fa9b4bee3d4',
    '29136696-2092-4f19-9591-c405d93d5e13','3d309794-62f2-4019-9942-34327a2740cf',
    '97adb0d9-fac6-496a-bb97-48fa7a82bf4a','c61274bd-7fc4-43f4-ae21-7e664f4be6dc',
    'c854409e-8ac7-49e9-b6cc-538b5b4a3aa1','88886aca-8f59-4769-b7b7-b5a13c7c0309',
    '4c92b26d-7cfa-4060-9519-80a11a5403b6','30e0d54f-b26d-417b-8729-9467a7184d0f',
    'c07edcef-13a7-4a70-8f32-36fbe5ecc9af','c97c8795-985b-45b0-b8ab-88ea48386a8b',
    '4a5b76dc-4a6a-4412-abc2-e73bbbe9e22b','90671f72-8726-4be7-8988-4d1e589dc506',
    '9a456b26-f0b4-4ba9-8376-8a6291ed2d08','2c394138-c346-42e9-9040-970e3fa8b398',
    'e055ee94-5924-43fd-9c57-b275783d5368','6c6367d6-1709-4d2c-a082-f08b29c0d4c9',
    '56c0ef19-1367-4069-9fe0-2456015d5354','c400e937-c116-440a-b4ea-682efccd7e05',
    '349d8025-2f7a-4fe0-813b-619ee78d9729','cb2ad725-1985-477c-a2cf-1193a930a6db',
    '5a3787a3-df4d-45ae-8c47-925a2c2250f2','8628b01b-3d41-4081-a843-7e0cd0572bd3',
    '7a2261aa-81aa-42e2-aec4-2b2f9bdf5c52','6bc13d26-25b0-4435-a1a2-9458e0464675',
    '6547e9e2-fd35-43ad-a3c5-018195e621ee','b60d32bf-79da-4316-b2b0-a949c54d9cac',
    '17a595ea-338a-46ab-a513-2a2f2a39ae0a','f8b015a8-5f5f-4c30-9582-d1ddc376bb58',
    'f60c742f-fe3e-49fa-af1b-81f200468257','ad8a006e-0e5e-40e5-a6c1-b021bef97063',
    'cbbd707e-6429-4e97-b37e-5eff36258539','be761451-c455-491c-a46a-4c99f2097780',
    '484df658-e5e2-473d-9510-58d5d4c79040','6a9a63ab-1e21-4a70-b0be-6abc7135ff60',
    '6a3b7ee3-b21c-46b7-91a7-7da60cfe08db','a78c2910-db28-4568-840d-35b1a67c7aa6',
    '00100088-4aeb-4126-8f53-aac86ca40273','b0ebe35d-f8a8-4315-9ca4-7a004e336838',
    '1499a704-1bdf-4e61-a181-497d930697c8','5e7aec7d-1529-487e-9314-cffec55e4c47',
    'c189a9f1-de39-4160-9215-ca2d5fda9806','7c8211f2-4f2d-4d4d-a03e-d3d9d6e37a23',
    '0f59408e-d86e-4b8f-8791-14d6d8f73a31','c3398361-d583-42bb-a56c-71c99b751ddc',
    '7bd26124-fb0e-41f4-894f-7366cea6d50e','4283265e-a701-400f-9d24-fd07ef9f83c8',
    '87d862d0-dc1f-450a-bdd6-a90f300e824f','aca157a0-5db9-41b7-9ccc-1648bf344580',
    'ddfe7bf2-fa26-4eb3-9c2c-1eb5172f409f','28fa2a80-be9b-49d8-8e76-04e299ff557d',
    '1216df4c-8e2d-425b-bb9d-179efb68912f','90d8cad3-0162-4279-84fa-1a5f887165b5',
    '80318fd3-b4b9-46f0-a0c1-1a265611b3db','840feeb8-7c5d-4e27-9ab9-191f3ca380ec',
    '59ac3853-b2a4-4aca-b8b1-b14be44e161a','2241dd94-64df-418a-8fb3-a6231a506f82',
    '21e165d1-b817-4ac9-851d-72f75ddc5ae1','3934af85-3118-4b2b-a2cf-6f2166d2698b',
    '2b0a55bb-79e8-4a7d-afee-7c1baab300a4','77ac0eb5-e5c7-44df-915f-508cc6cd1707',
    '076739aa-32c4-45ad-8187-d5ea472193ac','7569d7ec-6ee5-4372-b6ab-40c6fa6cfb1a',
    'c87282a0-375c-4569-b7b2-13271df5db3b','3959469f-8696-4367-9cf5-9711426a1216',
    '01ea7741-611a-469f-ad7a-43cdd97f9511','736f7a91-50c7-440d-a830-3bef9724e185',
    '2ae95e8c-5f5c-4b21-8baf-cf3d41cd995b','54e5d90b-abac-4136-b706-148992640ed2',
    'df60affe-2df0-4ff9-97ee-77704d1fc4fd','94a8d1e3-b209-45d2-9e02-618ae30ad6fa',
    'b27b2e43-7f0b-4c91-873a-de312b49218e','876c9a77-09d4-4d63-bb29-1d427b8ee4ec',
    'a01caef2-7bf2-4984-8e4a-1c28c161b1ca','e678a34d-3d5b-4b54-a160-d71caca04ec3',
    '31c8ad08-295b-4182-bca3-5f20d6c8ea75','0f29c577-c5fa-4b08-9769-5c3ea2c74d43',
    'e93cfb4e-1434-479e-b999-6fd27a6f46e7','bf3cc890-71ec-4a46-9215-3301931f0631',
    '128948a4-a1e5-4ebe-a955-0a3d7e321cfc','8d486c25-7e24-48fb-bd89-aeb9d8a13e89',
    '35fc371d-a97f-425e-b9c5-c2c5d417f92f','231b2793-724d-4d5d-9afd-1fea2820d99a',
    'c0da7c01-02d2-494b-a60d-fe01261453b7','2e9682fa-82aa-4c87-b9a7-dd4e1420d4e0',
    'c90a4539-db00-4033-9680-799e17b2a91d','1e5dea65-05e3-4946-82ac-472b8f271b9f',
    '459372a4-22d1-46f9-9ab4-29db40615443','f9d9b63e-9224-46d8-8621-2b9f175b8228',
    '0adee5d9-9d2e-4a28-a102-db2c058617e5','11c3fabb-e87b-4d97-b845-cb2e65550074',
    'e28b1c6d-36e3-4ad2-ba6a-bdf6ee32a8ca','b4a0a5e9-bdef-4493-b7a5-776331414d54',
    '3ae68785-8565-4dc8-804b-354b86cd5436',
  ]);

  const ALLOWED_CLIENTE_IDS = new Set([
    'e368f8e7-dae7-4e29-aed6-9bce03b6bb94',
    '17313744-d08b-499a-a471-9da015c037e3',
    '573e7a2a-451b-42a0-b87f-0abd7f282f94',
    '85c44900-5f73-47fb-acb9-233cfc1b4917',
    '0b668c07-9eca-4eb8-b905-8baf6d636757',
    'f85ce7e8-0738-4f2e-8bf9-95dd3c5f1ea6',
  ]);

  const ALLOWED_USER_IDS = new Set([
    // IDs originais no banco (keys do EXPORT_ID_REMAP)
    'e368f8e7-dae7-4e29-aed6-9bce03b6bb94',
    '17313744-d08b-499a-a471-9da015c037e3',
    '573e7a2a-451b-42a0-b87f-0abd7f282f94',
    '85c44900-5f73-47fb-acb9-233cfc1b4917',
    '0b668c07-9eca-4eb8-b905-8baf6d636757',
    'f85ce7e8-0738-4f2e-8bf9-95dd3c5f1ea6',
  ]);

  const remapExportRows = (rows: any[], tableKey?: string) => {
    let result = rows
      .filter(row => {
        // Filtrar por user_id quando disponível
        const hasUserId = row.user_id !== undefined && row.user_id !== null;
        if (hasUserId) {
          if (!ALLOWED_USER_IDS.has(row.user_id)) return false;
        }
        // Respeitar exclusões manuais da tabela de agendamentos
        if (tableKey === 'agendamentos' && EXCLUDED_AGENDAMENTO_IDS.has(row.id)) {
          return false;
        }
        // Se já filtrou por user_id, não precisa filtrar por cliente_id novamente
        if (hasUserId) return true;
        // Filtrar por cliente_id somente quando NÃO há user_id
        if (row.cliente_id !== undefined && row.cliente_id !== null) {
          return ALLOWED_CLIENTE_IDS.has(row.cliente_id);
        }
        return true;
      });
    // Colunas a excluir por tabela
    const EXCLUDE_COLUMNS: Record<string, string[]> = {
      subscriptions: ['hotmart_transaction_id', 'end_date'],
    };
    const excludeSet = new Set(EXCLUDE_COLUMNS[tableKey || ''] || []);

    return result.map(row => {
      const newRow = { ...row };
      // Remover colunas excluídas
      for (const col of excludeSet) delete newRow[col];
      // Agendamentos: manter o id original (UUID único da linha) — NÃO remapear
      // Remapear user_id
      if (newRow.user_id && EXPORT_ID_REMAP[newRow.user_id]) {
        newRow.user_id = EXPORT_ID_REMAP[newRow.user_id];
      }
      // Remapear cliente_id
      if (newRow.cliente_id && EXPORT_ID_REMAP[newRow.cliente_id]) {
        newRow.cliente_id = EXPORT_ID_REMAP[newRow.cliente_id];
      }
      // Remapear id da tabela clientes
      if (tableKey === 'clientes' && EXPORT_ID_REMAP[newRow.id]) {
        newRow.id = EXPORT_ID_REMAP[newRow.id];
      }
      return newRow;
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
                              const remapped = remapExportRows(resp.rows, key);
                              if (remapped.length === 0) continue;
                              const formatDate = (val: any) => {
                                if (typeof val !== 'string') return val;
                                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
                                  const d = new Date(val);
                                  if (!isNaN(d.getTime())) {
                                    const p = (n: number) => String(n).padStart(2, '0');
                                    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
                                  }
                                }
                                if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return `${val} 00:00:00`;
                                return val;
                              };
                              const formatted = remapped.map((row: any) => {
                                const nr: any = {};
                                for (const k of Object.keys(row)) nr[k] = formatDate(row[k]);
                                return nr;
                              });
                              const XLSX = (await import('xlsx')).default || await import('xlsx');
                              const ws = XLSX.utils.json_to_sheet(formatted);
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
                      disabled={exportLoading || exportSelected.size !== 1}
                      onClick={async () => {
                        setExportLoading(true);
                        const key = [...exportSelected][0];
                        try {
                          const resp = await callAdmin('export_table', { table: key, user_emails: EXPORT_FILTER_EMAILS });
                          if (resp?.rows && resp.rows.length > 0) {
                            const remapped = remapExportRows(resp.rows, key);
                            if (remapped.length > 0) {
                              const headers = Object.keys(remapped[0]);
                              const formatDateValue = (val: string): string => {
                                // ISO 8601 with T and timezone -> YYYY-MM-DD HH:MM:SS
                                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
                                  const d = new Date(val);
                                  if (!isNaN(d.getTime())) {
                                    const pad = (n: number) => String(n).padStart(2, '0');
                                    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                                  }
                                }
                                // Date only YYYY-MM-DD -> keep + add 00:00:00
                                if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return `${val} 00:00:00`;
                                return val;
                              };
                              const escape = (v: any) => {
                                if (v === null || v === undefined || v === '') return '';
                                if (typeof v === 'object') {
                                  const json = JSON.stringify(v);
                                  return `"${json.replace(/"/g, '""')}"`;
                                }
                                let s = String(v);
                                s = formatDateValue(s);
                                return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
                              };
                              const csvRows = remapped.map((r: any) => headers.map(h => escape(r[h])).join(','));
                              const csv = [headers.join(','), ...csvRows].join('\n');
                              setCsvPreview(csv);
                              toast.success('CSV gerado no campo abaixo');
                            } else {
                              toast.error('Nenhum registro encontrado após filtros');
                            }
                          } else {
                            toast.error('Tabela vazia');
                          }
                        } catch { toast.error('Erro ao gerar CSV'); }
                        setExportLoading(false);
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" /> Gerar CSV {exportSelected.size === 1 ? `(${[...exportSelected][0]})` : ''}
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


            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Code className="h-5 w-5" /> {csvPreview ? 'CSV Gerado' : 'SQL das Tabelas (CREATE TABLE)'}</CardTitle>
                <p className="text-xs text-muted-foreground">{csvPreview ? 'Conteúdo CSV gerado a partir das tabelas selecionadas.' : 'Copie o SQL abaixo para migrar a estrutura das tabelas do sistema.'}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-end gap-2">
                  {csvPreview && (
                    <Button size="sm" variant="ghost" onClick={() => setCsvPreview('')}>
                      Voltar para SQL
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => {
                    const content = csvPreview || SQL_SCHEMA;
                    navigator.clipboard.writeText(content);
                    toast.success(csvPreview ? 'CSV copiado!' : 'SQL copiado para a área de transferência!');
                  }}>
                    <Copy className="h-4 w-4 mr-1" /> Copiar {csvPreview ? 'CSV' : 'SQL'}
                  </Button>
                </div>
                <Textarea
                  id="sql-schema-textarea"
                  readOnly
                  className="font-mono text-[11px] min-h-[400px] bg-muted/30"
                  value={csvPreview || SQL_SCHEMA}
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

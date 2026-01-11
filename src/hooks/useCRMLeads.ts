import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays } from "date-fns";

export interface CRMLead {
  id: string;
  nome_empresa: string;
  nota_google: number | null;
  qtd_avaliacoes: number | null;
  telefone_empresa: string;
  nome_dono: string | null;
  telefone_dono: string | null;
  tentativa: number;
  teve_resposta: boolean;
  agendou_reuniao: boolean;
  data_reuniao: string | null;
  usando_acesso_gratis: boolean;
  dias_acesso_gratis: number;
  data_inicio_acesso_gratis: string | null;
  iniciou_acesso_pago: boolean;
  data_inicio_acesso_pago: string | null;
  plano_contratado: string | null;
  proximo_passo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CRMMensagem {
  id: string;
  lead_id: string;
  tentativa: number;
  data_envio: string;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
}

// Função para calcular o próximo passo automaticamente
export const calcularProximoPasso = (lead: Partial<CRMLead>): string | null => {
  const hoje = new Date();

  // Se iniciou acesso pago, não há próximo passo
  if (lead.iniciou_acesso_pago) {
    return null;
  }

  // Se está usando acesso grátis, próximo passo é o fim do acesso
  if (lead.usando_acesso_gratis && lead.data_inicio_acesso_gratis) {
    const dataInicio = new Date(lead.data_inicio_acesso_gratis);
    const diasGratis = lead.dias_acesso_gratis || 30;
    const dataFim = addDays(dataInicio, diasGratis);
    return dataFim.toISOString().split('T')[0];
  }

  // Se agendou reunião, próximo passo é a data da reunião
  if (lead.agendou_reuniao && lead.data_reuniao) {
    return lead.data_reuniao;
  }

  // Baseado na tentativa atual
  const tentativa = lead.tentativa || 1;
  
  if (tentativa >= 5 && !lead.teve_resposta) {
    // 5ª tentativa sem resposta - marcar como sem interesse
    return null;
  }

  // Dias até próximo contato baseado na tentativa
  const diasPorTentativa: Record<number, number> = {
    1: 3,
    2: 5,
    3: 7,
    4: 14,
    5: 0
  };

  const dias = diasPorTentativa[tentativa] || 3;
  return addDays(hoje, dias).toISOString().split('T')[0];
};

// Função para calcular o status automaticamente
export const calcularStatus = (lead: Partial<CRMLead>): string => {
  if (lead.iniciou_acesso_pago) return "Acesso pago";
  if (lead.usando_acesso_gratis) return "Acesso grátis";
  if (lead.agendou_reuniao) return "Reunião agendada";
  if (lead.tentativa && lead.tentativa >= 5 && !lead.teve_resposta) return "Sem interesse";
  if (lead.teve_resposta) return "Em contato";
  if (lead.tentativa && lead.tentativa > 1) return "Em contato";
  return "Novo";
};

export const useCRMLeads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CRMLead[];
    },
  });

  const createLead = useMutation({
    mutationFn: async (lead: Omit<CRMLead, "id" | "created_at" | "updated_at">) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const proximo_passo = calcularProximoPasso(lead);
      const status = calcularStatus(lead);

      const { data, error } = await supabase
        .from("crm_leads")
        .insert({
          ...lead,
          proximo_passo,
          status,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar lead", description: error.message, variant: "destructive" });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...lead }: Partial<CRMLead> & { id: string }) => {
      const proximo_passo = calcularProximoPasso(lead);
      const status = calcularStatus(lead);

      const { data, error } = await supabase
        .from("crm_leads")
        .update({
          ...lead,
          proximo_passo,
          status,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar lead", description: error.message, variant: "destructive" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_leads")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir lead", description: error.message, variant: "destructive" });
    },
  });

  const importLeads = useMutation({
    mutationFn: async (leadsData: Array<{ nome_empresa: string; nota_google: number | null; qtd_avaliacoes: number | null; telefone_empresa: string }>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const leadsToInsert = leadsData.map(lead => ({
        ...lead,
        tentativa: 1,
        teve_resposta: false,
        agendou_reuniao: false,
        usando_acesso_gratis: false,
        dias_acesso_gratis: 30,
        iniciou_acesso_pago: false,
        proximo_passo: addDays(new Date(), 3).toISOString().split('T')[0],
        status: "Novo",
        created_by: userData.user?.id,
      }));

      const { data, error } = await supabase
        .from("crm_leads")
        .insert(leadsToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: `${data.length} leads importados com sucesso!` });
    },
    onError: (error) => {
      toast({ title: "Erro ao importar leads", description: error.message, variant: "destructive" });
    },
  });

  return {
    leads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    importLeads,
  };
};

export const useCRMMensagens = (leadId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["crm-mensagens", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from("crm_mensagens")
        .select("*")
        .eq("lead_id", leadId)
        .order("data_envio", { ascending: false });

      if (error) throw error;
      return data as CRMMensagem[];
    },
    enabled: !!leadId,
  });

  const createMensagem = useMutation({
    mutationFn: async ({ lead_id, tentativa, observacao }: { lead_id: string; tentativa: number; observacao?: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("crm_mensagens")
        .insert({
          lead_id,
          tentativa,
          observacao,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-mensagens", leadId] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Mensagem registrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar mensagem", description: error.message, variant: "destructive" });
    },
  });

  return {
    mensagens,
    isLoading,
    createMensagem,
  };
};

export const useCRMAccess = () => {
  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ["crm-access"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const { data, error } = await supabase
        .from("crm_usuarios_autorizados")
        .select("id")
        .eq("email", userData.user.email)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
  });

  return { hasAccess: hasAccess ?? false, isLoading };
};

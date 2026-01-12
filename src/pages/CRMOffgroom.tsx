import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CRMLayout from "@/components/crm/CRMLayout";
import FilterBar from "@/components/crm/FilterBar";
import ImportExcel from "@/components/crm/ImportExcel";
import LeadsList from "@/components/crm/LeadsList";
import CRMDashboard from "@/components/crm/CRMDashboard";
import CRMFilters, { CRMFiltersState } from "@/components/crm/CRMFilters";
import { useCRMLeads, useCRMAccess } from "@/hooks/useCRMLeads";
import { Loader2, ShieldX, LayoutList, LayoutDashboard, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";


const CRMOffgroom = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("leads");
  const [advancedFilters, setAdvancedFilters] = useState<CRMFiltersState>({
    enviouMensagem: "",
    tentativa: "",
    teveResposta: "",
    agendouReuniao: "",
    usandoAcessoGratis: "",
    iniciouAcessoPago: "",
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const { leads, isLoading: leadsLoading } = useCRMLeads();
  const { hasAccess, isLoading: accessLoading } = useCRMAccess();

  // Verificar se há filtros ativos
  const hasActiveFilters = Object.values(advancedFilters).some(v => v !== "");

  // Mapa de mensagens por combinação de filtros (será configurado posteriormente)
  const getMessageForFilters = (filters: CRMFiltersState): string => {
    // Estrutura para configurar as mensagens
    const messages: Record<string, string> = {
      // Mensagens serão configuradas aqui pelo usuário
      // Formato: "teveResposta_agendouReuniao_usandoAcessoGratis_iniciouAcessoPago": "Mensagem..."
    };

    const key = `${filters.teveResposta}_${filters.agendouReuniao}_${filters.usandoAcessoGratis}_${filters.iniciouAcessoPago}`;
    
    return messages[key] || "Mensagem ainda não configurada para esta combinação de filtros.";
  };

  // Função para copiar mensagem do WhatsApp
  const handleCopyWhatsappMessage = async () => {
    const message = getMessageForFilters(advancedFilters);
    
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Mensagem copiada!",
        description: "Cole em sua conversa de Whatsapp com seu cliente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive",
      });
    }
  };

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Aplicar filtros
  const filteredLeads = useMemo(() => {
    let result = leads;

    // Filtro de texto (busca)
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(l => 
        l.nome_empresa.toLowerCase().includes(lowerFilter) ||
        l.telefone_empresa.includes(filter) ||
        (l.nome_dono && l.nome_dono.toLowerCase().includes(lowerFilter))
      );
    }

    // Filtro: Enviou mensagem?
    if (advancedFilters.enviouMensagem === "sim") {
      result = result.filter(l => (l.tentativa ?? 0) > 0);
    } else if (advancedFilters.enviouMensagem === "nao") {
      result = result.filter(l => (l.tentativa ?? 0) === 0);
    }

    // Filtro: Tentativa
    if (advancedFilters.tentativa !== "") {
      const tentativa = parseInt(advancedFilters.tentativa);
      result = result.filter(l => (l.tentativa ?? 0) === tentativa);
    }

    // Filtro: Teve Resposta?
    if (advancedFilters.teveResposta === "sim") {
      result = result.filter(l => l.teve_resposta === true);
    } else if (advancedFilters.teveResposta === "nao") {
      result = result.filter(l => l.teve_resposta !== true);
    }

    // Filtro: Agendou Reunião?
    if (advancedFilters.agendouReuniao === "sim") {
      result = result.filter(l => l.agendou_reuniao === true);
    } else if (advancedFilters.agendouReuniao === "nao") {
      result = result.filter(l => l.agendou_reuniao !== true);
    }

    // Filtro: Usando Acesso Grátis?
    if (advancedFilters.usandoAcessoGratis === "sim") {
      result = result.filter(l => l.usando_acesso_gratis === true);
    } else if (advancedFilters.usandoAcessoGratis === "nao") {
      result = result.filter(l => l.usando_acesso_gratis !== true);
    }

    // Filtro: Iniciou acesso pago?
    if (advancedFilters.iniciouAcessoPago === "sim") {
      result = result.filter(l => l.iniciou_acesso_pago === true);
    } else if (advancedFilters.iniciouAcessoPago === "nao") {
      result = result.filter(l => l.iniciou_acesso_pago !== true);
    }

    return result;
  }, [leads, filter, advancedFilters]);

  // Loading inicial
  if (isAuthenticated === null || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Não autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-muted-foreground">Você precisa estar logado para acessar o CRM.</p>
          <Button onClick={() => navigate("/login")}>Fazer Login</Button>
        </div>
      </div>
    );
  }

  // Sem permissão
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar o CRM interno.</p>
          <p className="text-sm text-muted-foreground">
            Esta área é exclusiva para funcionários autorizados da Offgroom.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CRMLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <LayoutList className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>
          
          {activeTab === "leads" && <ImportExcel />}
        </div>

        <TabsContent value="leads" className="space-y-4 mt-0">
          {/* Filtros */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <FilterBar value={filter} onChange={setFilter} />
              <div className="flex gap-2 items-center">
                <CRMFilters filters={advancedFilters} onChange={setAdvancedFilters} />
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    className="h-9 gap-2"
                    onClick={handleCopyWhatsappMessage}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar msg Whatsapp
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{leads.length} leads cadastrados</span>
            {(filter || Object.values(advancedFilters).some(v => v !== "")) && (
              <span>• {filteredLeads.length} encontrados</span>
            )}
          </div>

          {/* Lista de Leads */}
          <LeadsList 
            leads={filteredLeads} 
            isLoading={leadsLoading} 
            filter="" 
          />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-0">
          <CRMDashboard leads={leads} />
        </TabsContent>
      </Tabs>
    </CRMLayout>
  );
};

export default CRMOffgroom;

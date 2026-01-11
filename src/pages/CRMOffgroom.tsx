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
import { Loader2, ShieldX, LayoutList, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfDay, startOfWeek, startOfMonth, isBefore } from "date-fns";

const CRMOffgroom = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("leads");
  const [advancedFilters, setAdvancedFilters] = useState<CRMFiltersState>({
    status: "all",
    tentativa: "all",
    periodo: "all",
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const { leads, isLoading: leadsLoading } = useCRMLeads();
  const { hasAccess, isLoading: accessLoading } = useCRMAccess();

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

    // Filtro por status
    if (advancedFilters.status !== "all") {
      result = result.filter(l => l.status === advancedFilters.status);
    }

    // Filtro por tentativa
    if (advancedFilters.tentativa !== "all") {
      const tentativa = parseInt(advancedFilters.tentativa);
      if (tentativa === 5) {
        result = result.filter(l => l.tentativa >= 5);
      } else {
        result = result.filter(l => l.tentativa === tentativa);
      }
    }

    // Filtro por período (baseado no próximo passo)
    if (advancedFilters.periodo !== "all") {
      const hoje = startOfDay(new Date());
      const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 1 });
      const inicioMes = startOfMonth(new Date());

      result = result.filter(l => {
        if (!l.proximo_passo) return advancedFilters.periodo === "overdue" ? false : false;
        
        const proximoPasso = startOfDay(new Date(l.proximo_passo));

        switch (advancedFilters.periodo) {
          case "today":
            return proximoPasso.getTime() === hoje.getTime();
          case "week":
            return proximoPasso >= inicioSemana && proximoPasso <= new Date();
          case "month":
            return proximoPasso >= inicioMes && proximoPasso <= new Date();
          case "overdue":
            return isBefore(proximoPasso, hoje) && l.status !== "Standby" && l.status !== "Sem interesse";
          default:
            return true;
        }
      });
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
              <CRMFilters filters={advancedFilters} onChange={setAdvancedFilters} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{leads.length} leads cadastrados</span>
            {(filter || advancedFilters.status !== "all" || advancedFilters.tentativa !== "all" || advancedFilters.periodo !== "all") && (
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

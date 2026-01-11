import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CRMLayout from "@/components/crm/CRMLayout";
import FilterBar from "@/components/crm/FilterBar";
import ImportExcel from "@/components/crm/ImportExcel";
import LeadsList from "@/components/crm/LeadsList";
import { useCRMLeads, useCRMAccess } from "@/hooks/useCRMLeads";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

const CRMOffgroom = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
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
      <div className="space-y-6">
        {/* Header com filtro e importação */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <FilterBar value={filter} onChange={setFilter} />
          <ImportExcel />
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{leads.length} leads cadastrados</span>
          {filter && <span>• {leads.filter(l => 
            l.nome_empresa.toLowerCase().includes(filter.toLowerCase()) ||
            l.telefone_empresa.includes(filter) ||
            (l.nome_dono && l.nome_dono.toLowerCase().includes(filter.toLowerCase()))
          ).length} encontrados</span>}
        </div>

        {/* Lista de Leads */}
        <LeadsList 
          leads={leads} 
          isLoading={leadsLoading} 
          filter={filter} 
        />
      </div>
    </CRMLayout>
  );
};

export default CRMOffgroom;

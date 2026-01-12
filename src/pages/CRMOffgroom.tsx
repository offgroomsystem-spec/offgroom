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

  // Mapa de mensagens por combinação de filtros
  const getMessageForFilters = (filters: CRMFiltersState): string => {
    const messages: Record<string, string> = {
      // Tentativa 0 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "0_nao_nao_nao_nao": `Você saberia me dizer, agora, *quem são os clientes que vieram nos últimos 15 dias e não voltaram mais?* 🤔

Se você não tem essa resposta, o seu lucro pode estar indo direto para a concorrência.

Ter apenas um "bom serviço" não garante agenda cheia. Você precisa de *organização e inteligência* para garantir a recorrência.

O _Offgroom_ é um sistema de gestão para quem quer deixar de ser apenas um "prestador de serviços" e se tornar uma *empresa lucrativa* .

*Com o Offgroom você vai ter:* 

✅ Controle total da Agenda e dos Pacotes. 

✅ Confirmação de agendamento pelo WhatsApp

✅ Gestão Financeira completa

✅ Foco em Recorrência: saiba exatamente quem precisa voltar.

🎁 _PRESENTE EXCLUSIVO PARA VOCÊ:_

Eu confio tanto que o _Offgroom_ vai *organizar sua empresa e aumentar seu faturamento* , que liberei *30 DIAS DE ACESSO COMPLETO E GRATUITO.*

Sem pegadinhas. É entrar, usar, organizar e ver o resultado no bolso.

🚀 *Toque no link abaixo para ativar seus 30 dias grátis agora:* offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // Tentativa 1 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "1_nao_nao_nao_nao": `Você deve ter assistido ao vídeo e pensado: _"O sistema é ótimo, mas deve ser caro..."_ 💸

*Vou te surpreender* : o _Offgroom_ é muito mais barato do que você imagina.

Na verdade, a minha proposta é que ele saia *de graça* para você. Como assim? 🤔

É matemática simples: se as ferramentas de recorrência do Offgroom trouxerem de volta apenas 2 ou 3 clientes que sumiram da sua agenda, o sistema já se pagou sozinho.

Ou seja: você paga a mensalidade com o próprio resultado que o sistema gera, sem sentir no bolso, e ainda sobra lucro.

Não deixe o medo do custo impedir o crescimento da sua empresa.

🎁 *PROVE VOCÊ MESMO (SEM PAGAR NADA):* Liberei *30 DIAS DE ACESSO GRÁTIS.* Use as ferramentas, recupere clientes e veja o dinheiro entrar antes mesmo de pensar em pagar o sistema.

Toque no link e comece agora: 🚀 offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // Tentativa 2 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "2_nao_nao_nao_nao": `A falta de gestão afeta o dia a dia. Mas eu sei que cada Banho e Tosa tem sua própria rotina.

Por isso, mais do que "falar" sobre o sistema, eu quero te mostrar o Offgroom rodando na prática, dentro da realidade do seu negócio.

📅 Vamos agendar uma demonstração online?

Em uma conversa rápida de até 1 hora, eu vou:

Entender o que você mais precisa hoje (Agenda? Financeiro? Recorrência?).

Te mostrar na tela como o Offgroom resolve esses pontos.

Tirar todas as suas dúvidas sobre a ferramenta.

É sem compromisso. O objetivo é que você veja com seus próprios olhos se o sistema é para você.

*Me confirma qual seria o dia e horário ideal para você?*`,

      // Tentativa 3 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "3_nao_nao_nao_nao": `Seu concorrente já usa tecnologia para fidelizar os clientes dele... e você? 👀

Gerir um Banho e Tosa apenas no "caderno" ou na "memória" é pedir para perder dinheiro. Sem processos definidos, o cliente esquece de voltar.

Dê um basta na desorganização com o Offgroom. É a ferramenta completa para quem quer crescer de verdade: 

✅ Agendamentos rápidos e organizados. 

✅ Confirmação via Whatsapp _(adeus, faltas!)_ . 

✅ Controle financeiro na palma da mão.

🎁 *Liberei 30 DIAS DE ACESSO GRATUITO.*

Organize sua empresa e aumente seu lucro agora: 🚀 offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // Tentativa 4 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "4_nao_nao_nao_nao": `Quantos clientes te deixaram na mão essa semana porque esqueceram o horário? 😡

A falha não é do cliente, é do processo. Confiar na memória ou no caderninho de papel abre margem para erros e prejuízo.

O Offgroom funciona como seu "secretário virtual" para acabar com isso: 

✅ Ele confirma os agendamentos pelo WhatsApp para você. 

✅ Ele organiza a agenda para não encavalar horários. 

✅ Ele te avisa quando o pacote do cliente está acabando.

Chega de perder dinheiro por falha de comunicação.

🎁 *TESTE POR MINHA CONTA:* Quero que você tenha paz de espírito para trabalhar. *Liberei 30 DIAS DE ACESSO GRÁTIS* ao sistema completo.

Toque no link e comece a automatizar seu negócio: 🚀 offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // Tentativa 5 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "5_nao_nao_nao_nao": `Você sente que trabalha muito, mas não vê a cor do dinheiro no final do mês? 💸

Como falei no vídeo: o segredo não é só lavar bem, é ter *RECORRÊNCIA* .

Pare de deixar dinheiro na mesa por falta de organização. O Offgroom chegou para centralizar sua gestão: 

📍 Agenda inteligente _(com confirmação no Zap)_ . 

📍 Financeiro que bate centavo por centavo. 

📍 Controle de quem deve voltar _(recupere clientes inativos!)_ .

💡 *OFERTA DE LANÇAMENTO:* Quer ver seu Pet Shop lucrar mais? Estou liberando *30 dias de acesso TOTALMENTE GRÁTIS* para você testar.

Comece a usar agora e sinta a diferença: 🚀 offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,
    };

    // Chave inclui tentativa + outros filtros
    const key = `${filters.tentativa}_${filters.teveResposta}_${filters.agendouReuniao}_${filters.usandoAcessoGratis}_${filters.iniciouAcessoPago}`;
    
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

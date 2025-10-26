import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, TrendingUp, Calendar, Users, Package, ArrowLeft } from "lucide-react";
import { FilterPanel } from "@/components/relatorios/filters/FilterPanel";
import { DashboardExecutivo } from "@/components/relatorios/dashboard/DashboardExecutivo";
import { FluxoDeCaixa } from "@/components/relatorios/financeiros/FluxoDeCaixa";
import { DRE } from "@/components/relatorios/financeiros/DRE";
import { Inadimplencia } from "@/components/relatorios/financeiros/InadimplenciaDisabled";
import { PacotesProximosVencimento } from "@/components/relatorios/pacotes/PacotesProximosVencimento";

const Relatorios = () => {
  const [filtros, setFiltros] = useState({
    periodo: "mes",
    dataInicio: "",
    dataFim: "",
    bancosSelecionados: []
  });

  const [relatorioAtivo, setRelatorioAtivo] = useState<string | null>(null);
  const [versaoFiltro, setVersaoFiltro] = useState(0);

  const handleCardClick = (nomeRelatorio: string) => {
    setRelatorioAtivo(nomeRelatorio);
  };

  const handleVoltar = () => {
    setRelatorioAtivo(null);
  };

  const handleAplicarFiltros = () => {
    setVersaoFiltro(v => v + 1);
  };

  const handleLimparFiltros = () => {
    setFiltros({ periodo: "mes", dataInicio: "", dataFim: "", bancosSelecionados: [] });
  };

  if (relatorioAtivo) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={handleVoltar}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <FilterPanel 
          filtros={filtros}
          setFiltros={setFiltros}
          onAplicar={handleAplicarFiltros}
          onLimpar={handleLimparFiltros}
        />
        
        {relatorioAtivo === "dashboard" && <DashboardExecutivo key={versaoFiltro} filtros={filtros} />}
        {relatorioAtivo === "fluxo-caixa" && <FluxoDeCaixa filtros={filtros} key={versaoFiltro} />}
        {relatorioAtivo === "dre" && <DRE filtros={filtros} />}
        {relatorioAtivo === "inadimplencia" && <Inadimplencia filtros={filtros} />}
        {relatorioAtivo === "pacotes-vencimento" && <PacotesProximosVencimento key={versaoFiltro} />}
        
        {!["dashboard", "fluxo-caixa", "dre", "inadimplencia", "pacotes-vencimento"].includes(relatorioAtivo) && (
          <Card>
            <CardHeader>
              <CardTitle>Relatório em Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Este relatório está sendo desenvolvido e estará disponível em breve.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-foreground">Relatórios</h1>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard Executivo</span>
            <span className="sm:hidden">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios Financeiros</span>
            <span className="sm:hidden">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger value="servicos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Serviços e Agendamentos</span>
            <span className="sm:hidden">Serviços</span>
          </TabsTrigger>
          <TabsTrigger value="clientes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes e Pacotes</span>
            <span className="sm:hidden">Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="estoque" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Estoque e Compras</span>
            <span className="sm:hidden">Estoque</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
            onClick={() => handleCardClick("dashboard")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Dashboard Principal - Visão Rápida
              </CardTitle>
              <CardDescription>
                Visão 360° da saúde do negócio em uma única tela
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Clique para visualizar KPIs, alertas importantes e gráficos de tendência
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: "fluxo-caixa", titulo: "Fluxo de Caixa", desc: "Entradas e saídas detalhadas por período" },
              { id: "dre", titulo: "Demonstrativo de Resultado (DRE)", desc: "Análise de receitas, custos e lucro líquido" },
              { id: "ponto-equilibrio", titulo: "Ponto de Equilíbrio", desc: "Em desenvolvimento" },
              { id: "receita-operacional", titulo: "Receita Operacional", desc: "Em desenvolvimento" },
              { id: "receita-nao-operacional", titulo: "Receita Não Operacional", desc: "Em desenvolvimento" },
              { id: "despesas-fixas", titulo: "Despesas Fixas", desc: "Em desenvolvimento" },
              { id: "despesas-variaveis", titulo: "Despesas Variáveis", desc: "Em desenvolvimento" },
              { id: "despesa-nao-operacional", titulo: "Despesa Não Operacional", desc: "Em desenvolvimento" },
              { id: "movimentacoes-bancarias", titulo: "Movimentações Bancárias", desc: "Em desenvolvimento" },
              { id: "inadimplencia", titulo: "Inadimplência e Contas a Receber", desc: "Contas vencidas e a vencer" }
            ].map(rel => (
              <Card key={rel.id} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary" onClick={() => handleCardClick(rel.id)}>
                <CardHeader><CardTitle className="text-sm">{rel.titulo}</CardTitle></CardHeader>
                <CardContent><p className="text-xs text-muted-foreground">{rel.desc}</p></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="servicos" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Atendimentos Realizados", "Serviços Agendados vs. Capacidade", "Desempenho por Funcionário", "Serviços Avulsos", "Serviços Mais Vendidos"].map(titulo => (
              <Card key={titulo} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary">
                <CardHeader><CardTitle className="text-sm">{titulo}</CardTitle></CardHeader>
                <CardContent><p className="text-xs text-muted-foreground">Em desenvolvimento</p></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Pacotes Ativos", "Pacotes Expirados", "Taxa de Renovação", "Clientes Top (Por Receita)", "Valor de Vida do Cliente (CLV)", "Clientes em Risco (Churn Proativo)"].map(titulo => (
              <Card key={titulo} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary">
                <CardHeader><CardTitle className="text-sm">{titulo}</CardTitle></CardHeader>
                <CardContent><p className="text-xs text-muted-foreground">Em desenvolvimento</p></CardContent>
              </Card>
            ))}
            <Card 
              key="Pacotes Próximos do Vencimento" 
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("pacotes-vencimento")}
            >
              <CardHeader><CardTitle className="text-sm">Pacotes Próximos do Vencimento</CardTitle></CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">Visualize pacotes que vencem nos próximos 7 dias</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estoque" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Giro de Estoque e Curva ABC", "Produtos Próximos ao Vencimento", "Sugestão de Compra Inteligente", "Margem de Lucro por Produto"].map(titulo => (
              <Card key={titulo} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary">
                <CardHeader><CardTitle className="text-sm">{titulo}</CardTitle></CardHeader>
                <CardContent><p className="text-xs text-muted-foreground">Em desenvolvimento</p></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;

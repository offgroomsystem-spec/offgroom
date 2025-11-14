import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, TrendingUp, Calendar, Users, Package, ArrowLeft } from "lucide-react";
import { FilterPanel } from "@/components/relatorios/filters/FilterPanel";
import { DashboardExecutivo } from "@/components/relatorios/dashboard/DashboardExecutivo";
import FluxoDeCaixa from "@/components/relatorios/financeiros/FluxoDeCaixa";
import { DRE } from "@/components/relatorios/financeiros/DRE";
import { Inadimplencia } from "@/components/relatorios/financeiros/Inadimplencia";
import { PacotesProximosVencimento } from "@/components/relatorios/pacotes/PacotesProximosVencimento";
import { PacotesExpirados } from "@/components/relatorios/pacotes/PacotesExpirados";
import { ClientesEmRisco } from "@/components/relatorios/clientes/ClientesEmRisco";
import ControleFinanceiro from "@/pages/ControleFinanceiro";
import { ReceitaOperacional } from "@/components/relatorios/financeiros/ReceitaOperacional";
import { ReceitaNaoOperacional } from "@/components/relatorios/financeiros/ReceitaNaoOperacional";
import { DespesasFixas } from "@/components/relatorios/financeiros/DespesasFixas";
import { DespesasOperacionais } from "@/components/relatorios/financeiros/DespesasOperacionais";
import { DespesasNaoOperacionais } from "@/components/relatorios/financeiros/DespesasNaoOperacionais";
import { PontoEquilibrio } from "@/components/relatorios/financeiros/PontoEquilibrio";

const Relatorios = () => {
  const [filtros, setFiltros] = useState({
    periodo: "mes",
    dataInicio: "",
    dataFim: "",
    bancosSelecionados: [],
  });

  const [relatorioAtivo, setRelatorioAtivo] = useState<string | null>(null);
  const [versaoFiltro, setVersaoFiltro] = useState(0);
  const [filtrosControleFinanceiro, setFiltrosControleFinanceiro] = useState<any>(null);

  const handleCardClick = (nomeRelatorio: string, filtrosIniciais?: any) => {
    setRelatorioAtivo(nomeRelatorio);

    if (nomeRelatorio === "controle-financeiro" && filtrosIniciais) {
      setFiltrosControleFinanceiro(filtrosIniciais);
    } else {
      setFiltrosControleFinanceiro(null);
    }
  };

  const handleVoltar = () => {
    setRelatorioAtivo(null);
  };

  const handleAplicarFiltros = () => {
    setVersaoFiltro((v) => v + 1);
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

        {/* Filtros agora são integrados em cada relatório */}

        {relatorioAtivo === "dashboard" && (
          <DashboardExecutivo key={versaoFiltro} filtros={filtros} onNavigateToReport={handleCardClick} />
        )}
        {relatorioAtivo === "controle-financeiro" && <ControleFinanceiro filtrosIniciais={filtrosControleFinanceiro} />}
        {relatorioAtivo === "fluxo-caixa" && <FluxoDeCaixa key={versaoFiltro} />}
        {relatorioAtivo === "dre" && <DRE filtros={filtros} />}
        {relatorioAtivo === "inadimplencia" && <Inadimplencia />}
      {relatorioAtivo === "receita-operacional" && <ReceitaOperacional />}
      {relatorioAtivo === "receita-nao-operacional" && <ReceitaNaoOperacional />}
      {relatorioAtivo === "despesas-fixas" && <DespesasFixas />}
      {relatorioAtivo === "despesas-operacionais" && <DespesasOperacionais />}
      {relatorioAtivo === "despesas-nao-operacionais" && <DespesasNaoOperacionais />}
      {relatorioAtivo === "ponto-equilibrio" && <PontoEquilibrio />}
        {relatorioAtivo === "pacotes-vencimento" && <PacotesProximosVencimento key={versaoFiltro} />}
        {relatorioAtivo === "pacotes-expirados" && <PacotesExpirados key={versaoFiltro} />}
        {relatorioAtivo === "clientes-risco" && <ClientesEmRisco />}

      {![
        "dashboard",
        "controle-financeiro",
        "fluxo-caixa",
        "dre",
        "inadimplencia",
        "receita-operacional",
        "receita-nao-operacional",
    "despesas-fixas",
    "despesas-operacionais",
    "despesas-nao-operacionais",
    "ponto-equilibrio",
    "pacotes-vencimento",
        "pacotes-expirados",
        "clientes-risco",
      ].includes(relatorioAtivo) && (
          <Card>
            <CardHeader>
              <CardTitle>Relatório em Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Este relatório está sendo desenvolvido e estará disponível em breve.
              </p>
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
              <CardDescription>Visão 360° da saúde do negócio em uma única tela</CardDescription>
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
              {
                id: "dre",
                titulo: "Demonstrativo de Resultado (DRE)",
                desc: "Análise de receitas, custos e lucro líquido",
              },
              { id: "ponto-equilibrio", titulo: "Ponto de Equilíbrio (PE)", desc: "Calcule o valor necessário para cobrir todas as despesas" },
              { id: "receita-operacional", titulo: "Receita Operacional", desc: "Análise detalhada de receitas operacionais" },
              { id: "receita-nao-operacional", titulo: "Receita Não Operacional", desc: "Análise detalhada de receitas não operacionais" },
              { id: "despesas-fixas", titulo: "Despesas Fixas", desc: "Análise detalhada de despesas fixas mensais" },
              { id: "despesas-operacionais", titulo: "Despesas Operacionais", desc: "Análise detalhada de despesas operacionais do negócio" },
              { id: "despesas-nao-operacionais", titulo: "Despesas Não Operacionais", desc: "Análise de despesas não operacionais (manutenção, reparos, etc.)" },
              { id: "inadimplencia", titulo: "Inadimplência e Contas a Receber", desc: "Contas vencidas e gestão de inadimplência" },
            ].map((rel) => (
              <Card
                key={rel.id}
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                onClick={() => handleCardClick(rel.id)}
              >
                <CardHeader>
                  <CardTitle className="text-sm">{rel.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{rel.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="servicos" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Atendimentos Realizados",
              "Serviços Agendados vs. Capacidade",
              "Desempenho por Funcionário",
              "Serviços Avulsos",
              "Serviços Mais Vendidos",
            ].map((titulo) => (
              <Card key={titulo} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-sm">{titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card
              key="clientes-risco"
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("clientes-risco")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Clientes em Risco (Sem Agendamento)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Clientes sem agendamentos ativos, classificados por tempo de inatividade
                </p>
              </CardContent>
            </Card>
            {[
              "Pacotes Ativos",
              "Taxa de Renovação",
              "Clientes Top (Por Receita)",
              "Valor de Vida do Cliente (CLV)",
              "Clientes em Risco (Churn Proativo)",
            ].map((titulo) => (
              <Card key={titulo} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-sm">{titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
                </CardContent>
              </Card>
            ))}
            <Card
              key="Pacotes Expirados"
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("pacotes-expirados")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Pacotes Expirados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Pacotes vencidos sem agendamentos futuros</p>
              </CardContent>
            </Card>
            <Card
              key="Pacotes Próximos do Vencimento"
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("pacotes-vencimento")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Pacotes Próximos do Vencimento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Visualize pacotes que vencem nos próximos 7 dias</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estoque" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Giro de Estoque e Curva ABC",
              "Produtos Próximos ao Vencimento",
              "Sugestão de Compra Inteligente",
              "Margem de Lucro por Produto",
            ].map((titulo) => (
              <Card key={titulo} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-sm">{titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;

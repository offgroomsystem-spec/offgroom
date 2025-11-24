import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/relatorios/shared/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CalendarDays, DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subDays, addDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ContasProximasVencimento } from "@/components/dashboard/ContasProximasVencimento";
import { NovosClientes } from "@/components/dashboard/NovosClientes";

const Home = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [agendamentosPacotes, setAgendamentosPacotes] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const hoje = new Date();
        const inicioMes = startOfMonth(hoje);
        const fimMes = endOfMonth(hoje);
        const ultimos30Dias = subDays(hoje, 30);
        const ultimos90Dias = subDays(hoje, 90);
        
        // Carregar agendamentos
        const { data: agendamentosData } = await supabase
          .from("agendamentos")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", format(ultimos30Dias, "yyyy-MM-dd"))
          .order("data", { ascending: true })
          .order("horario", { ascending: true });
        
        setAgendamentos(agendamentosData || []);
        
        // Carregar agendamentos de pacotes
        const { data: agendamentosPacotesData } = await supabase
          .from("agendamentos_pacotes")
          .select("*")
          .eq("user_id", user.id)
          .gte("data_venda", format(ultimos90Dias, "yyyy-MM-dd"))
          .order("data_venda", { ascending: true });
        
        setAgendamentosPacotes(agendamentosPacotesData || []);
        
        // Carregar lançamentos financeiros
        const { data: lancamentosData } = await supabase
          .from("lancamentos_financeiros")
          .select("*, lancamentos_financeiros_itens(*)")
          .eq("user_id", user.id)
          .gte("data_pagamento", format(ultimos90Dias, "yyyy-MM-dd"));
        
        setLancamentos(lancamentosData || []);
        
        // Carregar clientes
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("*")
          .eq("user_id", user.id);
        
        setClientes(clientesData || []);
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do dashboard");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);
  
  // Cálculo dos KPIs
  const kpis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = format(hoje, "yyyy-MM-dd");
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);
    const proximaSemana = addDays(hoje, 7);
    const mesAnterior = subMonths(hoje, 1);
    const inicioMesAnterior = startOfMonth(mesAnterior);
    const fimMesAnterior = endOfMonth(mesAnterior);
    
    // Atendimentos do dia (agendamentos regulares)
    const atendimentosDiaRegulares = agendamentos.filter(
      (a) => a.data === hojeStr && (a.status === "confirmado" || a.status === "pendente")
    ).length;
    
    // Atendimentos do dia (pacotes agendados)
    const atendimentosDiaPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => 
        s.data === hojeStr
      ).length;
    }, 0);
    
    const atendimentosDia = atendimentosDiaRegulares + atendimentosDiaPacotes;
    
    // Atendimentos da semana (próximos 7 dias - regulares)
    const atendimentosSemanaRegulares = agendamentos.filter((a) => {
      const data = new Date(a.data);
      return data >= hoje && data <= proximaSemana && (a.status === "confirmado" || a.status === "pendente");
    }).length;
    
    // Atendimentos da semana (pacotes)
    const atendimentosSemanaPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => {
        if (!s.data) return false;
        const data = new Date(s.data);
        return data >= hoje && data <= proximaSemana;
      }).length;
    }, 0);
    
    const atendimentosSemana = atendimentosSemanaRegulares + atendimentosSemanaPacotes;
    
    // Variação de agendamentos (semana atual vs semana anterior)
    const semanaAnteriorInicio = subDays(hoje, 7);
    const atendimentosSemanaAnteriorRegulares = agendamentos.filter((a) => {
      const data = new Date(a.data);
      return data >= semanaAnteriorInicio && data < hoje;
    }).length;
    
    const atendimentosSemanaAnteriorPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => {
        if (!s.data) return false;
        const data = new Date(s.data);
        return data >= semanaAnteriorInicio && data < hoje;
      }).length;
    }, 0);
    
    const atendimentosSemanaAnterior = atendimentosSemanaAnteriorRegulares + atendimentosSemanaAnteriorPacotes;
    const variacaoAgendamentos = atendimentosSemanaAnterior > 0 
      ? ((atendimentosSemana - atendimentosSemanaAnterior) / atendimentosSemanaAnterior) * 100 
      : 0;
    
    // Faturamento do mês (receitas pagas)
    const faturamentoMes = lancamentos
      .filter((l) => {
        if (l.tipo !== "Receita" || !l.pago) return false;
        const data = new Date(l.data_pagamento);
        return data >= inicioMes && data <= fimMes;
      })
      .reduce((acc, l) => acc + Number(l.valor_total), 0);
    
    // Entradas previstas (receitas não pagas)
    const entradasPrevistas = lancamentos
      .filter((l) => l.tipo === "Receita" && !l.pago)
      .reduce((acc, l) => acc + Number(l.valor_total), 0);
    
    // Saídas previstas (despesas não pagas)
    const saidasPrevistas = lancamentos
      .filter((l) => l.tipo === "Despesa" && !l.pago)
      .reduce((acc, l) => acc + Number(l.valor_total), 0);
    
    // Taxa de recorrência (clientes que tiveram atendimento este mês e no mês anterior)
    const clientesMesAtual = new Set(
      agendamentos
        .filter((a) => {
          const data = new Date(a.data);
          return data >= inicioMes && data <= fimMes;
        })
        .map((a) => a.cliente)
    );
    
    const clientesMesAnterior = new Set(
      agendamentos
        .filter((a) => {
          const data = new Date(a.data);
          return data >= inicioMesAnterior && data <= fimMesAnterior;
        })
        .map((a) => a.cliente)
    );
    
    const clientesRecorrentes = [...clientesMesAtual].filter((c) => clientesMesAnterior.has(c)).length;
    const taxaRecorrencia = clientesMesAnterior.size > 0 
      ? (clientesRecorrentes / clientesMesAnterior.size) * 100 
      : 0;
    
    return {
      atendimentosDia,
      atendimentosSemana,
      variacaoAgendamentos,
      faturamentoMes,
      entradasPrevistas,
      saidasPrevistas,
      taxaRecorrencia,
    };
  }, [agendamentos, agendamentosPacotes, lancamentos]);
  
  // Dados para gráfico de fluxo de caixa (últimos 30 dias)
  const dadosFluxoCaixa = useMemo(() => {
    const ultimos30Dias = subDays(new Date(), 30);
    const dados: any[] = [];
    
    for (let i = 0; i < 30; i++) {
      const data = addDays(ultimos30Dias, i);
      const dataStr = format(data, "yyyy-MM-dd");
      
      const receitas = lancamentos
        .filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento === dataStr)
        .reduce((acc, l) => acc + Number(l.valor_total), 0);
      
      const despesas = lancamentos
        .filter((l) => l.tipo === "Despesa" && l.pago && l.data_pagamento === dataStr)
        .reduce((acc, l) => acc + Number(l.valor_total), 0);
      
      dados.push({
        data: format(data, "dd/MM", { locale: ptBR }),
        receitas,
        despesas,
        lucro: receitas - despesas,
      });
    }
    
    return dados;
  }, [lancamentos]);
  
  // Dados para gráfico de crescimento de agendamentos (últimos 3 meses)
  const dadosCrescimentoAgendamentos = useMemo(() => {
    const dados: any[] = [];
    
    for (let i = 2; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);
      
      // Agendamentos regulares
      const quantidadeRegulares = agendamentos.filter((a) => {
        const data = new Date(a.data);
        return data >= inicioMes && data <= fimMes;
      }).length;
      
      // Agendamentos de pacotes
      const quantidadePacotes = agendamentosPacotes.reduce((count, p) => {
        const servicos = Array.isArray(p.servicos) ? p.servicos : [];
        return count + servicos.filter((s: any) => {
          if (!s.data) return false;
          const data = new Date(s.data);
          return data >= inicioMes && data <= fimMes;
        }).length;
      }, 0);
      
      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        quantidade: quantidadeRegulares + quantidadePacotes,
      });
    }
    
    return dados;
  }, [agendamentos, agendamentosPacotes]);
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
      </div>
      
      {/* Linha 1: Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          titulo="Atendimentos Hoje"
          valor={`${kpis.atendimentosDia} agendamentos`}
          subtitulo=""
          icon={<Calendar />}
          cor="default"
        />
        
            <KPICard
              titulo="Próximos 7 dias"
              valor={`${kpis.atendimentosSemana} agendamentos`}
          subtitulo={`${kpis.variacaoAgendamentos > 0 ? "+" : ""}${kpis.variacaoAgendamentos.toFixed(1)}% vs semana anterior`}
          icon={<CalendarDays />}
          cor={kpis.variacaoAgendamentos >= 0 ? "green" : "red"}
        />
        
        <KPICard
          titulo="Faturamento Mês"
          valor={kpis.faturamentoMes}
          subtitulo="receitas pagas no mês"
          icon={<DollarSign />}
          cor="green"
        />
        
        <KPICard
          titulo="Entradas Previstas"
          valor={kpis.entradasPrevistas}
          subtitulo="contas a receber"
          icon={<TrendingUp />}
          cor="default"
        />
        
        <KPICard
          titulo="Saídas Previstas"
          valor={kpis.saidasPrevistas}
          subtitulo="contas a pagar"
          icon={<TrendingDown />}
          cor="red"
        />
        
        <KPICard
          titulo="Taxa de Recorrência"
          valor={`${kpis.taxaRecorrencia.toFixed(1)}%`}
          subtitulo="clientes que retornaram"
          icon={<Users />}
          cor={kpis.taxaRecorrencia >= 70 ? "green" : kpis.taxaRecorrencia >= 50 ? "yellow" : "red"}
        />
      </div>
      
      {/* Linha 2: Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico Fluxo de Caixa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Caixa - Últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFluxoCaixa}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(value)
                  }
                />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="#22c55e" name="Receitas" strokeWidth={2} />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Gráfico Crescimento de Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Atendimentos - Últimos 3 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosCrescimentoAgendamentos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantidade" fill="#3b82f6" name="Atendimentos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
          {/* Linha 3: Mini Relatórios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ContasProximasVencimento lancamentos={lancamentos} />
            <NovosClientes clientes={clientes} />
          </div>
    </div>
  );
};

export default Home;

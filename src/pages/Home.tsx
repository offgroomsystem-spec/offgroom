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
  const [diasFuncionamento, setDiasFuncionamento] = useState<any>(null);

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
        const { data: clientesData } = await supabase.from("clientes").select("*").eq("user_id", user.id);

        setClientes(clientesData || []);

        // Carregar configuração da empresa para obter dias de funcionamento
        const { data: empresaConfig } = await supabase
          .from("empresa_config")
          .select("dias_funcionamento")
          .eq("user_id", user.id)
          .single();

        setDiasFuncionamento(
          empresaConfig?.dias_funcionamento || {
            segunda: true,
            terca: true,
            quarta: true,
            quinta: true,
            sexta: true,
            sabado: false,
            domingo: false,
          },
        );
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Função para calcular o próximo dia útil
  const getProximoDiaUtil = (diasFuncionamento: any) => {
    const hoje = new Date();
    let proximoDia = addDays(hoje, 1);

    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    let tentativas = 0;
    while (tentativas < 7) {
      const diaDaSemana = diasSemana[proximoDia.getDay()];
      if (diasFuncionamento && diasFuncionamento[diaDaSemana] === true) {
        return proximoDia;
      }
      proximoDia = addDays(proximoDia, 1);
      tentativas++;
    }

    return addDays(hoje, 1);
  };

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
      (a) => a.data === hojeStr && (a.status === "confirmado" || a.status === "pendente"),
    ).length;

    // Atendimentos do dia (pacotes agendados)
    const atendimentosDiaPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => s.data === hojeStr).length;
    }, 0);

    const atendimentosDia = atendimentosDiaRegulares + atendimentosDiaPacotes;

    // Atendimentos do próximo dia útil
    const proximoDiaUtil = getProximoDiaUtil(diasFuncionamento);
    const proximoDiaUtilStr = format(proximoDiaUtil, "yyyy-MM-dd");

    // Agendamentos regulares do próximo dia útil
    const atendimentosProximoDiaRegulares = agendamentos.filter(
      (a) => a.data === proximoDiaUtilStr && (a.status === "confirmado" || a.status === "pendente"),
    ).length;

    // Agendamentos de pacotes do próximo dia útil
    const atendimentosProximoDiaPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => s.data === proximoDiaUtilStr).length;
    }, 0);

    const atendimentosProximoDia = atendimentosProximoDiaRegulares + atendimentosProximoDiaPacotes;

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
        .map((a) => a.cliente),
    );

    const clientesMesAnterior = new Set(
      agendamentos
        .filter((a) => {
          const data = new Date(a.data);
          return data >= inicioMesAnterior && data <= fimMesAnterior;
        })
        .map((a) => a.cliente),
    );

    const clientesRecorrentes = [...clientesMesAtual].filter((c) => clientesMesAnterior.has(c)).length;
    const taxaRecorrencia = clientesMesAnterior.size > 0 ? (clientesRecorrentes / clientesMesAnterior.size) * 100 : 0;

    return {
      atendimentosDia,
      atendimentosProximoDia,
      proximoDiaUtil,
      faturamentoMes,
      entradasPrevistas,
      saidasPrevistas,
      taxaRecorrencia,
    };
  }, [agendamentos, agendamentosPacotes, lancamentos, diasFuncionamento]);

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

  // Dados para gráfico de crescimento de agendamentos (últimos 12 meses)
  const dadosCrescimentoAgendamentos = useMemo(() => {
    const dados: any[] = [];

    for (let i = 11; i >= 0; i--) {
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
        return (
          count +
          servicos.filter((s: any) => {
            if (!s.data) return false;
            const data = new Date(s.data);
            return data >= inicioMes && data <= fimMes;
          }).length
        );
      }, 0);

      const totalAtendimentos = quantidadeRegulares + quantidadePacotes;

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        quantidade: totalAtendimentos,
      });
    }

    // Calcular variação percentual para cada mês
    return dados.map((d, index) => {
      if (index === 0) {
        return { ...d, variacao: 0 };
      }
      const mesAnterior = dados[index - 1].quantidade;
      const variacao = mesAnterior > 0 ? ((d.quantidade - mesAnterior) / mesAnterior) * 100 : 0;
      return { ...d, variacao };
    });
  }, [agendamentos, agendamentosPacotes]);

  // Média mensal de atendimentos
  const mediaMensalAtendimentos = useMemo(() => {
    if (!diasFuncionamento) return { media: 0, totalAtendimentos: 0, diasUteis: 0 };

    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);

    // Contar agendamentos regulares do mês
    const atendimentosRegulares = agendamentos.filter((a) => {
      const data = new Date(a.data);
      return data >= inicioMes && data <= hoje;
    }).length;

    // Contar agendamentos de pacotes do mês
    const atendimentosPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return (
        count +
        servicos.filter((s: any) => {
          if (!s.data) return false;
          const data = new Date(s.data);
          return data >= inicioMes && data <= hoje;
        }).length
      );
    }, 0);

    const totalAtendimentos = atendimentosRegulares + atendimentosPacotes;

    // Contar dias úteis trabalhados do início do mês até hoje
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    let diasUteis = 0;
    let dataAtual = new Date(inicioMes);

    while (dataAtual <= hoje) {
      const diaDaSemana = diasSemana[dataAtual.getDay()];
      if (diasFuncionamento[diaDaSemana] === true) {
        diasUteis++;
      }
      dataAtual = addDays(dataAtual, 1);
    }

    const media = diasUteis > 0 ? totalAtendimentos / diasUteis : 0;

    return {
      media: Math.round(media * 10) / 10,
      totalAtendimentos,
      diasUteis,
    };
  }, [agendamentos, agendamentosPacotes, diasFuncionamento]);

  // Dados históricos de média mensal para os últimos 12 meses
  const dadosMediaMensalHistorico = useMemo(() => {
    if (!diasFuncionamento) return [];

    const dados: any[] = [];
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    // Buscar últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);
      const hoje = new Date();

      // Limitar ao dia atual se for o mês corrente
      const dataFinal = i === 0 ? hoje : fimMes;

      // Contar agendamentos regulares do mês
      const atendimentosRegulares = agendamentos.filter((a) => {
        const data = new Date(a.data);
        return data >= inicioMes && data <= dataFinal;
      }).length;

      // Contar agendamentos de pacotes do mês
      const atendimentosPacotes = agendamentosPacotes.reduce((count, p) => {
        const servicos = Array.isArray(p.servicos) ? p.servicos : [];
        return (
          count +
          servicos.filter((s: any) => {
            if (!s.data) return false;
            const data = new Date(s.data);
            return data >= inicioMes && data <= dataFinal;
          }).length
        );
      }, 0);

      const totalAtendimentos = atendimentosRegulares + atendimentosPacotes;

      // Contar dias úteis do mês (até hoje se for mês corrente)
      let diasUteis = 0;
      let dataAtual = new Date(inicioMes);

      while (dataAtual <= dataFinal) {
        const diaDaSemana = diasSemana[dataAtual.getDay()];
        if (diasFuncionamento[diaDaSemana] === true) {
          diasUteis++;
        }
        dataAtual = addDays(dataAtual, 1);
      }

      const media = diasUteis > 0 ? totalAtendimentos / diasUteis : 0;

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        media: Math.round(media * 10) / 10, // Arredondar para 1 casa decimal
      });
    }

    return dados;
  }, [agendamentos, agendamentosPacotes, diasFuncionamento]);

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
          titulo="Atendimentos Próximo dia útil"
          valor={`${kpis.atendimentosProximoDia} agendamentos`}
          subtitulo={kpis.proximoDiaUtil ? format(kpis.proximoDiaUtil, "EEEE, dd/MM", { locale: ptBR }) : ""}
          icon={<CalendarDays />}
          cor="default"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico Fluxo de Caixa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Caixa - Últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFluxoCaixa} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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

        {/* Gráfico Evolução de Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Atendimentos - Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={dadosCrescimentoAgendamentos} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.mes}</p>
                          <p className="text-sm">Atendimentos: {data.quantidade}</p>
                          {data.variacao !== 0 && (
                            <p
                              className={`text-sm font-medium ${data.variacao > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.variacao > 0 ? "+" : ""}
                              {data.variacao.toFixed(1)}% vs mês anterior
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="quantidade"
                  stroke="#3b82f6"
                  name="Atendimentos"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Média Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Média do Mês de Atendimentos Realizados</CardTitle>
            <p className="text-xs text-muted-foreground">
              Média diária de atendimentos considerando apenas dias úteis trabalhados
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosMediaMensalHistorico} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.mes}</p>
                          <p className="text-sm">Média: {data.media.toFixed(1)} atendimentos/dia</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="media"
                  stroke="#8b5cf6"
                  name="Média Diária"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
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

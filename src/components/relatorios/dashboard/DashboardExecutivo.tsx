import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "../shared/KPICard";
import { AlertCard } from "../shared/AlertCard";
import { DollarSign, TrendingUp, Calendar, Users, Clock, AlertCircle, Package, UserX } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
}

interface DashboardExecutivoProps {
  filtros: Filtros;
}

export const DashboardExecutivo = ({ filtros }: DashboardExecutivoProps) => {
  // Calcular intervalo de datas baseado nos filtros
  const calcularIntervaloFiltro = useMemo(() => {
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date = hoje;

    switch (filtros.periodo) {
      case "hoje":
        dataInicio = hoje;
        break;
      case "semana":
        dataInicio = new Date();
        dataInicio.setDate(hoje.getDate() - 7);
        break;
      case "mes":
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case "trimestre":
        const mesAtual = hoje.getMonth();
        const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
        dataInicio = new Date(hoje.getFullYear(), inicioTrimestre, 1);
        break;
      case "ano":
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        break;
      case "customizado":
        dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : new Date(hoje.getFullYear(), 0, 1);
        dataFim = filtros.dataFim ? new Date(filtros.dataFim) : hoje;
        break;
      default:
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }

    return { dataInicio, dataFim };
  }, [filtros]);

  const lancamentos = useMemo(() => {
    const data = localStorage.getItem('lancamentos_financeiros');
    return data ? JSON.parse(data) : [];
  }, [filtros]);

  const agendamentos = useMemo(() => {
    const data = localStorage.getItem('agendamentos');
    return data ? JSON.parse(data) : [];
  }, [filtros]);

  const pacotes = useMemo(() => {
    const data = localStorage.getItem('pacotes');
    return data ? JSON.parse(data) : [];
  }, [filtros]);

  const produtos = useMemo(() => {
    const data = localStorage.getItem('produtos');
    return data ? JSON.parse(data) : [];
  }, [filtros]);

  const clientes = useMemo(() => {
    const data = localStorage.getItem('clientes');
    return data ? JSON.parse(data) : [];
  }, [filtros]);

  // Cálculos dos KPIs
  const kpis = useMemo(() => {
    const hoje = new Date();
    const { dataInicio, dataFim } = calcularIntervaloFiltro;

    // Lucro Líquido do Período
    const receitasMes = lancamentos
      .filter((l: any) => {
        if (l.tipo !== "Receita" || !l.pago) return false;
        const dataPag = new Date(l.dataPagamento);
        return dataPag >= dataInicio && dataPag <= dataFim;
      })
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const despesasMes = lancamentos
      .filter((l: any) => {
        if (l.tipo !== "Despesa" || !l.pago) return false;
        const dataPag = new Date(l.dataPagamento);
        return dataPag >= dataInicio && dataPag <= dataFim;
      })
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const lucroLiquido = receitasMes - despesasMes;

    // Ticket Médio
    const atendimentosConcluidos = agendamentos.filter((a: any) => {
      if (a.status !== "concluido") return false;
      const dataAgend = new Date(a.data);
      return dataAgend >= dataInicio && dataAgend <= dataFim;
    }).length;
    const ticketMedio = atendimentosConcluidos > 0 ? receitasMes / atendimentosConcluidos : 0;

    // Agenda do Dia (sempre hoje)
    const hojeStr = format(hoje, 'yyyy-MM-dd');
    const agendaDia = agendamentos.filter((a: any) => 
      a.data === hojeStr && (a.status === "confirmado" || a.status === "pendente")
    ).length;

    // Taxa de Retenção
    const clientesMesAtual = new Set(
      agendamentos
        .filter((a: any) => {
          const dataAgend = new Date(a.data);
          return dataAgend >= dataInicio && dataAgend <= dataFim;
        })
        .map((a: any) => a.cliente)
    );

    // Calcular período anterior com mesmo tamanho
    const diasNoFiltro = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    const dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - diasNoFiltro);

    const clientesMesAnterior = new Set(
      agendamentos
        .filter((a: any) => {
          const dataAgend = new Date(a.data);
          return dataAgend >= dataInicioAnterior && dataAgend < dataInicio;
        })
        .map((a: any) => a.cliente)
    );

    const clientesRetidos = [...clientesMesAtual].filter(c => clientesMesAnterior.has(c)).length;
    const taxaRetencao = clientesMesAnterior.size > 0 
      ? (clientesRetidos / clientesMesAnterior.size) * 100 
      : 0;

    return {
      lucroLiquido,
      ticketMedio,
      agendaDia,
      taxaRetencao
    };
  }, [lancamentos, agendamentos, calcularIntervaloFiltro]);

  // Alertas
  const alertas = useMemo(() => {
    const { dataInicio, dataFim } = calcularIntervaloFiltro;

    // Pacotes a Expirar no período filtrado
    const pacotesExpirando = pacotes.filter((p: any) => {
      if (!p.validade || !p.dataVenda) return false;
      const dataExpiracao = new Date(p.dataVenda);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(p.validade));
      return dataExpiracao >= dataInicio && dataExpiracao <= dataFim;
    }).map((p: any) => `${p.nomeCliente} - ${p.nomePacote}`);

    // Inadimplência no período
    const valorInadimplencia = lancamentos
      .filter((l: any) => {
        if (l.tipo !== "Receita" || l.pago) return false;
        const dataPag = new Date(l.dataPagamento);
        return dataPag >= dataInicio && dataPag <= dataFim;
      })
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    // Produtos vencendo no período
    const produtosVencendo = produtos
      .filter((p: any) => {
        if (!p.dataValidade) return false;
        const dataVal = new Date(p.dataValidade);
        return dataVal >= dataInicio && dataVal <= dataFim;
      })
      .map((p: any) => `${p.descricao} - ${format(new Date(p.dataValidade), 'dd/MM/yyyy')}`);

    // Clientes em Risco
    const clientesComAgendamentoRecente = new Set(
      agendamentos
        .filter((a: any) => {
          const dataAgend = new Date(a.data);
          return dataAgend >= dataInicio;
        })
        .map((a: any) => a.cliente)
    );

    const todosClientes = [...new Set(clientes.map((c: any) => c.nomeCliente))];
    const clientesEmRisco = todosClientes
      .filter(c => !clientesComAgendamentoRecente.has(c))
      .slice(0, 10);

    return {
      pacotesExpirando,
      valorInadimplencia,
      produtosVencendo,
      clientesEmRisco
    };
  }, [lancamentos, pacotes, produtos, clientes, agendamentos, calcularIntervaloFiltro]);

  // Dados do Gráfico de Tendência
  const dadosGrafico = useMemo(() => {
    const { dataInicio, dataFim } = calcularIntervaloFiltro;
    const dados = [];
    
    // Detectar se deve agrupar por mês (trimestre/ano) ou por dia
    const agruparPorMes = filtros.periodo === "trimestre" || filtros.periodo === "ano";
    
    if (agruparPorMes) {
      // AGRUPAMENTO POR MÊS
      const meses: { [key: string]: { receita: number; despesa: number } } = {};
      
      // Iterar por todos os lançamentos e agrupar por mês
      lancamentos.forEach((l: any) => {
        if (!l.pago) return;
        const dataLanc = new Date(l.dataPagamento);
        if (dataLanc < dataInicio || dataLanc > dataFim) return;
        
        const chaveMs = format(dataLanc, 'MM/yyyy');
        
        if (!meses[chaveMs]) {
          meses[chaveMs] = { receita: 0, despesa: 0 };
        }
        
        if (l.tipo === "Receita") {
          meses[chaveMs].receita += l.valorTotal || 0;
        } else if (l.tipo === "Despesa") {
          meses[chaveMs].despesa += l.valorTotal || 0;
        }
      });
      
      // Criar array ordenado de meses no intervalo
      const dataAtual = new Date(dataInicio);
      while (dataAtual <= dataFim) {
        const chaveMs = format(dataAtual, 'MM/yyyy');
        const dadosMes = meses[chaveMs] || { receita: 0, despesa: 0 };
        
        dados.push({
          periodo: chaveMs,
          receita: dadosMes.receita,
          despesa: dadosMes.despesa,
          meta: 10000
        });
        
        // Avançar para o próximo mês
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
      
    } else {
      // AGRUPAMENTO POR DIA
      const diasNoIntervalo = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      for (let i = 0; i < Math.min(diasNoIntervalo, 31); i++) {
        const dataAtual = new Date(dataInicio);
        dataAtual.setDate(dataAtual.getDate() + i);
        
        const receitaDia = lancamentos
          .filter((l: any) => {
            if (l.tipo !== "Receita" || !l.pago) return false;
            const dataLanc = new Date(l.dataPagamento);
            return dataLanc.toDateString() === dataAtual.toDateString();
          })
          .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);
        
        const despesaDia = lancamentos
          .filter((l: any) => {
            if (l.tipo !== "Despesa" || !l.pago) return false;
            const dataLanc = new Date(l.dataPagamento);
            return dataLanc.toDateString() === dataAtual.toDateString();
          })
          .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);
        
        dados.push({
          periodo: format(dataAtual, 'dd/MM'),
          receita: receitaDia,
          despesa: despesaDia,
          meta: 333
        });
      }
    }
    
    return dados;
  }, [lancamentos, calcularIntervaloFiltro, filtros.periodo]);

  return (
    <div className="space-y-3">
      {/* KPIs no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard 
          titulo="Lucro Líquido" 
          valor={kpis.lucroLiquido} 
          icon={<DollarSign className="h-4 w-4" />}
          periodo={
            filtros.periodo === "hoje" ? "Hoje" :
            filtros.periodo === "semana" ? "Esta Semana" :
            filtros.periodo === "mes" ? "Este Mês" :
            filtros.periodo === "trimestre" ? "Este Trimestre" :
            filtros.periodo === "ano" ? "Este Ano" :
            "Período Customizado"
          }
          cor={kpis.lucroLiquido >= 0 ? 'green' : 'red'}
          destaque
        />
        <KPICard 
          titulo="Ticket Médio" 
          valor={kpis.ticketMedio} 
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard 
          titulo="Agenda do Dia" 
          valor={`${kpis.agendaDia} serviços`} 
          icon={<Calendar className="h-4 w-4" />}
        />
        <KPICard 
          titulo="Taxa de Retenção" 
          valor={`${kpis.taxaRetencao.toFixed(1)}%`} 
          icon={<Users className="h-4 w-4" />}
          cor={kpis.taxaRetencao >= 70 ? 'green' : kpis.taxaRetencao >= 50 ? 'yellow' : 'red'}
        />
      </div>

      {/* Seção de Alertas */}
      <div>
        <h2 className="text-xl font-bold mb-3">Alertas Importantes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AlertCard 
            tipo="warning"
            titulo="Pacotes a Expirar (7 dias)"
            lista={alertas.pacotesExpirando}
            icone={<Clock className="h-5 w-5" />}
          />
          <AlertCard 
            tipo="error"
            titulo="Inadimplência Total"
            valor={alertas.valorInadimplencia}
            icone={<AlertCircle className="h-5 w-5" />}
          />
          <AlertCard 
            tipo="warning"
            titulo="Produtos Próximos ao Vencimento (30 dias)"
            lista={alertas.produtosVencendo}
            icone={<Package className="h-5 w-5" />}
          />
          <AlertCard 
            tipo="warning"
            titulo="Clientes em Risco (sem agendamento há 30+ dias)"
            lista={alertas.clientesEmRisco}
            icone={<UserX className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Gráfico de Tendência */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filtros.periodo === "trimestre" && "Receitas e Despesas por Mês (Trimestre Atual)"}
            {filtros.periodo === "ano" && "Receitas e Despesas por Mês (Ano Atual)"}
            {!["trimestre", "ano"].includes(filtros.periodo) && "Receitas e Despesas no Período Filtrado"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(value)}
              />
              <Legend />
              <Line type="monotone" dataKey="receita" stroke="#22c55e" name="Receita" strokeWidth={2} />
              <Line type="monotone" dataKey="despesa" stroke="#ef4444" name="Despesa" strokeWidth={2} />
              <Line type="monotone" dataKey="meta" stroke="#6b7280" name="Meta de Faturamento" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

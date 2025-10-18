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
  const lancamentos = useMemo(() => {
    const data = localStorage.getItem('lancamentos_financeiros');
    return data ? JSON.parse(data) : [];
  }, []);

  const agendamentos = useMemo(() => {
    const data = localStorage.getItem('agendamentos');
    return data ? JSON.parse(data) : [];
  }, []);

  const pacotes = useMemo(() => {
    const data = localStorage.getItem('pacotes');
    return data ? JSON.parse(data) : [];
  }, []);

  const produtos = useMemo(() => {
    const data = localStorage.getItem('produtos');
    return data ? JSON.parse(data) : [];
  }, []);

  const clientes = useMemo(() => {
    const data = localStorage.getItem('clientes');
    return data ? JSON.parse(data) : [];
  }, []);

  // Cálculos dos KPIs
  const kpis = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // Lucro Líquido do Mês
    const receitasMes = lancamentos
      .filter((l: any) => 
        l.tipo === "Receita" && 
        l.mesCompetencia === String(mesAtual).padStart(2, '0') && 
        l.ano === String(anoAtual) &&
        l.pago === true
      )
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const despesasMes = lancamentos
      .filter((l: any) => 
        l.tipo === "Despesa" && 
        l.mesCompetencia === String(mesAtual).padStart(2, '0') && 
        l.ano === String(anoAtual) &&
        l.pago === true
      )
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const lucroLiquido = receitasMes - despesasMes;

    // Ticket Médio
    const atendimentosConcluidos = agendamentos.filter((a: any) => a.status === "concluido").length;
    const ticketMedio = atendimentosConcluidos > 0 ? receitasMes / atendimentosConcluidos : 0;

    // Agenda do Dia
    const hojeStr = format(hoje, 'yyyy-MM-dd');
    const agendaDia = agendamentos.filter((a: any) => 
      a.data === hojeStr && (a.status === "confirmado" || a.status === "pendente")
    ).length;

    // Taxa de Retenção
    const clientesMesAtual = new Set(
      agendamentos
        .filter((a: any) => {
          const dataAgend = new Date(a.data);
          return dataAgend.getMonth() === mesAtual - 1 && dataAgend.getFullYear() === anoAtual;
        })
        .map((a: any) => a.cliente)
    );

    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;

    const clientesMesAnterior = new Set(
      agendamentos
        .filter((a: any) => {
          const dataAgend = new Date(a.data);
          return dataAgend.getMonth() === mesAnterior - 1 && dataAgend.getFullYear() === anoAnterior;
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
  }, [lancamentos, agendamentos]);

  // Alertas
  const alertas = useMemo(() => {
    const hoje = new Date();

    // Pacotes a Expirar (próximos 7 dias)
    const seteDiasFrente = new Date();
    seteDiasFrente.setDate(hoje.getDate() + 7);

    const pacotesExpirando = pacotes.filter((p: any) => {
      if (!p.validade) return false;
      const dataExpiracao = new Date(p.dataVenda);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(p.validade));
      return dataExpiracao >= hoje && dataExpiracao <= seteDiasFrente;
    }).map((p: any) => `${p.nomeCliente} - ${p.nomePacote}`);

    // Inadimplência
    const valorInadimplencia = lancamentos
      .filter((l: any) => l.tipo === "Receita" && !l.pago && new Date(l.dataPagamento) < hoje)
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    // Produtos próximos ao vencimento (30 dias)
    const trintaDiasFrente = new Date();
    trintaDiasFrente.setDate(hoje.getDate() + 30);

    const produtosVencendo = produtos
      .filter((p: any) => {
        if (!p.dataValidade) return false;
        const dataVal = new Date(p.dataValidade);
        return dataVal >= hoje && dataVal <= trintaDiasFrente;
      })
      .map((p: any) => `${p.descricao} - ${format(new Date(p.dataValidade), 'dd/MM/yyyy')}`);

    // Clientes em Risco (sem agendamento há mais de 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    const clientesComAgendamentoRecente = new Set(
      agendamentos
        .filter((a: any) => new Date(a.data) >= trintaDiasAtras)
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
  }, [lancamentos, pacotes, produtos, clientes, agendamentos]);

  // Dados do Gráfico de Tendência
  const dadosGrafico = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;

    const diasNoMes = new Date(anoAtual, mesAtual, 0).getDate();
    const dados = [];

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const receitaMesAtual = lancamentos
        .filter((l: any) => {
          if (l.tipo !== "Receita" || !l.pago) return false;
          const dataLanc = new Date(l.dataPagamento);
          return dataLanc.getDate() <= dia &&
                 dataLanc.getMonth() === mesAtual - 1 &&
                 dataLanc.getFullYear() === anoAtual;
        })
        .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

      const receitaMesAnterior = lancamentos
        .filter((l: any) => {
          if (l.tipo !== "Receita" || !l.pago) return false;
          const dataLanc = new Date(l.dataPagamento);
          return dataLanc.getDate() <= dia &&
                 dataLanc.getMonth() === mesAnterior - 1 &&
                 dataLanc.getFullYear() === anoAnterior;
        })
        .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

      dados.push({
        dia: dia.toString(),
        mesAtual: receitaMesAtual,
        mesAnterior: receitaMesAnterior,
        meta: (diasNoMes * 1000) * (dia / diasNoMes) // Meta fictícia
      });
    }

    return dados;
  }, [lancamentos]);

  return (
    <div className="space-y-6">
      {/* KPIs no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          titulo="Lucro Líquido" 
          valor={kpis.lucroLiquido} 
          icon={<DollarSign className="h-4 w-4" />}
          periodo="Mês Atual"
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
        <h2 className="text-xl font-bold mb-4">Alertas Importantes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <CardTitle>Receita: Mês Atual vs Mês Anterior</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(value)}
              />
              <Legend />
              <Line type="monotone" dataKey="mesAtual" stroke="#8884d8" name="Mês Atual" />
              <Line type="monotone" dataKey="mesAnterior" stroke="#82ca9d" name="Mês Anterior" />
              <Line type="monotone" dataKey="meta" stroke="#ff7300" strokeDasharray="5 5" name="Meta" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

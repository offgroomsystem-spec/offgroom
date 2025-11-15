import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Package,
  CheckCircle,
  Clock,
  TrendingUp,
  Award,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  format, subMonths, startOfMonth, endOfMonth, 
  addDays, differenceInDays 
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface PacoteAtivo {
  id: string;
  nomePacote: string;
  cliente: string;
  pet: string;
  raca: string;
  porte: string;
  whatsapp: string;
  dataAtivacao: string;
  dataValidade: string;
  servicosTotal: number;
  servicosUsados: number;
  servicosRestantes: number;
  status: "Ativo" | "Completo" | "Vencido";
  servicos: Array<{
    servico: string;
    quantidade: number;
  }>;
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
];

export function PacotesAtivos() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pacotes, setPacotes] = useState<PacoteAtivo[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
    dataFim: format(new Date(), "yyyy-MM-dd"),
    status: "all" as "all" | "Ativo" | "Completo" | "Vencido",
    cliente: "all",
    porte: "all",
  });

  const loadPacotes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 1. Buscar pacotes vendidos
      const { data: pacotesData, error: errorPacotes } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", user.id)
        .gte("data_venda", filtros.dataInicio)
        .lte("data_venda", filtros.dataFim)
        .order("data_venda", { ascending: false });
      
      if (errorPacotes) throw errorPacotes;
      
      // 2. Buscar informações dos pacotes (validade)
      const { data: pacotesInfoData } = await supabase
        .from("pacotes")
        .select("nome, validade")
        .eq("user_id", user.id);
      
      const pacotesInfoMap = new Map(
        (pacotesInfoData || []).map(p => [p.nome, p.validade])
      );
      
      // 3. Buscar raças para porte
      const { data: racasData } = await supabase
        .from("racas")
        .select("nome, porte")
        .eq("user_id", user.id);
      
      const racasMap = new Map(
        (racasData || []).map(r => [r.nome, r.porte])
      );
      
      // 4. Buscar agendamentos que usaram os pacotes
      const { data: agendamentosData } = await supabase
        .from("agendamentos")
        .select("numero_servico_pacote, servico, data")
        .eq("user_id", user.id)
        .not("numero_servico_pacote", "is", null);
      
      // Criar mapa de usos por pacote (usando ID do pacote)
      const usosPorPacote = new Map<string, number>();
      (agendamentosData || []).forEach(a => {
        const key = a.numero_servico_pacote;
        if (key) {
          usosPorPacote.set(key, (usosPorPacote.get(key) || 0) + 1);
        }
      });
      
      // 5. Consolidar dados
      const pacotesConsolidados: PacoteAtivo[] = (pacotesData || []).map((p: any) => {
        const servicos = p.servicos as any[];
        const totalServicos = servicos.reduce((acc, s) => acc + (s.quantidade || 1), 0);
        const servicosUsados = usosPorPacote.get(p.id) || 0;
        const servicosRestantes = Math.max(0, totalServicos - servicosUsados);
        
        // Calcular validade
        const validadeDias = parseInt(pacotesInfoMap.get(p.nome_pacote) || "90");
        const dataValidade = addDays(new Date(p.data_venda), validadeDias);
        
        // Calcular status
        const hoje = new Date();
        let status: "Ativo" | "Completo" | "Vencido";
        
        if (servicosRestantes === 0) {
          status = "Completo";
        } else if (dataValidade < hoje) {
          status = "Vencido";
        } else {
          status = "Ativo";
        }
        
        return {
          id: p.id,
          nomePacote: p.nome_pacote,
          cliente: p.nome_cliente,
          pet: p.nome_pet,
          raca: p.raca,
          porte: racasMap.get(p.raca) || "Médio",
          whatsapp: p.whatsapp,
          dataAtivacao: p.data_venda,
          dataValidade: format(dataValidade, "yyyy-MM-dd"),
          servicosTotal: totalServicos,
          servicosUsados,
          servicosRestantes,
          status,
          servicos: servicos.map((s: any) => ({
            servico: s.servico || "",
            quantidade: s.quantidade || 1,
          })),
        };
      });
      
      setPacotes(pacotesConsolidados);
      
    } catch (error) {
      console.error("Erro ao carregar pacotes:", error);
      toast.error("Erro ao carregar dados dos pacotes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacotes();
  }, [user]);

  const aplicarFiltros = () => {
    loadPacotes();
    setMostrarFiltros(false);
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
      dataFim: format(new Date(), "yyyy-MM-dd"),
      status: "all",
      cliente: "all",
      porte: "all",
    });
  };

  // Filtrar pacotes
  const pacotesFiltrados = useMemo(() => {
    return pacotes.filter(p => {
      if (filtros.status !== "all" && p.status !== filtros.status) return false;
      if (filtros.cliente !== "all" && p.cliente !== filtros.cliente) return false;
      if (filtros.porte !== "all" && p.porte !== filtros.porte) return false;
      return true;
    });
  }, [pacotes, filtros]);

  // Listas únicas para filtros
  const clientesUnicos = useMemo(() => 
    Array.from(new Set(pacotes.map(p => p.cliente))).sort(),
    [pacotes]
  );

  // Cards KPI
  const totalPacotesAtivos = useMemo(() => 
    pacotesFiltrados.filter(p => p.status === "Ativo").length,
    [pacotesFiltrados]
  );

  const totalServicosUsados = useMemo(() => 
    pacotesFiltrados.reduce((acc, p) => acc + p.servicosUsados, 0),
    [pacotesFiltrados]
  );

  const totalServicosRestantes = useMemo(() => 
    pacotesFiltrados.reduce((acc, p) => acc + p.servicosRestantes, 0),
    [pacotesFiltrados]
  );

  const taxaUtilizacao = useMemo(() => {
    const total = pacotesFiltrados.reduce((acc, p) => acc + p.servicosTotal, 0);
    return total > 0 ? (totalServicosUsados / total) * 100 : 0;
  }, [pacotesFiltrados, totalServicosUsados]);

  const pacoteMaisPopular = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => {
      contagem.set(p.nomePacote, (contagem.get(p.nomePacote) || 0) + 1);
    });
    
    let max = { nome: "—", quantidade: 0 };
    contagem.forEach((qtd, nome) => {
      if (qtd > max.quantidade) {
        max = { nome, quantidade: qtd };
      }
    });
    
    return max;
  }, [pacotesFiltrados]);

  // Gráficos
  const distribuicaoPorPacote = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => {
      contagem.set(p.nomePacote, (contagem.get(p.nomePacote) || 0) + 1);
    });
    
    return Array.from(contagem.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [pacotesFiltrados]);

  const distribuicaoPorte = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => {
      contagem.set(p.porte, (contagem.get(p.porte) || 0) + 1);
    });
    
    return Array.from(contagem.entries())
      .map(([porte, quantidade]) => ({ porte, quantidade }));
  }, [pacotesFiltrados]);

  const distribuicaoStatus = useMemo(() => {
    const contagem = { Ativo: 0, Completo: 0, Vencido: 0 };
    pacotesFiltrados.forEach(p => {
      contagem[p.status]++;
    });
    
    return [
      { status: "Ativo", quantidade: contagem.Ativo },
      { status: "Completo", quantidade: contagem.Completo },
      { status: "Vencido", quantidade: contagem.Vencido },
    ];
  }, [pacotesFiltrados]);

  const topClientes = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => {
      contagem.set(p.cliente, (contagem.get(p.cliente) || 0) + p.servicosUsados);
    });
    
    return Array.from(contagem.entries())
      .map(([nome, usados]) => ({ nome, usados }))
      .sort((a, b) => b.usados - a.usados)
      .slice(0, 10);
  }, [pacotesFiltrados]);

  const pacotesMaisUtilizados = useMemo(() => {
    const estatisticas = new Map<string, { total: number; usados: number }>();
    
    pacotesFiltrados.forEach(p => {
      const atual = estatisticas.get(p.nomePacote) || { total: 0, usados: 0 };
      estatisticas.set(p.nomePacote, {
        total: atual.total + p.servicosTotal,
        usados: atual.usados + p.servicosUsados,
      });
    });
    
    return Array.from(estatisticas.entries())
      .map(([nome, stats]) => ({
        nome,
        taxa: stats.total > 0 ? (stats.usados / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 10);
  }, [pacotesFiltrados]);

  const pacotesProximosVencimento = useMemo(() => {
    const hoje = new Date();
    const limite = addDays(hoje, 30);
    
    return pacotesFiltrados
      .filter(p => {
        const validade = new Date(p.dataValidade);
        return p.status === "Ativo" && validade >= hoje && validade <= limite;
      })
      .sort((a, b) => a.dataValidade.localeCompare(b.dataValidade))
      .slice(0, 10);
  }, [pacotesFiltrados]);

  const comparativoMensal = useMemo(() => {
    const hoje = new Date();
    const inicioMesAtual = startOfMonth(hoje);
    const fimMesAtual = endOfMonth(hoje);
    const inicioMesAnterior = startOfMonth(subMonths(hoje, 1));
    const fimMesAnterior = endOfMonth(subMonths(hoje, 1));
    
    const mesAtual = pacotes.filter(p => {
      const data = new Date(p.dataAtivacao);
      return data >= inicioMesAtual && data <= fimMesAtual;
    });
    
    const mesAnterior = pacotes.filter(p => {
      const data = new Date(p.dataAtivacao);
      return data >= inicioMesAnterior && data <= fimMesAnterior;
    });
    
    return [
      {
        categoria: "Pacotes Ativos",
        mesAtual: mesAtual.filter(p => p.status === "Ativo").length,
        mesAnterior: mesAnterior.filter(p => p.status === "Ativo").length,
      },
      {
        categoria: "Serviços Usados",
        mesAtual: mesAtual.reduce((acc, p) => acc + p.servicosUsados, 0),
        mesAnterior: mesAnterior.reduce((acc, p) => acc + p.servicosUsados, 0),
      },
      {
        categoria: "Serviços Restantes",
        mesAtual: mesAtual.reduce((acc, p) => acc + p.servicosRestantes, 0),
        mesAnterior: mesAnterior.reduce((acc, p) => acc + p.servicosRestantes, 0),
      },
    ];
  }, [pacotes]);

  const saldoPorCliente = useMemo(() => {
    const saldo = new Map<string, number>();
    
    pacotesFiltrados
      .filter(p => p.status === "Ativo")
      .forEach(p => {
        saldo.set(p.cliente, (saldo.get(p.cliente) || 0) + p.servicosRestantes);
      });
    
    return Array.from(saldo.entries())
      .map(([cliente, restantes]) => ({ cliente, restantes }))
      .sort((a, b) => b.restantes - a.restantes)
      .slice(0, 10);
  }, [pacotesFiltrados]);

  const exportarCSV = () => {
    const headers = [
      "Pacote",
      "Cliente",
      "Pet",
      "Raça",
      "Porte",
      "Data Ativação",
      "Data Validade",
      "Total Serviços",
      "Serviços Usados",
      "Serviços Restantes",
      "Status",
    ];
    
    const rows = pacotesFiltrados.map(p => [
      p.nomePacote,
      p.cliente,
      p.pet,
      p.raca,
      p.porte,
      format(new Date(p.dataAtivacao), "dd/MM/yyyy"),
      format(new Date(p.dataValidade), "dd/MM/yyyy"),
      p.servicosTotal,
      p.servicosUsados,
      p.servicosRestantes,
      p.status,
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.join(";"))
      .join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pacotes-ativos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    toast.success("Relatório exportado com sucesso!");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Relatório de Pacotes Ativos</h2>
        <Button onClick={exportarCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </div>
            {mostrarFiltros ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        
        {mostrarFiltros && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input 
                  type="date" 
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input 
                  type="date" 
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filtros.status} onValueChange={(v: any) => setFiltros({ ...filtros, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Completo">Completo</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={filtros.cliente} onValueChange={(v) => setFiltros({ ...filtros, cliente: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {clientesUnicos.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Porte</Label>
                <Select value={filtros.porte} onValueChange={(v) => setFiltros({ ...filtros, porte: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Pequeno">Pequeno</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={aplicarFiltros} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-blue-700 font-medium">Pacotes Ativos</p>
                <p className="text-3xl font-bold text-blue-900">{totalPacotesAtivos}</p>
                <p className="text-xs text-blue-600">No período selecionado</p>
              </div>
              <Package className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-green-700 font-medium">Serviços Utilizados</p>
                <p className="text-3xl font-bold text-green-900">{totalServicosUsados}</p>
                <p className="text-xs text-green-600">Total consumido</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-orange-700 font-medium">Serviços Disponíveis</p>
                <p className="text-3xl font-bold text-orange-900">{totalServicosRestantes}</p>
                <p className="text-xs text-orange-600">Ainda podem ser usados</p>
              </div>
              <Clock className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-purple-700 font-medium">Taxa de Utilização</p>
                <p className="text-3xl font-bold text-purple-900">{taxaUtilizacao.toFixed(1)}%</p>
                <p className="text-xs text-purple-600">Serviços usados / total</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-indigo-700 font-medium">Pacote Mais Popular</p>
                <p className="text-lg font-bold text-indigo-900 truncate">{pacoteMaisPopular.nome}</p>
                <p className="text-xs text-indigo-600">{pacoteMaisPopular.quantidade} pacotes</p>
              </div>
              <Award className="h-10 w-10 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos - Linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Pacote</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoPorPacote}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="quantidade"
                  nameKey="nome"
                  label={(entry) => entry.quantidade}
                >
                  {distribuicaoPorPacote.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribuicaoStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#3b82f6" name="Quantidade">
                  {distribuicaoStatus.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.status === "Ativo" ? "#10b981" :
                            entry.status === "Completo" ? "#3b82f6" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos - Linha 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Porte do Pet</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoPorte}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="quantidade"
                  label
                >
                  {distribuicaoPorte.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.porte === "Pequeno" ? "#10b981" : 
                            entry.porte === "Médio" ? "#f59e0b" : "#ef4444"} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pacotes com Maior Taxa de Utilização</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pacotesMaisUtilizados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="taxa" fill="#10b981" name="Taxa de Uso (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes - Maior Uso de Pacotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topClientes.length > 0 ? (
              topClientes.map((cliente, index) => (
                <div key={cliente.nome} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-semibold">{cliente.nome}</p>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                        style={{ width: `${(cliente.usados / topClientes[0].usados) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-lg">{cliente.usados}</p>
                    <p className="text-xs text-muted-foreground">serviços</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum dado disponível</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vencimentos Próximos */}
      <Card>
        <CardHeader>
          <CardTitle>Pacotes com Vencimento Próximo (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pacotesProximosVencimento.length > 0 ? (
              pacotesProximosVencimento.map((pacote) => {
                const diasRestantes = differenceInDays(new Date(pacote.dataValidade), new Date());
                
                return (
                  <div key={pacote.id} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{pacote.cliente} - {pacote.pet}</p>
                      <p className="text-xs text-muted-foreground">
                        {pacote.nomePacote} | {pacote.servicosRestantes} serviços restantes
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                        {diasRestantes} dias
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Vence {format(new Date(pacote.dataValidade), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhum pacote com vencimento próximo
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparativo Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo: Mês Atual vs Mês Anterior</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparativoMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="mesAtual" fill="#3b82f6" name="Mês Atual" />
              <Bar dataKey="mesAnterior" fill="#94a3b8" name="Mês Anterior" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Saldo por Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Saldo de Serviços por Cliente (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={saldoPorCliente} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="cliente" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="restantes" fill="#f59e0b" name="Serviços Restantes" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela Final */}
      <Card>
        <CardHeader>
          <CardTitle>Listagem Completa de Pacotes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pacote</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pet</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Usados</TableHead>
                <TableHead className="text-center">Restantes</TableHead>
                <TableHead>Ativação</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pacotesFiltrados.length > 0 ? (
                pacotesFiltrados
                  .sort((a, b) => b.dataAtivacao.localeCompare(a.dataAtivacao))
                  .map((pacote) => (
                    <TableRow key={pacote.id}>
                      <TableCell className="font-medium">{pacote.nomePacote}</TableCell>
                      <TableCell>{pacote.cliente}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pacote.pet}</p>
                          <p className="text-xs text-muted-foreground">
                            {pacote.raca} - {pacote.porte}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {pacote.servicosTotal}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          {pacote.servicosUsados}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={
                            pacote.servicosRestantes === 0 
                              ? "bg-red-50 text-red-700 border-red-300"
                              : pacote.servicosRestantes <= 2
                              ? "bg-orange-50 text-orange-700 border-orange-300"
                              : "bg-blue-50 text-blue-700 border-blue-300"
                          }
                        >
                          {pacote.servicosRestantes}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(pacote.dataAtivacao), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(pacote.dataValidade), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            pacote.status === "Ativo" ? "default" :
                            pacote.status === "Completo" ? "secondary" : "destructive"
                          }
                        >
                          {pacote.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum pacote encontrado para os filtros selecionados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

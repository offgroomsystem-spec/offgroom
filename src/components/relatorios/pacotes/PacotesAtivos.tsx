import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Award, Filter, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, addDays, differenceInDays } from "date-fns";

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
  servicos: Array<{ servico: string; quantidade: number }>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

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
      const { data: pacotesData, error: errorPacotes } = await supabase.from("agendamentos_pacotes").select("*").eq("user_id", user.id).gte("data_venda", filtros.dataInicio).lte("data_venda", filtros.dataFim).order("data_venda", { ascending: false });
      if (errorPacotes) throw errorPacotes;
      const { data: pacotesInfoData } = await supabase.from("pacotes").select("nome, validade, porte, raca").eq("user_id", user.id);
      const pacotesInfoMap = new Map((pacotesInfoData || []).map(p => [p.nome, { validade: p.validade, porte: p.porte, raca: p.raca }]));
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { data: agendamentosData } = await supabase.from("agendamentos").select("numero_servico_pacote, servico, data").eq("user_id", user.id).not("numero_servico_pacote", "is", null);
      const usosPorPacote = new Map<string, number>();
      (agendamentosData || []).forEach(a => {
        const dataAgendamento = new Date(a.data);
        dataAgendamento.setHours(0, 0, 0, 0);
        if (dataAgendamento <= hoje) {
          const key = a.numero_servico_pacote;
          if (key) usosPorPacote.set(key, (usosPorPacote.get(key) || 0) + 1);
        }
      });
      const pacotesConsolidados: PacoteAtivo[] = (pacotesData || []).map((p: any) => {
        const servicos = Array.isArray(p.servicos) ? p.servicos : [];
        const totalServicos = servicos.reduce((acc, s) => acc + (s.quantidade || 1), 0);
        const servicosUsados = usosPorPacote.get(p.id) || 0;
        const servicosRestantes = Math.max(0, totalServicos - servicosUsados);
        const infoComplementar = pacotesInfoMap.get(p.nome_pacote) || { validade: "90", porte: "Pequeno", raca: "" };
        const validadeDias = parseInt(infoComplementar.validade);
        const dataValidade = addDays(new Date(p.data_venda), validadeDias);
        let status: "Ativo" | "Completo" | "Vencido";
        if (servicosRestantes === 0) status = "Completo";
        else if (dataValidade < hoje) status = "Vencido";
        else status = "Ativo";
        return { id: p.id, nomePacote: p.nome_pacote, cliente: p.nome_cliente, pet: p.nome_pet, raca: p.raca, porte: infoComplementar.porte, whatsapp: p.whatsapp, dataAtivacao: p.data_venda, dataValidade: format(dataValidade, "yyyy-MM-dd"), servicosTotal: totalServicos, servicosUsados, servicosRestantes, status, servicos: servicos.map((s: any) => ({ servico: s.servico || "", quantidade: s.quantidade || 1 })) };
      });
      const pacotesUnicosPorClientePet = new Map<string, PacoteAtivo>();
      const pacotesOrdenados = [...pacotesConsolidados].sort((a, b) => new Date(b.dataAtivacao).getTime() - new Date(a.dataAtivacao).getTime());
      pacotesOrdenados.forEach(pacote => {
        const chave = `${pacote.cliente}-${pacote.pet}`;
        const dataValidade = new Date(pacote.dataValidade);
        if (dataValidade >= hoje && !pacotesUnicosPorClientePet.has(chave)) {
          pacotesUnicosPorClientePet.set(chave, pacote);
        }
      });
      setPacotes(Array.from(pacotesUnicosPorClientePet.values()));
    } catch (error) {
      console.error("Erro ao carregar pacotes:", error);
      toast.error("Erro ao carregar dados dos pacotes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPacotes(); }, [user]);

  const aplicarFiltros = () => { loadPacotes(); setMostrarFiltros(false); };
  const limparFiltros = () => { setFiltros({ dataInicio: format(subMonths(new Date(), 3), "yyyy-MM-dd"), dataFim: format(new Date(), "yyyy-MM-dd"), status: "all", cliente: "all", porte: "all" }); };

  const pacotesFiltrados = useMemo(() => pacotes.filter(p => {
    if (filtros.status !== "all" && p.status !== filtros.status) return false;
    if (filtros.cliente !== "all" && p.cliente !== filtros.cliente) return false;
    if (filtros.porte !== "all" && p.porte !== filtros.porte) return false;
    return true;
  }), [pacotes, filtros]);

  const clientesUnicos = useMemo(() => Array.from(new Set(pacotes.map(p => p.cliente))).sort(), [pacotes]);
  const totalPacotesAtivos = useMemo(() => pacotesFiltrados.filter(p => p.status === "Ativo").length, [pacotesFiltrados]);
  const pacoteMaisPopular = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => contagem.set(p.nomePacote, (contagem.get(p.nomePacote) || 0) + 1));
    let max = { nome: "—", quantidade: 0 };
    contagem.forEach((qtd, nome) => { if (qtd > max.quantidade) max = { nome, quantidade: qtd }; });
    return max;
  }, [pacotesFiltrados]);

  const distribuicaoPorPacote = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => contagem.set(p.nomePacote, (contagem.get(p.nomePacote) || 0) + 1));
    return Array.from(contagem.entries()).map(([nome, quantidade]) => ({ nome, quantidade })).sort((a, b) => b.quantidade - a.quantidade);
  }, [pacotesFiltrados]);

  const distribuicaoPorte = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => contagem.set(p.porte, (contagem.get(p.porte) || 0) + 1));
    return Array.from(contagem.entries()).map(([porte, quantidade]) => ({ porte, quantidade }));
  }, [pacotesFiltrados]);

  const pacotesProximosVencimento = useMemo(() => {
    const hoje = new Date();
    const daquiA30Dias = addDays(hoje, 30);
    return pacotesFiltrados.filter(p => {
      const dataValidade = new Date(p.dataValidade);
      return p.status === "Ativo" && dataValidade >= hoje && dataValidade <= daquiA30Dias && p.servicosRestantes > 0;
    }).sort((a, b) => new Date(a.dataValidade).getTime() - new Date(b.dataValidade).getTime()).slice(0, 10);
  }, [pacotesFiltrados]);

  const comparativoMensal = useMemo(() => {
    const hoje = new Date();
    const inicioMesAtual = startOfMonth(hoje);
    const fimMesAtual = endOfMonth(hoje);
    const inicioMesAnterior = startOfMonth(subMonths(hoje, 1));
    const fimMesAnterior = endOfMonth(subMonths(hoje, 1));
    const pacotesVendidosMesAtual = pacotes.filter(p => {
      const dataVenda = new Date(p.dataAtivacao);
      return dataVenda >= inicioMesAtual && dataVenda <= fimMesAtual;
    }).length;
    const pacotesVendidosMesAnterior = pacotes.filter(p => {
      const dataVenda = new Date(p.dataAtivacao);
      return dataVenda >= inicioMesAnterior && dataVenda <= fimMesAnterior;
    }).length;
    return [{ nome: "Mês Atual", pacotesVendidos: pacotesVendidosMesAtual }, { nome: "Mês Anterior", pacotesVendidos: pacotesVendidosMesAnterior }];
  }, [pacotes]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Relatório de Pacotes Ativos
        </h2>
      </div>
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
            {mostrarFiltros ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
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
                <Select
                  value={filtros.status}
                  onValueChange={(v: any) => setFiltros({ ...filtros, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Select
                  value={filtros.cliente}
                  onValueChange={(v) => setFiltros({ ...filtros, cliente: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {clientesUnicos.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Porte</Label>
                <Select
                  value={filtros.porte}
                  onValueChange={(v) => setFiltros({ ...filtros, porte: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-amber-700 font-medium">Pacote Mais Popular</p>
                <p className="text-xl font-bold text-amber-900">{pacoteMaisPopular.nome}</p>
                <p className="text-xs text-amber-600">{pacoteMaisPopular.quantidade} vendidos</p>
              </div>
              <Award className="h-10 w-10 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  labelLine={false}
                  label={({ nome, quantidade }) => `${nome}: ${quantidade}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantidade"
                >
                  {distribuicaoPorPacote.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Porte do Pet</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribuicaoPorte}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="porte" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pacotes com Vencimento Próximo (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pacotesProximosVencimento.length > 0 ? (
              pacotesProximosVencimento.map(pacote => {
                const diasRestantes = differenceInDays(
                  new Date(pacote.dataValidade),
                  new Date()
                );
                return (
                  <div
                    key={pacote.id}
                    className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {pacote.cliente} - {pacote.pet}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pacote.nomePacote} | {pacote.servicosRestantes} serviços restantes
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className="bg-orange-100 text-orange-800 border-orange-300"
                      >
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
      <Card>
        <CardHeader>
          <CardTitle>Comparativo: Mês Atual vs Mês Anterior</CardTitle>
          <CardDescription>Quantidade de pacotes vendidos em cada período</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparativoMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="pacotesVendidos" fill="#3b82f6" name="Pacotes Vendidos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Listagem Completa de Pacotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Porte</TableHead>
                  <TableHead>Data Ativação</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Usados</TableHead>
                  <TableHead>Restantes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacotesFiltrados
                  .filter(p => p.servicosRestantes > 0)
                  .map(pacote => (
                    <TableRow key={pacote.id}>
                      <TableCell className="font-medium">{pacote.cliente}</TableCell>
                      <TableCell>{pacote.pet}</TableCell>
                      <TableCell>{pacote.nomePacote}</TableCell>
                      <TableCell>{pacote.porte}</TableCell>
                      <TableCell>
                        {format(new Date(pacote.dataAtivacao), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(pacote.dataValidade), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{pacote.servicosTotal}</TableCell>
                      <TableCell>{pacote.servicosUsados}</TableCell>
                      <TableCell>{pacote.servicosRestantes}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pacote.status === "Ativo"
                              ? "default"
                              : pacote.status === "Completo"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {pacote.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                {pacotesFiltrados.filter(p => p.servicosRestantes > 0).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum pacote encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

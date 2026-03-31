import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, differenceInMinutes, eachDayOfInterval, getDay, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Users, Clock, Star, DollarSign, TrendingUp, Activity } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

interface Agendamento {
  id: string;
  groomer: string;
  data: string;
  horario: string;
  horario_termino: string;
  tempo_servico: string;
  servico: string;
  servicos: any;
  status: string;
  pet: string;
  raca: string;
  taxi_dog: string;
  cliente: string;
}

export const PerformanceBanhistas = () => {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [groomers, setGroomers] = useState<string[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);

  // Filters
  const [periodo, setPeriodo] = useState("mes");
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [groomerFilter, setGroomerFilter] = useState("todos");
  

  useEffect(() => {
    if (periodo === "mes") {
      setDataInicio(format(startOfMonth(new Date()), "yyyy-MM-dd"));
      setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    } else if (periodo === "mes-anterior") {
      const m = subMonths(new Date(), 1);
      setDataInicio(format(startOfMonth(m), "yyyy-MM-dd"));
      setDataFim(format(endOfMonth(m), "yyyy-MM-dd"));
    } else if (periodo === "trimestre") {
      setDataInicio(format(subMonths(startOfMonth(new Date()), 2), "yyyy-MM-dd"));
      setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    }
  }, [periodo]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [agRes, grRes, lnRes] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("id, groomer, data, horario, horario_termino, tempo_servico, servico, servicos, status, pet, raca, taxi_dog, cliente")
          .eq("user_id", ownerId)
          .gte("data", dataInicio)
          .lte("data", dataFim)
          .order("data", { ascending: true }),
        supabase.from("groomers").select("nome").eq("user_id", ownerId),
        supabase
          .from("lancamentos_financeiros")
          .select("agendamento_id, valor_total")
          .eq("user_id", ownerId)
          .eq("tipo", "receita")
          .not("agendamento_id", "is", null),
      ]);

      const agData = agRes.data || [];
      setAgendamentos(agData);
      const nomes = [...new Set((grRes.data || []).map((g) => g.nome))].sort();
      // Add "Não atribuído" if any appointment has empty groomer
      const hasEmpty = agData.some((a: any) => !a.groomer || !a.groomer.trim());
      if (hasEmpty) nomes.push("Não atribuído");
      setGroomers(nomes);
      setLancamentos(lnRes.data || []);
      setLoading(false);
    };
    load();
  }, [user, ownerId, dataInicio, dataFim]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("perf-banhistas")
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, () => {
        // Reload
        if (!user) return;
        supabase
          .from("agendamentos")
          .select("id, groomer, data, horario, horario_termino, tempo_servico, servico, servicos, status, pet, raca, taxi_dog, cliente")
          .eq("user_id", ownerId)
          .gte("data", dataInicio)
          .lte("data", dataFim)
          .order("data", { ascending: true })
          .then(({ data }) => setAgendamentos(data || []));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, ownerId, dataInicio, dataFim]);

  const receitaMap = useMemo(() => {
    const m = new Map<string, number>();
    lancamentos.forEach((l) => { if (l.agendamento_id) m.set(l.agendamento_id, l.valor_total); });
    return m;
  }, [lancamentos]);

  // Normalize groomer name: treat empty/blank as "Não atribuído"
  const normalizeGroomer = (g: string) => (g && g.trim() ? g.trim() : "Não atribuído");

  const normalizedAgendamentos = useMemo(() =>
    agendamentos.map((a) => ({ ...a, groomer: normalizeGroomer(a.groomer) })),
  [agendamentos]);

  const filtered = useMemo(() => {
    let list = normalizedAgendamentos;
    if (groomerFilter !== "todos") list = list.filter((a) => a.groomer === groomerFilter);
    return list;
  }, [normalizedAgendamentos, groomerFilter]);

  const concluidos = filtered;

  // Helper: parse tempo_servico "01:30" to minutes
  const parseMinutos = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Helper: get porte from raca text (simplified)
  const getPorte = (raca: string) => {
    const r = raca?.toLowerCase() || "";
    if (r.includes("grande") || r.includes("golden") || r.includes("labrador") || r.includes("pastor") || r.includes("husky") || r.includes("rottweiler")) return "Grande";
    if (r.includes("pequeno") || r.includes("yorkshire") || r.includes("shih") || r.includes("maltês") || r.includes("pinscher") || r.includes("chihuahua") || r.includes("lhasa") || r.includes("poodle toy")) return "Pequeno";
    return "Médio";
  };

  // === KPIs ===
  const kpis = useMemo(() => {
    const totalPets = concluidos.length;
    const totalMinutos = concluidos.reduce((s, a) => s + parseMinutos(a.tempo_servico), 0);
    const totalHoras = Math.round((totalMinutos / 60) * 10) / 10;
    const mediaMinutos = totalPets > 0 ? Math.round(totalMinutos / totalPets) : 0;

    // Banhista mais produtivo
    const countPerGroomer = new Map<string, number>();
    concluidos.forEach((a) => countPerGroomer.set(a.groomer, (countPerGroomer.get(a.groomer) || 0) + 1));
    let topGroomer = "-";
    let topCount = 0;
    countPerGroomer.forEach((c, g) => { if (c > topCount) { topCount = c; topGroomer = g; } });

    // Receita total
    const receitaTotal = concluidos.reduce((s, a) => s + (receitaMap.get(a.id) || 0), 0);

    // Taxa ocupação: horas trabalhadas / (8h * dias úteis * nº banhistas)
    const diasNoIntervalo = eachDayOfInterval({ start: parseISO(dataInicio), end: parseISO(dataFim) })
      .filter((d) => getDay(d) !== 0); // excluir domingo
    const numBanhistas = groomers.length || 1;
    const capacidadeTotal = diasNoIntervalo.length * 8 * numBanhistas;
    const taxaOcupacao = capacidadeTotal > 0 ? Math.round((totalHoras / capacidadeTotal) * 100) : 0;

    return { totalPets, totalHoras, mediaMinutos, topGroomer, topCount, receitaTotal, taxaOcupacao };
  }, [concluidos, receitaMap, groomers, dataInicio, dataFim]);

  // === Charts data ===

  // Pets atendidos por banhista
  const petsPerGroomer = useMemo(() => {
    const map = new Map<string, number>();
    concluidos.forEach((a) => map.set(a.groomer, (map.get(a.groomer) || 0) + 1));
    return [...map.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  }, [concluidos]);

  // Horas trabalhadas por banhista
  const horasPerGroomer = useMemo(() => {
    const map = new Map<string, number>();
    concluidos.forEach((a) => {
      const mins = parseMinutos(a.tempo_servico);
      map.set(a.groomer, (map.get(a.groomer) || 0) + mins);
    });
    return [...map.entries()].map(([nome, mins]) => ({ nome, horas: Math.round((mins / 60) * 10) / 10 })).sort((a, b) => b.horas - a.horas);
  }, [concluidos]);

  // Tempo médio por atendimento por banhista
  const tempoMedioPerGroomer = useMemo(() => {
    const mapMins = new Map<string, number>();
    const mapCount = new Map<string, number>();
    concluidos.forEach((a) => {
      const mins = parseMinutos(a.tempo_servico);
      mapMins.set(a.groomer, (mapMins.get(a.groomer) || 0) + mins);
      mapCount.set(a.groomer, (mapCount.get(a.groomer) || 0) + 1);
    });
    return [...mapMins.entries()].map(([nome, mins]) => ({
      nome,
      media: Math.round(mins / (mapCount.get(nome) || 1)),
    })).sort((a, b) => a.media - b.media);
  }, [concluidos]);

  // Receita por banhista
  const receitaPerGroomer = useMemo(() => {
    const map = new Map<string, number>();
    concluidos.forEach((a) => {
      map.set(a.groomer, (map.get(a.groomer) || 0) + (receitaMap.get(a.id) || 0));
    });
    return [...map.entries()].map(([nome, receita]) => ({ nome, receita: Math.round(receita * 100) / 100 })).sort((a, b) => b.receita - a.receita);
  }, [concluidos, receitaMap]);

  // Produtividade ao longo do tempo (por semana/dia)
  const produtividadeTimeline = useMemo(() => {
    const dayMap = new Map<string, number>();
    concluidos.forEach((a) => {
      dayMap.set(a.data, (dayMap.get(a.data) || 0) + 1);
    });
    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, total]) => ({
        data: format(parseISO(data), "dd/MM", { locale: ptBR }),
        atendimentos: total,
      }));
  }, [concluidos]);

  // Heatmap por hora do dia
  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7h-19h
    const counts = new Map<number, number>();
    hours.forEach((h) => counts.set(h, 0));
    concluidos.forEach((a) => {
      const h = parseInt(a.horario?.split(":")[0] || "0");
      if (counts.has(h)) counts.set(h, (counts.get(h) || 0) + 1);
    });
    return hours.map((h) => ({ hora: `${h}h`, total: counts.get(h) || 0 }));
  }, [concluidos]);

  // Ranking de performance (score combinado)
  const ranking = useMemo(() => {
    const groomerSet = new Set(concluidos.map((a) => a.groomer));
    const results: { nome: string; pets: number; receita: number; mediaMin: number; score: number }[] = [];
    groomerSet.forEach((g) => {
      const ga = concluidos.filter((a) => a.groomer === g);
      const pets = ga.length;
      const receita = ga.reduce((s, a) => s + (receitaMap.get(a.id) || 0), 0);
      const totalMin = ga.reduce((s, a) => s + parseMinutos(a.tempo_servico), 0);
      const mediaMin = pets > 0 ? Math.round(totalMin / pets) : 0;
      // Score: 50% pets + 30% receita + 20% eficiência (menos tempo = melhor)
      const maxPets = Math.max(...[...groomerSet].map((x) => concluidos.filter((a) => a.groomer === x).length), 1);
      const maxReceita = Math.max(...[...groomerSet].map((x) => concluidos.filter((a) => a.groomer === x).reduce((s, a) => s + (receitaMap.get(a.id) || 0), 0)), 1);
      const score = Math.round(((pets / maxPets) * 50) + ((receita / maxReceita) * 30) + (mediaMin > 0 ? ((60 / mediaMin) * 20) : 0));
      results.push({ nome: g, pets, receita, mediaMin, score: Math.min(score, 100) });
    });
    return results.sort((a, b) => b.score - a.score);
  }, [concluidos, receitaMap]);

  // Tipos de serviço por banhista
  const servicoPerGroomer = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    concluidos.forEach((a) => {
      if (!map.has(a.groomer)) map.set(a.groomer, new Map());
      const sMap = map.get(a.groomer)!;
      const servico = a.servico || "Outros";
      sMap.set(servico, (sMap.get(servico) || 0) + 1);
    });
    const result: { nome: string; [key: string]: any }[] = [];
    const allServicos = new Set<string>();
    map.forEach((sMap) => sMap.forEach((_, s) => allServicos.add(s)));
    map.forEach((sMap, groomer) => {
      const row: any = { nome: groomer };
      allServicos.forEach((s) => { row[s] = sMap.get(s) || 0; });
      result.push(row);
    });
    return { data: result, servicos: [...allServicos] };
  }, [concluidos]);

  // Cancelamentos por banhista
  const cancelamentos = useMemo(() => {
    const cancelados = filtered.filter((a) => a.status === "cancelado");
    const map = new Map<string, number>();
    cancelados.forEach((a) => map.set(a.groomer, (map.get(a.groomer) || 0) + 1));
    return [...map.entries()].map(([nome, total]) => ({ nome, cancelamentos: total })).sort((a, b) => b.cancelamentos - a.cancelamentos);
  }, [filtered]);

  // Performance por porte
  const porteData = useMemo(() => {
    const portes = new Map<string, { total: number; minutos: number }>();
    concluidos.forEach((a) => {
      const p = getPorte(a.raca);
      const existing = portes.get(p) || { total: 0, minutos: 0 };
      existing.total += 1;
      existing.minutos += parseMinutos(a.tempo_servico);
      portes.set(p, existing);
    });
    return [...portes.entries()].map(([porte, d]) => ({
      porte,
      total: d.total,
      mediaMin: d.total > 0 ? Math.round(d.minutos / d.total) : 0,
    }));
  }, [concluidos]);

  // Eficiência: tempo previsto vs real (usando tempo_servico como previsto, horario/horario_termino como real)
  const eficienciaData = useMemo(() => {
    const map = new Map<string, { previsto: number; real: number; count: number }>();
    concluidos.forEach((a) => {
      if (!a.horario || !a.horario_termino) return;
      const previsto = parseMinutos(a.tempo_servico);
      const inicio = new Date(`2000-01-01T${a.horario}`);
      const fim = new Date(`2000-01-01T${a.horario_termino}`);
      const real = differenceInMinutes(fim, inicio);
      if (real <= 0) return;
      const existing = map.get(a.groomer) || { previsto: 0, real: 0, count: 0 };
      existing.previsto += previsto;
      existing.real += real;
      existing.count += 1;
      map.set(a.groomer, existing);
    });
    return [...map.entries()].map(([nome, d]) => ({
      nome,
      previsto: d.count > 0 ? Math.round(d.previsto / d.count) : 0,
      real: d.count > 0 ? Math.round(d.real / d.count) : 0,
    }));
  }, [concluidos]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-2">
      {/* Filters */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mês atual</SelectItem>
                <SelectItem value="mes-anterior">Mês anterior</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodo === "custom" && (
            <>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-7 text-xs w-32" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Fim</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-7 text-xs w-32" />
              </div>
            </>
          )}
          <div className="space-y-0.5">
            <Label className="text-[10px]">Banhista</Label>
            <Select value={groomerFilter} onValueChange={setGroomerFilter}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {groomers.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
        {[
          { label: "Pets Atendidos", value: kpis.totalPets, icon: Users, color: "text-blue-500" },
          { label: "Horas Trabalhadas", value: `${kpis.totalHoras}h`, icon: Clock, color: "text-green-500" },
          { label: "Média/Atend.", value: `${kpis.mediaMinutos}min`, icon: Activity, color: "text-orange-500" },
          { label: "Mais Produtivo", value: kpis.topGroomer, sub: `${kpis.topCount} pets`, icon: Star, color: "text-yellow-500" },
          { label: "Taxa Ocupação", value: `${kpis.taxaOcupacao}%`, icon: TrendingUp, color: "text-purple-500" },
          { label: "Receita Total", value: formatCurrency(kpis.receitaTotal), icon: DollarSign, color: "text-emerald-500" },
        ].map((k) => (
          <Card key={k.label} className="p-0">
            <CardContent className="flex items-center gap-2 p-2">
              <k.icon className={`h-5 w-5 ${k.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-none truncate">{k.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{k.label}</p>
                {k.sub && <p className="text-[9px] text-muted-foreground">{k.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid md:grid-cols-2 gap-2">
        {/* Pets por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">🐾 Pets Atendidos por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {petsPerGroomer.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={petsPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Horas por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">⏱️ Horas Trabalhadas por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {horasPerGroomer.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={horasPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="horas" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tempo Médio por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">⏳ Tempo Médio por Atendimento (min)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {tempoMedioPerGroomer.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tempoMedioPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="media" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Receita por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">💰 Receita por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {receitaPerGroomer.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="receita" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Charts */}
      <div className="grid md:grid-cols-2 gap-2">
        {/* Produtividade Timeline */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">📈 Produtividade ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {produtividadeTimeline.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={produtividadeTimeline} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="data" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="atendimentos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Heatmap horários */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">🔥 Heatmap de Horários</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {heatmapData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmapData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {heatmapData.map((entry, i) => {
                      const max = Math.max(...heatmapData.map((d) => d.total), 1);
                      const intensity = entry.total / max;
                      const color = `hsl(${200 - intensity * 180}, ${60 + intensity * 30}%, ${50 - intensity * 15}%)`;
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Eficiência: Previsto vs Real */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">⚡ Eficiência (Previsto vs Real)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {eficienciaData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eficienciaData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="previsto" name="Previsto" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="real" name="Real" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cancelamentos */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">❌ Cancelamentos por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {cancelamentos.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-muted-foreground">Nenhum cancelamento 🎉</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cancelamentos} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cancelamentos" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking + Porte + Serviços */}
      <div className="grid md:grid-cols-3 gap-2">
        {/* Ranking */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">🏆 Ranking de Performance</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0">
            {ranking.length === 0 ? <EmptyState /> : (
              <div className="space-y-1">
                {ranking.map((r, i) => (
                  <div key={r.nome} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 text-muted-foreground font-medium">{i + 1}.</span>
                      <span className="font-medium">{r.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{r.pets} pets</Badge>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{r.mediaMin}min</Badge>
                      <Badge className="text-[9px] h-4 px-1 bg-primary/10 text-primary border-0">{r.score}pts</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance por Porte */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">🐕 Performance por Porte</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {porteData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porteData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="porte" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="total" name="Qtd" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mediaMin" name="Média (min)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tipos de serviço */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">✂️ Serviços por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {servicoPerGroomer.data.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={servicoPerGroomer.data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  {servicoPerGroomer.servicos.slice(0, 5).map((s, i) => (
                    <Bar key={s} dataKey={s} stackId="a" fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex items-center justify-center h-full">
    <p className="text-xs text-muted-foreground">Sem dados no período.</p>
  </div>
);

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RefreshCw, Filter, ChevronUp, ChevronDown, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
}

interface DREProps {
  filtros: Filtros;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

interface DRERowProps {
  titulo: string;
  valor: number | string;
  nivel: number;
  destaque?: boolean;
  cor?: "default" | "green" | "red";
}

const DRERow = ({ titulo, valor, nivel, destaque, cor = "default" }: DRERowProps) => {
  const indentClass = nivel === 1 ? "" : nivel === 2 ? "pl-6" : "pl-12";
  const fontClass = destaque ? "font-bold text-base" : nivel === 1 ? "font-semibold text-sm" : "text-sm";
  const corClass =
    cor === "green" ? "text-green-600 dark:text-green-400" : cor === "red" ? "text-red-600 dark:text-red-400" : "";

  return (
    <div className={`flex justify-between py-1.5 ${indentClass} ${fontClass} ${corClass}`}>
      <span>{titulo}</span>
      <span className="font-mono">{typeof valor === "number" ? formatCurrency(valor) : valor}</span>
    </div>
  );
};

export const DRE = ({ filtros }: DREProps) => {
  const { user, ownerId } = useAuth();
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizandoSaldo, setAtualizandoSaldo] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosLocais, setFiltrosLocais] = useState({
    periodo: filtros.periodo || "mes",
    dataInicio: filtros.dataInicio || "",
    dataFim: filtros.dataFim || "",
    bancosSelecionados: [] as string[],
    pago: null as boolean | null,
  });

  useEffect(() => {
    loadData();
  }, [user, filtrosLocais]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Calcular período
      let dataInicio = new Date();
      let dataFim = new Date();

      switch (filtrosLocais.periodo) {
        case "hoje":
          // Hoje
          break;
        case "semana":
          dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay());
          dataFim.setDate(dataInicio.getDate() + 6);
          break;
        case "mes":
          dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
          dataFim = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + 1, 0);
          break;
        case "trimestre":
          const mesAtual = dataInicio.getMonth();
          const trimestreInicio = Math.floor(mesAtual / 3) * 3;
          dataInicio = new Date(dataInicio.getFullYear(), trimestreInicio, 1);
          dataFim = new Date(dataInicio.getFullYear(), trimestreInicio + 3, 0);
          break;
        case "ano":
          dataInicio = new Date(dataInicio.getFullYear(), 0, 1);
          dataFim = new Date(dataInicio.getFullYear(), 11, 31);
          break;
        case "customizado":
          if (filtrosLocais.dataInicio && filtrosLocais.dataFim) {
            dataInicio = new Date(filtrosLocais.dataInicio);
            dataFim = new Date(filtrosLocais.dataFim);
          }
          break;
      }

      // Buscar lançamentos financeiros
      let query = supabase
        .from("lancamentos_financeiros")
        .select(
          `
          *,
          lancamentos_financeiros_itens (*)
        `,
        )
        .eq("user_id", user.id)
        .gte("data_pagamento", dataInicio.toISOString().split("T")[0])
        .lte("data_pagamento", dataFim.toISOString().split("T")[0]);

      // Filtro de status pago
      if (filtrosLocais.pago !== null) {
        query = query.eq("pago", filtrosLocais.pago);
      }

      const { data: lancamentosData, error: lancamentosError } = await query;

      if (lancamentosError) throw lancamentosError;

      // Buscar contas bancárias
      const { data: contasData, error: contasError } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", ownerId);

      if (contasError) throw contasError;

      // Mapear nome da conta para cada lançamento
      const lancamentosComBanco = (lancamentosData || []).map((l) => {
        const conta = contasData?.find((c) => c.id === l.conta_id);
        return {
          ...l,
          nomeBanco: conta?.nome || "Sem conta",
          itens: l.lancamentos_financeiros_itens || [],
        };
      });

      // Filtrar por bancos selecionados
      let lancamentosFiltrados = lancamentosComBanco;
      if (filtrosLocais.bancosSelecionados.length > 0) {
        // Se há filtro de banco, incluir apenas lançamentos dos bancos selecionados
        // E incluir "Sem conta" apenas se explicitamente selecionado
        lancamentosFiltrados = lancamentosComBanco.filter((l) =>
          filtrosLocais.bancosSelecionados.includes(l.nomeBanco),
        );
      }
      // Se não há filtro de banco, incluir TODOS os lançamentos (com e sem conta)

      setLancamentos(lancamentosFiltrados);
      setContas(contasData || []);
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const atualizarSaldoContas = async () => {
    if (!user) return;

    try {
      setAtualizandoSaldo(true);

      for (const conta of contas) {
        // Buscar todos os lançamentos pagos desta conta
        const { data: lancamentosConta, error } = await supabase
          .from("lancamentos_financeiros")
          .select("tipo, valor_total")
          .eq("user_id", user.id)
          .eq("conta_id", conta.id)
          .eq("pago", true);

        if (error) throw error;

        const receitas = (lancamentosConta || [])
          .filter((l) => l.tipo === "Receita")
          .reduce((acc, l) => acc + Number(l.valor_total), 0);

        const despesas = (lancamentosConta || [])
          .filter((l) => l.tipo === "Despesa")
          .reduce((acc, l) => acc + Number(l.valor_total), 0);

        const saldoAtualizado = receitas - despesas;

        const { error: updateError } = await supabase
          .from("contas_bancarias")
          .update({ saldo: saldoAtualizado })
          .eq("id", conta.id);

        if (updateError) throw updateError;
      }

      toast.success("Saldo das contas atualizado com sucesso!");
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar saldo:", error);
      toast.error("Erro ao atualizar saldo das contas");
    } finally {
      setAtualizandoSaldo(false);
    }
  };

  const dre = useMemo(() => {
    // Funções auxiliares
    const somarPorCategoria = (categoria: string, tipo: "Receita" | "Despesa") => {
      return lancamentos
        .filter((l) => l.tipo === tipo && l.descricao1 === categoria && l.pago)
        .reduce((acc, l) => acc + Number(l.valor_total), 0);
    };

    const somarPorSubcategorias = (categoria: string, subcategorias: string[]) => {
      return lancamentos
        .filter((l) => l.descricao1 === categoria && l.pago)
        .reduce((acc, l) => {
          const valorItens = (l.itens || [])
            .filter((item: any) => subcategorias.includes(item.descricao2))
            .reduce((sum: number, item: any) => sum + Number(item.valor), 0);
          return acc + valorItens;
        }, 0);
    };

    const somarSubcategoria = (subcategoria: string) => {
      return lancamentos
        .filter((l) => l.pago)
        .reduce((acc, l) => {
          const valorItem = (l.itens || [])
            .filter((item: any) => item.descricao2 === subcategoria)
            .reduce((sum: number, item: any) => sum + Number(item.valor), 0);
          return acc + valorItem;
        }, 0);
    };

    // 1. RECEITA OPERACIONAL BRUTA
    const receitaOperacional = somarPorCategoria("Receita Operacional", "Receita");
    const servicosReceita = somarSubcategoria("Serviços");
    const vendaReceita = somarSubcategoria("Venda");
    const outrasReceitasOp = receitaOperacional - servicosReceita - vendaReceita;

    // 2. CUSTOS OPERACIONAIS
    const produtosBanho = somarSubcategoria("Produtos para Banho");
    const materialLimpeza = somarSubcategoria("Material de Limpeza");
    const custosOperacionais = produtosBanho + materialLimpeza;

    // 3. LUCRO BRUTO
    const lucroBruto = receitaOperacional - custosOperacionais;

    // 4. DESPESAS OPERACIONAIS
    const contador = somarSubcategoria("Contador");
    const freelancer = somarSubcategoria("Freelancer");
    const telefonia = somarSubcategoria("Telefonia e internet");
    const energia = somarSubcategoria("Energia elétrica");
    const agua = somarSubcategoria("Água e esgoto");
    const marketing = somarSubcategoria("Publicidade e marketing");
    const outrasDespOp = somarSubcategoria("Outras Despesas Operacionais");
    const despesasOperacionais = contador + freelancer + telefonia + energia + agua + marketing + outrasDespOp;

    // 5. DESPESAS FIXAS
    const aluguel = somarSubcategoria("Aluguel");
    const salarios = somarSubcategoria("Salários");
    const impostos = somarSubcategoria("Impostos Fixos");
    const outrasDespFixas = somarSubcategoria("Outras Despesas Fixas");
    const despesasFixas = aluguel + salarios + impostos + outrasDespFixas;

    // 6. LUCRO OPERACIONAL
    const lucroOperacional = lucroBruto - despesasOperacionais - despesasFixas;

    // 7. RESULTADO NÃO OPERACIONAL
    const receitaNaoOperacional = somarPorCategoria("Receita Não Operacional", "Receita");
    const despesaNaoOperacional = somarPorCategoria("Despesa Não Operacional", "Despesa");
    const resultadoNaoOperacional = receitaNaoOperacional - despesaNaoOperacional;

    // 8. LUCRO LÍQUIDO
    const lucroLiquido = lucroOperacional + resultadoNaoOperacional;

    // MÉTRICAS ADICIONAIS
    const receitaTotal = receitaOperacional + receitaNaoOperacional;
    const despesasTotal = custosOperacionais + despesasOperacionais + despesasFixas + despesaNaoOperacional;
    const margemBruta = receitaOperacional > 0 ? (lucroBruto / receitaOperacional) * 100 : 0;
    const margemOperacional = receitaTotal > 0 ? (lucroOperacional / receitaTotal) * 100 : 0;
    const margemLiquida = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

    return {
      // Receita Operacional
      receitaOperacional,
      servicosReceita,
      vendaReceita,
      outrasReceitasOp,
      // Custos
      custosOperacionais,
      produtosBanho,
      materialLimpeza,
      // Lucro Bruto
      lucroBruto,
      margemBruta,
      // Despesas Operacionais
      despesasOperacionais,
      contador,
      freelancer,
      telefonia,
      energia,
      agua,
      marketing,
      outrasDespOp,
      // Despesas Fixas
      despesasFixas,
      aluguel,
      salarios,
      impostos,
      outrasDespFixas,
      // Lucro Operacional
      lucroOperacional,
      margemOperacional,
      // Resultado Não Operacional
      receitaNaoOperacional,
      despesaNaoOperacional,
      resultadoNaoOperacional,
      // Lucro Líquido
      lucroLiquido,
      margemLiquida,
      // Totais
      receitaTotal,
      despesasTotal,
    };
  }, [lancamentos]);

  const getPeriodoTexto = () => {
    const hoje = new Date();
    switch (filtrosLocais.periodo) {
      case "hoje":
        return hoje.toLocaleDateString("pt-BR");
      case "semana":
        return "Esta Semana";
      case "mes":
        return `${hoje.toLocaleString("pt-BR", { month: "long" })} de ${hoje.getFullYear()}`;
      case "trimestre":
        const trimestre = Math.floor(hoje.getMonth() / 3) + 1;
        return `${trimestre}º Trimestre de ${hoje.getFullYear()}`;
      case "ano":
        return `Ano de ${hoje.getFullYear()}`;
      case "customizado":
        if (filtrosLocais.dataInicio && filtrosLocais.dataFim) {
          return `${new Date(filtrosLocais.dataInicio).toLocaleDateString("pt-BR")} - ${new Date(filtrosLocais.dataFim).toLocaleDateString("pt-BR")}`;
        }
        return "Período Personalizado";
      default:
        return "Período selecionado";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com Título e Botões */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">DRE - Demonstrativo de Resultado</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <Filter className="h-4 w-4 mr-2" />
            {mostrarFiltros ? "Ocultar" : "Filtros"}
          </Button>
          <Button size="sm" onClick={atualizarSaldoContas} disabled={atualizandoSaldo}>
            <RefreshCw className={`h-4 w-4 mr-2 ${atualizandoSaldo ? "animate-spin" : ""}`} />
            Atualizar Saldo
          </Button>
        </div>
      </div>

      {/* Painel de Filtros */}
      {mostrarFiltros && (
        <Card>
          <CardHeader onClick={() => setMostrarFiltros(!mostrarFiltros)} className="cursor-pointer py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle className="text-lg">Filtros</CardTitle>
              </div>
              {mostrarFiltros ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Período */}
              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={filtrosLocais.periodo}
                  onValueChange={(value) => setFiltrosLocais({ ...filtrosLocais, periodo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Esta Semana</SelectItem>
                    <SelectItem value="mes">Este Mês</SelectItem>
                    <SelectItem value="trimestre">Este Trimestre</SelectItem>
                    <SelectItem value="ano">Este Ano</SelectItem>
                    <SelectItem value="customizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Datas Personalizadas */}
              {filtrosLocais.periodo === "customizado" && (
                <>
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={filtrosLocais.dataInicio}
                      onChange={(e) => setFiltrosLocais({ ...filtrosLocais, dataInicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={filtrosLocais.dataFim}
                      onChange={(e) => setFiltrosLocais({ ...filtrosLocais, dataFim: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Status Pagamento */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filtrosLocais.pago === null ? "todos" : filtrosLocais.pago ? "pago" : "nao-pago"}
                  onValueChange={(value) =>
                    setFiltrosLocais({
                      ...filtrosLocais,
                      pago: value === "todos" ? null : value === "pago",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="nao-pago">Não Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtro de Bancos */}
            {contas.length > 0 && (
              <div className="space-y-2">
                <Label>Filtrar por Banco</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                  {contas.map((conta) => (
                    <div key={conta.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`banco-${conta.id}`}
                        checked={filtrosLocais.bancosSelecionados.includes(conta.nome)}
                        onChange={(e) => {
                          const novosBancos = e.target.checked
                            ? [...filtrosLocais.bancosSelecionados, conta.nome]
                            : filtrosLocais.bancosSelecionados.filter((b) => b !== conta.nome);
                          setFiltrosLocais({ ...filtrosLocais, bancosSelecionados: novosBancos });
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`banco-${conta.id}`} className="text-xs cursor-pointer font-normal">
                        {conta.nome}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Receita Total */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(dre.receitaTotal)}
            </div>
          </CardContent>
        </Card>

        {/* Despesas Totais */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Despesas Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(dre.despesasTotal)}</div>
          </CardContent>
        </Card>

        {/* Lucro Operacional */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Lucro Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${dre.lucroOperacional >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(dre.lucroOperacional)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Margem: {dre.margemOperacional.toFixed(1)}%</p>
          </CardContent>
        </Card>

        {/* Lucro Líquido */}
        <Card className={`border-l-4 ${dre.lucroLiquido >= 0 ? "border-l-emerald-500" : "border-l-red-500"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className={`h-4 w-4 ${dre.lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"}`} />
              Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${dre.lucroLiquido >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(dre.lucroLiquido)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Margem: {dre.margemLiquida.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Detalhado */}
      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo de Resultado do Exercício</CardTitle>
          <CardDescription>{getPeriodoTexto()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* RECEITA OPERACIONAL BRUTA */}
            <DRERow titulo="(+) Receita Operacional Bruta" valor={dre.receitaOperacional} nivel={1} destaque />
            <DRERow titulo="Serviços" valor={dre.servicosReceita} nivel={2} />
            <DRERow titulo="Venda" valor={dre.vendaReceita} nivel={2} />
            <DRERow titulo="Outras Receitas Operacionais" valor={dre.outrasReceitasOp} nivel={2} />

            <Separator className="my-3" />

            {/* CUSTOS OPERACIONAIS */}
            <DRERow titulo="(-) Custos Operacionais" valor={dre.custosOperacionais} nivel={1} />
            <DRERow titulo="Produtos para Banho" valor={dre.produtosBanho} nivel={2} />
            <DRERow titulo="Material de Limpeza" valor={dre.materialLimpeza} nivel={2} />

            <Separator className="my-3" />

            {/* LUCRO BRUTO */}
            <DRERow
              titulo="(=) Lucro Bruto"
              valor={dre.lucroBruto}
              nivel={1}
              destaque
              cor={dre.lucroBruto >= 0 ? "green" : "red"}
            />
            <DRERow titulo="    Margem Bruta" valor={`${dre.margemBruta.toFixed(2)}%`} nivel={3} />

            <div className="pt-4" />

            {/* DESPESAS OPERACIONAIS */}
            <DRERow titulo="(-) Despesas Operacionais" valor={dre.despesasOperacionais} nivel={1} />
            <DRERow titulo="Contador" valor={dre.contador} nivel={2} />
            <DRERow titulo="Freelancer" valor={dre.freelancer} nivel={2} />
            <DRERow titulo="Telefonia e Internet" valor={dre.telefonia} nivel={2} />
            <DRERow titulo="Energia Elétrica" valor={dre.energia} nivel={2} />
            <DRERow titulo="Água e Esgoto" valor={dre.agua} nivel={2} />
            <DRERow titulo="Publicidade e Marketing" valor={dre.marketing} nivel={2} />
            <DRERow titulo="Outras Despesas Operacionais" valor={dre.outrasDespOp} nivel={2} />

            <Separator className="my-3" />

            {/* DESPESAS FIXAS */}
            <DRERow titulo="(-) Despesas Fixas" valor={dre.despesasFixas} nivel={1} />
            <DRERow titulo="Aluguel" valor={dre.aluguel} nivel={2} />
            <DRERow titulo="Salários" valor={dre.salarios} nivel={2} />
            <DRERow titulo="Impostos Fixos" valor={dre.impostos} nivel={2} />
            <DRERow titulo="Outras Despesas Fixas" valor={dre.outrasDespFixas} nivel={2} />

            <Separator className="my-3" />

            {/* LUCRO OPERACIONAL */}
            <DRERow
              titulo="(=) Lucro Operacional"
              valor={dre.lucroOperacional}
              nivel={1}
              destaque
              cor={dre.lucroOperacional >= 0 ? "green" : "red"}
            />
            <DRERow
              titulo="    Margem Operacional"
              valor={`${dre.margemOperacional.toFixed(2)}%`}
              nivel={3}
              cor={dre.margemOperacional >= 0 ? "green" : "red"}
            />

            <div className="pt-4" />

            {/* RESULTADO NÃO OPERACIONAL */}
            <DRERow
              titulo="(+/-) Resultado Não Operacional"
              valor={dre.resultadoNaoOperacional}
              nivel={1}
              cor={dre.resultadoNaoOperacional >= 0 ? "green" : "red"}
            />
            <DRERow titulo="(+) Receita Não Operacional" valor={dre.receitaNaoOperacional} nivel={2} />
            <DRERow titulo="(-) Despesa Não Operacional" valor={dre.despesaNaoOperacional} nivel={2} />

            <Separator className="my-3" />

            {/* LUCRO LÍQUIDO */}
            <DRERow
              titulo="(=) LUCRO LÍQUIDO DO EXERCÍCIO"
              valor={dre.lucroLiquido}
              nivel={1}
              destaque
              cor={dre.lucroLiquido >= 0 ? "green" : "red"}
            />
            <DRERow
              titulo="    Margem Líquida"
              valor={`${dre.margemLiquida.toFixed(2)}%`}
              nivel={3}
              cor={dre.margemLiquida >= 0 ? "green" : "red"}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

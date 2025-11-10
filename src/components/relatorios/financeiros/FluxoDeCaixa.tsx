import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  X,
  Check,
  ChevronsUpDown,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ExportButton } from "../shared/ExportButton";

// Interfaces
interface ItemLancamento {
  id: string;
  descricao2: string;
  produtoServico: string;
  valor: number;
}

interface LancamentoFluxo {
  id: string;
  ano: string;
  mesCompetencia: string;
  tipo: "Receita" | "Despesa";
  descricao1: string;
  nomeCliente: string;
  nomePet: string;
  pets: Pet[];
  itens: ItemLancamento[];
  valorTotal: number;
  dataPagamento: string;
  nomeBanco: string;
  pago: boolean;
  dataCadastro: string;
  valorDeducao: number;
  tipoDeducao: string;
}

interface Pet {
  id: string;
  clienteId: string;
  nomePet: string;
  raca: string;
  porte: string;
}

interface Cliente {
  id: string;
  nomeCliente: string;
}

interface ContaBancaria {
  id: string;
  nomeBanco: string;
  saldo: number;
}

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const categoriasDescricao1 = {
  Receita: ["Receita Operacional", "Receita Não Operacional"],
  Despesa: ["Despesa Fixa", "Despesa Variável", "Despesa Não Operacional"],
};

// Componente ComboboxField
interface ComboboxFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  id: string;
  disabled?: boolean;
}

const ComboboxField = ({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  id,
  disabled = false,
}: ComboboxFieldProps) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) {
      setOpen(false);
      return;
    }
    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-7 text-xs", disabled ? "opacity-50 cursor-not-allowed" : "")}
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="text-xs" />
          <CommandEmpty className="text-xs">Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={() => {
                  if (disabled) return;
                  onChange(option);
                  setOpen(false);
                }}
                className="text-xs"
              >
                <Check className={cn("mr-2 h-3 w-3", value === option ? "opacity-100" : "opacity-0")} />
                {option}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const FluxoDeCaixa = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFluxo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    mes: "",
    ano: "",
    nomePet: "",
    nomeCliente: "",
    tipo: "" as "Receita" | "Despesa" | "",
    descricao1: "",
    dataPagamento: "",
    nomeBanco: "",
    pago: null as boolean | null,
  });

  const [filtroDataAtivo, setFiltroDataAtivo] = useState<"periodo" | "mesano" | null>(null);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  // Estados para Atualizar Saldo
  const [dialogSaldoOpen, setDialogSaldoOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [novoSaldo, setNovoSaldo] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Load financial data from Supabase
  const loadLancamentos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select(
          `
          *,
          lancamentos_financeiros_itens (*)
        `,
        )
        .eq("user_id", user.id)
        .order("data_pagamento", { ascending: false });

      if (error) throw error;

      const lancamentosFormatados = (data || []).map((l: any) => ({
        id: l.id,
        ano: l.ano,
        mesCompetencia: l.mes_competencia,
        tipo: l.tipo as "Receita" | "Despesa",
        descricao1: l.descricao1,
        nomeCliente: "",
        nomePet: "",
        pets: [],
        itens: (l.lancamentos_financeiros_itens || []).map((i: any) => ({
          id: i.id,
          descricao2: i.descricao2,
          produtoServico: i.produto_servico || "",
          valor: Number(i.valor),
        })),
        valorTotal: Number(l.valor_total),
        dataPagamento: l.data_pagamento,
        nomeBanco: "",
        pago: l.pago,
        dataCadastro: l.data_cadastro || l.created_at,
        valorDeducao: Number(l.valor_deducao) || 0,
        tipoDeducao: l.tipo_deducao || "",
      }));

      // Map cliente_id and conta_id to names
      const clientesData = await supabase.from("clientes").select("*").eq("user_id", user.id);
      const petsData = await supabase.from("pets").select("*").eq("user_id", user.id);
      const contasData = await supabase.from("contas_bancarias").select("*").eq("user_id", user.id);

      if (clientesData.data && petsData.data && contasData.data) {
        const clientesMap = new Map(clientesData.data.map((c: any) => [c.id, c.nome_cliente]));
        const petsMapById = new Map(
          petsData.data.map((p: any) => [
            p.id,
            { nomePet: p.nome_pet, raca: p.raca, porte: p.porte, clienteId: p.cliente_id, id: p.id },
          ]),
        );
        const petsMap = new Map(petsData.data.map((p: any) => [p.cliente_id, p.nome_pet]));
        const contasMap = new Map(contasData.data.map((c: any) => [c.id, c.nome]));

        lancamentosFormatados.forEach((l: any) => {
          const lancOriginal = data?.find((lo: any) => lo.id === l.id);
          if (lancOriginal) {
            l.nomeCliente = clientesMap.get(lancOriginal.cliente_id) || "";
            l.nomePet = petsMap.get(lancOriginal.cliente_id) || "";
            l.nomeBanco = contasMap.get(lancOriginal.conta_id) || "";

            // Carregar array de pets a partir de pet_ids
            if (lancOriginal.pet_ids && Array.isArray(lancOriginal.pet_ids)) {
              l.pets = lancOriginal.pet_ids
                .map((petId: string) => petsMapById.get(petId))
                .filter((pet: any) => pet !== undefined);

              // Definir o primeiro pet como principal
              if (l.pets.length > 0) {
                l.nomePet = l.pets[0].nomePet;
              }
            } else {
              l.pets = [];
            }
          }
        });
      }

      setLancamentos(lancamentosFormatados);
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      toast.error("Erro ao carregar lançamentos");
    } finally {
      setLoading(false);
    }
  };

  // Load related data
  const loadRelatedData = async () => {
    if (!user) return;

    try {
      const [clientesRes, petsRes, contasRes] = await Promise.all([
        supabase.from("clientes").select("*").eq("user_id", user.id),
        supabase.from("pets").select("*").eq("user_id", user.id),
        supabase.from("contas_bancarias").select("*").eq("user_id", user.id),
      ]);

      if (clientesRes.data) {
        setClientes(
          clientesRes.data.map((c: any) => ({
            id: c.id,
            nomeCliente: c.nome_cliente,
          })),
        );
      }

      if (petsRes.data) {
        setPets(
          petsRes.data.map((p: any) => ({
            id: p.id,
            clienteId: p.cliente_id,
            nomePet: p.nome_pet,
            raca: p.raca || "",
            porte: p.porte || "",
          })),
        );
      }

      if (contasRes.data) {
        setContas(
          contasRes.data.map((c: any) => ({
            id: c.id,
            nomeBanco: c.nome,
            saldo: Number(c.saldo) || 0,
          })),
        );
      }
    } catch (error) {
      console.error("Erro ao carregar dados relacionados:", error);
    }
  };

  useEffect(() => {
    if (user) {
      loadLancamentos();
      loadRelatedData();
    }
  }, [user]);

  const aplicarFiltros = () => {
    setFiltrosAplicados(true);
    setMostrarFiltros(false);
    toast.success("Filtros aplicados!");
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: "",
      dataFim: "",
      mes: "",
      ano: "",
      nomePet: "",
      nomeCliente: "",
      tipo: "",
      descricao1: "",
      dataPagamento: "",
      nomeBanco: "",
      pago: null,
    });
    setFiltroDataAtivo(null);
    setFiltrosAplicados(false);
    toast.success("Filtros limpos!");
  };

  const lancamentosFiltrados = useMemo(() => {
    if (!filtrosAplicados) return lancamentos;

    let resultado = [...lancamentos];

    if (filtroDataAtivo === "periodo") {
      if (filtros.dataInicio || filtros.dataFim) {
        resultado = resultado.filter((l) => {
          if (!l.dataPagamento) return false;
          if (filtros.dataInicio && l.dataPagamento < filtros.dataInicio) return false;
          if (filtros.dataFim && l.dataPagamento > filtros.dataFim) return false;
          return true;
        });
      }
    } else if (filtroDataAtivo === "mesano") {
      if (filtros.mes || filtros.ano) {
        resultado = resultado.filter((l) => {
          if (filtros.mes && filtros.ano) {
            return l.mesCompetencia === filtros.mes && l.ano === filtros.ano;
          }
          if (filtros.mes) return l.mesCompetencia === filtros.mes;
          if (filtros.ano) return l.ano === filtros.ano;
          return true;
        });
      }
    }

    if (filtros.nomePet) {
      resultado = resultado.filter((l) => {
        // Buscar no pet principal
        if (l.nomePet === filtros.nomePet) return true;

        // Buscar nos pets adicionais
        if (l.pets && l.pets.length > 0) {
          return l.pets.some((p) => p.nomePet === filtros.nomePet);
        }

        return false;
      });
    }
    if (filtros.nomeCliente) {
      resultado = resultado.filter((l) => l.nomeCliente === filtros.nomeCliente);
    }
    if (filtros.tipo) {
      resultado = resultado.filter((l) => l.tipo === filtros.tipo);
    }
    if (filtros.descricao1) {
      resultado = resultado.filter((l) => l.descricao1 === filtros.descricao1);
    }
    if (filtros.dataPagamento) {
      resultado = resultado.filter((l) => l.dataPagamento === filtros.dataPagamento);
    }
    if (filtros.nomeBanco) {
      resultado = resultado.filter((l) => l.nomeBanco === filtros.nomeBanco);
    }
    if (filtros.pago !== null) {
      resultado = resultado.filter((l) => l.pago === filtros.pago);
    }

    return resultado;
  }, [lancamentos, filtros, filtroDataAtivo, filtrosAplicados]);

  const metricas = useMemo(() => {
    const dados = filtrosAplicados ? lancamentosFiltrados : lancamentos;

    const recebido = dados.filter((l) => l.tipo === "Receita" && l.pago);
    const aReceber = dados.filter((l) => l.tipo === "Receita" && !l.pago);
    const pago = dados.filter((l) => l.tipo === "Despesa" && l.pago);
    const aPagar = dados.filter((l) => l.tipo === "Despesa" && !l.pago);

    return {
      recebido: {
        valor: recebido.reduce((acc, l) => acc + l.valorTotal, 0),
        qtd: recebido.length,
      },
      aReceber: {
        valor: aReceber.reduce((acc, l) => acc + l.valorTotal, 0),
        qtd: aReceber.length,
      },
      pago: {
        valor: pago.reduce((acc, l) => acc + l.valorTotal, 0),
        qtd: pago.length,
      },
      aPagar: {
        valor: aPagar.reduce((acc, l) => acc + l.valorTotal, 0),
        qtd: aPagar.length,
      },
    };
  }, [lancamentos, lancamentosFiltrados, filtrosAplicados]);

  // Calcular saldos por banco
  const saldosPorBanco = useMemo(() => {
    return contas.map((conta) => {
      const lancamentosConta = lancamentos.filter((l) => l.nomeBanco === conta.nomeBanco && l.pago);
      const receitas = lancamentosConta.filter((l) => l.tipo === "Receita").reduce((acc, l) => acc + l.valorTotal, 0);
      const despesas = lancamentosConta.filter((l) => l.tipo === "Despesa").reduce((acc, l) => acc + l.valorTotal, 0);
      const saldoAtual = conta.saldo + receitas - despesas;

      return {
        nome: conta.nomeBanco,
        saldoInicial: conta.saldo,
        saldoAtual,
      };
    });
  }, [contas, lancamentos]);

  const saldoTotalAtual = useMemo(() => {
    return saldosPorBanco.reduce((acc, banco) => acc + banco.saldoAtual, 0);
  }, [saldosPorBanco]);

  // Filtros para pets e clientes
  const petsFiltro = useMemo(() => {
    if (!filtros.nomeCliente) {
      return [...new Set(pets.map((p) => p.nomePet))];
    }
    const clienteSelecionado = clientes.find((c) => c.nomeCliente === filtros.nomeCliente);
    if (!clienteSelecionado) return [];

    return pets.filter((p) => p.clienteId === clienteSelecionado.id).map((p) => p.nomePet);
  }, [filtros.nomeCliente, clientes, pets]);

  const clientesFiltro = useMemo(() => {
    if (!filtros.nomePet) {
      return [...new Set(clientes.map((c) => c.nomeCliente))];
    }
    const petSelecionado = pets.find((p) => p.nomePet === filtros.nomePet);
    if (!petSelecionado) return [];

    const clienteDonoPet = clientes.find((c) => c.id === petSelecionado.clienteId);
    return clienteDonoPet ? [clienteDonoPet.nomeCliente] : [];
  }, [filtros.nomePet, clientes, pets]);

  // Funções para Atualizar Saldo
  const abrirDialogoSaldo = () => {
    setContaSelecionada("");
    setNovoSaldo("");
    setDialogSaldoOpen(true);
  };

  const abrirConfirmacao = () => {
    if (!contaSelecionada || !novoSaldo) {
      toast.error("Preencha todos os campos!");
      return;
    }
    setDialogSaldoOpen(false);
    setConfirmDialogOpen(true);
  };

  const handleConfirmarAtualizacao = async () => {
    if (!user || !contaSelecionada || !novoSaldo) return;

    try {
      const conta = contas.find((c) => c.nomeBanco === contaSelecionada);
      if (!conta) {
        toast.error("Conta não encontrada!");
        return;
      }

      const saldoAtualConta =
        saldosPorBanco.find((s) => s.nome === contaSelecionada)?.saldoAtual || conta.saldo;
      const novoSaldoNumerico = parseFloat(novoSaldo);
      const diferenca = novoSaldoNumerico - saldoAtualConta;

      if (diferenca === 0) {
        toast.error("O novo saldo é igual ao saldo atual!");
        return;
      }

      const tipo = diferenca > 0 ? "Receita" : "Despesa";
      const valorAjuste = Math.abs(diferenca);

      const dataHoje = new Date().toISOString().split("T")[0];
      const anoAtual = new Date().getFullYear().toString();
      const mesAtual = String(new Date().getMonth() + 1).padStart(2, "0");

      // Criar lançamento de ajuste
      const { data: lancamentoData, error: lancamentoError } = await supabase
        .from("lancamentos_financeiros")
        .insert([
          {
            user_id: user.id,
            ano: anoAtual,
            mes_competencia: mesAtual,
            tipo,
            descricao1: tipo === "Receita" ? "Receita Não Operacional" : "Despesa Não Operacional",
            cliente_id: null,
            pet_ids: [],
            valor_total: valorAjuste,
            data_pagamento: dataHoje,
            conta_id: conta.id,
            pago: true,
            observacao: "Ajuste de saldo",
          },
        ])
        .select()
        .single();

      if (lancamentoError) throw lancamentoError;

      // Criar item do lançamento
      await supabase.from("lancamentos_financeiros_itens").insert([
        {
          lancamento_id: lancamentoData.id,
          descricao2:
            tipo === "Receita" ? "Outras Receitas Não Operacionais" : "Outras Despesas Não Operacionais",
          produto_servico: "Ajuste de saldo bancário",
          valor: valorAjuste,
        },
      ]);

      toast.success("Saldo atualizado com sucesso!");
      setConfirmDialogOpen(false);
      await loadLancamentos();
      await loadRelatedData();
    } catch (error) {
      console.error("Erro ao atualizar saldo:", error);
      toast.error("Erro ao atualizar saldo");
    }
  };

  // Dados para exportação
  const dadosExportacao = useMemo(() => {
    const dados = filtrosAplicados ? lancamentosFiltrados : lancamentos;
    return dados.map((l) => ({
      "Data do Pagamento": new Date(l.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR"),
      "Ano/Mês": `${l.ano}/${l.mesCompetencia}`,
      Tipo: l.tipo,
      Cliente: l.nomeCliente || "-",
      Pet: l.nomePet || "-",
      "Descrição 1": l.descricao1,
      "Descrições 2": l.itens.map((i) => i.descricao2).join(", "),
      Itens: l.itens.map((i) => `${i.produtoServico || i.descricao2} (${formatCurrency(i.valor)})`).join("; "),
      "Valor Total": formatCurrency(l.valorTotal),
      Banco: l.nomeBanco,
      Status: l.pago ? "Pago" : "Pendente",
    }));
  }, [lancamentos, lancamentosFiltrados, filtrosAplicados]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="h-8 text-xs gap-2"
          >
            <Filter className="h-3 w-3" />
            {mostrarFiltros ? "Ocultar" : "Mostrar"} Filtros
          </Button>

          {/* Botão Atualizar Saldo */}
          <Dialog open={dialogSaldoOpen} onOpenChange={setDialogSaldoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={abrirDialogoSaldo} className="h-8 text-xs gap-2">
                <RefreshCw className="h-3 w-3" />
                Atualizar Saldo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atualizar Saldo Bancário</DialogTitle>
                <DialogDescription>
                  Atualize o saldo de uma conta bancária. Um lançamento de ajuste será criado automaticamente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((conta) => (
                        <SelectItem key={conta.id} value={conta.nomeBanco}>
                          {conta.nomeBanco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {contaSelecionada && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Saldo Atual</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        saldosPorBanco.find((s) => s.nome === contaSelecionada)?.saldoAtual ||
                          contas.find((c) => c.nomeBanco === contaSelecionada)?.saldo ||
                          0,
                      )}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Novo Saldo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Digite o novo saldo"
                    value={novoSaldo}
                    onChange={(e) => setNovoSaldo(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogSaldoOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={abrirConfirmacao}>Atualizar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <ExportButton
            data={dadosExportacao}
            filename="fluxo-de-caixa"
            columns={[
              { key: "Data do Pagamento", label: "Data do Pagamento" },
              { key: "Ano/Mês", label: "Ano/Mês" },
              { key: "Tipo", label: "Tipo" },
              { key: "Cliente", label: "Cliente" },
              { key: "Pet", label: "Pet" },
              { key: "Descrição 1", label: "Descrição 1" },
              { key: "Descrições 2", label: "Descrições 2" },
              { key: "Itens", label: "Itens" },
              { key: "Valor Total", label: "Valor Total" },
              { key: "Banco", label: "Banco" },
              { key: "Status", label: "Status" },
            ]}
          />
        </div>
      </div>

      {/* Dashboard Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="py-1 pb-0">
            <CardTitle className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Recebido
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-lg font-bold text-green-700 dark:text-green-400">
              {formatCurrency(metricas.recebido.valor)}
            </div>
            <p className="text-[10px] text-green-600 dark:text-green-500">Qtd: {metricas.recebido.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
          <CardHeader className="py-1 pb-0">
            <CardTitle className="text-xs font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />A Receber
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
              {formatCurrency(metricas.aReceber.valor)}
            </div>
            <p className="text-[10px] text-yellow-600 dark:text-yellow-500">Qtd: {metricas.aReceber.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <CardHeader className="py-1 pb-0">
            <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(metricas.pago.valor)}
            </div>
            <p className="text-[10px] text-blue-600 dark:text-blue-500">Qtd: {metricas.pago.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="py-1 pb-0">
            <CardTitle className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />A Pagar
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-lg font-bold text-red-700 dark:text-red-400">
              {formatCurrency(metricas.aPagar.valor)}
            </div>
            <p className="text-[10px] text-red-600 dark:text-red-500">Qtd: {metricas.aPagar.qtd}</p>
          </CardContent>
        </Card>
      </div>

      {/* Saldos por Banco */}
      {saldosPorBanco.length > 0 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/30">
          <CardHeader className="py-2">
            <CardTitle className="text-sm text-purple-700 dark:text-purple-400">Saldos por Banco</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {saldosPorBanco.map((banco) => (
                <div key={banco.nome} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-purple-700 dark:text-purple-400">{banco.nome}:</span>
                  <span className="font-bold text-purple-900 dark:text-purple-300">
                    {formatCurrency(banco.saldoAtual)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold border-t pt-2 mt-2">
                <span className="text-purple-800 dark:text-purple-300">Saldo Total:</span>
                <span className="text-purple-900 dark:text-purple-200">{formatCurrency(saldoTotalAtual)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros (Colapsável) */}
      {mostrarFiltros && (
        <Card>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Filtros
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setMostrarFiltros(false)} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Filtros de Data */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Filtros de Data</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Período da Data do Pagamento</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Input
                      type="date"
                      value={filtros.dataInicio}
                      onChange={(e) => {
                        setFiltros({ ...filtros, dataInicio: e.target.value, mes: "", ano: "" });
                        setFiltroDataAtivo("periodo");
                      }}
                      disabled={filtroDataAtivo === "mesano"}
                      className="h-7 text-xs"
                      placeholder="De"
                    />
                    <Input
                      type="date"
                      value={filtros.dataFim}
                      onChange={(e) => {
                        setFiltros({ ...filtros, dataFim: e.target.value, mes: "", ano: "" });
                        setFiltroDataAtivo("periodo");
                      }}
                      disabled={filtroDataAtivo === "mesano"}
                      className="h-7 text-xs"
                      placeholder="Até"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Mês da Competência</Label>
                  <Select
                    value={filtros.mes}
                    onValueChange={(value) => {
                      setFiltros({ ...filtros, mes: value, dataInicio: "", dataFim: "" });
                      setFiltroDataAtivo("mesano");
                    }}
                    disabled={filtroDataAtivo === "periodo"}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value} className="text-xs">
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Ano</Label>
                  <Select
                    value={filtros.ano}
                    onValueChange={(value) => {
                      setFiltros({ ...filtros, ano: value, dataInicio: "", dataFim: "" });
                      setFiltroDataAtivo("mesano");
                    }}
                    disabled={filtroDataAtivo === "periodo"}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => 2025 + i).map((ano) => (
                        <SelectItem key={ano} value={ano.toString()} className="text-xs">
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Filtros de Categoria */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Filtros de Categoria</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Nome do Pet</Label>
                  <ComboboxField
                    value={filtros.nomePet}
                    onChange={(value) => setFiltros({ ...filtros, nomePet: value })}
                    options={petsFiltro}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar pet..."
                    id="filtro-pet"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Nome do Cliente</Label>
                  <ComboboxField
                    value={filtros.nomeCliente}
                    onChange={(value) => setFiltros({ ...filtros, nomeCliente: value })}
                    options={clientesFiltro}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar cliente..."
                    id="filtro-cliente"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Tipo</Label>
                  <Select value={filtros.tipo} onValueChange={(value: any) => setFiltros({ ...filtros, tipo: value })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita" className="text-xs">
                        Receita
                      </SelectItem>
                      <SelectItem value="Despesa" className="text-xs">
                        Despesa
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Descrição 1</Label>
                  <Select
                    value={filtros.descricao1}
                    onValueChange={(value) => setFiltros({ ...filtros, descricao1: value })}
                    disabled={!filtros.tipo}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder={filtros.tipo ? "Selecione" : "Selecione tipo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filtros.tipo &&
                        categoriasDescricao1[filtros.tipo].map((desc) => (
                          <SelectItem key={desc} value={desc} className="text-xs">
                            {desc}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={filtros.dataPagamento}
                    onChange={(e) => setFiltros({ ...filtros, dataPagamento: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Banco</Label>
                  <Select value={filtros.nomeBanco} onValueChange={(value) => setFiltros({ ...filtros, nomeBanco: value })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((c) => (
                        <SelectItem key={c.id} value={c.nomeBanco} className="text-xs">
                          {c.nomeBanco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Foi Pago</Label>
                  <Select
                    value={filtros.pago === null ? "" : filtros.pago ? "sim" : "nao"}
                    onValueChange={(value) =>
                      setFiltros({ ...filtros, pago: value === "sim" ? true : value === "nao" ? false : null })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim" className="text-xs">
                        Sim
                      </SelectItem>
                      <SelectItem value="nao" className="text-xs">
                        Não
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={limparFiltros} className="h-7 text-xs gap-2">
                <X className="h-3 w-3" />
                Limpar Filtros
              </Button>
              <Button onClick={aplicarFiltros} className="h-7 text-xs gap-2">
                <Filter className="h-3 w-3" />
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Lançamentos */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Lançamentos Financeiros</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold text-xs">Data do Pagamento</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Ano/Mês</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Tipo</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Cliente</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Pet</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Descrição 1</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Descrição 2</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Itens</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Valor Total</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Banco</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum lançamento cadastrado
                    </td>
                  </tr>
                ) : (
                  lancamentosFiltrados.map((lancamento) => (
                    <tr key={lancamento.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-2 text-xs">
                        {new Date(lancamento.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {lancamento.ano}/{lancamento.mesCompetencia}
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          variant={lancamento.tipo === "Receita" ? "default" : "destructive"}
                          className="text-[10px] h-5"
                        >
                          {lancamento.tipo}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs">{lancamento.nomeCliente || "-"}</td>
                      <td className="py-2 px-2 text-xs">
                        {lancamento.nomePet || "-"}
                        {lancamento.pets.length > 1 && (
                          <Badge variant="outline" className="ml-1 text-[9px] h-4">
                            +{lancamento.pets.length - 1}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs">{lancamento.descricao1}</td>
                      <td className="py-2 px-2 text-xs">
                        {lancamento.itens.map((i) => i.descricao2).join(", ")}
                      </td>
                      <td className="py-2 px-2 text-xs">
                        <div className="max-w-[200px] truncate">
                          {lancamento.itens
                            .map((i) => `${i.produtoServico || i.descricao2} (${formatCurrency(i.valor)})`)
                            .join("; ")}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-xs font-semibold">{formatCurrency(lancamento.valorTotal)}</td>
                      <td className="py-2 px-2 text-xs">{lancamento.nomeBanco}</td>
                      <td className="py-2 px-2">
                        <Badge variant={lancamento.pago ? "default" : "secondary"} className="text-[10px] h-5">
                          {lancamento.pago ? "Pago" : "Pendente"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Atualização de Saldo</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a atualizar o saldo da conta <strong>{contaSelecionada}</strong> para{" "}
              <strong>{formatCurrency(parseFloat(novoSaldo) || 0)}</strong>.<br />
              <br />
              Um lançamento de ajuste será criado automaticamente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarAtualizacao}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FluxoDeCaixa;

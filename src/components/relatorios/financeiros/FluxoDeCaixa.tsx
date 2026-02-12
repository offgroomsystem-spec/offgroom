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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  X,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Edit2,
  Trash2,
  Plus,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
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

interface Fornecedor {
  id: string;
  nome_fornecedor: string;
  cnpj_cpf: string;
  nome_fantasia: string | null;
}

interface LancamentoFluxo {
  id: string;
  ano: string;
  mesCompetencia: string;
  tipo: "Receita" | "Despesa";
  descricao1: string;
  nomeFornecedor: string;
  fornecedorId: string;
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

interface Servico {
  id: string;
  nome: string;
  valor: number;
}

interface Pacote {
  id: string;
  nome: string;
  valorFinal: number;
}

interface Produto {
  id: string;
  descricao: string;
  valorVenda: number;
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
  Despesa: ["Despesa Fixa", "Despesa Operacional", "Despesa Não Operacional"],
};

const categoriasDescricao2: { [key: string]: string[] } = {
  "Receita Operacional": ["Serviços", "Venda", "Outras Receitas Operacionais"],
  "Receita Não Operacional": ["Venda de Ativo", "Outras Receitas Não Operacionais"],
  "Despesa Fixa": ["Aluguel", "Salários", "Impostos Fixos", "Financiamentos", "Outras Despesas Fixas"],
  "Despesa Operacional": [
    "Combustível",
    "Contador",
    "Freelancer",
    "Telefonia e internet",
    "Energia elétrica",
    "Água e esgoto",
    "Publicidade e marketing",
    "Produtos para Banho",
    "Material de Limpeza",
    "Outras Despesas Operacionais",
  ],
  "Despesa Não Operacional": [
    "Manutenção",
    "Reparos",
    "Retirada Caixa",
    "Retirada Sócio",
    "Outras Despesas Não Operacionais",
  ],
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

// Componente ItemLancamentoForm
interface ItemLancamentoFormProps {
  item: ItemLancamento;
  index: number;
  formData: any;
  servicos: Servico[];
  pacotes: Pacote[];
  produtos: Produto[];
  onChange: (item: ItemLancamento) => void;
  onRemove: () => void;
  canRemove: boolean;
  onAdd?: () => void;
  isLast?: boolean;
  canAdd?: boolean;
}

const ItemLancamentoForm = ({
  item,
  index,
  formData,
  servicos,
  pacotes,
  produtos,
  onChange,
  onRemove,
  canRemove,
  onAdd,
  isLast,
  canAdd,
}: ItemLancamentoFormProps) => {
  const opcoesDescricao2 = formData.descricao1 ? categoriasDescricao2[formData.descricao1] || [] : [];

  const isServicos = item.descricao2 === "Serviços";
  const isVenda = item.descricao2 === "Venda";
  const isObrigatorio = isServicos || isVenda;

  const opcoesProdutoServico = useMemo(() => {
    if (isServicos) {
      return [
        ...servicos.map((s) => ({ nome: s.nome, valor: s.valor })),
        ...pacotes.map((p) => ({ nome: p.nome, valor: p.valorFinal })),
      ];
    } else if (isVenda) {
      return produtos.map((p) => ({ nome: p.descricao, valor: p.valorVenda }));
    }
    return [];
  }, [isServicos, isVenda, servicos, pacotes, produtos]);

  const handleProdutoServicoChange = (nomeSelecionado: string) => {
    const itemSelecionado = opcoesProdutoServico.find((o) => o.nome === nomeSelecionado);

    onChange({
      ...item,
      produtoServico: nomeSelecionado,
      valor: itemSelecionado ? itemSelecionado.valor : item.valor,
    });
  };

  return (
    <div className="grid grid-cols-12 gap-2 p-2 border rounded bg-background relative">
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <div className="col-span-4 space-y-0.5">
        <Label className="text-[10px] font-semibold">Descrição 2 *</Label>
        <Select
          value={item.descricao2}
          onValueChange={(value) => onChange({ ...item, descricao2: value, produtoServico: "", valor: 0 })}
          disabled={!formData.descricao1}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={formData.descricao1 ? "Selecione" : "Selecione Desc1"} />
          </SelectTrigger>
          <SelectContent>
            {opcoesDescricao2.map((desc) => (
              <SelectItem key={desc} value={desc} className="text-xs">
                {desc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-5 space-y-0.5">
        <Label className="text-[10px] font-semibold">
          {isServicos ? "Serviço" : isVenda ? "Produto" : "Observação"}
          {isObrigatorio && " *"}
        </Label>

        {isObrigatorio ? (
          <ComboboxField
            value={item.produtoServico}
            onChange={handleProdutoServicoChange}
            options={opcoesProdutoServico.map((o) => o.nome)}
            placeholder={`Selecione ${isServicos ? "serviço" : "produto"}`}
            searchPlaceholder={`Buscar ${isServicos ? "serviço" : "produto"}...`}
            id={`item-produto-${item.id}`}
          />
        ) : (
          <Input
            value={item.produtoServico}
            onChange={(e) => onChange({ ...item, produtoServico: e.target.value })}
            placeholder="Observação"
            className="h-7 text-xs"
          />
        )}
      </div>

      <div className="col-span-3 space-y-0.5">
        <div className="flex items-end justify-between gap-1">
          <div className="flex-1">
            <Label className="text-[10px] font-semibold">Valor *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.valor}
              onChange={(e) => onChange({ ...item, valor: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
            />
          </div>
          {isLast && canAdd && onAdd && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="h-7 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10"
              title="Adicionar novo item"
            >
              + Item
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const FluxoDeCaixa = () => {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFluxo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorSearch, setFornecedorSearch] = useState("");

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
  const [dataAjusteSaldo, setDataAjusteSaldo] = useState<Date>(new Date());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Estados para Edição e Exclusão
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoFluxo | null>(null);
  const [formData, setFormData] = useState({
    ano: new Date().getFullYear().toString(),
    mesCompetencia: String(new Date().getMonth() + 1).padStart(2, "0"),
    tipo: "" as "Receita" | "Despesa" | "",
    descricao1: "",
    nomeCliente: "",
    nomePet: "",
    petsSelecionados: [] as Pet[],
    dataPagamento: "",
    nomeBanco: "",
    pago: false,
    valorDeducao: 0,
    tipoDeducao: "",
    fornecedorId: "",
  });
  const [itensLancamento, setItensLancamento] = useState<ItemLancamento[]>([
    { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 },
  ]);

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
        nomeFornecedor: "",
        fornecedorId: l.fornecedor_id || "",
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
      const clientesData = await supabase.from("clientes").select("*").eq("user_id", ownerId);
      const petsData = await supabase.from("pets").select("*").eq("user_id", ownerId);
      const contasData = await supabase.from("contas_bancarias").select("*").eq("user_id", ownerId);
      const fornecedoresData = await supabase.from("fornecedores").select("id, nome_fornecedor").eq("user_id", ownerId);

      if (clientesData.data && petsData.data && contasData.data) {
        const clientesMap = new Map(clientesData.data.map((c: any) => [c.id, c.nome_cliente]));
        const fornecedoresMap = new Map((fornecedoresData.data || []).map((f: any) => [f.id, f.nome_fornecedor]));
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
            l.nomeFornecedor = fornecedoresMap.get(lancOriginal.fornecedor_id) || "";
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
      const [clientesRes, petsRes, contasRes, servicosRes, pacotesRes, produtosRes, fornecedoresRes] = await Promise.all([
        supabase.from("clientes").select("*").eq("user_id", ownerId),
        supabase.from("pets").select("*").eq("user_id", ownerId),
        supabase.from("contas_bancarias").select("*").eq("user_id", ownerId),
        supabase.from("servicos").select("*").eq("user_id", ownerId),
        supabase.from("pacotes").select("*").eq("user_id", ownerId),
        supabase.from("produtos").select("*").eq("user_id", ownerId),
        supabase.from("fornecedores").select("id, nome_fornecedor, cnpj_cpf, nome_fantasia").eq("user_id", ownerId),
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

      if (servicosRes.data) {
        setServicos(
          servicosRes.data.map((s: any) => ({
            id: s.id,
            nome: s.nome,
            valor: Number(s.valor),
          })),
        );
      }

      if (pacotesRes.data) {
        setPacotes(
          pacotesRes.data.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            valorFinal: Number(p.valor_final),
          })),
        );
      }

      if (produtosRes.data) {
        setProdutos(
          produtosRes.data.map((p: any) => ({
            id: p.id,
            descricao: p.nome,
            valorVenda: Number(p.valor),
          })),
        );
      }

      if (fornecedoresRes.data) {
        setFornecedores(
          fornecedoresRes.data.map((f: any) => ({
            id: f.id,
            nome_fornecedor: f.nome_fornecedor,
            cnpj_cpf: f.cnpj_cpf,
            nome_fantasia: f.nome_fantasia,
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

  const fornecedoresFiltrados = useMemo(() => {
    if (!fornecedorSearch) return fornecedores;
    const search = fornecedorSearch.toLowerCase();
    return fornecedores.filter(
      (f) =>
        f.nome_fornecedor.toLowerCase().includes(search) ||
        f.cnpj_cpf.toLowerCase().includes(search) ||
        (f.nome_fantasia || "").toLowerCase().includes(search),
    );
  }, [fornecedorSearch, fornecedores]);

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
      const saldoAtual = receitas - despesas;

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

  // Detectar período filtrado ativo
  const periodoFiltrado = useMemo(() => {
    if (!filtrosAplicados || !filtroDataAtivo) return null;

    if (filtroDataAtivo === "periodo") {
      if (!filtros.dataInicio && !filtros.dataFim) return null;
      return {
        inicio: filtros.dataInicio || "0000-01-01",
        fim: filtros.dataFim || "9999-12-31",
      };
    }

    if (filtroDataAtivo === "mesano") {
      if (!filtros.mes && !filtros.ano) return null;
      const ano = filtros.ano || new Date().getFullYear().toString();
      const mes = filtros.mes || "01";
      const inicioMes = `${ano}-${mes}-01`;
      const lastDay = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      const fimMes = `${ano}-${mes}-${String(lastDay).padStart(2, "0")}`;
      return { inicio: inicioMes, fim: fimMes };
    }

    return null;
  }, [filtrosAplicados, filtroDataAtivo, filtros.dataInicio, filtros.dataFim, filtros.mes, filtros.ano]);

  // Calcular Saldo Inicial e Saldo Final por banco (apenas quando filtro de data ativo)
  const saldosPeriodo = useMemo(() => {
    if (!periodoFiltrado) return null;

    const porBanco = contas.map((conta) => {
      const lancamentosConta = lancamentos.filter((l) => l.nomeBanco === conta.nomeBanco && l.pago);

      // Saldo Inicial: tudo ANTES do período
      const receitasAntes = lancamentosConta
        .filter((l) => l.tipo === "Receita" && l.dataPagamento < periodoFiltrado.inicio)
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const despesasAntes = lancamentosConta
        .filter((l) => l.tipo === "Despesa" && l.dataPagamento < periodoFiltrado.inicio)
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const saldoInicial = receitasAntes - despesasAntes;

      // Movimentação dentro do período
      const receitasPeriodo = lancamentosConta
        .filter((l) => l.tipo === "Receita" && l.dataPagamento >= periodoFiltrado.inicio && l.dataPagamento <= periodoFiltrado.fim)
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const despesasPeriodo = lancamentosConta
        .filter((l) => l.tipo === "Despesa" && l.dataPagamento >= periodoFiltrado.inicio && l.dataPagamento <= periodoFiltrado.fim)
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const saldoFinal = saldoInicial + receitasPeriodo - despesasPeriodo;

      return { nome: conta.nomeBanco, saldoInicial, saldoFinal };
    });

    const saldoInicialTotal = porBanco.reduce((acc, b) => acc + b.saldoInicial, 0);
    const saldoFinalTotal = porBanco.reduce((acc, b) => acc + b.saldoFinal, 0);

    return { porBanco, saldoInicialTotal, saldoFinalTotal };
  }, [periodoFiltrado, contas, lancamentos]);

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

  // Filtros para formulário
  const clientesFormulario = useMemo(() => {
    return clientes.map((c) => c.nomeCliente);
  }, [clientes]);

  const petsFormulario = useMemo(() => {
    if (!formData.nomeCliente) {
      return pets.map((p) => p.nomePet);
    }
    const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
    if (!clienteSelecionado) return [];

    return pets.filter((p) => p.clienteId === clienteSelecionado.id).map((p) => p.nomePet);
  }, [formData.nomeCliente, clientes, pets]);

  // Funções para Atualizar Saldo
  const abrirDialogoSaldo = () => {
    setContaSelecionada("");
    setNovoSaldo("");
    setDataAjusteSaldo(new Date());
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

  // Funções de Edição e Exclusão
  const resetForm = () => {
    setFormData({
      ano: new Date().getFullYear().toString(),
      mesCompetencia: String(new Date().getMonth() + 1).padStart(2, "0"),
      tipo: "",
      descricao1: "",
      nomeCliente: "",
      nomePet: "",
      petsSelecionados: [],
      dataPagamento: "",
      nomeBanco: "",
      pago: false,
      valorDeducao: 0,
      tipoDeducao: "",
      fornecedorId: "",
    });
    setItensLancamento([{ id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 }]);
    setIsEditDialogOpen(false);
    setFornecedorSearch("");
  };

  const abrirEdicao = (lancamento: LancamentoFluxo) => {
    setLancamentoSelecionado(lancamento);

    const petPrincipal = lancamento.pets && lancamento.pets.length > 0 ? lancamento.pets[0] : null;
    const petsAdicionais = lancamento.pets && lancamento.pets.length > 1 ? lancamento.pets.slice(1) : [];

    setFormData({
      ano: lancamento.ano,
      mesCompetencia: lancamento.mesCompetencia,
      tipo: lancamento.tipo,
      descricao1: lancamento.descricao1,
      nomeCliente: lancamento.nomeCliente,
      nomePet: petPrincipal ? petPrincipal.nomePet : lancamento.nomePet,
      petsSelecionados: petsAdicionais,
      dataPagamento: lancamento.dataPagamento,
      nomeBanco: lancamento.nomeBanco,
      pago: lancamento.pago,
      valorDeducao: lancamento.valorDeducao || 0,
      tipoDeducao: lancamento.tipoDeducao || "",
      fornecedorId: lancamento.fornecedorId || "",
    });
    setItensLancamento(lancamento.itens);
    setFornecedorSearch("");
    setIsEditDialogOpen(true);
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lancamentoSelecionado || !user) return;

    if (!formData.ano || !formData.mesCompetencia || !formData.tipo || !formData.descricao1) {
      toast.error("Favor preencher todos os campos obrigatórios!");
      return;
    }

    for (let i = 0; i < itensLancamento.length; i++) {
      const item = itensLancamento[i];
      if (!item.descricao2 || item.valor <= 0) {
        toast.error(`Item ${i + 1}: Favor preencher todos os campos!`);
        return;
      }
    }

    const valorTotal = itensLancamento.reduce((acc, item) => acc + item.valor, 0) - (formData.valorDeducao || 0);

    try {
      let clienteId = null;

      const clientePetObrigatorios = itensLancamento.some(
        (item) => item.descricao2 === "Serviços" || item.descricao2 === "Venda",
      );

      if (clientePetObrigatorios) {
        const cliente = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
        const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente?.id);

        if (!pet || !cliente) {
          toast.error("Cliente/Pet não encontrado ou não correspondem!");
          return;
        }

        clienteId = cliente.id;
      }

      const conta = contas.find((c) => c.nomeBanco === formData.nomeBanco);
      if (!conta) {
        toast.error("Conta bancária não encontrada!");
        return;
      }

      const cliente = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
      const petPrincipal = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente?.id);
      const petIds = petPrincipal ? [petPrincipal.id, ...formData.petsSelecionados.map((p) => p.id)] : [];

      await supabase
        .from("lancamentos_financeiros")
        .update({
          ano: formData.ano,
          mes_competencia: formData.mesCompetencia,
          tipo: formData.tipo,
          descricao1: formData.descricao1,
          cliente_id: clienteId,
          pet_ids: petIds,
          valor_total: valorTotal,
          data_pagamento: formData.dataPagamento,
          conta_id: conta.id,
          pago: formData.pago,
          valor_deducao: formData.valorDeducao || 0,
          tipo_deducao: formData.tipoDeducao || null,
          fornecedor_id: formData.tipo === "Despesa" && formData.fornecedorId ? formData.fornecedorId : null,
        })
        .eq("id", lancamentoSelecionado.id);

      await supabase.from("lancamentos_financeiros_itens").delete().eq("lancamento_id", lancamentoSelecionado.id);
      await supabase.from("lancamentos_financeiros_itens").insert(
        itensLancamento.map((item) => ({
          lancamento_id: lancamentoSelecionado.id,
          descricao2: item.descricao2,
          produto_servico: item.produtoServico,
          valor: item.valor,
        })),
      );

      toast.success("Lançamento atualizado com sucesso!");
      await loadLancamentos();
      resetForm();
      setLancamentoSelecionado(null);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar lançamento");
    }
  };

  const handleExcluir = async () => {
    if (!lancamentoSelecionado || !user) return;
    try {
      await supabase.from("lancamentos_financeiros").delete().eq("id", lancamentoSelecionado.id);
      toast.success("Lançamento excluído com sucesso!");
      await loadLancamentos();
      setIsDeleteDialogOpen(false);
      setLancamentoSelecionado(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir lançamento");
    }
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

      const dataAjuste = format(dataAjusteSaldo, "yyyy-MM-dd");
      const anoAtual = dataAjusteSaldo.getFullYear().toString();
      const mesAtual = String(dataAjusteSaldo.getMonth() + 1).padStart(2, "0");

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
            data_pagamento: dataAjuste,
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
      Fornecedor: l.nomeFornecedor || "-",
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

                <div className="space-y-2">
                  <Label>Data de Referência</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataAjusteSaldo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataAjusteSaldo ? format(dataAjusteSaldo, "dd/MM/yyyy") : <span>Selecione a data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataAjusteSaldo}
                        onSelect={(date) => date && setDataAjusteSaldo(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
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
              {/* Saldo Inicial e Final do Período - só aparece com filtro de data */}
              {saldosPeriodo && periodoFiltrado && (
                <>
                  {/* Saldo Inicial do Período */}
                  <div className="pb-2 border-b border-purple-200 dark:border-purple-700">
                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-1">
                      Saldo Inicial do Período ({periodoFiltrado.inicio.split("-").reverse().join("/")}):
                    </p>
                    {saldosPeriodo.porBanco.map((banco) => (
                      <div key={`ini-${banco.nome}`} className="flex items-center justify-between text-xs pl-2">
                        <span className="text-purple-600 dark:text-purple-400">{banco.nome}:</span>
                        <span className={cn("font-bold", banco.saldoInicial >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {formatCurrency(banco.saldoInicial)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs font-bold pl-2 mt-1">
                      <span className="text-purple-700 dark:text-purple-300">Saldo Inicial Total:</span>
                      <span className={cn(saldosPeriodo.saldoInicialTotal >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {formatCurrency(saldosPeriodo.saldoInicialTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Saldo Final do Período */}
                  <div className="pb-2 border-b border-purple-200 dark:border-purple-700">
                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-1">
                      Saldo Final do Período ({periodoFiltrado.fim.split("-").reverse().join("/")}):
                    </p>
                    {saldosPeriodo.porBanco.map((banco) => (
                      <div key={`fim-${banco.nome}`} className="flex items-center justify-between text-xs pl-2">
                        <span className="text-purple-600 dark:text-purple-400">{banco.nome}:</span>
                        <span className={cn("font-bold", banco.saldoFinal >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {formatCurrency(banco.saldoFinal)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs font-bold pl-2 mt-1">
                      <span className="text-purple-700 dark:text-purple-300">Saldo Final Total:</span>
                      <span className={cn(saldosPeriodo.saldoFinalTotal >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {formatCurrency(saldosPeriodo.saldoFinalTotal)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Saldo Atual (sempre visível) */}
              {saldosPeriodo && periodoFiltrado && (
                <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">Saldo Atual:</p>
              )}
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
                  <th className="text-left py-2 px-1 font-semibold text-xs">Data Pgto</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Ano/Mês</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Tipo</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Fornecedor</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Cliente</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Pet</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Descrição 1</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Descrição 2</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Itens</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Valor Total</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Banco</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Status</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum lançamento cadastrado
                    </td>
                  </tr>
                ) : (
                  lancamentosFiltrados.map((lancamento) => (
                    <tr key={lancamento.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-1 text-xs">
                        {new Date(lancamento.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 px-1 text-xs">
                        {lancamento.ano}/{lancamento.mesCompetencia}
                      </td>
                      <td className="py-2 px-1">
                        <Badge
                          variant={lancamento.tipo === "Receita" ? "default" : "destructive"}
                          className="text-[10px] h-5"
                        >
                          {lancamento.tipo}
                        </Badge>
                      </td>
                      <td className="py-2 px-1 text-xs">
                        <div className="max-w-[100px] truncate" title={lancamento.nomeFornecedor || "-"}>
                          {lancamento.nomeFornecedor || "-"}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-xs">{lancamento.nomeCliente || "-"}</td>
                      <td className="py-2 px-1 text-xs">
                        {lancamento.nomePet || "-"}
                        {lancamento.pets.length > 1 && (
                          <Badge variant="outline" className="ml-1 text-[9px] h-4">
                            +{lancamento.pets.length - 1}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-1 text-xs">{lancamento.descricao1}</td>
                      <td className="py-2 px-1 text-xs">
                        {lancamento.itens.map((i) => i.descricao2).join(", ")}
                      </td>
                      <td className="py-2 px-1 text-xs">
                        <div className="max-w-[150px] truncate">
                          {lancamento.itens
                            .map((i) => `${i.produtoServico || i.descricao2} (${formatCurrency(i.valor)})`)
                            .join("; ")}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-xs font-semibold">{formatCurrency(lancamento.valorTotal)}</td>
                      <td className="py-2 px-1 text-xs">{lancamento.nomeBanco}</td>
                      <td className="py-2 px-1">
                        <Badge variant={lancamento.pago ? "default" : "secondary"} className="text-[10px] h-5">
                          {lancamento.pago ? "Pago" : "Pendente"}
                        </Badge>
                      </td>
                      <td className="py-2 px-1">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirEdicao(lancamento)}
                            className="h-6 w-6 p-0"
                            title="Editar Lançamento"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setLancamentoSelecionado(lancamento);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="h-6 w-6 p-0"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Lançamento</DialogTitle>
            <DialogDescription className="text-[10px]">Atualize os dados do lançamento financeiro</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditar} className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Ano *</Label>
                <Input
                  type="number"
                  min="2020"
                  max="2050"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Mês Competência *</Label>
                <Select
                  value={formData.mesCompetencia}
                  onValueChange={(value) => setFormData({ ...formData, mesCompetencia: value })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
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
                <Label className="text-[10px] font-semibold">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value, descricao1: "", nomeCliente: "", nomePet: "", petsSelecionados: [], fornecedorId: "" })}
                >
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
                <Label className="text-[10px] font-semibold">Descrição 1 *</Label>
                <Select
                  value={formData.descricao1}
                  onValueChange={(value) => setFormData({ ...formData, descricao1: value })}
                  disabled={!formData.tipo}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder={formData.tipo ? "Selecione" : "Selecione tipo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.tipo &&
                      categoriasDescricao1[formData.tipo].map((desc) => (
                        <SelectItem key={desc} value={desc} className="text-xs">
                          {desc}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Nome do Cliente ou Fornecedor (condicional) */}
              <div className="space-y-0.5">
                {formData.tipo === "Despesa" ? (
                  <>
                    <Label className="text-[10px] font-semibold">Fornecedor</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-7 text-xs"
                        >
                          {formData.fornecedorId
                            ? (() => {
                                const f = fornecedores.find((f) => f.id === formData.fornecedorId);
                                return f ? f.nome_fornecedor : "Selecione";
                              })()
                            : "Selecione o fornecedor"}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome, CNPJ/CPF ou fantasia..."
                            className="text-xs"
                            value={fornecedorSearch}
                            onValueChange={setFornecedorSearch}
                          />
                          <CommandEmpty className="text-xs">Nenhum fornecedor encontrado.</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-y-auto">
                            {fornecedoresFiltrados.map((f) => (
                              <CommandItem
                                key={f.id}
                                value={f.id}
                                onSelect={() => {
                                  setFormData({
                                    ...formData,
                                    fornecedorId: formData.fornecedorId === f.id ? "" : f.id,
                                  });
                                  setFornecedorSearch("");
                                }}
                                className="text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 w-3",
                                    formData.fornecedorId === f.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{f.nome_fornecedor}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {f.cnpj_cpf}
                                    {f.nome_fantasia ? ` • ${f.nome_fantasia}` : ""}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </>
                ) : (
                  <>
                    <Label className="text-[10px] font-semibold">Nome do Cliente</Label>
                    <ComboboxField
                      value={formData.nomeCliente}
                      onChange={(value) => {
                        const novoCliente = clientes.find((c) => c.nomeCliente === value);
                        if (novoCliente && formData.nomePet) {
                          const petAtual = pets.find((p) => p.nomePet === formData.nomePet);
                          if (petAtual && petAtual.clienteId !== novoCliente.id) {
                            setFormData({ ...formData, nomeCliente: value, nomePet: "", petsSelecionados: [] });
                          } else {
                            setFormData({ ...formData, nomeCliente: value });
                          }
                        } else {
                          setFormData({ ...formData, nomeCliente: value });
                        }
                      }}
                      options={clientesFormulario}
                      placeholder="Selecione o cliente"
                      searchPlaceholder="Buscar cliente..."
                      id="edit-form-cliente"
                    />
                  </>
                )}
              </div>

              {/* Pets */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label className="text-[10px] font-semibold">Pets</Label>
                  {formData.tipo !== "Despesa" && formData.nomeCliente && formData.nomePet && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-5 text-[10px] px-2 gap-1">
                          <Plus className="h-3 w-3" />
                          Pet
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Adicionar Pet</Label>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {(() => {
                              const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
                              const primeiroPet = pets.find(
                                (p) => p.nomePet === formData.nomePet && p.clienteId === clienteSelecionado?.id,
                              );

                              if (!clienteSelecionado || !primeiroPet)
                                return <div className="text-xs text-muted-foreground">Nenhum pet disponível</div>;

                              const petsDisponiveis = pets.filter(
                                (p) =>
                                  p.clienteId === clienteSelecionado.id &&
                                  p.nomePet !== formData.nomePet &&
                                  !formData.petsSelecionados.some((ps) => ps.id === p.id),
                              );

                              if (petsDisponiveis.length === 0) {
                                return (
                                  <div className="text-xs text-muted-foreground p-2">
                                    Nenhum pet adicional disponível
                                  </div>
                                );
                              }

                              return petsDisponiveis.map((pet) => (
                                <Button
                                  key={pet.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-xs h-8"
                                  onClick={() => {
                                    if (!formData.petsSelecionados.some((p) => p.id === pet.id)) {
                                      setFormData({
                                        ...formData,
                                        petsSelecionados: [...formData.petsSelecionados, pet],
                                      });
                                      toast.success(`${pet.nomePet} adicionado!`);
                                    }
                                  }}
                                >
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">{pet.nomePet}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {pet.raca} - {pet.porte}
                                    </span>
                                  </div>
                                </Button>
                              ));
                            })()}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {formData.tipo === "Despesa" ? (
                  <div className="h-7 flex items-center px-3 text-xs border rounded-md bg-muted text-muted-foreground">
                    Não aplicável
                  </div>
                ) : (
                  <>
                    <ComboboxField
                      value={formData.nomePet}
                      onChange={(value) => {
                        if (!formData.nomeCliente) {
                          const petSelecionado = pets.find((p) => p.nomePet === value);
                          if (petSelecionado) {
                            const clienteDoPet = clientes.find((c) => c.id === petSelecionado.clienteId);
                            if (clienteDoPet) {
                              setFormData({
                                ...formData,
                                nomePet: value,
                                nomeCliente: clienteDoPet.nomeCliente,
                                petsSelecionados: [],
                              });
                            } else {
                              setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                            }
                          } else {
                            setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                          }
                        } else {
                          const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
                          const petSelecionado = pets.find((p) => p.nomePet === value && p.clienteId === clienteSelecionado?.id);

                          if (petSelecionado) {
                            setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                          } else {
                            setFormData({ ...formData, nomePet: value, nomeCliente: "", petsSelecionados: [] });
                          }
                        }
                      }}
                      options={petsFormulario}
                      placeholder="Selecione o pet principal"
                      searchPlaceholder="Buscar pet..."
                      id="edit-form-pet"
                    />

                    {formData.petsSelecionados.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {formData.petsSelecionados.map((pet) => (
                          <Badge key={pet.id} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                            {pet.nomePet}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  petsSelecionados: formData.petsSelecionados.filter((p) => p.id !== pet.id),
                                });
                                toast.success(`${pet.nomePet} removido`);
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="border rounded-md p-2 space-y-2 bg-secondary/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Itens do Lançamento</Label>
                {itensLancamento.length < 5 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setItensLancamento([
                        ...itensLancamento,
                        { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 },
                      ]);
                    }}
                    className="h-6 text-[10px] gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar Item
                  </Button>
                )}
              </div>

              {itensLancamento.map((item, index) => (
                <ItemLancamentoForm
                  key={item.id}
                  item={item}
                  index={index}
                  formData={formData}
                  servicos={servicos}
                  pacotes={pacotes}
                  produtos={produtos}
                  onChange={(novoItem) => {
                    setItensLancamento(itensLancamento.map((i) => (i.id === item.id ? novoItem : i)));
                  }}
                  onRemove={() => {
                    if (itensLancamento.length > 1) {
                      setItensLancamento(itensLancamento.filter((i) => i.id !== item.id));
                    } else {
                      toast.error("É necessário ter pelo menos 1 item");
                    }
                  }}
                  canRemove={itensLancamento.length > 1}
                  onAdd={() => {
                    if (itensLancamento.length < 10) {
                      setItensLancamento([
                        ...itensLancamento,
                        { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 },
                      ]);
                    } else {
                      toast.error("Limite máximo de 10 itens atingido");
                    }
                  }}
                  isLast={index === itensLancamento.length - 1}
                  canAdd={itensLancamento.length < 10}
                />
              ))}

              <div className="pt-2 border-t">
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Valor da Dedução</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="R$ 0,00"
                      value={formData.valorDeducao || ""}
                      onChange={(e) => setFormData({ ...formData, valorDeducao: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Tipo de Dedução</Label>
                    <Select
                      value={formData.tipoDeducao}
                      onValueChange={(value) => setFormData({ ...formData, tipoDeducao: value })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tarifa Bancária" className="text-xs">
                          Tarifa Bancária
                        </SelectItem>
                        <SelectItem value="Desconto" className="text-xs">
                          Desconto
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 h-7">
                    <Label className="text-xs font-semibold whitespace-nowrap">Valor Total:</Label>
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(
                        itensLancamento.reduce((acc, item) => acc + item.valor, 0) - (formData.valorDeducao || 0),
                      )}
                    </span>
                  </div>
                </div>

                {formData.valorDeducao > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor, 0))} - Dedução (
                    {formData.tipoDeducao}): {formatCurrency(formData.valorDeducao)}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Data do Pagamento</Label>
                <Input
                  type="date"
                  value={formData.dataPagamento}
                  onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Conta Bancária *</Label>
                <Select
                  value={formData.nomeBanco}
                  onValueChange={(value) => setFormData({ ...formData, nomeBanco: value })}
                >
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
                <Label className="text-[10px] font-semibold">Pago *</Label>
                <Select
                  value={formData.pago ? "sim" : "nao"}
                  onValueChange={(value) => setFormData({ ...formData, pago: value === "sim" })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm} className="h-7 text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="h-7 text-xs">
                Atualizar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir este lançamento?</p>
              {lancamentoSelecionado && (
                <div className="text-xs bg-secondary/50 p-2 rounded space-y-1">
                  <p>
                    <strong>Tipo:</strong> {lancamentoSelecionado.tipo}
                  </p>
                  <p>
                    <strong>Cliente:</strong> {lancamentoSelecionado.nomeCliente || "-"}
                  </p>
                  <p>
                    <strong>Pet:</strong> {lancamentoSelecionado.nomePet || "-"}
                  </p>
                  <p>
                    <strong>Valor Total:</strong> {formatCurrency(lancamentoSelecionado.valorTotal)}
                  </p>
                  <p>
                    <strong>Competência:</strong> {lancamentoSelecionado.ano}/{lancamentoSelecionado.mesCompetencia}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Atualização de Saldo</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a atualizar o saldo da conta <strong>{contaSelecionada}</strong> para{" "}
              <strong>{formatCurrency(parseFloat(novoSaldo) || 0)}</strong> na data{" "}
              <strong>{format(dataAjusteSaldo, "dd/MM/yyyy")}</strong>.<br />
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

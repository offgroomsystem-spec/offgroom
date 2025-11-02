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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
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
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Interfaces
interface ItemLancamento {
  id: string;
  descricao2: string;
  produtoServico: string;
  valor: number;
}

interface LancamentoFinanceiro {
  id: string;
  ano: string;
  mesCompetencia: string;
  tipo: "Receita" | "Despesa";
  descricao1: string;
  nomeCliente: string;
  nomePet: string;
  itens: ItemLancamento[];
  valorTotal: number;
  dataPagamento: string;
  nomeBanco: string;
  pago: boolean;
  dataCadastro: string;
}

interface Cliente {
  id: string;
  nomeCliente: string;
}

interface Pet {
  id: string;
  clienteId: string;
  nomePet: string;
}

interface ContaBancaria {
  id: string;
  nomeBanco: string;
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

// Categorias
const categoriasDescricao1 = {
  Receita: ["Receita Operacional", "Receita Não Operacional"],
  Despesa: ["Despesa Fixa", "Despesa Variável", "Despesa Não Operacional"],
};

const categoriasDescricao2: { [key: string]: string[] } = {
  "Receita Operacional": ["Serviços", "Venda", "Outras Receitas Operacionais"],
  "Receita Não Operacional": ["Venda de Ativo", "Outras Receitas Não Operacionais"],
  "Despesa Fixa": ["Aluguel", "Salários", "Impostos Fixos", "Outras Despesas Fixas"],
  "Despesa Variável": [
    "Produtos para Banho",
    "Material de Limpeza",
    "Energia Elétrica",
    "Água",
    "Internet",
    "Outras Despesas Variáveis",
  ],
  "Despesa Não Operacional": ["Manutenção", "Reparos", "Outras Despesas Não Operacionais"],
};

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

// Componente ComboboxField
interface ComboboxFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  id: string;
}

const ComboboxField = ({ value, onChange, options, placeholder, searchPlaceholder, id }: ComboboxFieldProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-7 text-xs">
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
    </div>
  );
};

interface ControleFinanceiroProps {
  filtrosIniciais?: {
    ano?: string;
    dataInicio?: string;
    dataFim?: string;
    foiPago?: string;
  };
}

const ControleFinanceiro = ({ filtrosIniciais }: ControleFinanceiroProps = {}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

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
        .order("data_cadastro", { ascending: false });

      if (error) throw error;

      const lancamentosFormatados = (data || []).map((l: any) => ({
        id: l.id,
        ano: l.ano,
        mesCompetencia: l.mes_competencia,
        tipo: l.tipo as "Receita" | "Despesa",
        descricao1: l.descricao1,
        nomeCliente: l.cliente_id ? "" : "", // Will be handled via lookup
        nomePet: "", // Will be handled via lookup
        itens: (l.lancamentos_financeiros_itens || []).map((i: any) => ({
          id: i.id,
          descricao2: i.descricao2,
          produtoServico: i.produto_servico || "",
          valor: Number(i.valor),
        })),
        valorTotal: Number(l.valor_total),
        dataPagamento: l.data_pagamento,
        nomeBanco: "", // Will be handled via lookup
        pago: l.pago,
        dataCadastro: l.data_cadastro || l.created_at,
      }));

      // Map cliente_id and conta_id to names
      const clientesData = await supabase.from("clientes").select("*").eq("user_id", user.id);

      const petsData = await supabase.from("pets").select("*").eq("user_id", user.id);

      const contasData = await supabase.from("contas_bancarias").select("*").eq("user_id", user.id);

      if (clientesData.data && petsData.data && contasData.data) {
        const clientesMap = new Map(clientesData.data.map((c: any) => [c.id, c.nome_cliente]));
        const petsMap = new Map(petsData.data.map((p: any) => [p.cliente_id, p.nome_pet]));
        const contasMap = new Map(contasData.data.map((c: any) => [c.id, c.nome]));

        lancamentosFormatados.forEach((l: any) => {
          const lancOriginal = data?.find((lo: any) => lo.id === l.id);
          if (lancOriginal) {
            l.nomeCliente = clientesMap.get(lancOriginal.cliente_id) || "";
            l.nomePet = petsMap.get(lancOriginal.cliente_id) || "";
            l.nomeBanco = contasMap.get(lancOriginal.conta_id) || "";
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

  // Load related data from Supabase
  const loadRelatedData = async () => {
    if (!user) return;

    try {
      const [clientesRes, petsRes, contasRes, servicosRes, pacotesRes, produtosRes] = await Promise.all([
        supabase.from("clientes").select("*").eq("user_id", user.id),
        supabase.from("pets").select("*").eq("user_id", user.id),
        supabase.from("contas_bancarias").select("*").eq("user_id", user.id),
        supabase.from("servicos").select("*").eq("user_id", user.id),
        supabase.from("pacotes").select("*").eq("user_id", user.id),
        supabase.from("produtos").select("*").eq("user_id", user.id),
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
          })),
        );
      }

      if (contasRes.data) {
        setContas(
          contasRes.data.map((c: any) => ({
            id: c.id,
            nomeBanco: c.nome,
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

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoFinanceiro | null>(null);

  const [formData, setFormData] = useState({
    ano: new Date().getFullYear().toString(),
    mesCompetencia: String(new Date().getMonth() + 1).padStart(2, "0"),
    tipo: "" as "Receita" | "Despesa" | "",
    descricao1: "",
    nomeCliente: "",
    nomePet: "",
    dataPagamento: "",
    nomeBanco: "",
    pago: false,
  });

  const [itensLancamento, setItensLancamento] = useState<ItemLancamento[]>([
    { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 },
  ]);

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

  // Aplicar filtros iniciais quando fornecidos
  useEffect(() => {
    if (filtrosIniciais) {
      const novosFiltros: any = { ...filtros };
      
      if (filtrosIniciais.ano) {
        novosFiltros.ano = filtrosIniciais.ano;
      }
      if (filtrosIniciais.dataInicio) {
        novosFiltros.dataInicio = filtrosIniciais.dataInicio;
        setFiltroDataAtivo("periodo");
      }
      if (filtrosIniciais.dataFim) {
        novosFiltros.dataFim = filtrosIniciais.dataFim;
        setFiltroDataAtivo("periodo");
      }
      if (filtrosIniciais.foiPago === "sim") {
        novosFiltros.pago = true;
      } else if (filtrosIniciais.foiPago === "nao") {
        novosFiltros.pago = false;
      }
      
      setFiltros(novosFiltros);
      setFiltrosAplicados(true);
      setMostrarFiltros(true);
    }
  }, [filtrosIniciais]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Filtrar pets baseado no cliente selecionado
  const petsFormulario = useMemo(() => {
    if (!formData.nomeCliente) {
      // Se não há cliente selecionado, retorna todos os pets
      return [...new Set(pets.map((p) => p.nomePet))];
    }
    // Encontrar o ID do cliente selecionado
    const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
    if (!clienteSelecionado) return [];

    // Retornar apenas os pets deste cliente
    return pets.filter((p) => p.clienteId === clienteSelecionado.id).map((p) => p.nomePet);
  }, [formData.nomeCliente, clientes, pets]);

  // Filtrar clientes baseado no pet selecionado
  const clientesFormulario = useMemo(() => {
    if (!formData.nomePet) {
      // Se não há pet selecionado, retorna todos os clientes
      return [...new Set(clientes.map((c) => c.nomeCliente))];
    }
    // Encontrar o pet selecionado
    const petSelecionado = pets.find((p) => p.nomePet === formData.nomePet);
    if (!petSelecionado) return [];

    // Retornar apenas o cliente dono deste pet
    const clienteDonoPet = clientes.find((c) => c.id === petSelecionado.clienteId);
    return clienteDonoPet ? [clienteDonoPet.nomeCliente] : [];
  }, [formData.nomePet, clientes, pets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.ano) {
      toast.error("Favor selecionar o Ano de competência!");
      return;
    }

    if (!formData.mesCompetencia) {
      toast.error("Favor selecionar o Mês de competência!");
      return;
    }

    if (!formData.tipo) {
      toast.error("Favor selecionar o Tipo financeiro!");
      return;
    }

    if (!formData.descricao1) {
      toast.error("Favor preencher a Descrição 1!");
      return;
    }

    if (!formData.nomePet) {
      toast.error("Favor selecionar o nome do Pet!");
      return;
    }

    if (!formData.nomeCliente) {
      toast.error("Favor selecionar o nome do Cliente!");
      return;
    }

    for (let i = 0; i < itensLancamento.length; i++) {
      const item = itensLancamento[i];

      if (!item.descricao2) {
        toast.error(`Item ${i + 1}: Favor preencher a Descrição 2!`);
        return;
      }

      if ((item.descricao2 === "Serviços" || item.descricao2 === "Venda") && !item.produtoServico) {
        toast.error(`Item ${i + 1}: Favor selecionar ${item.descricao2 === "Serviços" ? "o serviço" : "o produto"}!`);
        return;
      }

      if (item.valor <= 0) {
        toast.error(`Item ${i + 1}: Favor preencher o valor!`);
        return;
      }
    }

    if (!formData.nomeBanco) {
      toast.error("Favor selecionar o Banco!");
      return;
    }

    const valorTotal = itensLancamento.reduce((acc, item) => acc + item.valor, 0);

    try {
      // Find cliente_id and conta_id
      const pet = pets.find((p) => p.nomePet === formData.nomePet);
      const cliente = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
      const conta = contas.find((c) => c.nomeBanco === formData.nomeBanco);

      if (!pet || !cliente || pet.clienteId !== cliente.id) {
        toast.error("Cliente/Pet não encontrado ou não correspondem!");
        return;
      }
      if (!conta) {
        toast.error("Conta bancária não encontrada!");
        return;
      }

      // Insert main record
      const { data: lancamentoData, error: lancamentoError } = await supabase
        .from("lancamentos_financeiros")
        .insert([
          {
            user_id: user.id,
            ano: formData.ano,
            mes_competencia: formData.mesCompetencia,
            tipo: formData.tipo,
            descricao1: formData.descricao1,
            cliente_id: cliente.id,
            valor_total: valorTotal,
            data_pagamento: formData.dataPagamento,
            conta_id: conta.id,
            pago: formData.pago,
            observacao: null,
          },
        ])
        .select()
        .single();

      if (lancamentoError) throw lancamentoError;

      // Insert items
      const { error: itensError } = await supabase.from("lancamentos_financeiros_itens").insert(
        itensLancamento.map((item) => ({
          lancamento_id: lancamentoData.id,
          descricao2: item.descricao2,
          produto_servico: item.produtoServico,
          valor: item.valor,
        })),
      );

      if (itensError) throw itensError;

      toast.success("Lançamento cadastrado com sucesso!");
      await loadLancamentos();
      resetForm();
    } catch (error) {
      console.error("Erro ao criar lançamento:", error);
      toast.error("Erro ao criar lançamento");
    }
  };

  const resetForm = () => {
    setFormData({
      ano: new Date().getFullYear().toString(),
      mesCompetencia: String(new Date().getMonth() + 1).padStart(2, "0"),
      tipo: "",
      descricao1: "",
      nomeCliente: "",
      nomePet: "",
      dataPagamento: "",
      nomeBanco: "",
      pago: false,
    });
    setItensLancamento([{ id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 }]);
    setIsDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  const abrirEdicao = (lancamento: LancamentoFinanceiro) => {
    setLancamentoSelecionado(lancamento);
    setFormData({
      ano: lancamento.ano,
      mesCompetencia: lancamento.mesCompetencia,
      tipo: lancamento.tipo,
      descricao1: lancamento.descricao1,
      nomeCliente: lancamento.nomeCliente,
      nomePet: lancamento.nomePet,
      dataPagamento: lancamento.dataPagamento,
      nomeBanco: lancamento.nomeBanco,
      pago: lancamento.pago,
    });
    setItensLancamento(lancamento.itens);
    setIsEditDialogOpen(true);
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lancamentoSelecionado || !user) return;

    // Validations...
    if (
      !formData.ano ||
      !formData.mesCompetencia ||
      !formData.tipo ||
      !formData.descricao1 ||
      !formData.nomePet ||
      !formData.nomeCliente
    ) {
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

    const valorTotal = itensLancamento.reduce((acc, item) => acc + item.valor, 0);

    try {
      const pet = pets.find((p) => p.nomePet === formData.nomePet);
      const cliente = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
      const conta = contas.find((c) => c.nomeBanco === formData.nomeBanco);

      if (!pet || !cliente || pet.clienteId !== cliente.id || !conta) {
        toast.error("Cliente/Pet ou Conta bancária não encontrados!");
        return;
      }

      await supabase
        .from("lancamentos_financeiros")
        .update({
          ano: formData.ano,
          mes_competencia: formData.mesCompetencia,
          tipo: formData.tipo,
          descricao1: formData.descricao1,
          cliente_id: cliente.id,
          valor_total: valorTotal,
          data_pagamento: formData.dataPagamento,
          conta_id: conta.id,
          pago: formData.pago,
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
      resultado = resultado.filter((l) => l.nomePet === filtros.nomePet);
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Controle Financeiro</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMostrarFiltros(!mostrarFiltros)} className="h-8 text-xs gap-2">
            <Filter className="h-3 w-3" />
            {mostrarFiltros ? "Ocultar Filtros" : "Aplicar Filtros"}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs bg-green-600 hover:bg-green-700">
                <Plus className="h-3 w-3" />
                Lançar Financeiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">Lançar Financeiro</DialogTitle>
                <DialogDescription className="text-[10px]">
                  Preencha os dados do lançamento financeiro
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-2">
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
                      onValueChange={(value: any) => setFormData({ ...formData, tipo: value, descricao1: "" })}
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
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Nome do Cliente *</Label>
                    <ComboboxField
                      value={formData.nomeCliente}
                      onChange={(value) => {
                        // Ao mudar cliente, limpar pet apenas se o pet atual não pertencer ao novo cliente
                        const novoCliente = clientes.find((c) => c.nomeCliente === value);
                        if (novoCliente && formData.nomePet) {
                          const petAtual = pets.find((p) => p.nomePet === formData.nomePet);
                          if (petAtual && petAtual.clienteId !== novoCliente.id) {
                            setFormData({ ...formData, nomeCliente: value, nomePet: "" });
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
                      id="form-cliente"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Nome do Pet *</Label>
                    <ComboboxField
                      value={formData.nomePet}
                      onChange={(value) => {
                        // Ao mudar pet, atualizar cliente automaticamente
                        const petSelecionado = pets.find((p) => p.nomePet === value);
                        if (petSelecionado) {
                          const clienteDoPet = clientes.find((c) => c.id === petSelecionado.clienteId);
                          if (clienteDoPet) {
                            setFormData({ ...formData, nomePet: value, nomeCliente: clienteDoPet.nomeCliente });
                          } else {
                            setFormData({ ...formData, nomePet: value });
                          }
                        } else {
                          setFormData({ ...formData, nomePet: value });
                        }
                      }}
                      options={petsFormulario}
                      placeholder="Selecione o pet"
                      searchPlaceholder="Buscar pet..."
                      id="form-pet"
                    />
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
                    />
                  ))}

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">Valor Total:</Label>
                      <span className="text-base font-bold text-primary">
                        {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor, 0))}
                      </span>
                    </div>
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
                    Salvar Lançamento
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                  <Select
                    value={filtros.nomeBanco}
                    onValueChange={(value) => setFiltros({ ...filtros, nomeBanco: value })}
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
                  <th className="text-left py-2 px-2 font-semibold text-xs">Ano/Mês</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Tipo</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Cliente</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Pet</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Descrição 1</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Itens</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Valor Total</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Banco</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Status</th>
                  <th className="text-right py-2 px-2 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum lançamento cadastrado
                    </td>
                  </tr>
                ) : (
                  lancamentosFiltrados.map((lancamento) => (
                    <tr
                      key={lancamento.id}
                      className="border-b hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => abrirEdicao(lancamento)}
                    >
                      <td className="py-2 px-2 text-xs">
                        {lancamento.ano}/{lancamento.mesCompetencia}
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          variant={lancamento.tipo === "Receita" ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {lancamento.tipo}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs">{lancamento.nomeCliente}</td>
                      <td className="py-2 px-2 text-xs">{lancamento.nomePet}</td>
                      <td className="py-2 px-2 text-xs">{lancamento.descricao1}</td>
                      <td className="py-2 px-2 text-xs">
                        {lancamento.itens.length} item{lancamento.itens.length > 1 ? "s" : ""}
                      </td>
                      <td className="py-2 px-2 text-xs font-semibold">{formatCurrency(lancamento.valorTotal)}</td>
                      <td className="py-2 px-2 text-xs">{lancamento.nomeBanco}</td>
                      <td className="py-2 px-2">
                        <Badge variant={lancamento.pago ? "default" : "outline"} className="text-[10px]">
                          {lancamento.tipo === "Receita"
                            ? lancamento.pago
                              ? "Recebido"
                              : "A Receber"
                            : lancamento.pago
                              ? "Pago"
                              : "A Pagar"}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirEdicao(lancamento)}
                            className="h-6 w-6 p-0"
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value, descricao1: "" })}
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
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Nome do Cliente *</Label>
                <ComboboxField
                  value={formData.nomeCliente}
                  onChange={(value) => {
                    setFormData({ ...formData, nomeCliente: value, nomePet: "" });
                  }}
                  options={clientesFormulario}
                  placeholder="Selecione o cliente"
                  searchPlaceholder="Buscar cliente..."
                  id="edit-form-cliente"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Nome do Pet *</Label>
                <ComboboxField
                  value={formData.nomePet}
                  onChange={(value) => setFormData({ ...formData, nomePet: value })}
                  options={petsFormulario}
                  placeholder="Selecione o pet"
                  searchPlaceholder="Buscar pet..."
                  id="edit-form-pet"
                />
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
                />
              ))}

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Valor Total:</Label>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor, 0))}
                  </span>
                </div>
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
                    <strong>Cliente:</strong> {lancamentoSelecionado.nomeCliente}
                  </p>
                  <p>
                    <strong>Pet:</strong> {lancamentoSelecionado.nomePet}
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
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ControleFinanceiro;

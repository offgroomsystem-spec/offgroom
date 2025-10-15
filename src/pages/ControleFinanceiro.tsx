import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Filter, X, TrendingUp, TrendingDown, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Receita {
  id: string;
  tipo: "Receita Operacional" | "Receita Não Operacional";
  descricao: string;
}

interface Despesa {
  id: string;
  tipo: "Despesa Operacional" | "Despesa Não Operacional";
  descricao: string;
}

interface Cliente {
  id: string;
  nomeCliente: string;
  nomePet: string;
  porte: string;
  raca: string;
  whatsapp: string;
  endereco: string;
  observacao: string;
}

interface ContaBancaria {
  id: string;
  nomeBanco: string;
  saldo: number;
}

interface LancamentoFinanceiro {
  id: string;
  tipo: "Receita" | "Despesa";
  descricao1: string;
  descricao2: string;
  nomeCliente?: string;
  nomePet?: string;
  valor: number;
  dataPagamento: string;
  nomeBanco: string;
  pago: boolean;
  dataCompetencia: string;
  dataCadastro: string;
}

const ControleFinanceiro = () => {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>(() => {
    const saved = localStorage.getItem('lancamentos_financeiros');
    return saved ? JSON.parse(saved) : [];
  });

  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoFinanceiro | null>(null);

  const [filtroDataAtivo, setFiltroDataAtivo] = useState<'periodo' | 'mesano' | null>(null);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    mes: "",
    ano: "",
    nomePet: "",
    nomeCliente: "",
    tipo: "",
    descricao1: "",
    descricao2: "",
    dataPagamento: "",
    nomeBanco: "",
    pago: null as boolean | null,
  });

  const [formData, setFormData] = useState({
    tipo: "" as "Receita" | "Despesa" | "",
    descricao1: "",
    descricao2: "",
    nomeCliente: "",
    nomePet: "",
    valor: 0,
    dataCompetencia: "",
    dataPagamento: "",
    nomeBanco: "",
    pago: false,
  });

  const [openCombobox, setOpenCombobox] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('lancamentos_financeiros', JSON.stringify(lancamentos));
  }, [lancamentos]);

  useEffect(() => {
    const savedReceitas = localStorage.getItem('receitas');
    const savedDespesas = localStorage.getItem('despesas');
    const savedClientes = localStorage.getItem('clientes');
    const savedContas = localStorage.getItem('contas_bancarias');

    if (savedReceitas) setReceitas(JSON.parse(savedReceitas));
    if (savedDespesas) setDespesas(JSON.parse(savedDespesas));
    if (savedClientes) setClientes(JSON.parse(savedClientes));
    if (savedContas) setContas(JSON.parse(savedContas));
  }, []);

  const categoriasDescricao2: { [key: string]: string[] } = {
    "Receita Operacional": ["Venda de Banho", "Venda de Tosa", "Venda de Pacote", "Serviço de Taxi Dog"],
    "Receita Não Operacional": ["Venda de Produto", "Outras Receitas"],
    "Despesa Operacional": ["Salários", "Aluguel", "Energia Elétrica", "Água", "Internet", "Material de Limpeza", "Produtos para Banho"],
    "Despesa Não Operacional": ["Manutenção", "Impostos", "Outras Despesas"]
  };

  const opcoesDescricao1 = useMemo(() => {
    if (!formData.tipo) return [];
    if (formData.tipo === "Receita") return receitas.map(r => r.descricao);
    return despesas.map(d => d.descricao);
  }, [formData.tipo, receitas, despesas]);

  const opcoesDescricao2 = useMemo(() => {
    if (!formData.descricao1) return [];
    return categoriasDescricao2[formData.descricao1] || [];
  }, [formData.descricao1]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, descricao2: "" }));
  }, [formData.descricao1]);

  useEffect(() => {
    if (formData.nomeCliente) {
      const clienteSelecionado = clientes.find(c => c.nomeCliente === formData.nomeCliente);
      if (clienteSelecionado && formData.nomePet !== clienteSelecionado.nomePet) {
        setFormData(prev => ({ ...prev, nomePet: "" }));
      }
    }
  }, [formData.nomeCliente, clientes]);

  const clientesFiltrados = useMemo(() => {
    if (!filtros.nomePet) return [...new Set(clientes.map(c => c.nomeCliente))];
    return [...new Set(clientes.filter(c => c.nomePet === filtros.nomePet).map(c => c.nomeCliente))];
  }, [filtros.nomePet, clientes]);

  const petsFiltrados = useMemo(() => {
    if (!filtros.nomeCliente) return [...new Set(clientes.map(c => c.nomePet))];
    return [...new Set(clientes.filter(c => c.nomeCliente === filtros.nomeCliente).map(c => c.nomePet))];
  }, [filtros.nomeCliente, clientes]);

  const petsFormulario = useMemo(() => {
    if (!formData.nomeCliente) return [...new Set(clientes.map(c => c.nomePet))];
    return [...new Set(clientes.filter(c => c.nomeCliente === formData.nomeCliente).map(c => c.nomePet))];
  }, [formData.nomeCliente, clientes]);

  const lancamentosFiltrados = useMemo(() => {
    if (!filtrosAplicados) return lancamentos;

    let resultado = [...lancamentos];

    if (filtroDataAtivo === 'periodo') {
      if (filtros.dataInicio) {
        resultado = resultado.filter(l => l.dataPagamento >= filtros.dataInicio);
      }
      if (filtros.dataFim) {
        resultado = resultado.filter(l => l.dataPagamento <= filtros.dataFim);
      }
    } else if (filtroDataAtivo === 'mesano') {
      if (filtros.mes || filtros.ano) {
        resultado = resultado.filter(l => {
          const [ano, mes] = l.dataCompetencia.split('-');
          if (filtros.mes && filtros.ano) {
            return mes === filtros.mes && ano === filtros.ano;
          }
          if (filtros.mes) return mes === filtros.mes;
          if (filtros.ano) return ano === filtros.ano;
          return true;
        });
      }
    }

    if (filtros.nomePet) {
      resultado = resultado.filter(l => l.nomePet === filtros.nomePet);
    }
    if (filtros.nomeCliente) {
      resultado = resultado.filter(l => l.nomeCliente === filtros.nomeCliente);
    }
    if (filtros.tipo) {
      resultado = resultado.filter(l => l.tipo === filtros.tipo);
    }
    if (filtros.descricao1) {
      resultado = resultado.filter(l => l.descricao1 === filtros.descricao1);
    }
    if (filtros.descricao2) {
      resultado = resultado.filter(l => l.descricao2 === filtros.descricao2);
    }
    if (filtros.dataPagamento) {
      resultado = resultado.filter(l => l.dataPagamento === filtros.dataPagamento);
    }
    if (filtros.nomeBanco) {
      resultado = resultado.filter(l => l.nomeBanco === filtros.nomeBanco);
    }
    if (filtros.pago !== null) {
      resultado = resultado.filter(l => l.pago === filtros.pago);
    }

    return resultado;
  }, [lancamentos, filtros, filtroDataAtivo, filtrosAplicados]);

  const metricas = useMemo(() => {
    const dados = filtrosAplicados ? lancamentosFiltrados : lancamentos;
    
    const recebido = dados.filter(l => l.tipo === "Receita" && l.pago);
    const aReceber = dados.filter(l => l.tipo === "Receita" && !l.pago);
    const pago = dados.filter(l => l.tipo === "Despesa" && l.pago);
    const aPagar = dados.filter(l => l.tipo === "Despesa" && !l.pago);

    return {
      recebido: {
        valor: recebido.reduce((acc, l) => acc + l.valor, 0),
        qtd: recebido.length
      },
      aReceber: {
        valor: aReceber.reduce((acc, l) => acc + l.valor, 0),
        qtd: aReceber.length
      },
      pago: {
        valor: pago.reduce((acc, l) => acc + l.valor, 0),
        qtd: pago.length
      },
      aPagar: {
        valor: aPagar.reduce((acc, l) => acc + l.valor, 0),
        qtd: aPagar.length
      }
    };
  }, [lancamentos, lancamentosFiltrados, filtrosAplicados]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipo) {
      toast.error("Favor selecionar o tipo");
      return;
    }
    if (!formData.descricao1) {
      toast.error("Favor selecionar a descrição 1");
      return;
    }
    if (!formData.descricao2) {
      toast.error("Favor selecionar a descrição 2");
      return;
    }
    if (formData.valor <= 0) {
      toast.error("Favor preencher um valor maior que zero");
      return;
    }
    if (!formData.dataCompetencia) {
      toast.error("Favor selecionar a data de competência");
      return;
    }
    if (!formData.dataPagamento) {
      toast.error("Favor selecionar a data de pagamento");
      return;
    }
    if (!formData.nomeBanco) {
      toast.error("Favor selecionar o banco");
      return;
    }

    const novoLancamento: LancamentoFinanceiro = {
      id: Date.now().toString(),
      tipo: formData.tipo,
      descricao1: formData.descricao1,
      descricao2: formData.descricao2,
      nomeCliente: formData.nomeCliente || undefined,
      nomePet: formData.nomePet || undefined,
      valor: formData.valor,
      dataPagamento: formData.dataPagamento,
      nomeBanco: formData.nomeBanco,
      pago: formData.pago,
      dataCompetencia: formData.dataCompetencia,
      dataCadastro: new Date().toISOString(),
    };

    setLancamentos([...lancamentos, novoLancamento]);
    toast.success("Lançamento cadastrado com sucesso!");
    resetForm();
  };

  const handleEditar = () => {
    if (!lancamentoSelecionado) return;

    if (!formData.tipo || !formData.descricao1 || !formData.descricao2 || formData.valor <= 0 || 
        !formData.dataCompetencia || !formData.dataPagamento || !formData.nomeBanco) {
      toast.error("Favor preencher todos os campos obrigatórios");
      return;
    }

    setLancamentos(lancamentos.map(l =>
      l.id === lancamentoSelecionado.id
        ? {
            ...lancamentoSelecionado,
            tipo: formData.tipo as "Receita" | "Despesa",
            descricao1: formData.descricao1,
            descricao2: formData.descricao2,
            nomeCliente: formData.nomeCliente || undefined,
            nomePet: formData.nomePet || undefined,
            valor: formData.valor,
            dataPagamento: formData.dataPagamento,
            nomeBanco: formData.nomeBanco,
            pago: formData.pago,
            dataCompetencia: formData.dataCompetencia,
          }
        : l
    ));

    toast.success("Lançamento atualizado com sucesso!");
    resetForm();
    setLancamentoSelecionado(null);
    setIsEditDialogOpen(false);
  };

  const handleExcluir = () => {
    if (!lancamentoSelecionado) return;

    setLancamentos(lancamentos.filter(l => l.id !== lancamentoSelecionado.id));
    toast.success("Lançamento excluído com sucesso!");
    setLancamentoSelecionado(null);
    setIsDeleteDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      tipo: "",
      descricao1: "",
      descricao2: "",
      nomeCliente: "",
      nomePet: "",
      valor: 0,
      dataCompetencia: "",
      dataPagamento: "",
      nomeBanco: "",
      pago: false,
    });
    setIsDialogOpen(false);
  };

  const abrirEdicao = (lancamento: LancamentoFinanceiro) => {
    setLancamentoSelecionado(lancamento);
    setFormData({
      tipo: lancamento.tipo,
      descricao1: lancamento.descricao1,
      descricao2: lancamento.descricao2,
      nomeCliente: lancamento.nomeCliente || "",
      nomePet: lancamento.nomePet || "",
      valor: lancamento.valor,
      dataCompetencia: lancamento.dataCompetencia,
      dataPagamento: lancamento.dataPagamento,
      nomeBanco: lancamento.nomeBanco,
      pago: lancamento.pago,
    });
    setIsEditDialogOpen(true);
  };

  const aplicarFiltros = () => {
    setFiltrosAplicados(true);
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
      descricao2: "",
      dataPagamento: "",
      nomeBanco: "",
      pago: null,
    });
    setFiltroDataAtivo(null);
    setFiltrosAplicados(false);
    toast.success("Filtros limpos!");
  };

  const anos = Array.from({ length: 11 }, (_, i) => (2025 + i).toString());
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

  const ComboboxField = ({ 
    value, 
    onChange, 
    options, 
    placeholder, 
    searchPlaceholder,
    id 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    options: string[];
    placeholder: string;
    searchPlaceholder: string;
    id: string;
  }) => (
    <Popover open={openCombobox === id} onOpenChange={(open) => setOpenCombobox(open ? id : null)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={openCombobox === id}
          className="w-full justify-between h-8 text-xs"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          <CommandEmpty className="text-xs p-2">Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {options.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={() => {
                  onChange(option === value ? "" : option);
                  setOpenCombobox(null);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Controle Financeiro</h1>
      </div>

      {/* Dashboard Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recebido
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(metricas.recebido.valor)}</div>
            <p className="text-xs text-green-600 dark:text-green-500">Qtd: {metricas.recebido.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              A Receber
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{formatCurrency(metricas.aReceber.valor)}</div>
            <p className="text-xs text-yellow-600 dark:text-yellow-500">Qtd: {metricas.aReceber.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(metricas.pago.valor)}</div>
            <p className="text-xs text-blue-600 dark:text-blue-500">Qtd: {metricas.pago.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              A Pagar
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(metricas.aPagar.valor)}</div>
            <p className="text-xs text-red-600 dark:text-red-500">Qtd: {metricas.aPagar.qtd}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filtros de Data */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Período - De:</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => {
                  setFiltros({ ...filtros, dataInicio: e.target.value, mes: "", ano: "" });
                  setFiltroDataAtivo('periodo');
                }}
                disabled={filtroDataAtivo === 'mesano'}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Período - Até:</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => {
                  setFiltros({ ...filtros, dataFim: e.target.value, mes: "", ano: "" });
                  setFiltroDataAtivo('periodo');
                }}
                disabled={filtroDataAtivo === 'mesano'}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mês da Competência:</Label>
              <Select
                value={filtros.mes}
                onValueChange={(value) => {
                  setFiltros({ ...filtros, mes: value, dataInicio: "", dataFim: "" });
                  setFiltroDataAtivo('mesano');
                }}
                disabled={filtroDataAtivo === 'periodo'}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(mes => (
                    <SelectItem key={mes.value} value={mes.value} className="text-xs">{mes.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ano:</Label>
              <Select
                value={filtros.ano}
                onValueChange={(value) => {
                  setFiltros({ ...filtros, ano: value, dataInicio: "", dataFim: "" });
                  setFiltroDataAtivo('mesano');
                }}
                disabled={filtroDataAtivo === 'periodo'}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map(ano => (
                    <SelectItem key={ano} value={ano} className="text-xs">{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtros de Categoria */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome do Pet:</Label>
              <ComboboxField
                value={filtros.nomePet}
                onChange={(value) => setFiltros({ ...filtros, nomePet: value })}
                options={petsFiltrados}
                placeholder="Selecione o pet"
                searchPlaceholder="Buscar pet..."
                id="filtro-pet"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome do Cliente:</Label>
              <ComboboxField
                value={filtros.nomeCliente}
                onChange={(value) => setFiltros({ ...filtros, nomeCliente: value })}
                options={clientesFiltrados}
                placeholder="Selecione o cliente"
                searchPlaceholder="Buscar cliente..."
                id="filtro-cliente"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo:</Label>
              <Select value={filtros.tipo} onValueChange={(value) => setFiltros({ ...filtros, tipo: value })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita" className="text-xs">Receita</SelectItem>
                  <SelectItem value="Despesa" className="text-xs">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição 1:</Label>
              <Select value={filtros.descricao1} onValueChange={(value) => setFiltros({ ...filtros, descricao1: value, descricao2: "" })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {filtros.tipo === "Receita" && receitas.map(r => (
                    <SelectItem key={r.id} value={r.descricao} className="text-xs">{r.descricao}</SelectItem>
                  ))}
                  {filtros.tipo === "Despesa" && despesas.map(d => (
                    <SelectItem key={d.id} value={d.descricao} className="text-xs">{d.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição 2:</Label>
              <Select value={filtros.descricao2} onValueChange={(value) => setFiltros({ ...filtros, descricao2: value })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(categoriasDescricao2[filtros.descricao1] || []).map(desc => (
                    <SelectItem key={desc} value={desc} className="text-xs">{desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Data do Pagamento:</Label>
              <Input
                type="date"
                value={filtros.dataPagamento}
                onChange={(e) => setFiltros({ ...filtros, dataPagamento: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome do Banco:</Label>
              <Select value={filtros.nomeBanco} onValueChange={(value) => setFiltros({ ...filtros, nomeBanco: value })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map(c => (
                    <SelectItem key={c.id} value={c.nomeBanco} className="text-xs">{c.nomeBanco}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Foi Pago:</Label>
              <Select value={filtros.pago === null ? "" : filtros.pago.toString()} onValueChange={(value) => setFiltros({ ...filtros, pago: value === "" ? null : value === "true" })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true" className="text-xs">Sim</SelectItem>
                  <SelectItem value="false" className="text-xs">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={limparFiltros} className="h-8 text-xs gap-2">
              <X className="h-3 w-3" />
              Limpar Filtros
            </Button>
            <Button onClick={aplicarFiltros} className="h-8 text-xs gap-2">
              <Filter className="h-3 w-3" />
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-8 text-xs bg-green-600 hover:bg-green-700">
              <Plus className="h-3 w-3" />
              Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados do lançamento financeiro
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(value: any) => setFormData({ ...formData, tipo: value, descricao1: "", descricao2: "" })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita" className="text-xs">Receita</SelectItem>
                      <SelectItem value="Despesa" className="text-xs">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição 1 *</Label>
                  <Select value={formData.descricao1} onValueChange={(value) => setFormData({ ...formData, descricao1: value })} disabled={!formData.tipo}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={formData.tipo ? "Selecione" : "Selecione o tipo primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoesDescricao1.map(desc => (
                        <SelectItem key={desc} value={desc} className="text-xs">{desc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Descrição 2 *</Label>
                <Select value={formData.descricao2} onValueChange={(value) => setFormData({ ...formData, descricao2: value })} disabled={!formData.descricao1}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={formData.descricao1 ? "Selecione" : "Selecione descrição 1 primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesDescricao2.map(desc => (
                      <SelectItem key={desc} value={desc} className="text-xs">{desc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Cliente</Label>
                  <ComboboxField
                    value={formData.nomeCliente}
                    onChange={(value) => setFormData({ ...formData, nomeCliente: value })}
                    options={[...new Set(clientes.map(c => c.nomeCliente))]}
                    placeholder="Selecione o cliente"
                    searchPlaceholder="Buscar cliente..."
                    id="form-cliente"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Pet</Label>
                  <ComboboxField
                    value={formData.nomePet}
                    onChange={(value) => setFormData({ ...formData, nomePet: value })}
                    options={petsFormulario}
                    placeholder="Selecione o pet"
                    searchPlaceholder="Buscar pet..."
                    id="form-pet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Competência *</Label>
                  <Input
                    type="month"
                    value={formData.dataCompetencia}
                    onChange={(e) => setFormData({ ...formData, dataCompetencia: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Pagamento *</Label>
                  <Input
                    type="date"
                    value={formData.dataPagamento}
                    onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Banco *</Label>
                  <Select value={formData.nomeBanco} onValueChange={(value) => setFormData({ ...formData, nomeBanco: value })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(c => (
                        <SelectItem key={c.id} value={c.nomeBanco} className="text-xs">{c.nomeBanco}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pago *</Label>
                  <div className="flex items-center space-x-2 h-8">
                    <Switch checked={formData.pago} onCheckedChange={(checked) => setFormData({ ...formData, pago: checked })} />
                    <Label className="text-xs">{formData.pago ? "Sim" : "Não"}</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de Lançamentos */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Lançamentos Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-xs">Data Pagamento</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Tipo</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Cliente</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Pet</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Descrição 1</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Descrição 2</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Valor</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Banco</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Status</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum lançamento encontrado
                    </td>
                  </tr>
                ) : (
                  lancamentosFiltrados.sort((a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()).map((lancamento, index) => (
                    <tr key={lancamento.id} className={`border-b hover:bg-secondary/50 transition-colors ${index % 2 === 0 ? 'bg-muted/30' : ''}`}>
                      <td className="py-2 px-3 text-xs">{formatDate(lancamento.dataPagamento)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={lancamento.tipo === "Receita" ? "default" : "destructive"} className="text-xs">
                          {lancamento.tipo}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-xs">{lancamento.nomeCliente || '-'}</td>
                      <td className="py-2 px-3 text-xs">{lancamento.nomePet || '-'}</td>
                      <td className="py-2 px-3 text-xs">{lancamento.descricao1}</td>
                      <td className="py-2 px-3 text-xs">{lancamento.descricao2}</td>
                      <td className="py-2 px-3 text-xs text-right font-semibold">{formatCurrency(lancamento.valor)}</td>
                      <td className="py-2 px-3 text-xs">{lancamento.nomeBanco}</td>
                      <td className="py-2 px-3">
                        {lancamento.tipo === "Receita" ? (
                          <Badge variant={lancamento.pago ? "default" : "secondary"} className={`text-xs ${lancamento.pago ? 'bg-green-600' : 'bg-yellow-600'}`}>
                            {lancamento.pago ? "Recebido" : "A Receber"}
                          </Badge>
                        ) : (
                          <Badge variant={lancamento.pago ? "default" : "secondary"} className={`text-xs ${lancamento.pago ? 'bg-blue-600' : 'bg-red-600'}`}>
                            {lancamento.pago ? "Pago" : "A Pagar"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => abrirEdicao(lancamento)} className="h-7 w-7 p-0">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setLancamentoSelecionado(lancamento);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="h-7 w-7 p-0"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
            <DialogDescription className="text-xs">
              Edite os dados do lançamento financeiro
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleEditar(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(value: any) => setFormData({ ...formData, tipo: value, descricao1: "", descricao2: "" })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita" className="text-xs">Receita</SelectItem>
                    <SelectItem value="Despesa" className="text-xs">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição 1 *</Label>
                <Select value={formData.descricao1} onValueChange={(value) => setFormData({ ...formData, descricao1: value })} disabled={!formData.tipo}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={formData.tipo ? "Selecione" : "Selecione o tipo primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesDescricao1.map(desc => (
                      <SelectItem key={desc} value={desc} className="text-xs">{desc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição 2 *</Label>
              <Select value={formData.descricao2} onValueChange={(value) => setFormData({ ...formData, descricao2: value })} disabled={!formData.descricao1}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={formData.descricao1 ? "Selecione" : "Selecione descrição 1 primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDescricao2.map(desc => (
                    <SelectItem key={desc} value={desc} className="text-xs">{desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome do Cliente</Label>
                <ComboboxField
                  value={formData.nomeCliente}
                  onChange={(value) => setFormData({ ...formData, nomeCliente: value })}
                  options={[...new Set(clientes.map(c => c.nomeCliente))]}
                  placeholder="Selecione o cliente"
                  searchPlaceholder="Buscar cliente..."
                  id="edit-form-cliente"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nome do Pet</Label>
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

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Competência *</Label>
                <Input
                  type="month"
                  value={formData.dataCompetencia}
                  onChange={(e) => setFormData({ ...formData, dataCompetencia: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Pagamento *</Label>
                <Input
                  type="date"
                  value={formData.dataPagamento}
                  onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Banco *</Label>
                <Select value={formData.nomeBanco} onValueChange={(value) => setFormData({ ...formData, nomeBanco: value })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map(c => (
                      <SelectItem key={c.id} value={c.nomeBanco} className="text-xs">{c.nomeBanco}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pago *</Label>
                <div className="flex items-center space-x-2 h-8">
                  <Switch checked={formData.pago} onCheckedChange={(checked) => setFormData({ ...formData, pago: checked })} />
                  <Label className="text-xs">{formData.pago ? "Sim" : "Não"}</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="h-8 text-xs">
                Salvar
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
                <div className="text-sm space-y-1 mt-2 p-3 bg-muted rounded-md">
                  <p><strong>Tipo:</strong> {lancamentoSelecionado.tipo}</p>
                  <p><strong>Descrição:</strong> {lancamentoSelecionado.descricao1} - {lancamentoSelecionado.descricao2}</p>
                  <p><strong>Valor:</strong> {formatCurrency(lancamentoSelecionado.valor)}</p>
                  <p><strong>Data:</strong> {formatDate(lancamentoSelecionado.dataPagamento)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Não
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir}>
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ControleFinanceiro;

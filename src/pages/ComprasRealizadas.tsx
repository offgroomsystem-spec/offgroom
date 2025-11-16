import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Eye, Filter, X, Calendar, Search, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { format } from "date-fns";

interface CompraItem {
  id?: string;
  produto_id: string;
  quantidade: string;
  valor_compra: string;
  data_validade: string;
  observacoes: string;
  produto?: any;
}

interface CompraNF {
  id: string;
  chave_nf: string;
  fornecedor_id: string;
  data_compra: string;
  valor_total: number;
  created_at: string;
  fornecedor?: any;
  compras_nf_itens?: CompraItem[];
}

interface Fornecedor {
  id: string;
  nome_fornecedor: string;
}

interface Produto {
  id: string;
  nome: string;
  codigo: string;
}

export default function ComprasRealizadas() {
  const [compras, setCompras] = useState<CompraNF[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<CompraNF | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Filtros
  const [filtroFornecedor, setFiltroFornecedor] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");

  // Form fields
  const [formData, setFormData] = useState({
    chave_nf: "",
    fornecedor_id: "",
    data_compra: "",
  });

  const [itens, setItens] = useState<CompraItem[]>([
    {
      produto_id: "",
      quantidade: "",
      valor_compra: "",
      data_validade: "",
      observacoes: "",
    },
  ]);

  const [openProdutoIndex, setOpenProdutoIndex] = useState<number | null>(null);

  useEffect(() => {
    loadCompras();
    loadFornecedores();
    loadProdutos();
  }, []);

  const loadCompras = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("compras_nf")
        .select(`
          *,
          compras_nf_itens (*)
        `)
        .eq("user_id", user.id)
        .order("data_compra", { ascending: false });

      if (error) throw error;

      // Carregar fornecedores e produtos separadamente
      const [fornecedoresData, produtosData] = await Promise.all([
        supabase.from("fornecedores").select("id, nome_fornecedor").eq("user_id", user.id),
        supabase.from("produtos").select("id, nome, codigo").eq("user_id", user.id),
      ]);

      // Mapear fornecedores e produtos aos dados
      const comprasComRelacoes = data?.map((compra) => {
        const fornecedor = fornecedoresData.data?.find((f) => f.id === compra.fornecedor_id);
        const itensComProdutos = compra.compras_nf_itens?.map((item: any) => {
          const produto = produtosData.data?.find((p) => p.id === item.produto_id);
          return { ...item, produto };
        });
        return { ...compra, fornecedor, compras_nf_itens: itensComProdutos };
      });

      setCompras(comprasComRelacoes || []);
    } catch (error: any) {
      console.error("Erro ao carregar compras:", error);
      toast.error("Erro ao carregar compras");
    }
  };

  const loadFornecedores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome_fornecedor")
        .eq("user_id", user.id)
        .order("nome_fornecedor");

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar fornecedores:", error);
    }
  };

  const loadProdutos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, codigo")
        .eq("user_id", user.id)
        .order("nome");

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const adicionarItem = () => {
    setItens([
      ...itens,
      {
        produto_id: "",
        quantidade: "",
        valor_compra: "",
        data_validade: "",
        observacoes: "",
      },
    ]);
  };

  const removerItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const atualizarItem = (index: number, field: keyof CompraItem, value: string) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [field]: value };
    setItens(novosItens);
  };

  const calcularValorTotal = () => {
    return itens.reduce((total, item) => {
      const valor = parseFloat(item.valor_compra) || 0;
      return total + valor;
    }, 0);
  };

  const formatarChaveNF = (value: string) => {
    // Remove tudo que não é número
    const numeros = value.replace(/\D/g, '');
    
    // Limita a 44 dígitos
    const limitado = numeros.slice(0, 44);
    
    // Adiciona espaços a cada 4 dígitos
    const formatado = limitado.match(/.{1,4}/g)?.join(' ') || limitado;
    
    return formatado;
  };

  const handleChaveNFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarChaveNF(e.target.value);
    setFormData({ ...formData, chave_nf: formatado });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.chave_nf || !formData.fornecedor_id || !formData.data_compra) {
      toast.error("Preencha todos os campos obrigatórios da NF");
      return;
    }

    const itensValidos = itens.filter(
      (item) => item.produto_id && item.quantidade && item.valor_compra
    );

    if (itensValidos.length === 0) {
      toast.error("Adicione pelo menos um produto válido");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const valorTotal = calcularValorTotal();
      
      // Remove espaços da chave NF antes de salvar
      const chaveNFLimpa = formData.chave_nf.replace(/\s/g, '');
      
      // Valida se tem exatamente 44 dígitos
      if (chaveNFLimpa.length !== 44) {
        toast.error("A chave da NF deve ter exatamente 44 dígitos");
        return;
      }

      // Inserir a NF
      const { data: nfData, error: nfError } = await supabase
        .from("compras_nf")
        .insert({
          user_id: user.id,
          chave_nf: chaveNFLimpa,
          fornecedor_id: formData.fornecedor_id,
          data_compra: formData.data_compra,
          valor_total: valorTotal,
        })
        .select()
        .single();

      if (nfError) throw nfError;

      // Inserir os itens
      const itensParaInserir = itensValidos.map((item) => ({
        nf_id: nfData.id,
        produto_id: item.produto_id,
        quantidade: parseFloat(item.quantidade),
        valor_compra: parseFloat(item.valor_compra),
        data_validade: item.data_validade || null,
        observacoes: item.observacoes || null,
      }));

      const { error: itensError } = await supabase
        .from("compras_nf_itens")
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      toast.success("Compra registrada com sucesso!");
      await loadCompras();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Erro ao salvar compra:", error);
      if (error.code === "23505") {
        toast.error("Esta chave de NF já foi cadastrada");
      } else {
        toast.error("Erro ao salvar compra");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      chave_nf: "",
      fornecedor_id: "",
      data_compra: "",
    });
    setItens([
      {
        produto_id: "",
        quantidade: "",
        valor_compra: "",
        data_validade: "",
        observacoes: "",
      },
    ]);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("compras_nf").delete().eq("id", deleteId);

      if (error) throw error;

      toast.success("Compra excluída com sucesso!");
      await loadCompras();
    } catch (error: any) {
      console.error("Erro ao excluir compra:", error);
      toast.error("Erro ao excluir compra");
    } finally {
      setDeleteId(null);
    }
  };

  const visualizarDetalhes = (compra: CompraNF) => {
    setSelectedCompra(compra);
    setIsDetailsOpen(true);
  };

  const comprasFiltradas = compras.filter((compra) => {
    if (filtroFornecedor && compra.fornecedor_id !== filtroFornecedor) return false;
    if (filtroDataInicio && compra.data_compra < filtroDataInicio) return false;
    if (filtroDataFim && compra.data_compra > filtroDataFim) return false;
    if (filtroProduto) {
      const temProduto = compra.compras_nf_itens?.some(
        (item) => item.produto_id === filtroProduto
      );
      if (!temProduto) return false;
    }
    return true;
  });

  const limparFiltros = () => {
    setFiltroFornecedor("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroProduto("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Compras Realizadas</h1>
          <p className="text-muted-foreground">Gerenciamento de Notas Fiscais de Compra</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {mostrarFiltros ? "Ocultar Filtros" : "Filtros"}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Compra (NF)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Compra (Nota Fiscal)</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados da NF */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Dados da Nota Fiscal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chave_nf">Chave de Acesso da NF *</Label>
                      <Input
                        id="chave_nf"
                        value={formData.chave_nf}
                        onChange={handleChaveNFChange}
                        placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                        maxLength={54}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        44 dígitos numéricos
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fornecedor_id">Fornecedor *</Label>
                      <Select
                        value={formData.fornecedor_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, fornecedor_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores.map((fornecedor) => (
                            <SelectItem key={fornecedor.id} value={fornecedor.id}>
                              {fornecedor.nome_fornecedor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data_compra">Data da Compra *</Label>
                      <Input
                        id="data_compra"
                        type="date"
                        value={formData.data_compra}
                        onChange={(e) =>
                          setFormData({ ...formData, data_compra: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Valor Total</Label>
                      <Input
                        value={`R$ ${calcularValorTotal().toFixed(2)}`}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* Itens da NF */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Produtos da NF</h3>
                    <Button type="button" size="sm" onClick={adicionarItem} className="gap-2">
                      <Plus className="h-3 w-3" />
                      Adicionar Item
                    </Button>
                  </div>

                  {itens.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">Item {index + 1}</span>
                        {itens.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removerItem(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Produto *</Label>
                          <Popover 
                            open={openProdutoIndex === index} 
                            onOpenChange={(open) => setOpenProdutoIndex(open ? index : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openProdutoIndex === index}
                                className="w-full justify-between"
                              >
                                {item.produto_id
                                  ? produtos.find((p) => p.id === item.produto_id)
                                      ? `${produtos.find((p) => p.id === item.produto_id)?.codigo} - ${produtos.find((p) => p.id === item.produto_id)?.nome}`
                                      : "Selecione o produto"
                                  : "Selecione o produto"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Buscar produto..." 
                                  className="h-9"
                                />
                                <CommandList>
                                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                  <CommandGroup>
                                    {produtos.map((produto) => (
                                      <CommandItem
                                        key={produto.id}
                                        value={`${produto.codigo} ${produto.nome}`}
                                        onSelect={() => {
                                          atualizarItem(index, "produto_id", produto.id);
                                          setOpenProdutoIndex(null);
                                        }}
                                      >
                                        {produto.codigo} - {produto.nome}
                                        <Check
                                          className={`ml-auto h-4 w-4 ${
                                            item.produto_id === produto.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantidade *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantidade}
                            onChange={(e) =>
                              atualizarItem(index, "quantidade", e.target.value)
                            }
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Valor de Compra *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.valor_compra}
                            onChange={(e) =>
                              atualizarItem(index, "valor_compra", e.target.value)
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Data de Validade</Label>
                          <Input
                            type="date"
                            value={item.data_validade}
                            onChange={(e) =>
                              atualizarItem(index, "data_validade", e.target.value)
                            }
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Observações</Label>
                          <Input
                            value={item.observacoes}
                            onChange={(e) =>
                              atualizarItem(index, "observacoes", e.target.value)
                            }
                            placeholder="Observações sobre este item"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar Compra</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Filtros</h3>
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              Limpar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome_fornecedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={filtroProduto} onValueChange={setFiltroProduto}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave da NF</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Data da Compra</TableHead>
              <TableHead>Qtd. Itens</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comprasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma compra cadastrada
                </TableCell>
              </TableRow>
            ) : (
              comprasFiltradas.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell className="font-mono text-xs">
                    {compra.chave_nf.substring(0, 20)}...
                  </TableCell>
                  <TableCell>{compra.fornecedor?.nome_fornecedor || "N/A"}</TableCell>
                  <TableCell>
                    {format(new Date(compra.data_compra), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{compra.compras_nf_itens?.length || 0}</TableCell>
                  <TableCell>R$ {compra.valor_total.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => visualizarDetalhes(compra)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(compra.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra</DialogTitle>
          </DialogHeader>
          {selectedCompra && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Chave da NF</Label>
                  <p className="font-mono text-sm break-all">{selectedCompra.chave_nf}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fornecedor</Label>
                  <p>{selectedCompra.fornecedor?.nome_fornecedor || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data da Compra</Label>
                  <p>{format(new Date(selectedCompra.data_compra), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Total</Label>
                  <p className="font-semibold">R$ {selectedCompra.valor_total.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Itens da Compra</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Obs.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCompra.compras_nf_itens?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.produto?.codigo} - {item.produto?.nome}
                        </TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>R$ {parseFloat(item.valor_compra).toFixed(2)}</TableCell>
                        <TableCell>
                          {item.data_validade
                            ? format(new Date(item.data_validade), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>{item.observacoes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

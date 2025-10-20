import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Filter, X } from "lucide-react";
import { toast } from "sonner";

interface Produto {
  id: string;
  descricao: string;
  precoCusto: number;
  margemLucro: number;
  imposto: number;
  taxaCartao: number;
  codigo: string;
  valorVenda: number;
  lucroUnitario: number;
  dataCadastro: string;
}

const Produtos = () => {
  const [produtos, setProdutos] = useState<Produto[]>(() => {
    const saved = localStorage.getItem("produtos");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  const [filtros, setFiltros] = useState({
    nome: "",
    codigo: ""
  });
  
  const [formData, setFormData] = useState({
    descricao: "",
    precoCusto: "",
    margemLucro: "",
    imposto: "",
    taxaCartao: "2.33",
    codigo: "",
    valorVenda: ""
  });

  // Salvar no localStorage
  useEffect(() => {
    localStorage.setItem("produtos", JSON.stringify(produtos));
  }, [produtos]);

  // Gerar próximo código automático
  const gerarProximoCodigo = (): string => {
    if (produtos.length === 0) {
      return "0000000000001";
    }
    
    const codigosNumericos = produtos
      .map(p => parseInt(p.codigo))
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a);
    
    const maiorCodigo = codigosNumericos.length > 0 ? codigosNumericos[0] : 0;
    const proximoCodigo = maiorCodigo + 1;
    
    return proximoCodigo.toString().padStart(13, '0');
  };

  // Preencher código ao abrir dialog de cadastro
  useEffect(() => {
    if (isDialogOpen && !produtoSelecionado) {
      setFormData(prev => ({
        ...prev,
        codigo: gerarProximoCodigo()
      }));
    }
  }, [isDialogOpen, produtoSelecionado]);

  // Calcular Valor de Venda e Lucro Unitário em tempo real
  const calcularValores = useMemo(() => {
    const precoCusto = parseFloat(formData.precoCusto) || 0;
    const margemLucro = parseFloat(formData.margemLucro) || 0;
    const imposto = parseFloat(formData.imposto) || 0;
    const taxaCartao = parseFloat(formData.taxaCartao) || 0;
    
    if (precoCusto <= 0) {
      return { valorVenda: 0, lucroUnitario: 0, margemCalculada: 0 };
    }
    
    // Se Margem de Lucro foi preenchida, calcular Valor de Venda
    if (margemLucro > 0) {
      const percentualTotal = (margemLucro + imposto + taxaCartao) / 100;
      const valorVenda = precoCusto / (1 - percentualTotal);
      
      const lucroUnitario = valorVenda - precoCusto - (valorVenda * imposto / 100) - (valorVenda * taxaCartao / 100);
      
      return { 
        valorVenda: parseFloat(valorVenda.toFixed(2)), 
        lucroUnitario: parseFloat(lucroUnitario.toFixed(2)),
        margemCalculada: margemLucro
      };
    } 
    // Se Valor de Venda foi preenchido manualmente, calcular Margem de Lucro
    else if (formData.valorVenda) {
      const valorVenda = parseFloat(formData.valorVenda) || 0;
      
      if (valorVenda <= precoCusto) {
        return { valorVenda, lucroUnitario: 0, margemCalculada: 0 };
      }
      
      const lucroUnitario = valorVenda - precoCusto - (valorVenda * imposto / 100) - (valorVenda * taxaCartao / 100);
      const margemCalculada = ((valorVenda - precoCusto) / valorVenda) * 100 - imposto - taxaCartao;
      
      return { 
        valorVenda, 
        lucroUnitario: parseFloat(lucroUnitario.toFixed(2)),
        margemCalculada: parseFloat(margemCalculada.toFixed(2))
      };
    }
    
    // Caso apenas Preço de Custo esteja preenchido
    return { valorVenda: precoCusto, lucroUnitario: 0, margemCalculada: 0 };
  }, [formData.precoCusto, formData.margemLucro, formData.imposto, formData.taxaCartao, formData.valorVenda]);

  // Atualizar Valor de Venda automaticamente
  useEffect(() => {
    if (formData.precoCusto && (formData.margemLucro || formData.imposto || formData.taxaCartao)) {
      setFormData(prev => ({
        ...prev,
        valorVenda: calcularValores.valorVenda.toString()
      }));
    }
  }, [calcularValores.valorVenda, formData.precoCusto, formData.margemLucro, formData.imposto, formData.taxaCartao]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const resetForm = () => {
    setFormData({
      descricao: "",
      precoCusto: "",
      margemLucro: "",
      imposto: "",
      taxaCartao: "2.33",
      codigo: "",
      valorVenda: ""
    });
    setProdutoSelecionado(null);
    setIsDialogOpen(false);
  };

  const abrirEdicao = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setFormData({
      descricao: produto.descricao,
      precoCusto: produto.precoCusto.toString(),
      margemLucro: produto.margemLucro.toString(),
      imposto: produto.imposto.toString(),
      taxaCartao: produto.taxaCartao.toString(),
      codigo: produto.codigo,
      valorVenda: produto.valorVenda.toString()
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.descricao.trim()) {
      toast.error("Favor preencher a descrição do produto!");
      return;
    }

    if (!formData.precoCusto || parseFloat(formData.precoCusto) < 0) {
      toast.error("Favor preencher o preço de custo do produto!");
      return;
    }

    if (!formData.codigo || formData.codigo.length !== 13) {
      toast.error("O código deve ter exatamente 13 dígitos!");
      return;
    }

    // Verificar código duplicado
    const codigoExiste = produtos.some(p => 
      p.codigo === formData.codigo && p.id !== produtoSelecionado?.id
    );
    
    if (codigoExiste) {
      toast.error("Já existe um produto com este código!");
      return;
    }

    if (!formData.valorVenda || parseFloat(formData.valorVenda) <= 0) {
      toast.error("Favor preencher o valor de venda!");
      return;
    }

    const novoProduto: Produto = {
      id: produtoSelecionado?.id || Date.now().toString(),
      descricao: formData.descricao.trim(),
      precoCusto: parseFloat(formData.precoCusto),
      margemLucro: parseFloat(formData.margemLucro) || 0,
      imposto: parseFloat(formData.imposto) || 0,
      taxaCartao: parseFloat(formData.taxaCartao) || 0,
      codigo: formData.codigo,
      valorVenda: parseFloat(formData.valorVenda),
      lucroUnitario: calcularValores.lucroUnitario,
      dataCadastro: produtoSelecionado?.dataCadastro || new Date().toISOString()
    };

    if (produtoSelecionado) {
      setProdutos(produtos.map(p => p.id === produtoSelecionado.id ? novoProduto : p));
      toast.success("Produto atualizado com sucesso!");
    } else {
      setProdutos([...produtos, novoProduto]);
      toast.success("Produto cadastrado com sucesso!");
    }

    resetForm();
  };

  const handleExcluir = async () => {
    if (!produtoSelecionado) return;
    
    setProdutos(produtos.filter(p => p.id !== produtoSelecionado.id));
    toast.success(`Produto "${produtoSelecionado.descricao}" excluído com sucesso!`);
    setIsDeleteDialogOpen(false);
    setProdutoSelecionado(null);
  };

  // Lógica de Filtragem
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(produto => {
      const matchNome = produto.descricao.toLowerCase().includes(filtros.nome.toLowerCase());
      const matchCodigo = produto.codigo.includes(filtros.codigo);
      
      return matchNome && matchCodigo;
    });
  }, [produtos, filtros]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground text-xs">Gerencie os produtos físicos</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setMostrarFiltros(!mostrarFiltros)} 
            className="h-8 text-xs gap-2"
          >
            <Filter className="h-3 w-3" />
            {mostrarFiltros ? "Ocultar Filtros" : "Aplicar Filtros"}
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs">
                <Plus className="h-3 w-3" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {produtoSelecionado ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
                <DialogDescription className="text-[10px]">
                  Preencha os dados do produto
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Linha 1: Descrição */}
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-semibold">Descrição do Produto *</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Shampoo Premium 500ml"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Linha 2: Preço de Custo e Código */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Preço de Custo *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precoCusto}
                      onChange={(e) => setFormData({ ...formData, precoCusto: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs"
                    />
                  </div>
                  
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Código (13 dígitos) *</Label>
                    <Input
                      type="text"
                      maxLength={13}
                      value={formData.codigo}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, codigo: valor });
                      }}
                      placeholder="0000000000001"
                      className="h-8 text-xs"
                    />
                    {formData.codigo.length > 0 && formData.codigo.length !== 13 && (
                      <p className="text-[9px] text-destructive">O código deve ter exatamente 13 dígitos</p>
                    )}
                  </div>
                </div>

                {/* Linha 3: Margem de Lucro, Imposto, Taxa de Cartão */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Margem de Lucro (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.margemLucro}
                      onChange={(e) => setFormData({ ...formData, margemLucro: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs"
                    />
                    {calcularValores.margemCalculada > 0 && !formData.margemLucro && (
                      <p className="text-[9px] text-muted-foreground">
                        Calculado: {calcularValores.margemCalculada.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Imposto (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.imposto}
                      onChange={(e) => setFormData({ ...formData, imposto: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs"
                    />
                  </div>
                  
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Taxa de Cartão (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxaCartao}
                      onChange={(e) => setFormData({ ...formData, taxaCartao: e.target.value })}
                      placeholder="2.33"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Linha 4: Valor de Venda */}
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-semibold">Valor de Venda *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valorVenda}
                    onChange={(e) => setFormData({ ...formData, valorVenda: e.target.value })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Informação de Lucro Unitário */}
                <div className="bg-secondary/30 p-2 rounded-md border">
                  <p className="text-xs font-semibold text-center">
                    O valor do Lucro Unitário será de{" "}
                    <span className="text-primary">
                      {formatCurrency(calcularValores.lucroUnitario)}
                    </span>
                  </p>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button type="submit" className="h-7 text-xs">
                    {produtoSelecionado ? "Atualizar" : "Salvar Produto"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seção de Filtros */}
      {mostrarFiltros && (
        <Card>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Filtros
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setMostrarFiltros(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Pesquisar pelo Nome do Produto</Label>
                <Input
                  value={filtros.nome}
                  onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
                  placeholder="Digite o nome..."
                  className="h-7 text-xs"
                />
              </div>
              
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Pesquisar pelo Código do Produto</Label>
                <Input
                  value={filtros.codigo}
                  onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value })}
                  placeholder="Digite o código..."
                  className="h-7 text-xs"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setFiltros({ nome: "", codigo: "" })}
                className="h-7 text-xs gap-2"
              >
                <X className="h-3 w-3" />
                Limpar Filtros
              </Button>
              <Button 
                onClick={() => setMostrarFiltros(false)} 
                className="h-7 text-xs gap-2"
              >
                <Filter className="h-3 w-3" />
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Produtos */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Lista de Produtos</CardTitle>
          <CardDescription className="text-xs">
            Total: {produtosFiltrados.length} produtos cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold text-xs">Descrição</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Preço de Custo</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Margem (%)</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Imposto (%)</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Taxa Cartão (%)</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Código</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Valor de Venda</th>
                  <th className="text-right py-2 px-2 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum produto cadastrado
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((produto) => (
                    <tr 
                      key={produto.id} 
                      className="border-b hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => abrirEdicao(produto)}
                    >
                      <td className="py-2 px-2 text-xs font-medium">{produto.descricao}</td>
                      <td className="py-2 px-2 text-xs">{formatCurrency(produto.precoCusto)}</td>
                      <td className="py-2 px-2 text-xs">{produto.margemLucro.toFixed(2)}%</td>
                      <td className="py-2 px-2 text-xs">{produto.imposto.toFixed(2)}%</td>
                      <td className="py-2 px-2 text-xs">{produto.taxaCartao.toFixed(2)}%</td>
                      <td className="py-2 px-2 text-xs font-mono">{produto.codigo}</td>
                      <td className="py-2 px-2 text-xs font-semibold">{formatCurrency(produto.valorVenda)}</td>
                      <td className="py-2 px-2">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => abrirEdicao(produto)} 
                            className="h-6 w-6 p-0"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setProdutoSelecionado(produto);
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

      {/* Dialog de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir o produto <strong>{produtoSelecionado?.descricao}</strong>?</p>
              {produtoSelecionado && (
                <div className="text-xs bg-secondary/50 p-2 rounded space-y-1">
                  <p><strong>Código:</strong> {produtoSelecionado.codigo}</p>
                  <p><strong>Valor:</strong> {formatCurrency(produtoSelecionado.valorVenda)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Produtos;

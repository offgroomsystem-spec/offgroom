import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

interface Servico {
  id: string;
  nome: string;
  valor: number;
}

interface ServicoSelecionado {
  id: string;
  nome: string;
  valor: number;
}

interface Pacote {
  id: string;
  nome: string;
  servicos: ServicoSelecionado[];
  validade: string;
  descontoPercentual: number;
  descontoValor: number;
  valorFinal: number;
}

const Pacotes = () => {
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPacote, setEditingPacote] = useState<Pacote | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([]);
  const [servicoAtual, setServicoAtual] = useState<string>("");

  const [formData, setFormData] = useState({
    nome: "",
    validade: "",
    descontoPercentual: "",
    descontoValor: "",
  });

  // Carregar serviços do localStorage
  useEffect(() => {
    const servicosData = localStorage.getItem("servicos");
    if (servicosData) {
      setServicos(JSON.parse(servicosData));
    }
  }, []);

  // Calcular valor total dos serviços
  const valorTotalServicos = servicosSelecionados.reduce((acc, s) => acc + s.valor, 0);

  // Calcular desconto em valor quando percentual é alterado
  const handleDescontoPercentualChange = (value: string) => {
    const percentual = parseFloat(value) || 0;
    const valorDesconto = (valorTotalServicos * percentual) / 100;
    setFormData({
      ...formData,
      descontoPercentual: value,
      descontoValor: valorDesconto.toFixed(2),
    });
  };

  // Calcular desconto em percentual quando valor é alterado
  const handleDescontoValorChange = (value: string) => {
    const valorDesconto = parseFloat(value) || 0;
    const percentual = valorTotalServicos > 0 ? (valorDesconto / valorTotalServicos) * 100 : 0;
    setFormData({
      ...formData,
      descontoValor: value,
      descontoPercentual: percentual.toFixed(2),
    });
  };

  // Adicionar serviço ao pacote
  const handleAddServico = () => {
    if (!servicoAtual) {
      toast.error("Selecione um serviço");
      return;
    }

    const servico = servicos.find(s => s.id === servicoAtual);
    if (servico && !servicosSelecionados.find(s => s.id === servico.id)) {
      setServicosSelecionados([...servicosSelecionados, servico]);
      setServicoAtual("");
    }
  };

  // Remover serviço do pacote
  const handleRemoveServico = (id: string) => {
    setServicosSelecionados(servicosSelecionados.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) {
      toast.error("Favor preencher o Nome do Pacote");
      return;
    }
    if (servicosSelecionados.length === 0) {
      toast.error("Favor adicionar ao menos um serviço ao pacote");
      return;
    }
    if (!formData.validade) {
      toast.error("Favor preencher a Válidade do Pacote");
      return;
    }

    const descontoValor = parseFloat(formData.descontoValor) || 0;
    const valorFinal = valorTotalServicos - descontoValor;

    if (editingPacote) {
      setPacotes(pacotes.map(p => 
        p.id === editingPacote.id ? {
          id: editingPacote.id,
          nome: formData.nome,
          servicos: servicosSelecionados,
          validade: formData.validade,
          descontoPercentual: parseFloat(formData.descontoPercentual) || 0,
          descontoValor: descontoValor,
          valorFinal: valorFinal,
        } : p
      ));
      toast.success("Pacote atualizado com sucesso!");
    } else {
      const novoPacote: Pacote = {
        id: Date.now().toString(),
        nome: formData.nome,
        servicos: servicosSelecionados,
        validade: formData.validade,
        descontoPercentual: parseFloat(formData.descontoPercentual) || 0,
        descontoValor: descontoValor,
        valorFinal: valorFinal,
      };
      setPacotes([...pacotes, novoPacote]);
      toast.success("Pacote cadastrado com sucesso!");
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nome: "", validade: "", descontoPercentual: "", descontoValor: "" });
    setServicosSelecionados([]);
    setServicoAtual("");
    setEditingPacote(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (pacote: Pacote) => {
    setEditingPacote(pacote);
    setFormData({
      nome: pacote.nome,
      validade: pacote.validade,
      descontoPercentual: pacote.descontoPercentual.toString(),
      descontoValor: pacote.descontoValor.toString(),
    });
    setServicosSelecionados(pacote.servicos);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setPacotes(pacotes.filter(p => p.id !== id));
    toast.success("Pacote removido com sucesso!");
  };

  const filteredPacotes = pacotes.filter(pacote =>
    pacote.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const valorFinalCalculado = valorTotalServicos - (parseFloat(formData.descontoValor) || 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Pacotes</h1>
          <p className="text-muted-foreground text-xs">Gerencie os pacotes de serviços</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-8 text-xs">
              <Plus className="h-3 w-3" />
              Novo Pacote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">{editingPacote ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados do pacote
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nome" className="text-xs">Nome do Pacote</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Pacote Completo"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Serviços do Pacote</Label>
                <div className="flex gap-2">
                  <Select value={servicoAtual} onValueChange={setServicoAtual}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id} className="text-xs">
                          {servico.nome} - {formatCurrency(servico.valor)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddServico} size="sm" className="h-8 w-8 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {servicosSelecionados.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {servicosSelecionados.map((servico) => (
                      <div key={servico.id} className="flex items-center justify-between bg-secondary/50 p-2 rounded text-xs">
                        <span>{servico.nome} - {formatCurrency(servico.valor)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveServico(servico.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="font-semibold text-xs mt-2">
                      Valor Total dos Serviços: {formatCurrency(valorTotalServicos)}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="validade" className="text-xs">Dias de Válidade do Pacote</Label>
                <Input
                  id="validade"
                  type="number"
                  min="1"
                  value={formData.validade}
                  onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                  placeholder="Ex: 30"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="descontoPercentual" className="text-xs">Desconto (%)</Label>
                  <Input
                    id="descontoPercentual"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.descontoPercentual}
                    onChange={(e) => handleDescontoPercentualChange(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="descontoValor" className="text-xs">Desconto (R$)</Label>
                  <Input
                    id="descontoValor"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.descontoValor}
                    onChange={(e) => handleDescontoValorChange(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 bg-secondary/30 p-3 rounded">
                <Label className="text-xs font-semibold">Valor Final do Pacote</Label>
                <div className="text-lg font-bold text-accent">
                  {formatCurrency(valorFinalCalculado)}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs">
                  {editingPacote ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base">Lista de Pacotes</CardTitle>
              <CardDescription className="text-xs">Total: {pacotes.length} pacotes cadastrados</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar pacote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-xs">Pacote</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Serviços</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Válidade</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Desconto</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Valor Final</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPacotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum pacote cadastrado
                    </td>
                  </tr>
                ) : (
                  filteredPacotes.map((pacote) => (
                    <tr key={pacote.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-xs">{pacote.nome}</td>
                      <td className="py-2 px-3 text-xs">
                        {pacote.servicos.map(s => s.nome).join(", ")}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {pacote.validade} dias
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {pacote.descontoPercentual.toFixed(2)}% ({formatCurrency(pacote.descontoValor)})
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-accent/10 text-accent text-xs">
                          {formatCurrency(pacote.valorFinal)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(pacote)} className="h-7 w-7 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(pacote.id)} className="h-7 w-7 p-0">
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
    </div>
  );
};

export default Pacotes;

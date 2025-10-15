import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Despesa {
  id: string;
  tipo: "Despesa Operacional" | "Despesa Não Operacional";
  descricao: string;
}

const Despesas = () => {
  const [despesas, setDespesas] = useState<Despesa[]>(() => {
    const saved = localStorage.getItem('despesas');
    return saved ? JSON.parse(saved) : [];
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [despesaSelecionada, setDespesaSelecionada] = useState<Despesa | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState<{
    tipo: "Despesa Operacional" | "Despesa Não Operacional" | "";
    descricao: string;
  }>({
    tipo: "",
    descricao: "",
  });

  useEffect(() => {
    localStorage.setItem('despesas', JSON.stringify(despesas));
  }, [despesas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo) {
      toast.error("Favor selecionar o tipo de despesa");
      return;
    }
    if (!formData.descricao.trim()) {
      toast.error("Favor preencher a descrição da despesa");
      return;
    }
    
    const novaDespesa: Despesa = {
      id: Date.now().toString(),
      tipo: formData.tipo,
      descricao: formData.descricao,
    };
    
    setDespesas([...despesas, novaDespesa]);
    toast.success("Despesa cadastrada com sucesso!");
    resetForm();
  };

  const handleEditar = () => {
    if (!despesaSelecionada) return;
    
    if (!formData.tipo) {
      toast.error("Favor selecionar o tipo de despesa");
      return;
    }
    if (!formData.descricao.trim()) {
      toast.error("Favor preencher a descrição da despesa");
      return;
    }
    
    setDespesas(despesas.map(d => 
      d.id === despesaSelecionada.id 
        ? { ...despesaSelecionada, tipo: formData.tipo as "Despesa Operacional" | "Despesa Não Operacional", descricao: formData.descricao }
        : d
    ));
    
    toast.success("Despesa atualizada com sucesso!");
    resetForm();
    setDespesaSelecionada(null);
    setIsEditDialogOpen(false);
  };

  const handleExcluir = () => {
    if (!despesaSelecionada) return;
    
    setDespesas(despesas.filter(d => d.id !== despesaSelecionada.id));
    toast.success("Despesa excluída com sucesso!");
    setDespesaSelecionada(null);
    setIsDeleteDialogOpen(false);
  };

  const handleSelecionarDespesa = (despesa: Despesa) => {
    setDespesaSelecionada(despesa);
  };

  const resetForm = () => {
    setFormData({ tipo: "", descricao: "" });
    setIsDialogOpen(false);
  };

  const abrirEdicao = () => {
    if (!despesaSelecionada) return;
    setFormData({
      tipo: despesaSelecionada.tipo,
      descricao: despesaSelecionada.descricao,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cadastro de Despesas</h1>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs">
                <Plus className="h-3 w-3" />
                Cadastrar Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Despesa</DialogTitle>
                <DialogDescription className="text-xs">
                  Preencha os dados da despesa
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="tipo" className="text-xs">Tipo de Despesa *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Despesa Operacional" className="text-xs">
                        Despesa Operacional
                      </SelectItem>
                      <SelectItem value="Despesa Não Operacional" className="text-xs">
                        Despesa Não Operacional
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="descricao" className="text-xs">Descrição da Despesa *</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Ex: Compra de materiais"
                  />
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

          {despesaSelecionada && (
            <>
              <Button 
                variant="outline" 
                className="gap-2 h-8 text-xs"
                onClick={abrirEdicao}
              >
                <Edit2 className="h-3 w-3" />
                Editar Despesa
              </Button>
              <Button 
                variant="destructive" 
                className="gap-2 h-8 text-xs"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
                Excluir Despesa
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {despesas.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground text-xs">
              Nenhuma despesa cadastrada
            </CardContent>
          </Card>
        ) : (
          despesas.map((despesa) => (
            <Card 
              key={despesa.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                despesaSelecionada?.id === despesa.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => handleSelecionarDespesa(despesa)}
            >
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{despesa.descricao}</CardTitle>
                <CardDescription className="text-xs">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    despesa.tipo === "Despesa Operacional" 
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                      : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  }`}>
                    {despesa.tipo}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que gostaria de excluir a Despesa "{despesaSelecionada?.descricao}"?
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que gostaria de editar a Despesa "{despesaSelecionada?.descricao}"?
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditar(); }} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="tipo-edit" className="text-xs">Tipo de Despesa *</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Despesa Operacional" className="text-xs">
                    Despesa Operacional
                  </SelectItem>
                  <SelectItem value="Despesa Não Operacional" className="text-xs">
                    Despesa Não Operacional
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="descricao-edit" className="text-xs">Descrição da Despesa *</Label>
              <Input
                id="descricao-edit"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="h-8 text-xs"
                placeholder="Ex: Compra de materiais"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)} 
                className="h-8 text-xs"
              >
                Não
              </Button>
              <Button type="submit" className="h-8 text-xs">
                Sim
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Despesas;

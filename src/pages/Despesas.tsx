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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Despesa {
  id: string;
  tipo: "Despesa Operacional" | "Despesa Não Operacional";
  descricao: string;
}

const Despesas = () => {
  const { user } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (user) {
      loadDespesas();
    }
  }, [user]);

  const loadDespesas = async () => {
    try {
      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', user?.id)
        .eq('valor', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const despesasFormatadas = data.map((d: any) => ({
          id: d.id,
          tipo: d.categoria as "Despesa Operacional" | "Despesa Não Operacional",
          descricao: d.descricao
        }));
        setDespesas(despesasFormatadas);
      }
    } catch (error: any) {
      console.error('Erro ao carregar despesas:', error);
      toast.error("Erro ao carregar despesas");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!formData.tipo) {
      toast.error("Favor selecionar o tipo de despesa");
      return;
    }
    if (!formData.descricao.trim()) {
      toast.error("Favor preencher a descrição da despesa");
      return;
    }
    
    try {
      const despesaData = {
        categoria: formData.tipo,
        descricao: formData.descricao.trim(),
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        user_id: user.id
      };

      const { error } = await supabase
        .from('despesas')
        .insert([despesaData]);

      if (error) throw error;

      toast.success("Despesa cadastrada com sucesso!");
      await loadDespesas();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar despesa:', error);
      toast.error("Erro ao salvar despesa");
    }
  };

  const handleEditar = async () => {
    if (!despesaSelecionada || !user) return;
    
    if (!formData.tipo) {
      toast.error("Favor selecionar o tipo de despesa");
      return;
    }
    if (!formData.descricao.trim()) {
      toast.error("Favor preencher a descrição da despesa");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('despesas')
        .update({
          categoria: formData.tipo,
          descricao: formData.descricao.trim()
        })
        .eq('id', despesaSelecionada.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Despesa atualizada com sucesso!");
      await loadDespesas();
      resetForm();
      setDespesaSelecionada(null);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao atualizar despesa:', error);
      toast.error("Erro ao atualizar despesa");
    }
  };

  const handleExcluir = async () => {
    if (!despesaSelecionada || !user) return;
    
    try {
      const { error } = await supabase
        .from('despesas')
        .delete()
        .eq('id', despesaSelecionada.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Despesa excluída com sucesso!");
      await loadDespesas();
      setDespesaSelecionada(null);
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao excluir despesa:', error);
      toast.error("Erro ao excluir despesa");
    }
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

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

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

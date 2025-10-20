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

interface Receita {
  id: string;
  tipo: "Receita Operacional" | "Receita Não Operacional";
  descricao: string;
}

const Receitas = () => {
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [receitaSelecionada, setReceitaSelecionada] = useState<Receita | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState<{
    tipo: "Receita Operacional" | "Receita Não Operacional" | "";
    descricao: string;
  }>({
    tipo: "",
    descricao: "",
  });

  useEffect(() => {
    if (user) {
      loadReceitas();
    }
  }, [user]);

  const loadReceitas = async () => {
    try {
      const { data, error } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', user?.id)
        .eq('valor', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const receitasFormatadas = data.map((r: any) => ({
          id: r.id,
          tipo: r.categoria as "Receita Operacional" | "Receita Não Operacional",
          descricao: r.descricao
        }));
        setReceitas(receitasFormatadas);
      }
    } catch (error: any) {
      console.error('Erro ao carregar receitas:', error);
      toast.error("Erro ao carregar receitas");
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
      toast.error("Favor selecionar o tipo de receita");
      return;
    }
    if (!formData.descricao.trim()) {
      toast.error("Favor preencher a descrição da receita");
      return;
    }
    
    try {
      const receitaData = {
        categoria: formData.tipo,
        descricao: formData.descricao.trim(),
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        user_id: user.id
      };

      const { error } = await supabase
        .from('receitas')
        .insert([receitaData]);

      if (error) throw error;

      toast.success("Receita cadastrada com sucesso!");
      await loadReceitas();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar receita:', error);
      toast.error("Erro ao salvar receita");
    }
  };

  const handleEditar = async () => {
    if (!receitaSelecionada || !user) return;
    
    if (!formData.tipo) {
      toast.error("Favor selecionar o tipo de receita");
      return;
    }
    if (!formData.descricao.trim()) {
      toast.error("Favor preencher a descrição da receita");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('receitas')
        .update({
          categoria: formData.tipo,
          descricao: formData.descricao.trim()
        })
        .eq('id', receitaSelecionada.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Receita atualizada com sucesso!");
      await loadReceitas();
      resetForm();
      setReceitaSelecionada(null);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao atualizar receita:', error);
      toast.error("Erro ao atualizar receita");
    }
  };

  const handleExcluir = async () => {
    if (!receitaSelecionada || !user) return;
    
    try {
      const { error } = await supabase
        .from('receitas')
        .delete()
        .eq('id', receitaSelecionada.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Receita excluída com sucesso!");
      await loadReceitas();
      setReceitaSelecionada(null);
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao excluir receita:', error);
      toast.error("Erro ao excluir receita");
    }
  };

  const handleSelecionarReceita = (receita: Receita) => {
    setReceitaSelecionada(receita);
  };

  const resetForm = () => {
    setFormData({ tipo: "", descricao: "" });
    setIsDialogOpen(false);
  };

  const abrirEdicao = () => {
    if (!receitaSelecionada) return;
    setFormData({
      tipo: receitaSelecionada.tipo,
      descricao: receitaSelecionada.descricao,
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cadastro de Receitas</h1>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs">
                <Plus className="h-3 w-3" />
                Cadastrar Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Receita</DialogTitle>
                <DialogDescription className="text-xs">
                  Preencha os dados da receita
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="tipo" className="text-xs">Tipo de Receita *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita Operacional" className="text-xs">
                        Receita Operacional
                      </SelectItem>
                      <SelectItem value="Receita Não Operacional" className="text-xs">
                        Receita Não Operacional
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="descricao" className="text-xs">Descrição da Receita *</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Ex: Venda de serviços"
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

          {receitaSelecionada && (
            <>
              <Button 
                variant="outline" 
                className="gap-2 h-8 text-xs"
                onClick={abrirEdicao}
              >
                <Edit2 className="h-3 w-3" />
                Editar Receita
              </Button>
              <Button 
                variant="destructive" 
                className="gap-2 h-8 text-xs"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
                Excluir Receita
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {receitas.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground text-xs">
              Nenhuma receita cadastrada
            </CardContent>
          </Card>
        ) : (
          receitas.map((receita) => (
            <Card 
              key={receita.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                receitaSelecionada?.id === receita.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => handleSelecionarReceita(receita)}
            >
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{receita.descricao}</CardTitle>
                <CardDescription className="text-xs">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    receita.tipo === "Receita Operacional" 
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  }`}>
                    {receita.tipo}
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
              Tem certeza que gostaria de excluir a Receita "{receitaSelecionada?.descricao}"?
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
            <DialogTitle>Editar Receita</DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que gostaria de editar a Receita "{receitaSelecionada?.descricao}"?
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditar(); }} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="tipo-edit" className="text-xs">Tipo de Receita *</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita Operacional" className="text-xs">
                    Receita Operacional
                  </SelectItem>
                  <SelectItem value="Receita Não Operacional" className="text-xs">
                    Receita Não Operacional
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="descricao-edit" className="text-xs">Descrição da Receita *</Label>
              <Input
                id="descricao-edit"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="h-8 text-xs"
                placeholder="Ex: Venda de serviços"
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

export default Receitas;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Servico {
  id: string;
  nome: string;
  valor: number;
  porte: string;
  raca: string;
}

interface Raca {
  nome: string;
  porte: string;
}

const Servicos = () => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [racasDisponiveis, setRacasDisponiveis] = useState<Raca[]>([]);
  const [racasFiltradas, setRacasFiltradas] = useState<Raca[]>([]);

  const [formData, setFormData] = useState({
    nome: "",
    valor: "",
    porte: "",
    raca: "",
  });

  // Fetch raças from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchRacas = async () => {
      // Buscar raças padrão
      const { data: racasPadrao } = await supabase
        .from('racas_padrao')
        .select('nome, porte')
        .order('nome');
      
      // Buscar raças customizadas do usuário
      const { data: racasCustom } = await supabase
        .from('racas')
        .select('nome, porte')
        .eq('user_id', user.id)
        .order('nome');
      
      // Combinar e remover duplicatas
      const todasRacas = [...(racasPadrao || []), ...(racasCustom || [])];
      const racasUnicas = Array.from(
        new Map(todasRacas.map(r => [r.nome, r])).values()
      );
      
      setRacasDisponiveis(racasUnicas);
    };
    
    fetchRacas();
  }, [user]);

  // Fetch servicos from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchServicos = async () => {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error fetching services:', error);
        toast.error('Erro ao carregar serviços');
      } else {
        setServicos(data || []);
      }
      setLoading(false);
    };
    
    fetchServicos();
  }, [user]);

  // Filtrar raças por porte
  useEffect(() => {
    if (formData.porte) {
      const filtradas = racasDisponiveis.filter(r => r.porte === formData.porte);
      setRacasFiltradas(filtradas);
      
      // Limpar raça se não estiver no porte selecionado
      if (formData.raca) {
        const racaValida = filtradas.find(r => r.nome === formData.raca);
        if (!racaValida) {
          setFormData(prev => ({ ...prev, raca: "" }));
        }
      }
    } else {
      setRacasFiltradas([]);
    }
  }, [formData.porte, racasDisponiveis]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    // Validações
    if (!formData.nome || !formData.valor || !formData.porte || !formData.raca) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    if (editingServico) {
      const { error } = await supabase
        .from('servicos')
        .update({
          nome: formData.nome,
          valor: parseFloat(formData.valor),
          porte: formData.porte,
          raca: formData.raca,
        })
        .eq('id', editingServico.id)
        .eq('user_id', user.id);
        
      if (error) {
        toast.error("Erro ao atualizar serviço");
        console.error(error);
        return;
      }
      
      setServicos(servicos.map(s => 
        s.id === editingServico.id 
          ? { 
              ...s,
              nome: formData.nome, 
              valor: parseFloat(formData.valor),
              porte: formData.porte,
              raca: formData.raca,
            }
          : s
      ));
      toast.success("Serviço atualizado com sucesso!");
    } else {
      const { data, error } = await supabase
        .from('servicos')
        .insert([{
          user_id: user.id,
          nome: formData.nome,
          valor: parseFloat(formData.valor),
          porte: formData.porte,
          raca: formData.raca,
        }])
        .select()
        .single();
        
      if (error) {
        toast.error("Erro ao cadastrar serviço");
        console.error(error);
        return;
      }
      
      if (data) {
        setServicos([...servicos, data]);
      }
      toast.success("Serviço cadastrado com sucesso!");
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nome: "", valor: "", porte: "", raca: "" });
    setEditingServico(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (servico: Servico) => {
    setEditingServico(servico);
    setFormData({ 
      nome: servico.nome, 
      valor: servico.valor.toString(),
      porte: servico.porte || "",
      raca: servico.raca || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('servicos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      toast.error("Erro ao remover serviço");
      console.error(error);
      return;
    }
    
    setServicos(servicos.filter(s => s.id !== id));
    toast.success("Serviço removido com sucesso!");
  };

  const filteredServicos = servicos.filter(servico =>
    servico.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground text-xs">Gerencie os serviços oferecidos</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-8 text-xs">
              <Plus className="h-3 w-3" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg">{editingServico ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados do serviço
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nome" className="text-xs">Nome do Serviço</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Banho e Tosa"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="valor" className="text-xs">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0.00"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="porte" className="text-xs">Porte do Pet *</Label>
                <Select
                  value={formData.porte}
                  onValueChange={(value) => setFormData({ ...formData, porte: value })}
                  required
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pequeno">Pequeno</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="raca" className="text-xs">Raça do Pet *</Label>
                <Select
                  value={formData.raca}
                  onValueChange={(value) => setFormData({ ...formData, raca: value })}
                  disabled={!formData.porte}
                  required
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={
                      formData.porte 
                        ? "Selecione a raça" 
                        : "Selecione o porte primeiro"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {racasFiltradas.length === 0 && formData.porte && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        Nenhuma raça cadastrada para este porte
                      </div>
                    )}
                    {racasFiltradas.map((raca) => (
                      <SelectItem key={raca.nome} value={raca.nome}>
                        {raca.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs">
                  {editingServico ? "Atualizar" : "Salvar"}
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
              <CardTitle className="text-base">Lista de Serviços</CardTitle>
              <CardDescription className="text-xs">Total: {servicos.length} serviços cadastrados</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar serviço..."
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
                  <th className="text-left py-2 px-3 font-semibold text-xs">Serviço</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Valor</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredServicos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum serviço cadastrado
                    </td>
                  </tr>
                ) : (
                  filteredServicos.map((servico) => (
                    <tr key={servico.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-xs">{servico.nome}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent">
                          {formatCurrency(servico.valor)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(servico)} className="h-7 w-7 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(servico.id)} className="h-7 w-7 p-0">
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

export default Servicos;

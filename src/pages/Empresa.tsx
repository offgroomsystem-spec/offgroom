import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EmpresaConfig {
  id?: string;
  bordao: string;
  horarioInicio: string;
  horarioFim: string;
}

interface Groomer {
  id: string;
  nome: string;
}

const Empresa = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<EmpresaConfig>({
    bordao: "",
    horarioInicio: "",
    horarioFim: "",
  });
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [novoGroomer, setNovoGroomer] = useState("");
  const [editandoGroomer, setEditandoGroomer] = useState<Groomer | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch empresa config from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchEmpresa = async () => {
      const { data, error } = await supabase
        .from('empresa_config')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching empresa:', error);
      } else if (data) {
        const empresaData = data as any;
        setFormData({
          id: empresaData.id,
          bordao: empresaData.bordao || '',
          horarioInicio: empresaData.horario_inicio || '',
          horarioFim: empresaData.horario_fim || ''
        });
      }
      setLoading(false);
    };
    
    fetchEmpresa();
  }, [user]);

  // Fetch groomers from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchGroomers = async () => {
      const { data, error } = await (supabase as any)
        .from('groomers')
        .select('id, nome')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error fetching groomers:', error);
      } else if (data) {
        const groomersData: Groomer[] = data.map((g: any) => ({
          id: g.id,
          nome: g.nome
        }));
        setGroomers(groomersData);
      }
    };
    
    fetchGroomers();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    
    // Validar bordão (máximo 50 caracteres)
    if (formData.bordao.length > 50) {
      toast.error("Bordão da empresa deve ter no máximo 50 caracteres");
      return;
    }

    if (formData.id) {
      // Update existing
      const { error } = await supabase
        .from('empresa_config')
        .update({
          bordao: formData.bordao,
          horario_inicio: formData.horarioInicio,
          horario_fim: formData.horarioFim
        })
        .eq('id', formData.id)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating empresa:', error);
        toast.error('Erro ao atualizar dados da empresa');
      } else {
        toast.success("Dados da empresa salvos com sucesso!");
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('empresa_config')
        .insert({
          user_id: user.id,
          bordao: formData.bordao,
          horario_inicio: formData.horarioInicio,
          horario_fim: formData.horarioFim
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error inserting empresa:', error);
        toast.error('Erro ao salvar dados da empresa');
      } else {
        setFormData({ ...formData, id: data.id });
        toast.success("Dados da empresa salvos com sucesso!");
      }
    }
  };

  const handleAdicionarGroomer = async () => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    
    if (!novoGroomer.trim()) {
      toast.error("Nome do groomer não pode estar vazio");
      return;
    }

    if (groomers.some(g => g.nome.toLowerCase() === novoGroomer.trim().toLowerCase())) {
      toast.error("Groomer já cadastrado");
      return;
    }

    const { data, error } = await (supabase as any)
      .from('groomers')
      .insert({
        user_id: user.id,
        nome: novoGroomer.trim()
      })
      .select('id, nome')
      .single();
      
    if (error) {
      console.error('Error adding groomer:', error);
      toast.error('Erro ao adicionar groomer');
    } else if (data) {
      const newGroomer: Groomer = {
        id: (data as any).id,
        nome: (data as any).nome
      };
      setGroomers([...groomers, newGroomer]);
      setNovoGroomer("");
      toast.success("Groomer adicionado com sucesso!");
    }
  };

  const handleEditarGroomer = (groomer: Groomer) => {
    setEditandoGroomer(groomer);
    setNovoGroomer(groomer.nome);
  };

  const handleSalvarEdicaoGroomer = async () => {
    if (!editandoGroomer || !user) return;
    
    if (!novoGroomer.trim()) {
      toast.error("Nome do groomer não pode estar vazio");
      return;
    }

    const { error } = await (supabase as any)
      .from('groomers')
      .update({ nome: novoGroomer.trim() })
      .eq('id', editandoGroomer.id)
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error updating groomer:', error);
      toast.error('Erro ao atualizar groomer');
    } else {
      const updatedGroomers = groomers.map(g => 
        g.id === editandoGroomer.id ? { id: g.id, nome: novoGroomer.trim() } : g
      );
      setGroomers(updatedGroomers);
      setEditandoGroomer(null);
      setNovoGroomer("");
      toast.success("Groomer atualizado com sucesso!");
    }
  };

  const handleExcluirGroomer = async (id: string) => {
    if (!user) return;
    
    const { error } = await (supabase as any)
      .from('groomers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error deleting groomer:', error);
      toast.error('Erro ao excluir groomer');
    } else {
      const updatedGroomers = groomers.filter(g => g.id !== id);
      setGroomers(updatedGroomers);
      toast.success("Groomer excluído com sucesso!");
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastro da Empresa</h1>
        <p className="text-muted-foreground">
          Configure as informações da sua empresa
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>
            Preencha as informações gerais da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bordao">Bordão da Empresa</Label>
              <Input
                id="bordao"
                placeholder="Digite o bordão da empresa (máx. 50 caracteres)"
                value={formData.bordao}
                onChange={(e) => setFormData({ ...formData, bordao: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bordao.length}/50 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label>Horário de Funcionamento da Empresa</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horarioInicio" className="text-sm">Horário Início</Label>
                  <Input
                    id="horarioInicio"
                    type="time"
                    value={formData.horarioInicio}
                    onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horarioFim" className="text-sm">Horário Fim</Label>
                  <Input
                    id="horarioFim"
                    type="time"
                    value={formData.horarioFim}
                    onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Salvar Configurações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Groomers</CardTitle>
          <CardDescription>
            Gerencie os groomers da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="Digite o nome do groomer"
                value={novoGroomer}
                onChange={(e) => setNovoGroomer(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (editandoGroomer) {
                      handleSalvarEdicaoGroomer();
                    } else {
                      handleAdicionarGroomer();
                    }
                  }
                }}
              />
              {editandoGroomer ? (
                <>
                  <Button onClick={handleSalvarEdicaoGroomer}>
                    Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditandoGroomer(null);
                      setNovoGroomer("");
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={handleAdicionarGroomer}>
                  Adicionar Groomer
                </Button>
              )}
            </div>

            {groomers.length > 0 && (
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold">Nome do Groomer</th>
                      <th className="p-3 text-right text-sm font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groomers.map((groomer) => (
                      <tr key={groomer.id} className="border-t hover:bg-accent/50">
                        <td className="p-3">{groomer.nome}</td>
                        <td className="p-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditarGroomer(groomer)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja excluir o groomer ${groomer.nome}?`)) {
                                  handleExcluirGroomer(groomer.id);
                                }
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {groomers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum groomer cadastrado ainda.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Empresa;

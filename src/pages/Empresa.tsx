import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface EmpresaConfig {
  bordao: string;
  horarioInicio: string;
  horarioFim: string;
}

interface Groomer {
  id: string;
  nome: string;
}

const Empresa = () => {
  const [formData, setFormData] = useState<EmpresaConfig>(() => {
    const saved = localStorage.getItem('empresaConfig');
    return saved ? JSON.parse(saved) : {
      bordao: "",
      horarioInicio: "",
      horarioFim: "",
    };
  });

  const [groomers, setGroomers] = useState<Groomer[]>(() => {
    const saved = localStorage.getItem('groomers');
    return saved ? JSON.parse(saved) : [];
  });

  const [novoGroomer, setNovoGroomer] = useState("");
  const [editandoGroomer, setEditandoGroomer] = useState<Groomer | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar bordão (máximo 50 caracteres)
    if (formData.bordao.length > 50) {
      toast.error("Bordão da empresa deve ter no máximo 50 caracteres");
      return;
    }

    localStorage.setItem('empresaConfig', JSON.stringify(formData));
    toast.success("Dados da empresa salvos com sucesso!");
  };

  const handleAdicionarGroomer = () => {
    if (!novoGroomer.trim()) {
      toast.error("Nome do groomer não pode estar vazio");
      return;
    }

    if (groomers.some(g => g.nome.toLowerCase() === novoGroomer.trim().toLowerCase())) {
      toast.error("Groomer já cadastrado");
      return;
    }

    const novoGroomerObj: Groomer = {
      id: Date.now().toString(),
      nome: novoGroomer.trim()
    };

    const updatedGroomers = [...groomers, novoGroomerObj];
    setGroomers(updatedGroomers);
    localStorage.setItem('groomers', JSON.stringify(updatedGroomers));
    setNovoGroomer("");
    toast.success("Groomer adicionado com sucesso!");
  };

  const handleEditarGroomer = (groomer: Groomer) => {
    setEditandoGroomer(groomer);
    setNovoGroomer(groomer.nome);
  };

  const handleSalvarEdicaoGroomer = () => {
    if (!editandoGroomer) return;
    if (!novoGroomer.trim()) {
      toast.error("Nome do groomer não pode estar vazio");
      return;
    }

    const updatedGroomers = groomers.map(g => 
      g.id === editandoGroomer.id ? { ...g, nome: novoGroomer.trim() } : g
    );
    setGroomers(updatedGroomers);
    localStorage.setItem('groomers', JSON.stringify(updatedGroomers));
    setEditandoGroomer(null);
    setNovoGroomer("");
    toast.success("Groomer atualizado com sucesso!");
  };

  const handleExcluirGroomer = (id: string) => {
    const updatedGroomers = groomers.filter(g => g.id !== id);
    setGroomers(updatedGroomers);
    localStorage.setItem('groomers', JSON.stringify(updatedGroomers));
    toast.success("Groomer excluído com sucesso!");
  };

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

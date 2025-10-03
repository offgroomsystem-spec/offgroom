import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Raca {
  id: string;
  nome: string;
  porte: string;
}

const Racas = () => {
  const [racas, setRacas] = useState<Raca[]>(() => {
    const saved = localStorage.getItem('racas');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('racas', JSON.stringify(racas));
  }, [racas]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRaca, setEditingRaca] = useState<Raca | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [porteFilter, setPorteFilter] = useState<string>("todos");

  const [formData, setFormData] = useState({
    nome: "",
    porte: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRaca) {
      setRacas(racas.map(r => 
        r.id === editingRaca.id ? { ...formData, id: editingRaca.id } : r
      ));
      toast.success("Raça atualizada com sucesso!");
    } else {
      const novaRaca: Raca = {
        ...formData,
        id: Date.now().toString(),
      };
      setRacas([...racas, novaRaca]);
      toast.success("Raça cadastrada com sucesso!");
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nome: "", porte: "" });
    setEditingRaca(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (raca: Raca) => {
    setEditingRaca(raca);
    setFormData(raca);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setRacas(racas.filter(r => r.id !== id));
    toast.success("Raça removida com sucesso!");
  };

  const filteredRacas = racas.filter(raca => {
    const matchesSearch = raca.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPorte = porteFilter === "todos" || raca.porte === porteFilter;
    return matchesSearch && matchesPorte;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Raças de Pets</h1>
          <p className="text-muted-foreground mt-1">Gerencie as raças cadastradas</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Raça
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRaca ? "Editar Raça" : "Nova Raça"}</DialogTitle>
              <DialogDescription>
                Preencha os dados da raça
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Raça</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="porte">Porte</Label>
                <Select value={formData.porte} onValueChange={(value) => setFormData({ ...formData, porte: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeno">Pequeno</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingRaca ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4">
            <div>
              <CardTitle>Lista de Raças</CardTitle>
              <CardDescription>Total: {racas.length} raças cadastradas</CardDescription>
            </div>
            <div className="flex gap-4">
              <Select value={porteFilter} onValueChange={setPorteFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por porte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os portes</SelectItem>
                  <SelectItem value="pequeno">Pequeno</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="grande">Grande</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar raça..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Raça</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Porte</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRacas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma raça cadastrada
                    </td>
                  </tr>
                ) : (
                  filteredRacas.map((raca) => (
                    <tr key={raca.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground">{raca.id}</td>
                      <td className="py-3 px-4 font-medium">{raca.nome}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {raca.porte}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(raca)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(raca.id)}>
                            <Trash2 className="h-4 w-4" />
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

export default Racas;

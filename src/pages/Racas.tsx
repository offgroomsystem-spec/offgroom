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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Raças de Pets</h1>
          <p className="text-muted-foreground text-xs">Gerencie as raças cadastradas</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-8 text-xs">
              <Plus className="h-3 w-3" />
              Nova Raça
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg">{editingRaca ? "Editar Raça" : "Nova Raça"}</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados da raça
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nome" className="text-xs">Nome da Raça</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="porte" className="text-xs">Porte</Label>
                <Select value={formData.porte} onValueChange={(value) => setFormData({ ...formData, porte: value })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeno" className="text-xs">Pequeno</SelectItem>
                    <SelectItem value="medio" className="text-xs">Médio</SelectItem>
                    <SelectItem value="grande" className="text-xs">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs">
                  {editingRaca ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex justify-between items-center gap-2">
            <div>
              <CardTitle className="text-base">Lista de Raças</CardTitle>
              <CardDescription className="text-xs">Total: {racas.length} raças cadastradas</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={porteFilter} onValueChange={setPorteFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="Filtrar por porte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">Todos os portes</SelectItem>
                  <SelectItem value="pequeno" className="text-xs">Pequeno</SelectItem>
                  <SelectItem value="medio" className="text-xs">Médio</SelectItem>
                  <SelectItem value="grande" className="text-xs">Grande</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar raça..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-xs">ID</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Raça</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Porte</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRacas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhuma raça cadastrada
                    </td>
                  </tr>
                ) : (
                  filteredRacas.map((raca) => (
                    <tr key={raca.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground text-xs">{raca.id}</td>
                      <td className="py-2 px-3 font-medium text-xs">{raca.nome}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {raca.porte}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(raca)} className="h-7 w-7 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(raca.id)} className="h-7 w-7 p-0">
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

export default Racas;

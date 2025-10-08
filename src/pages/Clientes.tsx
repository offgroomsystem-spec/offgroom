import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Raca {
  id: string;
  nome: string;
  porte: string;
}

interface Cliente {
  id: string;
  nomeCliente: string;
  nomePet: string;
  porte: string;
  raca: string;
  whatsapp: string;
  endereco: string;
  observacao: string;
}

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    const saved = localStorage.getItem('clientes');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('clientes', JSON.stringify(clientes));
  }, [clientes]);
  
  const [racas, setRacas] = useState<Raca[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    nomeCliente: "",
    nomePet: "",
    porte: "",
    raca: "",
    whatsapp: "",
    endereco: "",
    observacao: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem('racas');
    if (saved) {
      setRacas(JSON.parse(saved));
    }
  }, []);

  const racasFiltradas = racas.filter(raca => raca.porte === formData.porte);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nomeCliente.trim()) {
      toast.error("Favor preencher o Nome do Cliente");
      return;
    }
    if (!formData.nomePet.trim()) {
      toast.error("Favor preencher o Nome do Pet");
      return;
    }
    if (!formData.porte) {
      toast.error("Favor selecionar o Porte do Pet");
      return;
    }
    if (!formData.raca) {
      toast.error("Favor preencher a Raça do Pet");
      return;
    }
    if (!formData.whatsapp || formData.whatsapp.length !== 11) {
      toast.error("Favor preencher o WhatsApp com 11 dígitos (DDD + número)");
      return;
    }
    // Endereço não é mais obrigatório
    
    if (editingCliente) {
      setClientes(clientes.map(c => 
        c.id === editingCliente.id ? { ...formData, id: editingCliente.id } : c
      ));
      toast.success("Cliente atualizado com sucesso!");
    } else {
      const novoCliente: Cliente = {
        ...formData,
        id: Date.now().toString(),
      };
      setClientes([...clientes, novoCliente]);
      toast.success("Cliente cadastrado com sucesso!");
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nomeCliente: "",
      nomePet: "",
      porte: "",
      raca: "",
      whatsapp: "",
      endereco: "",
      observacao: "",
    });
    setEditingCliente(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData(cliente);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setClientes(clientes.filter(c => c.id !== id));
    toast.success("Cliente removido com sucesso!");
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.nomePet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Clientes e Pets</h1>
          <p className="text-muted-foreground text-xs">Gerencie os cadastros de clientes e seus pets</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-8 text-xs">
              <Plus className="h-3 w-3" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">{editingCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados do cliente e pet
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="nomeCliente" className="text-xs">Nome do Cliente *</Label>
                  <Input
                    id="nomeCliente"
                    value={formData.nomeCliente}
                    onChange={(e) => setFormData({ ...formData, nomeCliente: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="nomePet" className="text-xs">Nome do Pet *</Label>
                  <Input
                    id="nomePet"
                    value={formData.nomePet}
                    onChange={(e) => setFormData({ ...formData, nomePet: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="porte" className="text-xs">Porte do Pet *</Label>
                  <Select 
                    value={formData.porte} 
                    onValueChange={(value) => setFormData({ ...formData, porte: value, raca: "" })}
                  >
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
                
                <div className="space-y-1">
                  <Label htmlFor="raca" className="text-xs">Raça *</Label>
                  <Select 
                    value={formData.raca} 
                    onValueChange={(value) => setFormData({ ...formData, raca: value })}
                    disabled={!formData.porte}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={!formData.porte ? "Selecione o porte primeiro" : "Selecione a raça"} />
                    </SelectTrigger>
                    <SelectContent>
                      {racasFiltradas.length === 0 ? (
                        <SelectItem value="sem-raca" disabled className="text-xs">
                          Nenhuma raça cadastrada para este porte
                        </SelectItem>
                      ) : (
                        racasFiltradas.map((raca) => (
                          <SelectItem key={raca.id} value={raca.nome} className="text-xs">
                            {raca.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="whatsapp" className="text-xs">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                      setFormData({ ...formData, whatsapp: value });
                    }
                  }}
                  placeholder="DDD + número (11 dígitos)"
                  maxLength={11}
                  className="h-8 text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Ex: 11987654321 (DDD + número)
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="endereco" className="text-xs">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="observacao" className="text-xs">Observação</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs">
                  {editingCliente ? "Atualizar" : "Salvar"}
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
              <CardTitle className="text-base">Lista de Clientes</CardTitle>
              <CardDescription className="text-xs">Total: {clientes.length} clientes cadastrados</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou pet..."
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
                  <th className="text-left py-2 px-3 font-semibold text-xs">Cliente</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Pet</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">WhatsApp</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Porte</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Raça</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Endereço</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum cliente cadastrado
                    </td>
                  </tr>
                ) : (
                  filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-3 text-xs">{cliente.nomeCliente}</td>
                      <td className="py-2 px-3 text-xs">{cliente.nomePet}</td>
                      <td className="py-2 px-3 text-xs">
                        {cliente.whatsapp ? 
                          `(${cliente.whatsapp.slice(0,2)}) ${cliente.whatsapp.slice(2,7)}-${cliente.whatsapp.slice(7)}` 
                          : '-'
                        }
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {cliente.porte}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">{cliente.raca}</td>
                      <td className="py-2 px-3 text-xs">{cliente.endereco || '-'}</td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(cliente)} className="h-7 w-7 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(cliente.id)} className="h-7 w-7 p-0">
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

export default Clientes;

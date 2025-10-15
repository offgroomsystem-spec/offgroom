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

interface ContaBancaria {
  id: string;
  nomeBanco: string;
  tipoConta: "Conta Corrente" | "Conta Poupança";
  agencia: string;
  numeroConta: string;
  saldo: number;
}

const ContasBancarias = () => {
  const [contas, setContas] = useState<ContaBancaria[]>(() => {
    const saved = localStorage.getItem('contas_bancarias');
    return saved ? JSON.parse(saved) : [];
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaBancaria | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState<{
    nomeBanco: string;
    tipoConta: "Conta Corrente" | "Conta Poupança" | "";
    agencia: string;
    numeroConta: string;
    saldo: number;
  }>({
    nomeBanco: "",
    tipoConta: "",
    agencia: "",
    numeroConta: "",
    saldo: 0,
  });

  useEffect(() => {
    localStorage.setItem('contas_bancarias', JSON.stringify(contas));
  }, [contas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nomeBanco.trim()) {
      toast.error("Favor preencher o nome do banco");
      return;
    }
    if (!formData.tipoConta) {
      toast.error("Favor selecionar o tipo de conta");
      return;
    }
    if (!formData.agencia.trim()) {
      toast.error("Favor preencher a agência");
      return;
    }
    if (!formData.numeroConta.trim()) {
      toast.error("Favor preencher o número da conta");
      return;
    }
    
    const novaConta: ContaBancaria = {
      id: Date.now().toString(),
      nomeBanco: formData.nomeBanco,
      tipoConta: formData.tipoConta,
      agencia: formData.agencia,
      numeroConta: formData.numeroConta,
      saldo: formData.saldo,
    };
    
    setContas([...contas, novaConta]);
    toast.success("Conta bancária cadastrada com sucesso!");
    resetForm();
  };

  const handleEditar = () => {
    if (!contaSelecionada) return;
    
    if (!formData.nomeBanco.trim()) {
      toast.error("Favor preencher o nome do banco");
      return;
    }
    if (!formData.tipoConta) {
      toast.error("Favor selecionar o tipo de conta");
      return;
    }
    if (!formData.agencia.trim()) {
      toast.error("Favor preencher a agência");
      return;
    }
    if (!formData.numeroConta.trim()) {
      toast.error("Favor preencher o número da conta");
      return;
    }
    
    setContas(contas.map(c => 
      c.id === contaSelecionada.id 
        ? { 
            ...contaSelecionada, 
            nomeBanco: formData.nomeBanco,
            tipoConta: formData.tipoConta as "Conta Corrente" | "Conta Poupança",
            agencia: formData.agencia,
            numeroConta: formData.numeroConta,
            saldo: formData.saldo,
          }
        : c
    ));
    
    toast.success("Conta bancária atualizada com sucesso!");
    resetForm();
    setContaSelecionada(null);
    setIsEditDialogOpen(false);
  };

  const handleExcluir = () => {
    if (!contaSelecionada) return;
    
    setContas(contas.filter(c => c.id !== contaSelecionada.id));
    toast.success("Conta bancária excluída com sucesso!");
    setContaSelecionada(null);
    setIsDeleteDialogOpen(false);
  };

  const handleSelecionarConta = (conta: ContaBancaria) => {
    setContaSelecionada(conta);
  };

  const resetForm = () => {
    setFormData({ 
      nomeBanco: "", 
      tipoConta: "", 
      agencia: "", 
      numeroConta: "", 
      saldo: 0 
    });
    setIsDialogOpen(false);
  };

  const abrirEdicao = () => {
    if (!contaSelecionada) return;
    setFormData({
      nomeBanco: contaSelecionada.nomeBanco,
      tipoConta: contaSelecionada.tipoConta,
      agencia: contaSelecionada.agencia,
      numeroConta: contaSelecionada.numeroConta,
      saldo: contaSelecionada.saldo,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cadastro de Contas Bancárias</h1>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs">
                <Plus className="h-3 w-3" />
                Cadastrar Conta Bancária
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Conta Bancária</DialogTitle>
                <DialogDescription className="text-xs">
                  Preencha os dados da conta bancária
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="nomeBanco" className="text-xs">Nome do Banco *</Label>
                  <Input
                    id="nomeBanco"
                    value={formData.nomeBanco}
                    onChange={(e) => setFormData({ ...formData, nomeBanco: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="tipoConta" className="text-xs">Tipo de Conta *</Label>
                  <Select 
                    value={formData.tipoConta} 
                    onValueChange={(value) => setFormData({ ...formData, tipoConta: value as any })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conta Corrente" className="text-xs">
                        Conta Corrente
                      </SelectItem>
                      <SelectItem value="Conta Poupança" className="text-xs">
                        Conta Poupança
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="agencia" className="text-xs">Agência *</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Ex: 1234-5"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="numeroConta" className="text-xs">Número da Conta *</Label>
                  <Input
                    id="numeroConta"
                    value={formData.numeroConta}
                    onChange={(e) => setFormData({ ...formData, numeroConta: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Ex: 12345-6"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="saldo" className="text-xs">Saldo Inicial</Label>
                  <Input
                    id="saldo"
                    type="number"
                    step="0.01"
                    value={formData.saldo}
                    onChange={(e) => setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs"
                    placeholder="0.00"
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

          {contaSelecionada && (
            <>
              <Button 
                variant="outline" 
                className="gap-2 h-8 text-xs"
                onClick={abrirEdicao}
              >
                <Edit2 className="h-3 w-3" />
                Editar Conta
              </Button>
              <Button 
                variant="destructive" 
                className="gap-2 h-8 text-xs"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
                Excluir Conta
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contas.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground text-xs">
              Nenhuma conta bancária cadastrada
            </CardContent>
          </Card>
        ) : (
          contas.map((conta) => (
            <Card 
              key={conta.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                contaSelecionada?.id === conta.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => handleSelecionarConta(conta)}
            >
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{conta.nomeBanco}</CardTitle>
                <CardDescription className="text-xs space-y-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    conta.tipoConta === "Conta Corrente" 
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" 
                      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                  }`}>
                    {conta.tipoConta}
                  </span>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div>Agência: {conta.agencia}</div>
                    <div>Conta: {conta.numeroConta}</div>
                    <div className="font-semibold mt-1">Saldo: {formatCurrency(conta.saldo)}</div>
                  </div>
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
              Tem certeza que gostaria de excluir a Conta "{contaSelecionada?.nomeBanco}"?
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
            <DialogTitle>Editar Conta Bancária</DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que gostaria de editar a Conta "{contaSelecionada?.nomeBanco}"?
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditar(); }} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="nomeBanco-edit" className="text-xs">Nome do Banco *</Label>
              <Input
                id="nomeBanco-edit"
                value={formData.nomeBanco}
                onChange={(e) => setFormData({ ...formData, nomeBanco: e.target.value })}
                className="h-8 text-xs"
                placeholder="Ex: Banco do Brasil"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="tipoConta-edit" className="text-xs">Tipo de Conta *</Label>
              <Select 
                value={formData.tipoConta} 
                onValueChange={(value) => setFormData({ ...formData, tipoConta: value as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conta Corrente" className="text-xs">
                    Conta Corrente
                  </SelectItem>
                  <SelectItem value="Conta Poupança" className="text-xs">
                    Conta Poupança
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="agencia-edit" className="text-xs">Agência *</Label>
              <Input
                id="agencia-edit"
                value={formData.agencia}
                onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                className="h-8 text-xs"
                placeholder="Ex: 1234-5"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="numeroConta-edit" className="text-xs">Número da Conta *</Label>
              <Input
                id="numeroConta-edit"
                value={formData.numeroConta}
                onChange={(e) => setFormData({ ...formData, numeroConta: e.target.value })}
                className="h-8 text-xs"
                placeholder="Ex: 12345-6"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="saldo-edit" className="text-xs">Saldo</Label>
              <Input
                id="saldo-edit"
                type="number"
                step="0.01"
                value={formData.saldo}
                onChange={(e) => setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
                placeholder="0.00"
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

export default ContasBancarias;

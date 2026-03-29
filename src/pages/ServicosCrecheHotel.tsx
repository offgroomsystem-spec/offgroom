import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Pencil, Trash2, Dog, Hotel, Clock, CalendarDays, Sun } from "lucide-react";
import { toast } from "sonner";

interface ServicoCreche {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  modelo_preco: string;
  modelo_cobranca: string;
  valor_unico: number;
  valor_pequeno: number;
  valor_medio: number;
  valor_grande: number;
  is_padrao: boolean;
  is_opcional: boolean;
  observacoes_internas: string | null;
}

const emptyForm: Omit<ServicoCreche, "id"> = {
  nome: "",
  descricao: "",
  tipo: "creche",
  modelo_preco: "unico",
  modelo_cobranca: "periodo",
  valor_unico: 0,
  valor_pequeno: 0,
  valor_medio: 0,
  valor_grande: 0,
  is_padrao: false,
  is_opcional: true,
  observacoes_internas: "",
};

const generateNome = (tipo: string, modelo_cobranca: string, modelo_preco: string) => {
  const tipoLabel = tipo === "creche" ? "Creche" : "Hotel";
  const cobrancaLabel = tipo === "creche"
    ? modelo_cobranca === "hora" ? "Por Hora" : modelo_cobranca === "dia" ? "Por Dia" : "Por Período"
    : "";
  const precoLabel = modelo_preco === "porte" ? "Por Porte" : "";
  return [tipoLabel, cobrancaLabel, precoLabel].filter(Boolean).join(" - ");
};

const ServicosCrecheHotel = () => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<ServicoCreche[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadServicos = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("servicos_creche")
      .select("*")
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar serviços");
      return;
    }
    setServicos((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadServicos();
  }, [user]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: ServicoCreche) => {
    setEditingId(s.id);
    setForm({
      nome: s.nome,
      descricao: s.descricao || "",
      tipo: s.tipo,
      modelo_preco: s.modelo_preco,
      modelo_cobranca: s.modelo_cobranca || "periodo",
      valor_unico: s.valor_unico,
      valor_pequeno: s.valor_pequeno,
      valor_medio: s.valor_medio,
      valor_grande: s.valor_grande,
      is_padrao: s.is_padrao,
      is_opcional: s.is_opcional,
      observacoes_internas: s.observacoes_internas || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (form.modelo_preco === "porte" && (form.valor_pequeno <= 0 || form.valor_medio <= 0 || form.valor_grande <= 0)) {
      toast.error("Defina o valor para todos os portes");
      return;
    }
    if (form.modelo_preco === "unico" && form.valor_unico <= 0) {
      toast.error("Defina o valor do serviço");
      return;
    }

    const autoNome = generateNome(form.tipo, form.modelo_cobranca, form.modelo_preco);
    const payload = {
      nome: autoNome,
      descricao: null as string | null,
      tipo: form.tipo,
      modelo_preco: form.modelo_preco,
      modelo_cobranca: form.tipo === "creche" ? form.modelo_cobranca : "periodo",
      valor_unico: form.modelo_preco === "unico" ? form.valor_unico : 0,
      valor_pequeno: form.modelo_preco === "porte" ? form.valor_pequeno : 0,
      valor_medio: form.modelo_preco === "porte" ? form.valor_medio : 0,
      valor_grande: form.modelo_preco === "porte" ? form.valor_grande : 0,
      is_padrao: false,
      is_opcional: true,
      observacoes_internas: form.observacoes_internas?.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("servicos_creche")
        .update(payload as any)
        .eq("id", editingId);
      if (error) {
        toast.error("Erro ao atualizar serviço");
        return;
      }
      toast.success("Serviço atualizado com sucesso");
    } else {
      const { error } = await supabase
        .from("servicos_creche")
        .insert({ ...payload, user_id: user!.id } as any);
      if (error) {
        toast.error("Erro ao criar serviço");
        return;
      }
      toast.success("Serviço criado com sucesso");
    }
    setDialogOpen(false);
    loadServicos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;
    const { error } = await supabase.from("servicos_creche").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir serviço");
      return;
    }
    toast.success("Serviço excluído");
    loadServicos();
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getDisplayPrice = (s: ServicoCreche) => {
    const suffix = s.tipo === "creche" ? (s.modelo_cobranca === "hora" ? "/h" : s.modelo_cobranca === "dia" ? "/dia" : "/período") : "";
    if (s.modelo_preco === "unico") return formatCurrency(s.valor_unico) + suffix;
    return `P: ${formatCurrency(s.valor_pequeno)} | M: ${formatCurrency(s.valor_medio)} | G: ${formatCurrency(s.valor_grande)}${suffix ? ` ${suffix}` : ""}`;
  };

  const getModeloCobrancaLabel = (mc: string) => {
    if (mc === "hora") return "Por Hora";
    if (mc === "dia") return "Por Dia";
    return "Por Período";
  };

  const getValorLabel = () => {
    if (form.tipo === "creche") {
      if (form.modelo_cobranca === "hora") return "Valor/Hora (R$) *";
      if (form.modelo_cobranca === "dia") return "Valor/Dia (R$) *";
      return "Valor/Período (R$) *";
    }
    return "Valor (R$) *";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços Creche & Hotel</h1>
          <p className="text-sm text-muted-foreground">Gerencie os serviços disponíveis para Creche e Hotel Pet</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-muted-foreground">Carregando...</p>
          ) : servicos.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicos.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Badge variant={s.tipo === "creche" ? "default" : "secondary"} className="gap-1">
                        {s.tipo === "creche" ? <Dog className="h-3 w-3" /> : <Hotel className="h-3 w-3" />}
                        {s.tipo === "creche" ? "Creche" : "Hotel"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.tipo === "creche" ? getModeloCobrancaLabel(s.modelo_cobranca) : "—"}
                    </TableCell>
                    <TableCell>{s.modelo_preco === "unico" ? "Valor Único" : "Por Porte"}</TableCell>
                    <TableCell className="text-sm">{getDisplayPrice(s)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base">{editingId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo do Serviço *</Label>
                <ToggleGroup
                  type="single"
                  value={form.tipo}
                  onValueChange={(v) => v && setForm({ ...form, tipo: v })}
                  className="justify-start"
                  size="sm"
                >
                  <ToggleGroupItem value="creche" className="gap-1 h-7 px-2.5 text-xs">
                    <Dog className="h-3 w-3" /> Creche
                  </ToggleGroupItem>
                  <ToggleGroupItem value="hotel" className="gap-1 h-7 px-2.5 text-xs">
                    <Hotel className="h-3 w-3" /> Hotel
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precificação *</Label>
                <ToggleGroup
                  type="single"
                  value={form.modelo_preco}
                  onValueChange={(v) => v && setForm({ ...form, modelo_preco: v })}
                  className="justify-start"
                  size="sm"
                >
                  <ToggleGroupItem value="unico" className="h-7 px-2.5 text-xs">Único</ToggleGroupItem>
                  <ToggleGroupItem value="porte" className="h-7 px-2.5 text-xs">Por Porte</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {form.tipo === "creche" && (
              <div className="space-y-1">
                <Label className="text-xs">Modelo de Cobrança *</Label>
                <ToggleGroup
                  type="single"
                  value={form.modelo_cobranca}
                  onValueChange={(v) => v && setForm({ ...form, modelo_cobranca: v })}
                  className="justify-start"
                  size="sm"
                >
                  <ToggleGroupItem value="hora" className="gap-1 h-7 px-2.5 text-xs">
                    <Clock className="h-3 w-3" /> Por Hora
                  </ToggleGroupItem>
                  <ToggleGroupItem value="periodo" className="gap-1 h-7 px-2.5 text-xs">
                    <Sun className="h-3 w-3" /> Por Período
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dia" className="gap-1 h-7 px-2.5 text-xs">
                    <CalendarDays className="h-3 w-3" /> Por Dia
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            {form.modelo_preco === "unico" ? (
              <div className="space-y-1">
                <Label className="text-xs">{getValorLabel()}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_unico || ""}
                  onChange={(e) => setForm({ ...form, valor_unico: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Pequeno (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor_pequeno || ""}
                    onChange={(e) => setForm({ ...form, valor_pequeno: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Médio (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor_medio || ""}
                    onChange={(e) => setForm({ ...form, valor_medio: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grande (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor_grande || ""}
                    onChange={(e) => setForm({ ...form, valor_grande: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>{editingId ? "Atualizar" : "Criar Serviço"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicosCrecheHotel;

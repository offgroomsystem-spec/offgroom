import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dog, Hotel, X, Search } from "lucide-react";
import { toast } from "sonner";

interface ServicoCreche {
  id: string;
  nome: string;
  tipo: string;
  modelo_preco: string;
  modelo_cobranca: string;
  valor_unico: number;
  valor_pequeno: number;
  valor_medio: number;
  valor_grande: number;
}

interface PacoteCreche {
  id: string;
  nome: string;
  tipo: string;
  servicos_ids: string[];
  desconto_percentual: number;
  desconto_valor: number;
  valor_total: number;
  valor_final: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPacote?: PacoteCreche | null;
  onSaved: () => void;
}

const NovoPacoteCrecheModal = ({ open, onOpenChange, editingPacote, onSaved }: Props) => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("creche");
  const [selectedServicoIds, setSelectedServicoIds] = useState<string[]>([]);
  const [descontoPct, setDescontoPct] = useState("");
  const [descontoVal, setDescontoVal] = useState("");
  const [lastEdited, setLastEdited] = useState<"pct" | "val">("pct");
  const [servicos, setServicos] = useState<ServicoCreche[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadServicos();
    if (editingPacote) {
      setNome(editingPacote.nome);
      setTipo(editingPacote.tipo);
      setSelectedServicoIds(editingPacote.servicos_ids || []);
      setDescontoPct(editingPacote.desconto_percentual > 0 ? String(editingPacote.desconto_percentual) : "");
      setDescontoVal(editingPacote.desconto_valor > 0 ? String(editingPacote.desconto_valor) : "");
    } else {
      setNome("");
      setTipo("creche");
      setSelectedServicoIds([]);
      setDescontoPct("");
      setDescontoVal("");
    }
  }, [open, editingPacote]);

  const loadServicos = async () => {
    const { data } = await supabase.from("servicos_creche").select("*").order("nome");
    if (data) setServicos(data as any[]);
  };

  const filteredServicos = useMemo(() => servicos.filter((s) => s.tipo === tipo), [servicos, tipo]);

  const getServicoValor = (s: ServicoCreche) => {
    if (s.modelo_preco === "unico") return s.valor_unico || 0;
    return Math.max(s.valor_pequeno || 0, s.valor_medio || 0, s.valor_grande || 0);
  };

  const somaServicos = useMemo(() => {
    return selectedServicoIds.reduce((acc, id) => {
      const s = servicos.find((sv) => sv.id === id);
      return acc + (s ? getServicoValor(s) : 0);
    }, 0);
  }, [selectedServicoIds, servicos]);

  // Sync desconto bidirecional
  useEffect(() => {
    if (somaServicos <= 0) return;
    if (lastEdited === "pct") {
      const pct = parseFloat(descontoPct.replace(",", ".")) || 0;
      const val = (somaServicos * pct) / 100;
      setDescontoVal(val > 0 ? val.toFixed(2) : "");
    } else {
      const val = parseFloat(descontoVal.replace(",", ".")) || 0;
      const pct = (val / somaServicos) * 100;
      setDescontoPct(pct > 0 ? pct.toFixed(2) : "");
    }
  }, [descontoPct, descontoVal, lastEdited, somaServicos]);

  const descontoNumerico = parseFloat(descontoVal.replace(",", ".")) || 0;
  const valorFinal = Math.max(0, somaServicos - descontoNumerico);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const toggleServico = (id: string) => {
    setSelectedServicoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // When tipo changes, clear selected services that don't match
  useEffect(() => {
    setSelectedServicoIds((prev) =>
      prev.filter((id) => servicos.find((s) => s.id === id && s.tipo === tipo))
    );
  }, [tipo, servicos]);

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do pacote");
      return;
    }
    if (selectedServicoIds.length === 0) {
      toast.error("Selecione ao menos um serviço");
      return;
    }

    setSaving(true);
    const payload = {
      nome: nome.trim(),
      tipo,
      servicos_ids: selectedServicoIds,
      desconto_percentual: parseFloat(descontoPct.replace(",", ".")) || 0,
      desconto_valor: descontoNumerico,
      valor_total: somaServicos,
      valor_final: valorFinal,
      user_id: user!.id,
    };

    let error;
    if (editingPacote) {
      ({ error } = await supabase
        .from("pacotes_creche" as any)
        .update(payload as any)
        .eq("id", editingPacote.id));
    } else {
      ({ error } = await supabase.from("pacotes_creche" as any).insert(payload as any));
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar pacote");
      console.error(error);
      return;
    }
    toast.success(editingPacote ? "Pacote atualizado" : "Pacote criado com sucesso");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">
            {editingPacote ? "Editar Pacote" : "Novo Pacote"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Nome */}
          <div className="space-y-1">
            <Label className="text-xs">Nome do Pacote *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Pacote Mensal Creche"
              className="h-8 text-sm"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <Label className="text-xs">Tipo de Estadia *</Label>
            <ToggleGroup
              type="single"
              value={tipo}
              onValueChange={(v) => v && setTipo(v)}
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

          {/* Serviços */}
          <div className="space-y-1">
            <Label className="text-xs">Serviços do Pacote *</Label>
            {selectedServicoIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {selectedServicoIds.map((id) => {
                  const s = servicos.find((sv) => sv.id === id);
                  if (!s) return null;
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 text-[10px] h-5 pr-1">
                      {s.nome} — {formatCurrency(getServicoValor(s))}
                      <button onClick={() => toggleServico(id)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <Command className="border rounded-md">
              <CommandInput placeholder="Buscar serviço..." className="h-8 text-xs" />
              <CommandList className="max-h-32">
                <CommandEmpty className="text-xs p-2">Nenhum serviço encontrado</CommandEmpty>
                <CommandGroup>
                  {filteredServicos.map((s) => {
                    const selected = selectedServicoIds.includes(s.id);
                    return (
                      <CommandItem
                        key={s.id}
                        onSelect={() => toggleServico(s.id)}
                        className={`text-xs cursor-pointer ${selected ? "bg-accent" : ""}`}
                      >
                        <span className="flex-1">{s.nome}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatCurrency(getServicoValor(s))}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {/* Descontos */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Desconto (%)</Label>
              <Input
                value={descontoPct}
                onChange={(e) => {
                  setDescontoPct(e.target.value);
                  setLastEdited("pct");
                }}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desconto (R$)</Label>
              <Input
                value={descontoVal}
                onChange={(e) => {
                  setDescontoVal(e.target.value);
                  setLastEdited("val");
                }}
                placeholder="0,00"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Valor Final */}
          <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Valor Final</span>
            <span className="text-sm font-bold text-foreground">{formatCurrency(valorFinal)}</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {editingPacote ? "Atualizar" : "Criar Pacote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NovoPacoteCrecheModal;

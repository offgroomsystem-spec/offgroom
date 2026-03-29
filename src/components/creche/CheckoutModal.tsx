import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { calcularValorPorHora } from "@/utils/crecheBilling";

interface Estadia {
  id: string;
  tipo: string;
  data_entrada: string;
  hora_entrada: string;
  data_saida_prevista: string | null;
  pet_nome: string;
  cliente_nome: string;
  pet_porte?: string;
}

interface BillingItem {
  estadiaId: string;
  petNome: string;
  valorTotal: number;
  descricao: string;
  servicoNome: string;
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estadiasAtivas: Estadia[];
  onSuccess: () => void;
  contextClienteNome?: string | null;
  contextEstadiaId?: string | null;
}

const CheckoutModal = ({ open, onOpenChange, estadiasAtivas, onSuccess, contextClienteNome, contextEstadiaId }: CheckoutModalProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);

  // Filter by tutor when context is provided
  const filteredEstadias = contextClienteNome
    ? estadiasAtivas.filter((e) => e.cliente_nome === contextClienteNome)
    : estadiasAtivas;

  const allSelected = filteredEstadias.length > 0 && selectedIds.size === filteredEstadias.length;

  // Pre-select the pet when opening with context
  useEffect(() => {
    if (open && contextEstadiaId) {
      setSelectedIds(new Set([contextEstadiaId]));
    }
    if (!open) {
      setSelectedIds(new Set());
      setObservacoes("");
      setBillingItems([]);
    }
  }, [open, contextEstadiaId]);

  // Calculate billing for all selected pets
  useEffect(() => {
    if (selectedIds.size === 0) {
      setBillingItems([]);
      return;
    }

    const selectedEstadias = filteredEstadias.filter((e) => selectedIds.has(e.id));

    const calcBilling = async () => {
      try {
        const tipos = [...new Set(selectedEstadias.map((e) => e.tipo))];
        const { data: servicos } = await supabase
          .from("servicos_creche")
          .select("*")
          .in("tipo", tipos)
          .eq("is_padrao", true);

        const servicoMap = new Map((servicos || []).map((s: any) => [s.tipo, s]));
        const now = new Date();
        const horaSaida = format(now, "HH:mm");
        const dataSaida = format(now, "yyyy-MM-dd");

        const items: BillingItem[] = [];

        for (const est of selectedEstadias) {
          const servico = servicoMap.get(est.tipo) as any;
          if (!servico || servico.modelo_cobranca !== "hora") continue;

          let valorHora = servico.valor_unico || 0;
          if (servico.modelo_preco === "porte" && est.pet_porte) {
            const porte = est.pet_porte.toLowerCase();
            if (porte === "pequeno") valorHora = servico.valor_pequeno || 0;
            else if (porte === "medio" || porte === "médio") valorHora = servico.valor_medio || 0;
            else if (porte === "grande") valorHora = servico.valor_grande || 0;
          }

          const result = calcularValorPorHora(est.hora_entrada, est.data_entrada, horaSaida, dataSaida, valorHora);
          items.push({
            estadiaId: est.id,
            petNome: est.pet_nome,
            valorTotal: result.valorTotal,
            descricao: result.descricao,
            servicoNome: servico.nome,
          });
        }

        setBillingItems(items);
      } catch {
        setBillingItems([]);
      }
    };

    calcBilling();
    const interval = setInterval(calcBilling, 60000);
    return () => clearInterval(interval);
  }, [selectedIds, filteredEstadias]);

  const totalGeral = useMemo(() => billingItems.reduce((sum, b) => sum + b.valorTotal, 0), [billingItems]);

  const togglePet = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEstadias.map((e) => e.id)));
    }
  };

  const handleCheckout = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um pet.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const ids = [...selectedIds];

      const { error } = await supabase
        .from("creche_estadias")
        .update({
          status: "finalizado",
          data_saida: format(now, "yyyy-MM-dd"),
          hora_saida: format(now, "HH:mm"),
          observacoes_saida: observacoes || null,
        })
        .in("id", ids);

      if (error) throw error;
      toast.success(
        ids.length === 1
          ? "Check-out realizado com sucesso!"
          : `Check-out de ${ids.length} pets realizado com sucesso!`
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao fazer check-out: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedEstadias = filteredEstadias.filter((e) => selectedIds.has(e.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-out</DialogTitle>
          <DialogDescription>Registrar saída de pet.</DialogDescription>
        </DialogHeader>

        {filteredEstadias.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum pet ativo no momento.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">
                Selecione o(s) Pet(s)
                {contextClienteNome && (
                  <span className="text-muted-foreground ml-1">— Tutor: {contextClienteNome}</span>
                )}
              </Label>
              <div className="border rounded-md max-h-52 overflow-y-auto mt-1">
                {/* Select All */}
                {filteredEstadias.length > 1 && (
                  <div
                    onClick={toggleAll}
                    className="px-3 py-2 cursor-pointer flex items-center gap-2 text-sm border-b hover:bg-accent"
                  >
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    <span className="font-medium text-xs">Selecionar todos ({filteredEstadias.length})</span>
                  </div>
                )}
                {filteredEstadias.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => togglePet(e.id)}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-sm ${
                      selectedIds.has(e.id) ? "bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    <Checkbox checked={selectedIds.has(e.id)} onCheckedChange={() => togglePet(e.id)} />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{e.pet_nome}</span>
                        <span className="text-muted-foreground ml-2">({e.cliente_nome})</span>
                      </div>
                      <Badge variant={e.tipo === "hotel" ? "secondary" : "outline"} className="text-[10px]">
                        {e.tipo === "hotel" ? "Hotel" : "Creche"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {selectedIds.size > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedIds.size} pet{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Info for selected pets */}
            {selectedEstadias.length > 0 && (
              <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
                {selectedEstadias.map((est) => (
                  <div key={est.id} className="flex items-center justify-between">
                    <span className="font-medium">{est.pet_nome}</span>
                    <span>
                      {format(new Date(est.data_entrada + "T00:00:00"), "dd/MM", { locale: ptBR })} {est.hora_entrada?.slice(0, 5)}
                      {est.data_saida_prevista && (
                        <span className="ml-2 text-muted-foreground">
                          → {format(new Date(est.data_saida_prevista + "T00:00:00"), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Billing */}
            {billingItems.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-primary">💰 Cálculo Automático</p>
                {billingItems.map((b) => (
                  <div key={b.estadiaId} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium">{b.petNome}</span>
                      <span className="text-muted-foreground ml-1">({b.descricao})</span>
                    </div>
                    <span className="font-semibold">
                      {b.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                ))}
                {billingItems.length > 1 && (
                  <div className="flex items-center justify-between border-t pt-1.5 mt-1">
                    <span className="text-xs font-medium">Total</span>
                    <span className="text-base font-bold text-foreground">
                      {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                )}
                {billingItems.length === 1 && (
                  <p className="text-lg font-bold text-foreground">
                    {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs">Observações de Saída</Label>
              <Textarea
                placeholder="Observações finais..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="min-h-[50px] text-sm"
              />
            </div>

            <Button onClick={handleCheckout} disabled={saving || selectedIds.size === 0} className="w-full">
              {saving
                ? "Salvando..."
                : selectedIds.size > 1
                  ? `Confirmar Check-out (${selectedIds.size} pets)`
                  : "Confirmar Check-out"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;

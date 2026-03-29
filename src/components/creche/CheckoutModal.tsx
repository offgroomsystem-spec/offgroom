import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Estadia {
  id: string;
  tipo: string;
  data_entrada: string;
  hora_entrada: string;
  data_saida_prevista: string | null;
  pet_nome: string;
  cliente_nome: string;
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estadiasAtivas: Estadia[];
  onSuccess: () => void;
}

const CheckoutModal = ({ open, onOpenChange, estadiasAtivas, onSuccess }: CheckoutModalProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = estadiasAtivas.find((e) => e.id === selectedId);

  const handleCheckout = async () => {
    if (!selectedId) {
      toast.error("Selecione um pet.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const { error } = await supabase
        .from("creche_estadias")
        .update({
          status: "finalizado",
          data_saida: format(now, "yyyy-MM-dd"),
          hora_saida: format(now, "HH:mm"),
          observacoes_saida: observacoes || null,
        })
        .eq("id", selectedId);

      if (error) throw error;
      toast.success("Check-out realizado com sucesso!");
      setSelectedId(null);
      setObservacoes("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao fazer check-out: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-out</DialogTitle>
          <DialogDescription>Registrar saída de pet.</DialogDescription>
        </DialogHeader>

        {estadiasAtivas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum pet ativo no momento.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Selecione o Pet</Label>
              <div className="border rounded-md max-h-48 overflow-y-auto mt-1">
                {estadiasAtivas.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm ${
                      selectedId === e.id ? "bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    <div>
                      <span className="font-medium">{e.pet_nome}</span>
                      <span className="text-muted-foreground ml-2">({e.cliente_nome})</span>
                    </div>
                    <Badge variant={e.tipo === "hotel" ? "secondary" : "outline"} className="text-[10px]">
                      {e.tipo === "hotel" ? "Hotel" : "Creche"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {selected && (
              <div className="bg-muted/50 rounded-md p-2 text-xs space-y-0.5">
                <p><strong>Entrada:</strong> {format(new Date(selected.data_entrada + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} às {selected.hora_entrada?.slice(0, 5)}</p>
                {selected.data_saida_prevista && (
                  <p><strong>Saída Prevista:</strong> {format(new Date(selected.data_saida_prevista + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>
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

            <Button onClick={handleCheckout} disabled={saving || !selectedId} className="w-full">
              {saving ? "Salvando..." : "Confirmar Check-out"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;

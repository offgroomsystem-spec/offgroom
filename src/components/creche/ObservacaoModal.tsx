import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ObservacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estadiaId: string | null;
  petNome: string;
  onSuccess: () => void;
}

const sugestoesRapidas = [
  "Pet muito ativo",
  "Pet ansioso",
  "Pet calmo e tranquilo",
  "Alimentação normal",
  "Recusou alimentação",
  "Bebeu bastante água",
  "Interagiu bem com outros pets",
  "Prefere ficar isolado",
  "Chorou/latiu bastante",
  "Dormiu bem",
];

const ObservacaoModal = ({ open, onOpenChange, estadiaId, petNome, onSuccess }: ObservacaoModalProps) => {
  const { user } = useAuth();
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!estadiaId || !user || !obs.trim()) {
      toast.error("Digite uma observação.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("creche_registros_diarios").insert({
        estadia_id: estadiaId,
        user_id: user.id,
        observacoes: obs.trim(),
      });
      if (error) throw error;
      toast.success("Observação adicionada!");
      setObs("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Observação - {petNome}</DialogTitle>
          <DialogDescription>Adicione uma observação rápida.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {sugestoesRapidas.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer text-[11px] hover:bg-accent"
                onClick={() => setObs((prev) => (prev ? prev + ". " + s : s))}
              >
                {s}
              </Badge>
            ))}
          </div>

          <Textarea
            placeholder="Digite a observação..."
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="min-h-[80px] text-sm"
          />

          <Button onClick={handleSave} disabled={saving || !obs.trim()} className="w-full">
            {saving ? "Salvando..." : "Salvar Observação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ObservacaoModal;

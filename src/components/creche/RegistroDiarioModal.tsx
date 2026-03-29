import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RegistroDiarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estadiaId: string | null;
  petNome: string;
  onSuccess: () => void;
}

interface Registro {
  id: string;
  data_registro: string;
  hora_registro: string;
  comeu: boolean;
  bebeu_agua: boolean;
  brincou: boolean;
  interagiu_bem: boolean;
  brigas: boolean;
  fez_necessidades: boolean;
  sinais_doenca: boolean;
  pulgas_carrapatos: boolean;
  observacoes: string | null;
}

const RegistroDiarioModal = ({ open, onOpenChange, estadiaId, petNome, onSuccess }: RegistroDiarioModalProps) => {
  const { user } = useAuth();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    comeu: false,
    bebeu_agua: false,
    brincou: false,
    interagiu_bem: false,
    brigas: false,
    fez_necessidades: false,
    sinais_doenca: false,
    pulgas_carrapatos: false,
  });
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (open && estadiaId) loadRegistros();
  }, [open, estadiaId]);

  const loadRegistros = async () => {
    if (!estadiaId) return;
    const { data } = await supabase
      .from("creche_registros_diarios")
      .select("*")
      .eq("estadia_id", estadiaId)
      .order("data_registro", { ascending: false })
      .order("hora_registro", { ascending: false });
    if (data) setRegistros(data as Registro[]);
  };

  const handleSave = async () => {
    if (!estadiaId || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("creche_registros_diarios").insert({
        estadia_id: estadiaId,
        user_id: user.id,
        ...form,
        observacoes: obs || null,
      });
      if (error) throw error;
      toast.success("Registro adicionado!");
      setForm({
        comeu: false, bebeu_agua: false, brincou: false, interagiu_bem: false,
        brigas: false, fez_necessidades: false, sinais_doenca: false, pulgas_carrapatos: false,
      });
      setObs("");
      loadRegistros();
      onSuccess();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const items = [
    { key: "comeu", label: "Comeu" },
    { key: "bebeu_agua", label: "Bebeu água" },
    { key: "brincou", label: "Brincou" },
    { key: "interagiu_bem", label: "Boa interação" },
    { key: "brigas", label: "Brigas" },
    { key: "fez_necessidades", label: "Necessidades" },
    { key: "sinais_doenca", label: "Sinais doença" },
    { key: "pulgas_carrapatos", label: "Pulgas/Carrapatos" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registro Diário - {petNome}</DialogTitle>
          <DialogDescription>Acompanhamento durante a estadia.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Novo registro */}
          <div className="border rounded-md p-3 space-y-2">
            <p className="text-xs font-semibold">Novo Registro</p>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Checkbox
                    checked={(form as any)[item.key]}
                    onCheckedChange={(v) => setForm((prev) => ({ ...prev, [item.key]: !!v }))}
                  />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
            <Textarea
              placeholder="Observações..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="min-h-[40px] text-sm"
            />
            <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
              {saving ? "Salvando..." : "Adicionar Registro"}
            </Button>
          </div>

          {/* Histórico */}
          {registros.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1">Histórico</p>
              <ScrollArea className="max-h-48">
                <div className="space-y-1.5">
                  {registros.map((r) => (
                    <div key={r.id} className="border rounded p-2 text-xs space-y-0.5">
                      <p className="font-medium">
                        {format(new Date(r.data_registro + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} às {r.hora_registro?.slice(0, 5)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {r.comeu && <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1.5 py-0.5 rounded">Comeu</span>}
                        {r.bebeu_agua && <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded">Água</span>}
                        {r.brincou && <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1.5 py-0.5 rounded">Brincou</span>}
                        {r.interagiu_bem && <span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded">Boa interação</span>}
                        {r.brigas && <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 rounded">Brigas</span>}
                        {r.fez_necessidades && <span className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">Necessidades</span>}
                        {r.sinais_doenca && <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 rounded">Doença</span>}
                        {r.pulgas_carrapatos && <span className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-1.5 py-0.5 rounded">Pulgas</span>}
                      </div>
                      {r.observacoes && <p className="text-muted-foreground">{r.observacoes}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegistroDiarioModal;

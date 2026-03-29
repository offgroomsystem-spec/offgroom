import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Pet {
  id: string;
  nome_pet: string;
  cliente_id: string;
  cliente_nome?: string;
  cliente_whatsapp?: string;
}

const normalizePhone = (phone: string) =>
  phone.replace(/[\s\-\(\)\+]/g, "");

interface CheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CheckinModal = ({ open, onOpenChange, onSuccess }: CheckinModalProps) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
  const [searchPet, setSearchPet] = useState("");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [tipo, setTipo] = useState<string>("creche");
  const [dataEntrada, setDataEntrada] = useState(format(new Date(), "yyyy-MM-dd"));
  const [horaEntrada, setHoraEntrada] = useState(format(new Date(), "HH:mm"));
  const [dataSaidaPrevista, setDataSaidaPrevista] = useState("");
  const [horaSaidaPrevista, setHoraSaidaPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  const [checklist, setChecklist] = useState({
    comeu_antes: false,
    comportamento_normal: true,
    sinais_doenca: false,
    pulgas_carrapatos: false,
    agressivo: false,
    restricao: false,
  });
  const [checklistObs, setChecklistObs] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    loadPets();
  }, [open, user]);

  useEffect(() => {
    if (!searchPet.trim()) {
      setFilteredPets(pets);
    } else {
      const s = searchPet.toLowerCase();
      const sNorm = normalizePhone(s);
      setFilteredPets(
        pets.filter(
          (p) =>
            p.nome_pet.toLowerCase().includes(s) ||
            (p.cliente_nome && p.cliente_nome.toLowerCase().includes(s)) ||
            (p.cliente_whatsapp && normalizePhone(p.cliente_whatsapp).includes(sNorm))
        )
      );
    }
  }, [searchPet, pets]);

  const loadPets = async () => {
    const { data } = await supabase
      .from("pets")
      .select("id, nome_pet, cliente_id")
      .order("nome_pet");

    if (data) {
      const clienteIds = [...new Set(data.map((p) => p.cliente_id))];
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome_cliente, whatsapp")
        .in("id", clienteIds);

      const clienteMap = new Map(
        clientes?.map((c) => [c.id, { nome: c.nome_cliente, whatsapp: c.whatsapp }]) || []
      );
      setPets(
        data.map((p) => ({
          ...p,
          cliente_nome: clienteMap.get(p.cliente_id)?.nome || "",
          cliente_whatsapp: clienteMap.get(p.cliente_id)?.whatsapp || "",
        }))
      );
    }
  };

  const handleSave = async () => {
    if (!selectedPet || !user) {
      toast.error("Selecione um pet.");
      return;
    }
    if (tipo === "hotel" && !dataSaidaPrevista) {
      toast.error("Informe a previsão de saída para hospedagem.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("creche_estadias").insert({
        user_id: user.id,
        pet_id: selectedPet.id,
        cliente_id: selectedPet.cliente_id,
        tipo,
        data_entrada: dataEntrada,
        hora_entrada: horaEntrada,
        data_saida_prevista: dataSaidaPrevista || null,
        hora_saida_prevista: horaSaidaPrevista || null,
        observacoes_entrada: observacoes || null,
        checklist_entrada: { ...checklist, observacoes_adicionais: checklistObs },
        status: "ativo",
      });

      if (error) throw error;
      toast.success("Check-in realizado com sucesso!");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao fazer check-in: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedPet(null);
    setSearchPet("");
    setTipo("creche");
    setDataEntrada(format(new Date(), "yyyy-MM-dd"));
    setHoraEntrada(format(new Date(), "HH:mm"));
    setDataSaidaPrevista("");
    setHoraSaidaPrevista("");
    setObservacoes("");
    setChecklist({
      comeu_antes: false,
      comportamento_normal: true,
      sinais_doenca: false,
      pulgas_carrapatos: false,
      agressivo: false,
      restricao: false,
    });
    setChecklistObs("");
  };

  const checklistItems = [
    { key: "comeu_antes", label: "Comeu antes de chegar?" },
    { key: "comportamento_normal", label: "Comportamento normal?" },
    { key: "sinais_doenca", label: "Sinais de doença?" },
    { key: "pulgas_carrapatos", label: "Pulgas/Carrapatos?" },
    { key: "agressivo", label: "Está agressivo?" },
    { key: "restricao", label: "Possui restrição?" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-in</DialogTitle>
          <DialogDescription>Registrar entrada de pet na creche ou hotel.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Pet search */}
          <div>
            <Label className="text-xs">Buscar Pet / Tutor</Label>
            <Input
              placeholder="Nome do pet, tutor ou WhatsApp..."
              value={searchPet}
              onChange={(e) => {
                setSearchPet(e.target.value);
                setSelectedPet(null);
              }}
              className="h-8 text-sm"
            />
            {searchPet && !selectedPet && filteredPets.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Nenhum pet ou tutor encontrado com os dados informados</p>
            )}
            {searchPet && !selectedPet && filteredPets.length > 0 && (
              <div className="border rounded-md mt-1 max-h-32 overflow-y-auto bg-background">
                {filteredPets.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-1.5 hover:bg-accent cursor-pointer text-sm"
                    onClick={() => {
                      setSelectedPet(p);
                      setSearchPet(`${p.nome_pet} - ${p.cliente_nome}`);
                    }}
                  >
                    <span className="font-medium">{p.nome_pet}</span>
                    <span className="text-muted-foreground ml-2">({p.cliente_nome})</span>
                    {p.cliente_whatsapp && (
                      <span className="text-muted-foreground ml-1 text-xs">• {p.cliente_whatsapp}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPet && (
            <p className="text-xs text-muted-foreground">
              Tutor: <strong>{selectedPet.cliente_nome}</strong>
            </p>
          )}

          {/* Tipo */}
          <div>
            <Label className="text-xs">Tipo de Estadia</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creche">Creche (Day Care)</SelectItem>
                <SelectItem value="hotel">Hotel (Hospedagem)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Data Entrada</Label>
              <Input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Hora Entrada</Label>
              <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Previsão Saída {tipo === "hotel" && "*"}</Label>
              <Input type="date" value={dataSaidaPrevista} onChange={(e) => setDataSaidaPrevista(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Hora Saída Prevista</Label>
              <Input type="time" value={horaSaidaPrevista} onChange={(e) => setHoraSaidaPrevista(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <Label className="text-xs font-semibold">Checklist Inicial</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {checklistItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Checkbox
                    checked={(checklist as any)[item.key]}
                    onCheckedChange={(v) => setChecklist((prev) => ({ ...prev, [item.key]: !!v }))}
                  />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
            <Textarea
              placeholder="Observações do checklist..."
              value={checklistObs}
              onChange={(e) => setChecklistObs(e.target.value)}
              className="mt-1.5 min-h-[50px] text-sm"
            />
          </div>

          {/* Obs */}
          <div>
            <Label className="text-xs">Observações Gerais</Label>
            <Textarea
              placeholder="Observações sobre a entrada..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-[50px] text-sm"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Confirmar Check-in"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckinModal;

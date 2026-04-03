import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, X } from "lucide-react";

interface ServicoExtra {
  id: string;
  nome: string;
  valor: number;
}

interface Pet {
  id: string;
  nome_pet: string;
  cliente_id: string;
  porte?: string;
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
  const [modeloPreco, setModeloPreco] = useState<string>("unico");
  const [modeloCobranca, setModeloCobranca] = useState<string>("hora");
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
      .select("id, nome_pet, cliente_id, porte")
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
      const insertData: any = {
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
        modelo_preco: modeloPreco,
        modelo_cobranca: modeloCobranca,
      };

      const { error } = await supabase.from("creche_estadias").insert(insertData);

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
    setModeloPreco("unico");
    setModeloCobranca("hora");
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
    { key: "comeu_antes", label: "Comeu antes?" },
    { key: "comportamento_normal", label: "Comportamento normal?" },
    { key: "sinais_doenca", label: "Sinais de doença?" },
    { key: "pulgas_carrapatos", label: "Pulgas/Carrapatos?" },
    { key: "agressivo", label: "Agressivo?" },
    { key: "restricao", label: "Restrição?" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Check-in</DialogTitle>
          <DialogDescription className="text-xs">Registrar entrada de pet na creche ou hotel.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          {/* Pet search */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Buscar Pet / Tutor</Label>
            <Input
              placeholder="Nome do pet, tutor ou WhatsApp..."
              value={searchPet}
              onChange={(e) => {
                setSearchPet(e.target.value);
                setSelectedPet(null);
              }}
              className="h-7 text-xs"
            />
            {searchPet && !selectedPet && filteredPets.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Nenhum resultado encontrado</p>
            )}
            {searchPet && !selectedPet && filteredPets.length > 0 && (
              <div className="border rounded mt-0.5 max-h-28 overflow-y-auto bg-background">
                {filteredPets.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="px-2 py-1 hover:bg-accent cursor-pointer text-xs"
                    onClick={() => {
                      setSelectedPet(p);
                      setSearchPet(`${p.nome_pet} - ${p.cliente_nome}`);
                    }}
                  >
                    <span className="font-medium">{p.nome_pet}</span>
                    <span className="text-muted-foreground ml-1.5">({p.cliente_nome})</span>
                    {p.cliente_whatsapp && (
                      <span className="text-muted-foreground ml-1 text-[10px]">• {p.cliente_whatsapp}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPet && (
            <p className="text-[11px] text-muted-foreground -mt-1">
              Tutor: <strong>{selectedPet.cliente_nome}</strong>
              {selectedPet.porte && <span className="ml-2">Porte: <strong className="capitalize">{selectedPet.porte}</strong></span>}
            </p>
          )}

          {/* Tipo + Pricing in a row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Tipo de Estadia</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v); }}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creche">Creche (Day Care)</SelectItem>
                  <SelectItem value="hotel">Hotel (Hospedagem)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">Tipo de Cobrança</Label>
              <ToggleGroup
                type="single"
                value={modeloPreco}
                onValueChange={(v) => { if (v) setModeloPreco(v); }}
                className="justify-start mt-0.5"
              >
                <ToggleGroupItem value="unico" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Único
                </ToggleGroupItem>
                <ToggleGroupItem value="porte" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Por Porte
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Modelo de Cobrança - visible only for Creche */}
          {tipo === "creche" && (
          <div>
            <Label className="text-[11px] text-muted-foreground">Modelo de Cobrança</Label>
            <ToggleGroup
              type="single"
              value={modeloCobranca}
              onValueChange={(v) => { if (v) setModeloCobranca(v); }}
              className="justify-start mt-0.5"
            >
              <ToggleGroupItem value="hora" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Por Hora
              </ToggleGroupItem>
              <ToggleGroupItem value="dia" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Por Dia
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          )}

          {/* Datas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Data Entrada</Label>
              <Input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Hora Entrada</Label>
              <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} className="h-7 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Previsão Saída {tipo === "hotel" && "*"}</Label>
              <Input type="date" value={dataSaidaPrevista} onChange={(e) => setDataSaidaPrevista(e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Hora Saída Prevista</Label>
              <Input type="time" value={horaSaidaPrevista} onChange={(e) => setHoraSaidaPrevista(e.target.value)} className="h-7 text-xs" />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <Label className="text-[11px] font-semibold">Checklist Inicial</Label>
            <div className="grid grid-cols-3 gap-1 mt-0.5">
              {checklistItems.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5">
                  <Checkbox
                    className="h-3.5 w-3.5"
                    checked={(checklist as any)[item.key]}
                    onCheckedChange={(v) => setChecklist((prev) => ({ ...prev, [item.key]: !!v }))}
                  />
                  <span className="text-[10px] leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
            <Textarea
              placeholder="Observações do checklist..."
              value={checklistObs}
              onChange={(e) => setChecklistObs(e.target.value)}
              className="mt-1 min-h-[40px] text-xs"
            />
          </div>

          {/* Obs */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Observações Gerais</Label>
            <Textarea
              placeholder="Observações sobre a entrada..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-[40px] text-xs"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-8 text-sm">
            {saving ? "Salvando..." : "Confirmar Check-in"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckinModal;

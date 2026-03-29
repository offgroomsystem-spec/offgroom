import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import CrecheKPICards from "@/components/creche/CrecheKPICards";
import CheckinModal from "@/components/creche/CheckinModal";
import CheckoutModal from "@/components/creche/CheckoutModal";
import EstadiasAtivas from "@/components/creche/EstadiasAtivas";
import RegistroDiarioModal from "@/components/creche/RegistroDiarioModal";

interface EstadiaComNomes {
  id: string;
  tipo: string;
  data_entrada: string;
  hora_entrada: string;
  data_saida_prevista: string | null;
  pet_nome: string;
  cliente_nome: string;
  observacoes_entrada: string | null;
}

const Creche = () => {
  const { user } = useAuth();
  const [estadiasAtivas, setEstadiasAtivas] = useState<EstadiaComNomes[]>([]);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [registroOpen, setRegistroOpen] = useState(false);
  const [registroEstadiaId, setRegistroEstadiaId] = useState<string | null>(null);
  const [registroPetNome, setRegistroPetNome] = useState("");

  const hoje = format(new Date(), "yyyy-MM-dd");

  const loadEstadias = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("creche_estadias")
      .select("id, tipo, data_entrada, hora_entrada, data_saida_prevista, pet_id, cliente_id, observacoes_entrada")
      .eq("status", "ativo")
      .order("data_entrada", { ascending: false });

    if (!data || data.length === 0) {
      setEstadiasAtivas([]);
      return;
    }

    const petIds = [...new Set(data.map((d) => d.pet_id))];
    const clienteIds = [...new Set(data.map((d) => d.cliente_id))];

    const [petsRes, clientesRes] = await Promise.all([
      supabase.from("pets").select("id, nome_pet").in("id", petIds),
      supabase.from("clientes").select("id, nome_cliente").in("id", clienteIds),
    ]);

    const petMap = new Map(petsRes.data?.map((p) => [p.id, p.nome_pet]) || []);
    const clienteMap = new Map(clientesRes.data?.map((c) => [c.id, c.nome_cliente]) || []);

    setEstadiasAtivas(
      data.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        data_entrada: d.data_entrada,
        hora_entrada: d.hora_entrada,
        data_saida_prevista: d.data_saida_prevista,
        pet_nome: petMap.get(d.pet_id) || "Pet",
        cliente_nome: clienteMap.get(d.cliente_id) || "Cliente",
        observacoes_entrada: d.observacoes_entrada,
      }))
    );
  }, [user]);

  useEffect(() => {
    loadEstadias();
  }, [loadEstadias]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("creche-estadias-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "creche_estadias" }, () => {
        loadEstadias();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadEstadias]);

  // KPIs
  const crecheHoje = estadiasAtivas.filter((e) => e.tipo === "creche" && e.data_entrada === hoje).length;
  const hospedadosAtivos = estadiasAtivas.filter((e) => e.tipo === "hotel").length;
  const checkinHoje = estadiasAtivas.filter((e) => e.data_entrada === hoje).length;
  const checkoutHoje = estadiasAtivas.filter((e) => e.data_saida_prevista === hoje).length;

  const handleRegistro = (estadiaId: string, petNome: string) => {
    setRegistroEstadiaId(estadiaId);
    setRegistroPetNome(petNome);
    setRegistroOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Creche & Hotel Pet</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCheckinOpen(true)} className="gap-1.5">
            <LogIn className="h-4 w-4" />
            Check-in
          </Button>
          <Button variant="outline" onClick={() => setCheckoutOpen(true)} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            Check-out
          </Button>
        </div>
      </div>

      <CrecheKPICards
        crecheHoje={crecheHoje}
        hospedadosAtivos={hospedadosAtivos}
        checkinHoje={checkinHoje}
        checkoutHoje={checkoutHoje}
      />

      <EstadiasAtivas estadias={estadiasAtivas} onRegistro={handleRegistro} />

      <CheckinModal open={checkinOpen} onOpenChange={setCheckinOpen} onSuccess={loadEstadias} />
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        estadiasAtivas={estadiasAtivas}
        onSuccess={loadEstadias}
      />
      <RegistroDiarioModal
        open={registroOpen}
        onOpenChange={setRegistroOpen}
        estadiaId={registroEstadiaId}
        petNome={registroPetNome}
        onSuccess={loadEstadias}
      />
    </div>
  );
};

export default Creche;

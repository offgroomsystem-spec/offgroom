import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Groomer {
  id: string;
  nome: string;
}

type ModeloComissao = "groomer" | "faturamento" | "atendimento" | "hibrida";

interface ComissaoConfig {
  id?: string;
  ativo: boolean;
  modelo: ModeloComissao;
  comissao_faturamento: number;
  comissao_atendimento: number;
  bonus_meta: number;
  comissoes_groomers: Record<string, number>;
}

interface Props {
  groomers: Groomer[];
}

const MODELOS: { value: ModeloComissao; label: string; desc: string }[] = [
  { value: "groomer", label: "Comissão por Groomer", desc: "Percentual individual por groomer sobre o faturamento bruto." },
  { value: "faturamento", label: "Comissão por Faturamento", desc: "Percentual único sobre o faturamento bruto." },
  { value: "atendimento", label: "Comissão por Atendimento", desc: "Percentual por atendimento realizado sobre o faturamento bruto." },
  { value: "hibrida", label: "Comissão Híbrida", desc: "Faturamento + Atendimento + Bônus por Meta batida" },
];

export function ConfigurarComissoes({ groomers }: Props) {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ComissaoConfig>({
    ativo: false,
    modelo: "groomer",
    comissao_faturamento: 0,
    comissao_atendimento: 0,
    bonus_meta: 0,
    comissoes_groomers: {},
  });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("comissoes_config" as any)
        .select("*")
        .eq("user_id", ownerId)
        .single();

      if (!error && data) {
        const d = data as any;
        setConfig({
          id: d.id,
          ativo: d.ativo ?? false,
          modelo: d.modelo ?? "groomer",
          comissao_faturamento: d.comissao_faturamento ?? 0,
          comissao_atendimento: d.comissao_atendimento ?? 0,
          bonus_meta: d.bonus_meta ?? 0,
          comissoes_groomers: (d.comissoes_groomers as Record<string, number>) ?? {},
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user, ownerId]);

  const clampValue = (val: string): number => {
    const n = parseFloat(val);
    if (isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
  };

  const validate = (): boolean => {
    if (config.modelo === "groomer") {
      for (const g of groomers) {
        const v = config.comissoes_groomers[g.id];
        if (v === undefined || v === null || isNaN(v)) {
          toast.error(`Preencha a comissão do groomer ${g.nome}`);
          return false;
        }
      }
    }
    if (config.modelo === "faturamento") {
      if (!config.comissao_faturamento && config.comissao_faturamento !== 0) {
        toast.error("Preencha a comissão por faturamento");
        return false;
      }
    }
    if (config.modelo === "atendimento") {
      if (!config.comissao_atendimento && config.comissao_atendimento !== 0) {
        toast.error("Preencha a comissão por atendimento");
        return false;
      }
    }
    if (config.modelo === "hibrida") {
      if (config.comissao_faturamento === null || config.comissao_atendimento === null || config.bonus_meta === null) {
        toast.error("Preencha todos os campos da comissão híbrida");
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!user) return;
    if (config.ativo && !validate()) return;

    setSaving(true);
    const payload: any = {
      user_id: ownerId,
      ativo: config.ativo,
      modelo: config.modelo,
      comissao_faturamento: config.comissao_faturamento,
      comissao_atendimento: config.comissao_atendimento,
      bonus_meta: config.bonus_meta,
      comissoes_groomers: config.comissoes_groomers,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (config.id) {
      ({ error } = await supabase
        .from("comissoes_config" as any)
        .update(payload)
        .eq("id", config.id));
    } else {
      const { data, error: e } = await supabase
        .from("comissoes_config" as any)
        .insert(payload)
        .select()
        .single();
      error = e;
      if (data) setConfig((c) => ({ ...c, id: (data as any).id }));
    }

    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar configuração de comissões");
    } else {
      toast.success("Configuração de comissões salva!");
    }
  };

  const handleToggle = (checked: boolean) => {
    setConfig((c) => ({ ...c, ativo: checked }));
  };

  const handleModeloChange = (modelo: ModeloComissao) => {
    setConfig((c) => ({
      ...c,
      modelo,
      comissao_faturamento: 0,
      comissao_atendimento: 0,
      bonus_meta: 0,
      comissoes_groomers: {},
    }));
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurar Comissões</CardTitle>
        <CardDescription>Defina as regras de comissão dos colaboradores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="comissao-toggle" className="text-sm font-medium">
            Ativar controle de comissões
          </Label>
          <Switch
            id="comissao-toggle"
            checked={config.ativo}
            onCheckedChange={handleToggle}
          />
        </div>

        {config.ativo && (
          <div className="space-y-4 pt-2">
            <RadioGroup
              value={config.modelo}
              onValueChange={(v) => handleModeloChange(v as ModeloComissao)}
              className="space-y-2"
            >
              {MODELOS.map((m) => (
                <div key={m.value} className="flex items-start space-x-3 rounded-md border p-3">
                  <RadioGroupItem value={m.value} id={`modelo-${m.value}`} className="mt-0.5" />
                  <div>
                    <Label htmlFor={`modelo-${m.value}`} className="font-medium cursor-pointer">
                      {m.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {/* Campos por modelo */}
            <div className="space-y-3 pt-2">
              {config.modelo === "groomer" && (
                <>
                  {groomers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum groomer cadastrado. Cadastre groomers acima para configurar comissões individuais.</p>
                  ) : (
                    groomers.map((g) => (
                      <div key={g.id} className="flex items-center gap-3">
                        <Label className="min-w-[120px] text-sm">{g.nome}</Label>
                        <div className="relative flex-1 max-w-[140px]">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            placeholder="0"
                            value={config.comissoes_groomers[g.id] ?? ""}
                            onChange={(e) =>
                              setConfig((c) => ({
                                ...c,
                                comissoes_groomers: {
                                  ...c.comissoes_groomers,
                                  [g.id]: clampValue(e.target.value),
                                },
                              }))
                            }
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {config.modelo === "faturamento" && (
                <div className="space-y-1">
                  <Label className="text-sm">Comissão sobre Faturamento</Label>
                  <div className="relative max-w-[200px]">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="0"
                      value={config.comissao_faturamento || ""}
                      onChange={(e) => setConfig((c) => ({ ...c, comissao_faturamento: clampValue(e.target.value) }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              )}

              {config.modelo === "atendimento" && (
                <div className="space-y-1">
                  <Label className="text-sm">Comissão por Atendimento Realizado</Label>
                  <div className="relative max-w-[200px]">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="0"
                      value={config.comissao_atendimento || ""}
                      onChange={(e) => setConfig((c) => ({ ...c, comissao_atendimento: clampValue(e.target.value) }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              )}

              {config.modelo === "hibrida" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm">Faturamento</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder="0"
                        value={config.comissao_faturamento || ""}
                        onChange={(e) => setConfig((c) => ({ ...c, comissao_faturamento: clampValue(e.target.value) }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Atendimento</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder="0"
                        value={config.comissao_atendimento || ""}
                        onChange={(e) => setConfig((c) => ({ ...c, comissao_atendimento: clampValue(e.target.value) }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Bônus por Meta batida</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder="0"
                        value={config.bonus_meta || ""}
                        onChange={(e) => setConfig((c) => ({ ...c, bonus_meta: clampValue(e.target.value) }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Comissões
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

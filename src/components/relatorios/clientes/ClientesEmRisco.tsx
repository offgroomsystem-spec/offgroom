import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { ModalDetalhesCliente } from "./ModalDetalhesCliente";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ClienteEmRisco {
  id: string;
  nomeCliente: string;
  nomePet: string;
  whatsapp: string;
  ultimoAgendamento: Date;
  diasSemAgendar: number;
  faixaRisco: string;
}

function ClientesEmRisco() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<ClienteEmRisco[]>([]);
  const [filtroDias, setFiltroDias] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteEmRisco | null>(null);
  const [filtroAberto, setFiltroAberto] = useState(false);

  useEffect(() => {
    carregarClientesEmRisco();
  }, []);

  const carregarClientesEmRisco = async () => {
    if (!user) return;

    try {
      const { data: agendamentos, error: errorAg } = await supabase
        .from("agendamentos")
        .select("id, cliente, pet, data, whatsapp, user_id")
        .eq("user_id", user.id);

      const { data: agendamentosPacotes, error: errorPac } = await supabase
        .from("agendamentos_pacotes")
        .select("id, nome_cliente, nome_pet, whatsapp, datas")
        .eq("user_id", user.id);

      if (errorAg) throw errorAg;
      if (errorPac) throw errorPac;

      const hoje = new Date();
      const mapaClientes = new Map<string, ClienteEmRisco>();

      // Processar agendamentos normais
      agendamentos?.forEach((ag) => {
        if (!ag.data) return;
        const dataAg = parseISO(ag.data);
        const chave = `${ag.cliente}-${ag.pet}`;

        const existente = mapaClientes.get(chave);
        if (!existente || dataAg > existente.ultimoAgendamento) {
          mapaClientes.set(chave, {
            id: ag.id,
            nomeCliente: ag.cliente,
            nomePet: ag.pet,
            whatsapp: ag.whatsapp || "",
            ultimoAgendamento: dataAg,
            diasSemAgendar: differenceInDays(hoje, dataAg),
            faixaRisco: "",
          });
        }
      });

      // Processar pacotes
      agendamentosPacotes?.forEach((pac) => {
        if (!pac.datas) return;
        let datasArray: string[] = [];

        try {
          datasArray = JSON.parse(pac.datas);
        } catch {
          if (typeof pac.datas === "string") {
            datasArray = [pac.datas];
          }
        }

        datasArray.forEach((d) => {
          const dataAg = parseISO(d);
          const chave = `${pac.nome_cliente}-${pac.nome_pet}`;

          const existente = mapaClientes.get(chave);
          if (!existente || dataAg > existente.ultimoAgendamento) {
            mapaClientes.set(chave, {
              id: pac.id,
              nomeCliente: pac.nome_cliente,
              nomePet: pac.nome_pet,
              whatsapp: pac.whatsapp || "",
              ultimoAgendamento: dataAg,
              diasSemAgendar: differenceInDays(hoje, dataAg),
              faixaRisco: "",
            });
          }
        });
      });

      const clientesEmRisco = Array.from(mapaClientes.values())
        .filter((c) => c.ultimoAgendamento < hoje)
        .map((c) => ({
          ...c,
          faixaRisco:
            c.diasSemAgendar > 90
              ? "Crítico"
              : c.diasSemAgendar > 60
                ? "Alto"
                : c.diasSemAgendar > 30
                  ? "Moderado"
                  : "Baixo",
        }))
        .sort((a, b) => b.diasSemAgendar - a.diasSemAgendar);

      setClientes(clientesEmRisco);
    } catch (error) {
      console.error("Erro ao carregar clientes em risco:", error);
      toast.error("Erro ao carregar clientes em risco");
    }
  };

  const filtrarClientes = () => {
    let filtrados = [...clientes];

    if (filtroDias) {
      filtrados = filtrados.filter((c) => c.diasSemAgendar >= Number(filtroDias));
    }

    if (busca) {
      const termo = busca.toLowerCase();
      filtrados = filtrados.filter(
        (c) => c.nomeCliente.toLowerCase().includes(termo) || c.nomePet.toLowerCase().includes(termo),
      );
    }

    if (dataInicio) {
      const inicio = parseISO(dataInicio);
      filtrados = filtrados.filter((c) => c.ultimoAgendamento >= inicio);
    }

    if (dataFim) {
      const fim = parseISO(dataFim);
      filtrados = filtrados.filter((c) => c.ultimoAgendamento <= fim);
    }

    setClientes(filtrados);
    setFiltroAberto(false);
  };

  const limparFiltros = () => {
    setFiltroDias("");
    setBusca("");
    setDataInicio("");
    setDataFim("");
    carregarClientesEmRisco();
    setFiltroAberto(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clientes em Risco</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltroAberto(!filtroAberto)}
              className="flex items-center gap-1"
            >
              {filtroAberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {filtroAberto ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>
          </div>
        </CardHeader>

        {filtroAberto && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Intervalo de Dias</label>
                <Input
                  type="number"
                  value={filtroDias}
                  onChange={(e) => setFiltroDias(e.target.value)}
                  placeholder="Ex: 30"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Buscar Cliente ou Pet</label>
                <Input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite para buscar..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data Início (Opcional)</label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>

              <div>
                <label className="text-sm font-medium">Data Fim (Opcional)</label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={filtrarClientes}>Filtrar</Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardContent>
          {clientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhum cliente em risco encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Cliente</th>
                    <th>Pet</th>
                    <th>WhatsApp</th>
                    <th>Último Agendamento</th>
                    <th>Dias sem Agendar</th>
                    <th>Faixa de Risco</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b hover:bg-muted cursor-pointer"
                      onClick={() => setClienteSelecionado(c)}
                    >
                      <td className="py-2">{c.nomeCliente}</td>
                      <td>{c.nomePet}</td>
                      <td>{c.whatsapp}</td>
                      <td>{format(c.ultimoAgendamento, "dd/MM/yyyy")}</td>
                      <td>{c.diasSemAgendar}</td>
                      <td>{c.faixaRisco}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {clienteSelecionado && (
        <ModalDetalhesCliente
          aberto={!!clienteSelecionado}
          cliente={clienteSelecionado}
          onFechar={() => setClienteSelecionado(null)}
        />
      )}
    </div>
  );
}

export default ClientesEmRisco;

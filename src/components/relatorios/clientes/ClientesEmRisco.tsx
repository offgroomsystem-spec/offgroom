import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";
import { ModalDetalhesCliente } from "./ModalDetalhesCliente";

interface ClienteRisco {
  id: string;
  nomeCliente: string;
  nomePet: string;
  whatsapp: string;
  ultimoAgendamento: Date;
  diasSemAgendar: number;
  faixaRisco: string;
}

export default function ClientesEmRisco() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<ClienteRisco[]>([]);
  const [filtroDias, setFiltroDias] = useState<number>(30);
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteRisco | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: agendamentos, error: erro1 } = await supabase
        .from("agendamentos")
        .select("cliente, pet, whatsapp, data")
        .eq("user_id", user.id);

      const { data: pacotes, error: erro2 } = await supabase
        .from("agendamentos_pacotes")
        .select("nome_cliente, nome_pet, whatsapp_cliente, servicos")
        .eq("user_id", user.id);

      if (erro1 || erro2) throw erro1 || erro2;

      const todosAgendamentos: {
        cliente: string;
        pet: string;
        whatsapp: string;
        data: string;
      }[] = [];

      agendamentos?.forEach((ag) => {
        todosAgendamentos.push({
          cliente: ag.cliente,
          pet: ag.pet,
          whatsapp: ag.whatsapp,
          data: ag.data,
        });
      });

      pacotes?.forEach((p) => {
        try {
          const servicos = JSON.parse(p.servicos);
          if (Array.isArray(servicos)) {
            servicos.forEach((s: any) => {
              if (s.data) {
                todosAgendamentos.push({
                  cliente: p.nome_cliente,
                  pet: p.nome_pet,
                  whatsapp: p.whatsapp_cliente,
                  data: s.data,
                });
              }
            });
          }
        } catch {}
      });

      const clientesMap = new Map<string, ClienteRisco>();

      todosAgendamentos.forEach((a) => {
        const chave = `${a.cliente}_${a.pet}`;
        const dataAgendamento = parseISO(a.data);
        const existente = clientesMap.get(chave);

        if (!existente || dataAgendamento > existente.ultimoAgendamento) {
          clientesMap.set(chave, {
            id: chave,
            nomeCliente: a.cliente,
            nomePet: a.pet,
            whatsapp: a.whatsapp,
            ultimoAgendamento: dataAgendamento,
            diasSemAgendar: differenceInDays(new Date(), dataAgendamento),
            faixaRisco: "",
          });
        }
      });

      let lista = Array.from(clientesMap.values());

      // Aplicar filtros
      if (filtroDias) {
        lista = lista.filter((c) => c.diasSemAgendar >= filtroDias);
      }

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        lista = lista.filter(
          (c) => c.nomeCliente.toLowerCase().includes(termo) || c.nomePet.toLowerCase().includes(termo),
        );
      }

      if (dataInicio) {
        const inicio = parseISO(dataInicio);
        lista = lista.filter((c) => c.ultimoAgendamento >= inicio);
      }

      if (dataFim) {
        const fim = parseISO(dataFim);
        lista = lista.filter((c) => c.ultimoAgendamento <= fim);
      }

      lista = lista.filter((c) => c.ultimoAgendamento <= new Date());

      lista.forEach((c) => {
        if (c.diasSemAgendar > 90) c.faixaRisco = "Alto";
        else if (c.diasSemAgendar > 60) c.faixaRisco = "Médio";
        else c.faixaRisco = "Baixo";
      });

      setClientes(lista);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar clientes em risco");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    await carregarClientes();
    setFiltrosVisiveis(false);
  };

  const limparFiltros = () => {
    setFiltroDias(30);
    setBusca("");
    setDataInicio("");
    setDataFim("");
    setFiltrosVisiveis(false);
    carregarClientes();
  };

  const exportar = clientes.map((c) => ({
    Cliente: c.nomeCliente,
    Pet: c.nomePet,
    Telefone: c.whatsapp,
    "Último Agendamento": format(c.ultimoAgendamento, "dd/MM/yyyy"),
    "Dias sem Agendar": c.diasSemAgendar,
    "Faixa de Risco": c.faixaRisco,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Clientes em Risco</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFiltrosVisiveis(!filtrosVisiveis)}>
              {filtrosVisiveis ? "Ocultar Filtros" : "Filtrar"}
            </Button>
            <ExportButton
              data={exportar}
              filename="clientes_em_risco.csv"
              columns={["Cliente", "Pet", "Telefone", "Último Agendamento", "Dias sem Agendar", "Faixa de Risco"]}
            />
          </div>
        </CardHeader>

        {filtrosVisiveis && (
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Intervalo de Dias</Label>
              <Input type="number" value={filtroDias} onChange={(e) => setFiltroDias(Number(e.target.value))} />
            </div>
            <div>
              <Label>Buscar Cliente ou Pet</Label>
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div>
              <Label>Data Início (Opcional)</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim (Opcional)</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>

            <div className="col-span-2 md:col-span-4 flex justify-end gap-2">
              <Button onClick={aplicarFiltros}>Filtrar</Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : clientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum cliente em risco encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Último Agendamento</TableHead>
                  <TableHead>Dias sem Agendar</TableHead>
                  <TableHead>Faixa de Risco</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nomeCliente}</TableCell>
                    <TableCell>{c.nomePet}</TableCell>
                    <TableCell>{c.whatsapp}</TableCell>
                    <TableCell>{format(c.ultimoAgendamento, "dd/MM/yyyy")}</TableCell>
                    <TableCell>{c.diasSemAgendar}</TableCell>
                    <TableCell>{c.faixaRisco}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setClienteSelecionado(c);
                          setModalAberto(true);
                        }}
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalDetalhesCliente aberto={modalAberto} cliente={clienteSelecionado} onFechar={() => setModalAberto(false)} />
    </div>
  );
}

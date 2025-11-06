import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiltrosClientesRisco } from "@/components/relatorios/clientes/FiltrosClientesEmRisco";
import { ModalDetalhesCliente } from "@/components/relatorios/clientes/ModalDetalhesCliente";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, parseISO, format } from "date-fns";
import { toast } from "sonner";

interface ClienteRisco {
  id: string;
  nomeCliente: string;
  nomePet: string;
  whatsapp: string;
  ultimoAgendamento: string;
  diasSemAgendar: number;
  faixaRisco: string;
}

const calcularFaixaRisco = (dias: number) => {
  if (dias <= 10) return "7-10 dias";
  if (dias <= 15) return "11-15 dias";
  if (dias <= 20) return "16-20 dias";
  if (dias <= 30) return "21-30 dias";
  if (dias <= 45) return "31-45 dias";
  if (dias <= 90) return "46-90 dias";
  return "Mais de 90 dias";
};

export default function ClientesEmRisco() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<ClienteRisco[]>([]);
  const [filtros, setFiltros] = useState({
    faixaDias: "todos",
    busca: "",
    dataInicio: "",
    dataFim: "",
  });
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteRisco | null>(null);
  const [loading, setLoading] = useState(false);

  const carregarClientes = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Buscar agendamentos
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, cliente, pet, whatsapp, data")
        .eq("user_id", user.id)
        .order("data", { ascending: false });

      if (error) throw error;

      const mapaClientes = new Map<string, ClienteRisco>();

      data.forEach((ag) => {
        const chave = `${ag.cliente}-${ag.pet}`;
        const dataAgendamento = parseISO(ag.data);
        const hoje = new Date();
        const diasSemAgendar = differenceInDays(hoje, dataAgendamento);

        if (!mapaClientes.has(chave)) {
          mapaClientes.set(chave, {
            id: ag.id,
            nomeCliente: ag.cliente,
            nomePet: ag.pet,
            whatsapp: ag.whatsapp,
            ultimoAgendamento: ag.data,
            diasSemAgendar,
            faixaRisco: calcularFaixaRisco(diasSemAgendar),
          });
        }
      });

      setClientes(Array.from(mapaClientes.values()));
    } catch (error) {
      console.error("Erro ao carregar clientes em risco:", error);
      toast.error("Erro ao carregar clientes em risco");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, [user]);

  const aplicarFiltros = () => {
    setFiltrosVisiveis(false); // recolher após filtrar
  };

  const limparFiltros = () => {
    setFiltros({
      faixaDias: "todos",
      busca: "",
      dataInicio: "",
      dataFim: "",
    });
    setFiltrosVisiveis(false); // recolher após limpar
  };

  const clientesFiltrados = clientes.filter((c) => {
    const dentroFaixa = filtros.faixaDias === "todos" || c.faixaRisco === filtros.faixaDias;

    const buscaTexto =
      c.nomeCliente.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      c.nomePet.toLowerCase().includes(filtros.busca.toLowerCase());

    const dataAgendamento = parseISO(c.ultimoAgendamento);
    const inicioValido = filtros.dataInicio ? parseISO(filtros.dataInicio) : null;
    const fimValido = filtros.dataFim ? parseISO(filtros.dataFim) : null;

    const dentroPeriodo =
      (!inicioValido || dataAgendamento >= inicioValido) && (!fimValido || dataAgendamento <= fimValido);

    return dentroFaixa && buscaTexto && dentroPeriodo;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Clientes em Risco</CardTitle>
          <Button variant="outline" onClick={() => setFiltrosVisiveis(!filtrosVisiveis)}>
            <Filter className="h-4 w-4 mr-2" />
            {filtrosVisiveis ? "Recolher Filtros" : "Exibir Filtros"}
            {filtrosVisiveis ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </CardHeader>

        {filtrosVisiveis && (
          <CardContent>
            <FiltrosClientesRisco filtros={filtros} setFiltros={setFiltros} onFiltrar={aplicarFiltros} />
            <div className="flex justify-end mt-2">
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-6">Carregando...</p>
          ) : clientesFiltrados.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Nenhum cliente encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Último Agendamento</TableHead>
                  <TableHead>Dias Sem Agendar</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nomeCliente}</TableCell>
                    <TableCell>{c.nomePet}</TableCell>
                    <TableCell>{c.whatsapp}</TableCell>
                    <TableCell>{format(parseISO(c.ultimoAgendamento), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{c.diasSemAgendar}</TableCell>
                    <TableCell>{c.faixaRisco}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setClienteSelecionado(c)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalDetalhesCliente
        aberto={!!clienteSelecionado}
        cliente={clienteSelecionado}
        onFechar={() => setClienteSelecionado(null)}
      />
    </div>
  );
}

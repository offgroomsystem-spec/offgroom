import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MessageSquare, Loader2 } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { FiltrosClientesRisco } from "./FiltrosClientesRisco";
import { ModalDetalhesCliente } from "./ModalDetalhesCliente";
import { ExportButton } from "../shared/ExportButton";

interface ClienteRisco {
  id: string;
  nomeCliente: string;
  nomePet: string;
  whatsapp: string;
  ultimoAgendamento: Date;
  diasSemAgendar: number;
  faixaRisco: string;
}

const classificarFaixaRisco = (dias: number): string => {
  if (dias >= 7 && dias <= 10) return "7-10";
  if (dias >= 11 && dias <= 15) return "11-15";
  if (dias >= 16 && dias <= 20) return "16-20";
  if (dias >= 21 && dias <= 30) return "21-30";
  if (dias >= 31 && dias <= 45) return "31-45";
  if (dias >= 46 && dias <= 90) return "46-90";
  if (dias > 90) return "perdido";
  return "sem-risco";
};

const obterVarianteBadge = (faixa: string) => {
  switch (faixa) {
    case "7-10":
      return "default";
    case "11-15":
    case "16-20":
      return "secondary";
    case "21-30":
    case "31-45":
      return "secondary";
    case "46-90":
    case "perdido":
      return "destructive";
    default:
      return "outline";
  }
};

const obterLabelFaixa = (faixa: string): string => {
  if (faixa === "perdido") return "Mais de 90 dias";
  return `${faixa} dias`;
};

const obterCorCard = (faixa: string) => {
  switch (faixa) {
    case "7-10":
      return "bg-green-50 border-green-200";
    case "11-15":
    case "16-20":
      return "bg-yellow-50 border-yellow-200";
    case "21-30":
    case "31-45":
      return "bg-orange-50 border-orange-200";
    case "46-90":
    case "perdido":
      return "bg-red-50 border-red-200";
    default:
      return "";
  }
};

const abrirWhatsApp = (whatsapp: string, nomeCliente: string) => {
  const numeroLimpo = whatsapp.replace(/\D/g, "");
  const numeroCompleto = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;

  const mensagem = encodeURIComponent(
    `Olá ${nomeCliente}! Notamos que faz um tempo que não nos visita. Gostaríamos de saber como você e seu pet estão!`,
  );

  window.open(`https://wa.me/${numeroCompleto}?text=${mensagem}`, "_blank");
};

export const ClientesEmRisco = () => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<ClienteRisco[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<ClienteRisco[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    faixaDias: "todos",
    busca: "",
    dataInicio: "",
    dataFim: "",
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteRisco | null>(null);

  const carregarClientesEmRisco = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Buscar agendamentos regulares
      const { data: agendamentos, error: errorAgendamentos } = await supabase
        .from("agendamentos")
        .select("cliente_id, cliente, data, pet, whatsapp")
        .eq("user_id", user.id)
        .order("data", { ascending: false });

      if (errorAgendamentos) throw errorAgendamentos;

      // Buscar agendamentos de pacotes
      const { data: agendamentosPacotes, error: errorPacotes } = await supabase
        .from("agendamentos_pacotes")
        .select("id, nome_cliente, nome_pet, whatsapp, servicos")
        .eq("user_id", user.id);

      if (errorPacotes) throw errorPacotes;

      // --- Mapa de clientes (únicos) ---
      const clientesMap = new Map<string, ClienteRisco>();

      // --- Agendamentos regulares ---
      agendamentos?.forEach((ag) => {
        const dataAgendamento = parseISO(ag.data);
        const chave = `${ag.cliente}_${ag.pet}`;

        const existente = clientesMap.get(chave);
        if (!existente || dataAgendamento > existente.ultimoAgendamento) {
          clientesMap.set(chave, {
            id: ag.cliente_id || chave,
            nomeCliente: ag.cliente,
            nomePet: ag.pet,
            whatsapp: ag.whatsapp,
            ultimoAgendamento: dataAgendamento,
            diasSemAgendar: 0,
            faixaRisco: "sem-risco",
          });
        }
      });

      // --- Agendamentos de pacotes ---
      agendamentosPacotes?.forEach((ag) => {
        if (!ag.servicos) return;

        let servicosArray: any[] = [];

        // Tenta corrigir JSON escapado
        try {
          const texto = ag.servicos.replace(/""/g, '"').replace(/^"|"$/g, "");
          servicosArray = JSON.parse(texto);
        } catch (e) {
          console.warn("Erro ao interpretar servicos do pacote:", e, ag.servicos);
        }

        if (Array.isArray(servicosArray)) {
          const datasValidas = servicosArray.map((s) => new Date(s.data)).filter((d) => !isNaN(d.getTime()));

          if (datasValidas.length > 0) {
            const ultimaData = new Date(Math.max(...datasValidas.map((d) => d.getTime())));
            const chave = `${ag.nome_cliente}_${ag.nome_pet}`;
            const existente = clientesMap.get(chave);

            if (!existente || ultimaData > existente.ultimoAgendamento) {
              clientesMap.set(chave, {
                id: ag.id || chave,
                nomeCliente: ag.nome_cliente,
                nomePet: ag.nome_pet,
                whatsapp: ag.whatsapp,
                ultimoAgendamento: ultimaData,
                diasSemAgendar: 0,
                faixaRisco: "sem-risco",
              });
            }
          }
        }
      });

      // --- Verificar agendamentos futuros (regulares + pacotes) ---
      const clientesEmRisco: ClienteRisco[] = [];

      clientesMap.forEach((cliente) => {
        const temAgendamentoFuturoRegular = agendamentos?.some(
          (ag) => ag.cliente === cliente.nomeCliente && ag.pet === cliente.nomePet && parseISO(ag.data) >= hoje,
        );

        const temAgendamentoFuturoPacote = agendamentosPacotes?.some((ag) => {
          if (ag.nome_cliente !== cliente.nomeCliente || ag.nome_pet !== cliente.nomePet) return false;
          try {
            const texto = ag.servicos.replace(/""/g, '"').replace(/^"|"$/g, "");
            const servicosArray = JSON.parse(texto);
            return servicosArray.some((s: any) => new Date(s.data) >= hoje);
          } catch {
            return false;
          }
        });

        const temFuturo = temAgendamentoFuturoRegular || temAgendamentoFuturoPacote;
        if (temFuturo) return;

        const diasSemAgendar = differenceInDays(hoje, cliente.ultimoAgendamento);
        if (diasSemAgendar >= 7) {
          cliente.diasSemAgendar = diasSemAgendar;
          cliente.faixaRisco = classificarFaixaRisco(diasSemAgendar);
          clientesEmRisco.push(cliente);
        }
      });

      clientesEmRisco.sort((a, b) => b.diasSemAgendar - a.diasSemAgendar);

      setClientes(clientesEmRisco);
      aplicarFiltros(clientesEmRisco);
    } catch (error) {
      console.error("Erro ao carregar clientes em risco:", error);
      toast.error("Erro ao carregar dados dos clientes");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (clientesBase: ClienteRisco[] = clientes) => {
    let resultado = [...clientesBase];

    if (filtros.faixaDias !== "todos") {
      resultado = resultado.filter((c) => c.faixaRisco === filtros.faixaDias);
    }

    if (filtros.busca.trim()) {
      const buscaLower = filtros.busca.toLowerCase();
      resultado = resultado.filter(
        (c) => c.nomeCliente.toLowerCase().includes(buscaLower) || c.nomePet.toLowerCase().includes(buscaLower),
      );
    }

    if (filtros.dataInicio) {
      const dataInicio = parseISO(filtros.dataInicio);
      resultado = resultado.filter((c) => c.ultimoAgendamento >= dataInicio);
    }

    if (filtros.dataFim) {
      const dataFim = parseISO(filtros.dataFim);
      resultado = resultado.filter((c) => c.ultimoAgendamento <= dataFim);
    }

    setClientesFiltrados(resultado);
  };

  const handleFiltrar = () => aplicarFiltros();

  const abrirModalDetalhes = (cliente: ClienteRisco) => {
    setClienteSelecionado(cliente);
    setModalAberto(true);
  };

  useEffect(() => {
    carregarClientesEmRisco();
  }, [user]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
      <FiltrosClientesRisco filtros={filtros} setFiltros={setFiltros} onFiltrar={handleFiltrar} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Clientes em Risco ({clientesFiltrados.length})</CardTitle>
          <ExportButton
            data={clientesFiltrados.map((c) => ({
              Cliente: c.nomeCliente,
              Pet: c.nomePet,
              Telefone: c.whatsapp,
              "Último Agendamento": format(c.ultimoAgendamento, "dd/MM/yyyy"),
              "Dias sem Agendar": c.diasSemAgendar,
              "Faixa de Risco": obterLabelFaixa(c.faixaRisco),
            }))}
            filename="clientes-em-risco"
          />
        </CardHeader>

        <CardContent>
          {clientesFiltrados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado com os filtros aplicados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Último Agendamento</TableHead>
                    <TableHead>Dias sem Agendar</TableHead>
                    <TableHead>Faixa de Risco</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nomeCliente}</TableCell>
                      <TableCell>{cliente.nomePet}</TableCell>
                      <TableCell>{cliente.whatsapp}</TableCell>
                      <TableCell>{format(cliente.ultimoAgendamento, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{cliente.diasSemAgendar} dias</TableCell>
                      <TableCell>
                        <Badge variant={obterVarianteBadge(cliente.faixaRisco)}>
                          {obterLabelFaixa(cliente.faixaRisco)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirModalDetalhes(cliente)}
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirWhatsApp(cliente.whatsapp, cliente.nomeCliente)}
                            title="Abrir WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ModalDetalhesCliente aberto={modalAberto} cliente={clienteSelecionado} onFechar={() => setModalAberto(false)} />
    </div>
  );
};

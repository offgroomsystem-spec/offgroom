import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MessageSquare, Loader2, FileDown } from "lucide-react";
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
  const numeroLimpo = whatsapp.replace(/\D/g, '');
  const numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
  
  const mensagem = encodeURIComponent(
    `Olá ${nomeCliente}! Notamos que faz um tempo que não nos visita. Gostaríamos de saber como você e seu pet estão! 🐾`
  );
  
  window.open(`https://wa.me/${numeroCompleto}?text=${mensagem}`, '_blank');
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
    dataFim: ""
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteRisco | null>(null);

  const carregarClientesEmRisco = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Buscar todos os agendamentos (regulares e de pacotes)
      const { data: agendamentos, error: errorAgendamentos } = await supabase
        .from('agendamentos')
        .select('cliente_id, cliente, data, pet, whatsapp')
        .eq('user_id', user.id)
        .order('data', { ascending: false });

      if (errorAgendamentos) throw errorAgendamentos;

      // Processar dados e identificar clientes em risco
      const clientesMap = new Map<string, ClienteRisco>();

      // Processar todos os agendamentos
      agendamentos?.forEach(ag => {
        const dataAgendamento = parseISO(ag.data);
        const chaveCliente = `${ag.cliente}_${ag.pet}`;
        
        if (!clientesMap.has(chaveCliente)) {
          clientesMap.set(chaveCliente, {
            id: ag.cliente_id || chaveCliente,
            nomeCliente: ag.cliente,
            nomePet: ag.pet,
            whatsapp: ag.whatsapp,
            ultimoAgendamento: dataAgendamento,
            diasSemAgendar: 0,
            faixaRisco: "sem-risco"
          });
        } else {
          const clienteExistente = clientesMap.get(chaveCliente)!;
          if (dataAgendamento > clienteExistente.ultimoAgendamento) {
            clienteExistente.ultimoAgendamento = dataAgendamento;
          }
        }
      });

      // Filtrar apenas clientes sem agendamentos futuros e calcular dias
      const clientesEmRisco: ClienteRisco[] = [];
      
      clientesMap.forEach(cliente => {
        // Verificar se tem agendamento futuro
        const temAgendamentoFuturo = agendamentos?.some(
          ag => ag.cliente === cliente.nomeCliente && 
                ag.pet === cliente.nomePet && 
                parseISO(ag.data) >= hoje
        );

        if (!temAgendamentoFuturo) {
          const diasSemAgendar = differenceInDays(hoje, cliente.ultimoAgendamento);
          
          if (diasSemAgendar >= 7) {
            cliente.diasSemAgendar = diasSemAgendar;
            cliente.faixaRisco = classificarFaixaRisco(diasSemAgendar);
            clientesEmRisco.push(cliente);
          }
        }
      });

      // Ordenar do maior para o menor tempo sem agendar
      clientesEmRisco.sort((a, b) => b.diasSemAgendar - a.diasSemAgendar);

      setClientes(clientesEmRisco);
      aplicarFiltros(clientesEmRisco);
    } catch (error) {
      console.error('Erro ao carregar clientes em risco:', error);
      toast.error('Erro ao carregar dados dos clientes');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (clientesBase: ClienteRisco[] = clientes) => {
    let resultado = [...clientesBase];

    // Filtro por faixa de dias
    if (filtros.faixaDias !== "todos") {
      resultado = resultado.filter(c => c.faixaRisco === filtros.faixaDias);
    }

    // Filtro por busca de nome
    if (filtros.busca.trim()) {
      const buscaLower = filtros.busca.toLowerCase();
      resultado = resultado.filter(
        c => c.nomeCliente.toLowerCase().includes(buscaLower) ||
             c.nomePet.toLowerCase().includes(buscaLower)
      );
    }

    // Filtro por data de último agendamento
    if (filtros.dataInicio) {
      const dataInicio = parseISO(filtros.dataInicio);
      resultado = resultado.filter(c => c.ultimoAgendamento >= dataInicio);
    }

    if (filtros.dataFim) {
      const dataFim = parseISO(filtros.dataFim);
      resultado = resultado.filter(c => c.ultimoAgendamento <= dataFim);
    }

    setClientesFiltrados(resultado);
  };

  const handleFiltrar = () => {
    aplicarFiltros();
  };

  const abrirModalDetalhes = (cliente: ClienteRisco) => {
    setClienteSelecionado(cliente);
    setModalAberto(true);
  };

  useEffect(() => {
    carregarClientesEmRisco();
  }, [user]);

  // Calcular contadores
  const contadores = {
    "7-10": clientes.filter(c => c.faixaRisco === "7-10").length,
    "11-15": clientes.filter(c => c.faixaRisco === "11-15").length,
    "16-20": clientes.filter(c => c.faixaRisco === "16-20").length,
    "21-30": clientes.filter(c => c.faixaRisco === "21-30").length,
    "31-45": clientes.filter(c => c.faixaRisco === "31-45").length,
    "46-90": clientes.filter(c => c.faixaRisco === "46-90").length,
    "perdido": clientes.filter(c => c.faixaRisco === "perdido").length,
  };

  // Preparar dados para exportação
  const dadosExportacao = clientesFiltrados.map(c => ({
    Cliente: c.nomeCliente,
    Pet: c.nomePet,
    Telefone: c.whatsapp,
    "Último Agendamento": format(c.ultimoAgendamento, "dd/MM/yyyy"),
    "Dias sem Agendar": c.diasSemAgendar,
    "Faixa de Risco": obterLabelFaixa(c.faixaRisco)
  }));

  const colunasExportacao = [
    { key: "Cliente", label: "Cliente" },
    { key: "Pet", label: "Pet" },
    { key: "Telefone", label: "Telefone" },
    { key: "Último Agendamento", label: "Último Agendamento" },
    { key: "Dias sem Agendar", label: "Dias sem Agendar" },
    { key: "Faixa de Risco", label: "Faixa de Risco" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contadores por Faixa */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className={obterCorCard("7-10")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-700">{contadores["7-10"]}</div>
            <div className="text-xs text-muted-foreground">7-10 dias</div>
          </CardContent>
        </Card>
        <Card className={obterCorCard("11-15")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-700">{contadores["11-15"]}</div>
            <div className="text-xs text-muted-foreground">11-15 dias</div>
          </CardContent>
        </Card>
        <Card className={obterCorCard("16-20")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-700">{contadores["16-20"]}</div>
            <div className="text-xs text-muted-foreground">16-20 dias</div>
          </CardContent>
        </Card>
        <Card className={obterCorCard("21-30")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-700">{contadores["21-30"]}</div>
            <div className="text-xs text-muted-foreground">21-30 dias</div>
          </CardContent>
        </Card>
        <Card className={obterCorCard("31-45")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-700">{contadores["31-45"]}</div>
            <div className="text-xs text-muted-foreground">31-45 dias</div>
          </CardContent>
        </Card>
        <Card className={obterCorCard("46-90")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-700">{contadores["46-90"]}</div>
            <div className="text-xs text-muted-foreground">46-90 dias</div>
          </CardContent>
        </Card>
        <Card className={obterCorCard("perdido")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-700">{contadores["perdido"]}</div>
            <div className="text-xs text-muted-foreground">Perdidos</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <FiltrosClientesRisco
        filtros={filtros}
        setFiltros={setFiltros}
        onFiltrar={handleFiltrar}
      />

      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Clientes em Risco ({clientesFiltrados.length})</CardTitle>
          <ExportButton
            data={dadosExportacao}
            filename="clientes-em-risco"
            columns={colunasExportacao}
          />
        </CardHeader>
        <CardContent>
          {clientesFiltrados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum cliente encontrado com os filtros aplicados
            </p>
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
                      <TableCell>
                        {format(cliente.ultimoAgendamento, "dd/MM/yyyy")}
                      </TableCell>
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

      {/* Modal de Detalhes */}
      <ModalDetalhesCliente
        aberto={modalAberto}
        cliente={clienteSelecionado}
        onFechar={() => setModalAberto(false)}
      />
    </div>
  );
};

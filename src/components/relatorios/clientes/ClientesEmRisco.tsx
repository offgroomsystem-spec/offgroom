import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { format, differenceInDays, parseISO, isValid } from "date-fns";
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

// Gera a mensagem personalizada conforme a faixa de dias
const gerarMensagemWhatsApp = (cliente: ClienteRisco): string => {
  const { nomeCliente, nomePet, diasSemAgendar } = cliente;

  if (diasSemAgendar >= 7 && diasSemAgendar <= 10)
    return `Olá, ${nomeCliente}!  
Como vc está?

Notamos que faz ${diasSemAgendar} dias do último banho de ${nomePet}. Está quase na hora do próximo banho. Vamos marcar o próximo para manter os cuidados em dia?`;

  if (diasSemAgendar >= 11 && diasSemAgendar <= 15)
    return `Oii, ${nomeCliente}.  
Como vc está?

Já faz um tempinho desde o último banho de ${nomePet}. Vamos marcar o próximo para ele continuar sempre bem cuidado?`;

  if (diasSemAgendar >= 16 && diasSemAgendar <= 20)
    return `Olá, ${nomeCliente}.  
Como vc está?

Já faz um bom tempo que o ${nomePet} não vem nos visitar. Vamos agendar o próximo banho e colocar os cuidados em dia?`;

  if (diasSemAgendar >= 21 && diasSemAgendar <= 30)
    return `Olá, ${nomeCliente}.  
Como vc está?

Já faz quase um mês desde o último banho de ${nomePet}. Que tal agendar um novo e deixar ele limpo e confortável?`;

  if (diasSemAgendar >= 31 && diasSemAgendar <= 45)
    return `Oii, ${nomeCliente}!  
Como vc está?

O ${nomePet} está há bastante tempo sem vir nos visitar. Temos horários disponíveis nesta semana. Vamos marcar?`;

  if (diasSemAgendar >= 46 && diasSemAgendar <= 90)
    return `Olá, ${nomeCliente}.  
Já faz bastante tempo que ${nomePet} não vem ao nosso espaço. Sentimos falta dele. Que tal agendar um novo banho e colocá-lo em dia com um cuidado especial?`;

  return `Olá, ${nomeCliente}! Tudo bem?`;
};

// Copia o link formatado com a mensagem
const copiarLinkWhatsApp = (cliente: ClienteRisco) => {
  if (!cliente.whatsapp) return toast.error("Número de WhatsApp não informado");

  const numeroLimpo = cliente.whatsapp.toString().replace(/\D/g, "");
  const numeroCompleto = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;

  const mensagem = encodeURIComponent(gerarMensagemWhatsApp(cliente));
  const link = `https://wa.me/${numeroCompleto}?text=${mensagem}`;

  navigator.clipboard.writeText(link).then(() => {
    toast.success("✅ Link copiado! Cole no navegador (Ctrl+V) para abrir o WhatsApp");
  });
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

      const { data: agendamentos, error: errorAg } = await supabase
        .from("agendamentos")
        .select("cliente_id, cliente, data, pet, whatsapp")
        .eq("user_id", user.id)
        .order("data", { ascending: false });

      if (errorAg) throw errorAg;

      const { data: pacotes, error: errorPac } = await supabase
        .from("agendamentos_pacotes")
        .select("id, nome_cliente, data_venda, nome_pet, whatsapp, servicos")
        .eq("user_id", user.id);

      if (errorPac) throw errorPac;

      const mapa = new Map<string, ClienteRisco>();

      const adicionarOuAtualizar = (
        chave: string,
        nomeCliente: string,
        nomePet: string,
        whatsapp: any,
        dataStr: string,
      ) => {
        if (!dataStr) return;
        const data = parseISO(dataStr);
        if (!isValid(data)) return;

        if (!mapa.has(chave)) {
          mapa.set(chave, {
            id: chave,
            nomeCliente,
            nomePet,
            whatsapp: whatsapp ? whatsapp.toString() : "",
            ultimoAgendamento: data,
            diasSemAgendar: 0,
            faixaRisco: "sem-risco",
          });
        } else {
          const existente = mapa.get(chave)!;
          if (data > existente.ultimoAgendamento) {
            existente.ultimoAgendamento = data;
          }
        }
      };

      agendamentos?.forEach((a) => {
        const chave = `${a.cliente}_${a.pet}`;
        adicionarOuAtualizar(chave, a.cliente, a.pet, a.whatsapp, a.data);
      });

      pacotes?.forEach((p) => {
        const chave = `${p.nome_cliente}_${p.nome_pet}`;
        let ultimaDataServico: Date | null = null;

        try {
          const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
          if (Array.isArray(servicos)) {
            const datasValidas = servicos.map((s) => parseISO(s.data)).filter((d) => isValid(d));
            if (datasValidas.length > 0) {
              ultimaDataServico = new Date(Math.max(...datasValidas.map((d) => d.getTime())));
            }
          }
        } catch {}

        const dataFinal = ultimaDataServico ? ultimaDataServico.toISOString().split("T")[0] : p.data_venda;
        adicionarOuAtualizar(chave, p.nome_cliente, p.nome_pet, p.whatsapp, dataFinal);
      });

      const listaRisco: ClienteRisco[] = [];
      mapa.forEach((cli) => {
        const dias = differenceInDays(hoje, cli.ultimoAgendamento);
        const temAgendamentoFuturo =
          agendamentos?.some(
            (a) => a.cliente === cli.nomeCliente && a.pet === cli.nomePet && parseISO(a.data) >= hoje,
          ) ||
          pacotes?.some((p) => {
            if (p.nome_cliente !== cli.nomeCliente || p.nome_pet !== cli.nomePet) return false;
            try {
              const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
              if (Array.isArray(servicos)) {
                return servicos.some((s) => isValid(parseISO(s.data)) && parseISO(s.data) >= hoje);
              }
            } catch {
              return false;
            }
            return parseISO(p.data_venda) >= hoje;
          });

        if (!temAgendamentoFuturo && dias >= 7) {
          cli.diasSemAgendar = dias;
          cli.faixaRisco = classificarFaixaRisco(dias);
          listaRisco.push(cli);
        }
      });

      listaRisco.sort((a, b) => b.diasSemAgendar - a.diasSemAgendar);
      setClientes(listaRisco);
      aplicarFiltros(listaRisco);
    } catch (err) {
      console.error("Erro ao carregar clientes em risco:", err);
      toast.error("Erro ao carregar dados dos clientes");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (base: ClienteRisco[] = clientes) => {
    let resultado = [...base];
    if (filtros.faixaDias !== "todos") resultado = resultado.filter((c) => c.faixaRisco === filtros.faixaDias);
    if (filtros.busca.trim()) {
      const termo = filtros.busca.toLowerCase();
      resultado = resultado.filter(
        (c) => c.nomeCliente.toLowerCase().includes(termo) || c.nomePet.toLowerCase().includes(termo),
      );
    }
    if (filtros.dataInicio) resultado = resultado.filter((c) => c.ultimoAgendamento >= parseISO(filtros.dataInicio));
    if (filtros.dataFim) resultado = resultado.filter((c) => c.ultimoAgendamento <= parseISO(filtros.dataFim));
    setClientesFiltrados(resultado);
  };

  const handleFiltrar = () => aplicarFiltros();
  const abrirModalDetalhes = (c: ClienteRisco) => {
    setClienteSelecionado(c);
    setModalAberto(true);
  };

  useEffect(() => {
    carregarClientesEmRisco();
  }, [user]);

  const contadores = {
    "7-10": clientes.filter((c) => c.faixaRisco === "7-10").length,
    "11-15": clientes.filter((c) => c.faixaRisco === "11-15").length,
    "16-20": clientes.filter((c) => c.faixaRisco === "16-20").length,
    "21-30": clientes.filter((c) => c.faixaRisco === "21-30").length,
    "31-45": clientes.filter((c) => c.faixaRisco === "31-45").length,
    "46-90": clientes.filter((c) => c.faixaRisco === "46-90").length,
    perdido: clientes.filter((c) => c.faixaRisco === "perdido").length,
  };

  const dadosExportacao = clientesFiltrados.map((c) => ({
    Cliente: c.nomeCliente,
    Pet: c.nomePet,
    Telefone: c.whatsapp,
    "Último Agendamento": format(c.ultimoAgendamento, "dd/MM/yyyy"),
    "Dias sem Agendar": c.diasSemAgendar,
    "Faixa de Risco": obterLabelFaixa(c.faixaRisco),
  }));

  const colunasExportacao = [
    { key: "Cliente", label: "Cliente" },
    { key: "Pet", label: "Pet" },
    { key: "Telefone", label: "Telefone" },
    { key: "Último Agendamento", label: "Último Agendamento" },
    { key: "Dias sem Agendar", label: "Dias sem Agendar" },
    { key: "Faixa de Risco", label: "Faixa de Risco" },
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Contadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.keys(contadores).map((key) => (
          <Card key={key} className={obterCorCard(key)}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-center">{contadores[key as keyof typeof contadores]}</div>
              <div className="text-xs text-center text-muted-foreground">{obterLabelFaixa(key)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FiltrosClientesRisco filtros={filtros} setFiltros={setFiltros} onFiltrar={handleFiltrar} />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Clientes em Risco ({clientesFiltrados.length})</CardTitle>
          <ExportButton data={dadosExportacao} filename="clientes-em-risco" columns={colunasExportacao} />
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
                  {clientesFiltrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nomeCliente}</TableCell>
                      <TableCell>{c.nomePet}</TableCell>
                      <TableCell>{c.whatsapp}</TableCell>
                      <TableCell>{format(c.ultimoAgendamento, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{c.diasSemAgendar} dias</TableCell>
                      <TableCell>
                        <Badge variant={obterVarianteBadge(c.faixaRisco)}>{obterLabelFaixa(c.faixaRisco)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirModalDetalhes(c)}
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copiarLinkWhatsApp(c)}
                            title="Copiar Link do WhatsApp"
                          >
                            <span
                              className="text-lg"
                              dangerouslySetInnerHTML={{ __html: '<i class="fi fi-rr-link-alt"></i>' }}
                            />
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

// src/components/relatorios/clientes/ClientesEmRisco.tsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays, isValid } from "date-fns";
import { toast } from "sonner";
import { FiltrosClientesRisco } from "./FiltrosClientesRisco";
import { ModalDetalhesCliente } from "./ModalDetalhesCliente";
import { buildWhatsAppUrl, getInvalidPhoneMessage, normalizeBrazilPhone } from "@/utils/phone";

interface ClienteRisco {
  id: string;
  clienteId: string;
  nomeCliente: string;
  nomePet: string;
  sexoPet: string | null;
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

// Monta a lista de pets com artigo de gênero: "o Theo, a Amora, a Meg"
const montarListaPets = (pets: { nomePet: string; sexoPet: string | null }[]): string => {
  return pets
    .map((p) => {
      const artigo = p.sexoPet?.toLowerCase() === "fêmea" || p.sexoPet?.toLowerCase() === "femea" ? "a" : "o";
      return `${artigo} ${p.nomePet}`;
    })
    .join(", ");
};

const isFemeaFe = (sexo: string | null): boolean => {
  const s = sexo?.toLowerCase();
  return s === "fêmea" || s === "femea";
};

const todosFemeaFe = (pets: { sexoPet: string | null }[]): boolean => {
  return pets.every((p) => isFemeaFe(p.sexoPet));
};

const gFe = (pets: { sexoPet: string | null }[], ms: string, fs: string, mp: string, fp: string): string => {
  if (pets.length === 1) return isFemeaFe(pets[0].sexoPet) ? fs : ms;
  return todosFemeaFe(pets) ? fp : mp;
};

// Gera mensagem agrupada para todos os pets do mesmo cliente
const gerarMensagemAgrupada = (
  primeiroNome: string,
  pets: { nomePet: string; sexoPet: string | null; diasSemAgendar: number }[]
): string => {
  const listaPets = montarListaPets(pets);
  const maxDias = Math.max(...pets.map((p) => p.diasSemAgendar));
  const singular = pets.length === 1;

  if (singular) {
    const p = pets[0];
    const art = isFemeaFe(p.sexoPet) ? "A" : "O";
    const art_l = isFemeaFe(p.sexoPet) ? "a" : "o";
    const ele = isFemeaFe(p.sexoPet) ? "ela" : "ele";
    const dele = isFemeaFe(p.sexoPet) ? "dela" : "dele";
    const cheiroso = isFemeaFe(p.sexoPet) ? "cheirosa" : "cheiroso";
    const limpinho = isFemeaFe(p.sexoPet) ? "limpinha" : "limpinho";
    const do_ = isFemeaFe(p.sexoPet) ? "da" : "do";

    if (maxDias >= 7 && maxDias <= 10)
      return `Oi, ${primeiroNome}!\nSeparei alguns horários especiais essa semana e lembrei de vocês 😊\n${art} ${p.nomePet} já está na hora daquele banho caprichado 🛁✨ Quer que eu garanta um horário pra você?`;
    if (maxDias >= 11 && maxDias <= 15)
      return `🚨 Alerta banho atrasado! 😂🐶\nOi, ${primeiroNome}! ${art} ${p.nomePet} já passou da fase do 'só mais uns dias' 😅\nQue tal garantir aquele banho caprichado e deixar ${ele} ${cheiroso} e confortável de novo? 🛁💚\nMe chama que te passo os horários disponíveis !`;
    if (maxDias >= 16 && maxDias <= 20)
      return `Oi, ${primeiroNome}!\n${art} ${p.nomePet} já está há alguns dias além do ideal sem banho 😬\nNessa fase, pode começar a gerar desconfortos e até afetar a pele ${dele} 😕\nQue tal já agendarmos pra deixar ${ele} ${limpinho} e ${cheiroso} novamente? 🥰✨`;
    if (maxDias >= 21 && maxDias <= 30)
      return `Oi, ${primeiroNome}!\nJá faz um bom tempinho desde o último banho ${do_} ${p.nomePet} 🐾\nCom ${maxDias} dias, é bem importante retomar os cuidados pra evitar desconfortos e manter a saúde ${dele} 🛁\nVamos agendar pra deixar ${ele} ${limpinho} e ${cheiroso} novamente? ✨\nTemos alguns horários disponiveis, vamos agendar ?`;
    if (maxDias >= 31 && maxDias <= 45)
      return `🚨 Atenção: nível máximo de 'precisando de banho' atingido! 😂🐶\nOi, ${primeiroNome}! ${art} ${p.nomePet} já está pedindo socorro por um banho caprichado 🛁✨\nBora resolver isso e deixar ${ele} ${cheiroso} novamente?\nSe quiser, posso te sugerir os melhores horários disponíveis! 💚`;
    if (maxDias >= 46 && maxDias <= 90)
      return `Oi, ${primeiroNome}!\nPercebemos que ${art_l} ${p.nomePet} não vem há um tempinho… sentimos falta ${dele} por aqui 😕\nQueremos muito continuar cuidando ${dele} como sempre fizemos 😔\nVamos agendar um horário pra retomar esse cuidado?`;
    return `Oi, ${primeiroNome}!\nEstamos abrindo alguns horários especiais pra clientes que queremos muito receber de volta… e ${art_l} ${p.nomePet} está nessa lista 🐶✨\nQue tal aproveitar e agendar um banho pra deixar ${ele} ${cheiroso} novamente? 🛁😊`;
  }

  // PLURAL (2+ pets)
  const eles = gFe(pets, "ele", "ela", "eles", "elas");
  const deles = gFe(pets, "dele", "dela", "deles", "delas");
  const cheirosos = gFe(pets, "cheiroso", "cheirosa", "cheirosos", "cheirosas");
  const limpinho = gFe(pets, "limpinho", "limpinha", "limpinho", "limpinha");

  if (maxDias >= 7 && maxDias <= 10)
    return `Oi, ${primeiroNome}!\nSeparei alguns horários especiais essa semana e lembrei de vocês 😊\n${listaPets} já estão na hora daquele banho caprichado 🛁✨ Quer que eu garanta um horário pra você?`;
  if (maxDias >= 11 && maxDias <= 15)
    return `🚨 Alerta banho atrasado! 😂🐶\nOi, ${primeiroNome}! ${listaPets} já passou da fase do 'só mais uns dias' 😅\nQue tal garantir aquele banho caprichado e deixar ${eles} ${cheirosos} e confortável de novo? 🛁💚\nMe chama que te passo os horários disponíveis !`;
  if (maxDias >= 16 && maxDias <= 20)
    return `Oi, ${primeiroNome}!\n${listaPets} já estão há alguns dias além do ideal sem banho 😬\nNessa fase, pode começar a gerar desconfortos e até afetar a pele ${deles} 😕\nQue tal já agendarmos pra deixar ${eles} ${limpinho} e ${cheirosos} novamente? 🥰✨`;
  if (maxDias >= 21 && maxDias <= 30)
    return `Oi, ${primeiroNome}!\nJá faz um bom tempinho desde o último banho ${gFe(pets, "do", "da", "do", "da")} ${listaPets} 🐾\nCom ${maxDias} dias, é bem importante retomar os cuidados pra evitar desconfortos e manter a saúde ${deles} 🛁\nVamos agendar pra deixar ${eles} ${limpinho} e ${cheirosos} novamente? ✨\nTemos alguns horários disponiveis, vamos agendar ?`;
  if (maxDias >= 31 && maxDias <= 45)
    return `🚨 Atenção: nível máximo de 'precisando de banho' atingido! 😂🐶\nOi, ${primeiroNome}! ${listaPets} já está pedindo socorro por um banho caprichado 🛁✨\nBora resolver isso e deixar ${eles} ${cheirosos} novamente?\nSe quiser, posso te sugerir os melhores horários disponíveis! 💚`;
  if (maxDias >= 46 && maxDias <= 90)
    return `Oi, ${primeiroNome}!\nPercebemos que ${listaPets} não vem há um tempinho… sentimos falta ${deles} por aqui 😕\nQueremos muito continuar cuidando ${deles} como sempre fizemos 😔\nVamos agendar um horário pra retomar esse cuidado?`;
  return `Oi, ${primeiroNome}!\nEstamos abrindo alguns horários especiais pra clientes que queremos muito receber de volta… e ${listaPets} está nessa lista 🐶✨\nQue tal aproveitar e agendar um banho pra deixar ${eles} ${cheirosos} novamente? 🛁😊`;
};

export const ClientesEmRisco = () => {
  const { user, ownerId } = useAuth();
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
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState<string | null>(null);
  const whatsappInstanceRef = useRef<{ name: string; connected: boolean }>({ name: "", connected: false });

  // Carregar instância WhatsApp
  useEffect(() => {
    const loadInstance = async () => {
      if (!ownerId) return;
      try {
        const { data: instances } = await supabase
          .from("whatsapp_instances")
          .select("instance_name, status")
          .eq("user_id", ownerId)
          .limit(1);

        if (instances && instances.length > 0) {
          const inst = instances[0];
          whatsappInstanceRef.current.name = inst.instance_name;

          if (inst.status === "connected") {
            try {
              const { data } = await supabase.functions.invoke("evolution-api", {
                body: { action: "check-status", instanceName: inst.instance_name },
              });
              whatsappInstanceRef.current.connected = data?.instance?.state === "open";
            } catch {
              whatsappInstanceRef.current.connected = false;
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar instância WhatsApp:", err);
      }
    };
    loadInstance();
  }, [ownerId]);

  // Enviar WhatsApp diretamente via Evolution API
  const enviarWhatsAppDireto = async (clienteClicado: ClienteRisco, todosClientes: ClienteRisco[]) => {
    if (!clienteClicado.whatsapp) return toast.error("Número de WhatsApp não informado");

    const petsDoCliente = todosClientes
      .filter((c) => c.clienteId === clienteClicado.clienteId)
      .map((c) => ({ nomePet: c.nomePet, sexoPet: c.sexoPet, diasSemAgendar: c.diasSemAgendar }));

    const primeiroNome = clienteClicado.nomeCliente.split(" ")[0];
    const mensagem = gerarMensagemAgrupada(primeiroNome, petsDoCliente);

    const numeroCompleto = normalizeBrazilPhone(clienteClicado.whatsapp);
    if (!numeroCompleto) {
      return toast.error(getInvalidPhoneMessage(clienteClicado.whatsapp));
    }

    const { name: instanceName, connected } = whatsappInstanceRef.current;

    if (!connected || !instanceName) {
      const link = buildWhatsAppUrl(numeroCompleto, mensagem);
      if (!link) return toast.error(getInvalidPhoneMessage(clienteClicado.whatsapp));
      window.open(link, "_blank");
      return;
    }

    setEnviandoWhatsApp(clienteClicado.clienteId);

    try {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send-message",
          instanceName,
          number: numeroCompleto,
          text: mensagem,
        },
      });

      if (error) {
        const detail = data?.error || data?.details || error?.message || "Erro desconhecido";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      toast.success(`Mensagem enviada para ${clienteClicado.nomeCliente}!`);
    } catch (err) {
      console.error("Erro ao enviar WhatsApp:", err);
      toast.error("Erro ao enviar mensagem. Abrindo link manual...");
      const link = buildWhatsAppUrl(numeroCompleto, mensagem);
      if (link) window.open(link, "_blank");
    } finally {
      setEnviandoWhatsApp(null);
    }
  };

  // carregar clientes (mantive sua lógica que já funcionava)
  const carregarClientesEmRisco = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Paginação para buscar TODOS os agendamentos (sem limite de 1000)
      const allAgendamentos: any[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("agendamentos")
          .select("cliente_id, cliente, data, pet, whatsapp")
          .eq("user_id", ownerId)
          .order("data", { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        if (data) allAgendamentos.push(...data);
        if (!data || data.length < 1000) break;
        page++;
      }

      // Buscar sexo dos pets
      const { data: petsData } = await supabase
        .from("pets")
        .select("cliente_id, nome_pet, sexo")
        .eq("user_id", ownerId);

      const petSexoMap = new Map<string, string | null>();
      (petsData || []).forEach((p: any) => {
        petSexoMap.set(`${p.cliente_id}_${p.nome_pet}`, p.sexo);
      });
      const agendamentos = allAgendamentos;

      // Paginação para buscar TODOS os pacotes
      const allPacotes: any[] = [];
      page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("agendamentos_pacotes")
          .select("id, nome_cliente, data_venda, nome_pet, whatsapp, servicos")
          .eq("user_id", ownerId)
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        if (data) allPacotes.push(...data);
        if (!data || data.length < 1000) break;
        page++;
      }
      const pacotes = allPacotes;

      const mapa = new Map<string, ClienteRisco>();

      const adicionarOuAtualizar = (
        chave: string,
        nomeCliente: string,
        nomePet: string,
        whatsapp: any,
        dataStr: string,
        clienteId: string,
      ) => {
        if (!dataStr) return;
        const data = new Date(dataStr + "T00:00:00");
        if (!isValid(data)) return;

        if (!mapa.has(chave)) {
          mapa.set(chave, {
            id: chave,
            clienteId,
            nomeCliente,
            nomePet,
            sexoPet: petSexoMap.get(`${clienteId}_${nomePet}`) || null,
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
        const clienteId = a.cliente_id || a.cliente;
        const chave = `${clienteId}_${a.pet}`;
        adicionarOuAtualizar(chave, a.cliente, a.pet, a.whatsapp, a.data, clienteId);
      });

      pacotes?.forEach((p) => {
        // Tentar encontrar o cliente_id pelo nome
        const clienteMatch = (petsData || []).find((pd: any) => {
          // fallback: match by nome_cliente from clientes query would be better
          return false;
        });
        const chave = `${p.nome_cliente}_${p.nome_pet}`;
        let ultimaDataServico: Date | null = null;

        try {
          const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
          if (Array.isArray(servicos)) {
            const datasValidas = servicos.map((s: any) => new Date(s.data + "T00:00:00")).filter((d: Date) => isValid(d));
            if (datasValidas.length > 0) {
              ultimaDataServico = new Date(Math.max(...datasValidas.map((d: Date) => d.getTime())));
            }
          }
        } catch {}

        const dataFinal = ultimaDataServico ? ultimaDataServico.toISOString().split("T")[0] : p.data_venda;
        adicionarOuAtualizar(chave, p.nome_cliente, p.nome_pet, p.whatsapp, dataFinal, p.nome_cliente);
      });

      const listaRisco: ClienteRisco[] = [];

      mapa.forEach((cli) => {
        const dias = differenceInDays(hoje, cli.ultimoAgendamento);
        const temAgendamentoFuturo =
          agendamentos?.some(
            (a) => `${a.cliente_id || a.cliente}_${a.pet}` === cli.id && new Date(a.data + "T00:00:00") >= hoje,
          ) ||
          pacotes?.some((p) => {
            if (`${p.nome_cliente}_${p.nome_pet}` !== cli.id) return false;
            try {
              const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
              if (Array.isArray(servicos)) {
                return servicos.some((s) => isValid(new Date(s.data + "T00:00:00")) && new Date(s.data + "T00:00:00") >= hoje);
              }
            } catch {
              return false;
            }
            return new Date(p.data_venda + "T00:00:00") >= hoje;
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

  useEffect(() => {
    carregarClientesEmRisco();
  }, [user]);

  // aplica filtros e atualiza clientesFiltrados
  const aplicarFiltros = (base: ClienteRisco[] = clientes) => {
    let resultado = [...base];

    if (filtros.faixaDias !== "todos") resultado = resultado.filter((c) => c.faixaRisco === filtros.faixaDias);

    if (filtros.busca.trim()) {
      const termo = filtros.busca.toLowerCase();
      resultado = resultado.filter(
        (c) => c.nomeCliente.toLowerCase().includes(termo) || c.nomePet.toLowerCase().includes(termo),
      );
    }

    if (filtros.dataInicio) resultado = resultado.filter((c) => c.ultimoAgendamento >= new Date(filtros.dataInicio + "T00:00:00"));

    if (filtros.dataFim) resultado = resultado.filter((c) => c.ultimoAgendamento <= new Date(filtros.dataFim + "T00:00:00"));

    setClientesFiltrados(resultado);
  };

  // quando usuário clica em Filtrar (passado para o componente filho),
  // recolhemos a área de filtros também.
  const handleFiltrar = () => {
    aplicarFiltros();
    setFiltrosVisiveis(false);
  };

  // detecta quando o filho limpou os filtros (estado padrão) e recolhe automaticamente
  useEffect(() => {
    const padrao =
      filtros.faixaDias === "todos" &&
      filtros.busca.trim() === "" &&
      filtros.dataInicio === "" &&
      filtros.dataFim === "";

    if (padrao) {
      setFiltrosVisiveis(false);
      aplicarFiltros();
    }
  }, [filtros]); // eslint-disable-line

  const abrirModalDetalhes = (c: ClienteRisco) => {
    setClienteSelecionado(c);
    setModalAberto(true);
  };

  // contadores (mantidos iguais)
  const contadores = {
    "7-10": clientes.filter((c) => c.faixaRisco === "7-10").length,
    "11-15": clientes.filter((c) => c.faixaRisco === "11-15").length,
    "16-20": clientes.filter((c) => c.faixaRisco === "16-20").length,
    "21-30": clientes.filter((c) => c.faixaRisco === "21-30").length,
    "31-45": clientes.filter((c) => c.faixaRisco === "31-45").length,
    "46-90": clientes.filter((c) => c.faixaRisco === "46-90").length,
    perdido: clientes.filter((c) => c.faixaRisco === "perdido").length,
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
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

      {/* botão que exibe / recolhe o painel de filtros */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setFiltrosVisiveis((s) => !s)}
          title={filtrosVisiveis ? "Recolher filtros" : "Exibir filtros"}
        >
          <Filter className="h-4 w-4 mr-2" />
          {filtrosVisiveis ? "Recolher Filtros" : "Exibir Filtros"}
          {filtrosVisiveis ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>
      </div>

      {/* painel de filtros (recolhido por padrão) */}
      {filtrosVisiveis && (
        <div>
          <FiltrosClientesRisco filtros={filtros} setFiltros={setFiltros} onFiltrar={handleFiltrar} />
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Clientes em Risco ({clientesFiltrados.length})</CardTitle>
          {/* Removi ExportButton conforme pedido */}
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
                      <TableCell>{format(c.ultimoAgendamento as unknown as Date, "dd/MM/yyyy")}</TableCell>
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
                            onClick={() => enviarWhatsAppDireto(c, clientesFiltrados)}
                            title="Enviar WhatsApp"
                            disabled={enviandoWhatsApp === c.clienteId}
                          >
                            {enviandoWhatsApp === c.clienteId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '16px' }}></i>
                            )}
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

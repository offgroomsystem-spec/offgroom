import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/relatorios/shared/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CalendarDays, DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle, Package, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subDays, addDays, subMonths, differenceInDays, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ContasProximasVencimento } from "@/components/dashboard/ContasProximasVencimento";
import { NovosClientes } from "@/components/dashboard/NovosClientes";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [agendamentosPacotes, setAgendamentosPacotes] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [diasFuncionamento, setDiasFuncionamento] = useState<any>(null);
  const [kpisAdicionais, setKpisAdicionais] = useState({
    clientesEmRisco: 0,
    pacotesExpirados: 0,
    pacotesAExpirar: 0,
    produtosVencimento: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const hoje = new Date();
        const inicioMes = startOfMonth(hoje);
        const fimMes = endOfMonth(hoje);
        const ultimos30Dias = subDays(hoje, 30);
        const ultimos90Dias = subDays(hoje, 90);

        // Carregar agendamentos
        const { data: agendamentosData } = await supabase
          .from("agendamentos")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", format(ultimos30Dias, "yyyy-MM-dd"))
          .order("data", { ascending: true })
          .order("horario", { ascending: true });

        setAgendamentos(agendamentosData || []);

        // Carregar agendamentos de pacotes
        const { data: agendamentosPacotesData } = await supabase
          .from("agendamentos_pacotes")
          .select("*")
          .eq("user_id", user.id)
          .gte("data_venda", format(ultimos90Dias, "yyyy-MM-dd"))
          .order("data_venda", { ascending: true });

        setAgendamentosPacotes(agendamentosPacotesData || []);

        // Carregar lançamentos financeiros
        const { data: lancamentosData } = await supabase
          .from("lancamentos_financeiros")
          .select("*, lancamentos_financeiros_itens(*)")
          .eq("user_id", user.id)
          .gte("data_pagamento", format(ultimos90Dias, "yyyy-MM-dd"));

        setLancamentos(lancamentosData || []);

        // Carregar clientes
        const { data: clientesData } = await supabase.from("clientes").select("*").eq("user_id", user.id);

        setClientes(clientesData || []);

        // Carregar configuração da empresa para obter dias de funcionamento
        const { data: empresaConfig } = await supabase
          .from("empresa_config")
          .select("dias_funcionamento")
          .eq("user_id", user.id)
          .single();

        setDiasFuncionamento(
          empresaConfig?.dias_funcionamento || {
            segunda: true,
            terca: true,
            quarta: true,
            quinta: true,
            sexta: true,
            sabado: false,
            domingo: false,
          },
        );

        // Calcular KPIs adicionais
        const [clientesRisco, pacotesExp, pacotesAExp, produtosVenc] = await Promise.all([
          calcularClientesEmRisco(),
          calcularPacotesExpirados(),
          calcularPacotesAExpirar(),
          calcularProdutosVencimento(),
        ]);

        setKpisAdicionais({
          clientesEmRisco: clientesRisco,
          pacotesExpirados: pacotesExp,
          pacotesAExpirar: pacotesAExp,
          produtosVencimento: produtosVenc,
        });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Função para calcular o próximo dia útil
  const getProximoDiaUtil = (diasFuncionamento: any) => {
    const hoje = new Date();
    let proximoDia = addDays(hoje, 1);

    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    let tentativas = 0;
    while (tentativas < 7) {
      const diaDaSemana = diasSemana[proximoDia.getDay()];
      if (diasFuncionamento && diasFuncionamento[diaDaSemana] === true) {
        return proximoDia;
      }
      proximoDia = addDays(proximoDia, 1);
      tentativas++;
    }

    return addDays(hoje, 1);
  };

  // Calcular Clientes em Risco (15-90 dias sem agendamento)
  const calcularClientesEmRisco = async () => {
    if (!user) return 0;

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: agendamentosData } = await supabase
        .from("agendamentos")
        .select("cliente_id, cliente, data, pet, whatsapp")
        .eq("user_id", user.id)
        .order("data", { ascending: false });

      const { data: pacotesData } = await supabase
        .from("agendamentos_pacotes")
        .select("id, nome_cliente, data_venda, nome_pet, servicos")
        .eq("user_id", user.id);

      const mapa = new Map<string, { nomeCliente: string; nomePet: string; ultimoAgendamento: Date }>();

      agendamentosData?.forEach((a) => {
        const chave = `${a.cliente}_${a.pet}`;
        const data = parseISO(a.data);
        if (!isValid(data)) return;

        if (!mapa.has(chave)) {
          mapa.set(chave, { nomeCliente: a.cliente, nomePet: a.pet, ultimoAgendamento: data });
        } else {
          const existente = mapa.get(chave)!;
          if (data > existente.ultimoAgendamento) {
            existente.ultimoAgendamento = data;
          }
        }
      });

      pacotesData?.forEach((p) => {
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

        const dataFinal = ultimaDataServico ? ultimaDataServico : parseISO(p.data_venda);
        if (!isValid(dataFinal)) return;

        if (!mapa.has(chave)) {
          mapa.set(chave, { nomeCliente: p.nome_cliente, nomePet: p.nome_pet, ultimoAgendamento: dataFinal });
        } else {
          const existente = mapa.get(chave)!;
          if (dataFinal > existente.ultimoAgendamento) {
            existente.ultimoAgendamento = dataFinal;
          }
        }
      });

      let count = 0;
      mapa.forEach((cli) => {
        const dias = differenceInDays(hoje, cli.ultimoAgendamento);
        
        // Verificar agendamento futuro APENAS para este cliente/pet específico
        const temAgendamentoFuturo =
          agendamentosData?.some(
            (a) => a.cliente === cli.nomeCliente && a.pet === cli.nomePet && parseISO(a.data) >= hoje
          ) ||
          pacotesData?.some((p) => {
            if (p.nome_cliente !== cli.nomeCliente || p.nome_pet !== cli.nomePet) return false;
            try {
              const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
              if (Array.isArray(servicos)) {
                return servicos.some((s) => isValid(parseISO(s.data)) && parseISO(s.data) >= hoje);
              }
            } catch {
              return false;
            }
            return false;
          });

        if (!temAgendamentoFuturo && dias >= 15 && dias <= 90) {
          count++;
        }
      });

      return count;
    } catch (error) {
      console.error("Erro ao calcular clientes em risco:", error);
      return 0;
    }
  };

  // Calcular Pacotes Expirados sem agendamento futuro
  const calcularPacotesExpirados = async () => {
    if (!user) return 0;

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: agendamentosPacotesData } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", user.id);

      const { data: pacotesDefinicao } = await supabase
        .from("pacotes")
        .select("*")
        .eq("user_id", user.id);

      const { data: todosAgendamentos } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("user_id", user.id);

      let count = 0;

      for (const pacoteVendido of agendamentosPacotesData || []) {
        const definicao = pacotesDefinicao?.find((p) => p.nome === pacoteVendido.nome_pacote);
        if (!definicao) continue;

        const dataVenda = new Date(pacoteVendido.data_venda);
        const validadeDias = parseInt(definicao.validade) || 0;
        const dataVencimento = new Date(dataVenda);
        dataVencimento.setDate(dataVencimento.getDate() + validadeDias);

        if (dataVencimento >= hoje) continue;

        const agendamentosClientePet =
          todosAgendamentos?.filter((ag) => {
            const clienteNormalizado = ag.cliente?.trim().toLowerCase() || "";
            const clientePacoteNormalizado = pacoteVendido.nome_cliente?.trim().toLowerCase() || "";
            const petNormalizado = ag.pet?.trim().toLowerCase() || "";
            const petPacoteNormalizado = pacoteVendido.nome_pet?.trim().toLowerCase() || "";

            return clienteNormalizado === clientePacoteNormalizado && petNormalizado === petPacoteNormalizado;
          }) || [];

        const temAgendamentoNaTabela = agendamentosClientePet.some((ag) => {
          const dataAgendamento = new Date(ag.data);
          dataAgendamento.setHours(0, 0, 0, 0);
          return dataAgendamento >= hoje;
        });

        const servicosFuturosNoPacote =
          (pacoteVendido.servicos as any[])?.filter((servico) => {
            const dataServico = new Date(servico.data);
            dataServico.setHours(0, 0, 0, 0);
            return dataServico >= hoje;
          }) || [];
        const temServicoFuturoNoPacote = servicosFuturosNoPacote.length > 0;

        // Verificar se algum outro pacote do mesmo cliente/pet tem serviços futuros
        const outrosPacotesClientePet =
          agendamentosPacotesData?.filter((p) => {
            if (p.id === pacoteVendido.id) return false;

            const clienteNormalizado = p.nome_cliente?.trim().toLowerCase() || "";
            const clientePacoteNormalizado = pacoteVendido.nome_cliente?.trim().toLowerCase() || "";
            const petNormalizado = p.nome_pet?.trim().toLowerCase() || "";
            const petPacoteNormalizado = pacoteVendido.nome_pet?.trim().toLowerCase() || "";

            return clienteNormalizado === clientePacoteNormalizado && petNormalizado === petPacoteNormalizado;
          }) || [];

        const temServicoFuturoEmOutrosPacotes = outrosPacotesClientePet.some((outroPacote) => {
          return (outroPacote.servicos as any[])?.some((servico) => {
            const dataServico = new Date(servico.data);
            dataServico.setHours(0, 0, 0, 0);
            return dataServico >= hoje;
          });
        });

        const temAgendamentoFuturo =
          temAgendamentoNaTabela || temServicoFuturoNoPacote || temServicoFuturoEmOutrosPacotes;

        // Se não tem agendamento futuro, adicionar à contagem (sem limite de 90 dias)
        if (!temAgendamentoFuturo) {
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error("Erro ao calcular pacotes expirados:", error);
      return 0;
    }
  };

  // Calcular Pacotes a Expirar (7 dias)
  const calcularPacotesAExpirar = async () => {
    if (!user) return 0;

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: agendamentosPacotesData } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", user.id);

      const { data: pacotesDefinicao } = await supabase
        .from("pacotes")
        .select("nome, validade")
        .eq("user_id", user.id);

      // Criar mapa de validades
      const validadeMap = new Map<string, number>();
      (pacotesDefinicao || []).forEach((p) => {
        const validadeDias = parseInt(p.validade.replace(/\D/g, "")) || 0;
        validadeMap.set(p.nome, validadeDias);
      });

      let count = 0;

      for (const pacoteVendido of agendamentosPacotesData || []) {
        const validade = validadeMap.get(pacoteVendido.nome_pacote) || 0;
        
        // Calcular dias restantes usando a mesma lógica do relatório
        const dataVencimento = new Date(pacoteVendido.data_venda);
        dataVencimento.setDate(dataVencimento.getDate() + validade);
        dataVencimento.setHours(0, 0, 0, 0);

        const diffTime = dataVencimento.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diasRestantes >= 0 && diasRestantes <= 7) {
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error("Erro ao calcular pacotes a expirar:", error);
      return 0;
    }
  };

  // Calcular Produtos Próximos ao Vencimento (30 dias)
  const calcularProdutosVencimento = async () => {
    if (!user) return 0;

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: itensCompra } = await supabase
        .from("compras_nf_itens")
        .select(`
          id,
          produto_id,
          quantidade,
          data_validade,
          nf_id,
          compras_nf!inner (
            user_id
          )
        `)
        .not("data_validade", "is", null);

      const itensDoUsuario = (itensCompra || []).filter(
        (item: any) => item.compras_nf?.user_id === user.id
      );

      const lotesMap = new Map<string, boolean>();

      itensDoUsuario.forEach((item: any) => {
        const dataValidade = new Date(item.data_validade);
        dataValidade.setHours(0, 0, 0, 0);

        const diasParaVencer = differenceInDays(dataValidade, hoje);

        const chave = `${item.produto_id}-${item.data_validade}`;

        if (diasParaVencer <= 30 && !lotesMap.has(chave)) {
          lotesMap.set(chave, true);
        }
      });

      return lotesMap.size;
    } catch (error) {
      console.error("Erro ao calcular produtos vencimento:", error);
      return 0;
    }
  };

  // Cálculo dos KPIs
  const kpis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = format(hoje, "yyyy-MM-dd");
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);
    const proximaSemana = addDays(hoje, 7);
    const mesAnterior = subMonths(hoje, 1);
    const inicioMesAnterior = startOfMonth(mesAnterior);
    const fimMesAnterior = endOfMonth(mesAnterior);

    // Atendimentos do dia (agendamentos regulares)
    const atendimentosDiaRegulares = agendamentos.filter(
      (a) => a.data === hojeStr && (a.status === "confirmado" || a.status === "pendente"),
    ).length;

    // Atendimentos do dia (pacotes agendados)
    const atendimentosDiaPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => s.data === hojeStr).length;
    }, 0);

    const atendimentosDia = atendimentosDiaRegulares + atendimentosDiaPacotes;

    // Atendimentos do próximo dia útil
    const proximoDiaUtil = getProximoDiaUtil(diasFuncionamento);
    const proximoDiaUtilStr = format(proximoDiaUtil, "yyyy-MM-dd");

    // Agendamentos regulares do próximo dia útil
    const atendimentosProximoDiaRegulares = agendamentos.filter(
      (a) => a.data === proximoDiaUtilStr && (a.status === "confirmado" || a.status === "pendente"),
    ).length;

    // Agendamentos de pacotes do próximo dia útil
    const atendimentosProximoDiaPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => s.data === proximoDiaUtilStr).length;
    }, 0);

    const atendimentosProximoDia = atendimentosProximoDiaRegulares + atendimentosProximoDiaPacotes;

    // Faturamento do mês (receitas pagas)
    const faturamentoMes = lancamentos
      .filter((l) => {
        if (l.tipo !== "Receita" || !l.pago) return false;
        const data = new Date(l.data_pagamento);
        return data >= inicioMes && data <= fimMes;
      })
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    // Entradas previstas (receitas não pagas)
    const entradasPrevistas = lancamentos
      .filter((l) => l.tipo === "Receita" && !l.pago)
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    // Saídas previstas (despesas não pagas)
    const saidasPrevistas = lancamentos
      .filter((l) => l.tipo === "Despesa" && !l.pago)
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    // Taxa de recorrência (clientes que tiveram atendimento este mês e no mês anterior)
    const clientesMesAtual = new Set(
      agendamentos
        .filter((a) => {
          const data = new Date(a.data);
          return data >= inicioMes && data <= fimMes;
        })
        .map((a) => a.cliente),
    );

    const clientesMesAnterior = new Set(
      agendamentos
        .filter((a) => {
          const data = new Date(a.data);
          return data >= inicioMesAnterior && data <= fimMesAnterior;
        })
        .map((a) => a.cliente),
    );

    const clientesRecorrentes = [...clientesMesAtual].filter((c) => clientesMesAnterior.has(c)).length;
    const taxaRecorrencia = clientesMesAnterior.size > 0 ? (clientesRecorrentes / clientesMesAnterior.size) * 100 : 0;

    return {
      atendimentosDia,
      atendimentosProximoDia,
      proximoDiaUtil,
      faturamentoMes,
      entradasPrevistas,
      saidasPrevistas,
      taxaRecorrencia,
    };
  }, [agendamentos, agendamentosPacotes, lancamentos, diasFuncionamento]);

  // Dados para gráfico de fluxo de caixa (últimos 30 dias)
  const dadosFluxoCaixa = useMemo(() => {
    const ultimos30Dias = subDays(new Date(), 30);
    const dados: any[] = [];

    for (let i = 0; i < 30; i++) {
      const data = addDays(ultimos30Dias, i);
      const dataStr = format(data, "yyyy-MM-dd");

      const receitas = lancamentos
        .filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento === dataStr)
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      const despesas = lancamentos
        .filter((l) => l.tipo === "Despesa" && l.pago && l.data_pagamento === dataStr)
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      dados.push({
        data: format(data, "dd/MM", { locale: ptBR }),
        receitas,
        despesas,
        lucro: receitas - despesas,
      });
    }

    return dados;
  }, [lancamentos]);

  // Dados para gráfico de crescimento de agendamentos (últimos 12 meses)
  const dadosCrescimentoAgendamentos = useMemo(() => {
    const dados: any[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);

      // Agendamentos regulares
      const quantidadeRegulares = agendamentos.filter((a) => {
        const data = new Date(a.data);
        return data >= inicioMes && data <= fimMes;
      }).length;

      // Agendamentos de pacotes
      const quantidadePacotes = agendamentosPacotes.reduce((count, p) => {
        const servicos = Array.isArray(p.servicos) ? p.servicos : [];
        return (
          count +
          servicos.filter((s: any) => {
            if (!s.data) return false;
            const data = new Date(s.data);
            return data >= inicioMes && data <= fimMes;
          }).length
        );
      }, 0);

      const totalAtendimentos = quantidadeRegulares + quantidadePacotes;

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        quantidade: totalAtendimentos,
      });
    }

    // Calcular variação percentual para cada mês
    return dados.map((d, index) => {
      if (index === 0) {
        return { ...d, variacao: 0 };
      }
      const mesAnterior = dados[index - 1].quantidade;
      const variacao = mesAnterior > 0 ? ((d.quantidade - mesAnterior) / mesAnterior) * 100 : 0;
      return { ...d, variacao };
    });
  }, [agendamentos, agendamentosPacotes]);

  // Média mensal de atendimentos
  const mediaMensalAtendimentos = useMemo(() => {
    if (!diasFuncionamento) return { media: 0, totalAtendimentos: 0, diasUteis: 0 };

    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);

    // Contar agendamentos regulares do mês
    const atendimentosRegulares = agendamentos.filter((a) => {
      const data = new Date(a.data);
      return data >= inicioMes && data <= hoje;
    }).length;

    // Contar agendamentos de pacotes do mês
    const atendimentosPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return (
        count +
        servicos.filter((s: any) => {
          if (!s.data) return false;
          const data = new Date(s.data);
          return data >= inicioMes && data <= hoje;
        }).length
      );
    }, 0);

    const totalAtendimentos = atendimentosRegulares + atendimentosPacotes;

    // Contar dias úteis trabalhados do início do mês até hoje
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    let diasUteis = 0;
    let dataAtual = new Date(inicioMes);

    while (dataAtual <= hoje) {
      const diaDaSemana = diasSemana[dataAtual.getDay()];
      if (diasFuncionamento[diaDaSemana] === true) {
        diasUteis++;
      }
      dataAtual = addDays(dataAtual, 1);
    }

    const media = diasUteis > 0 ? totalAtendimentos / diasUteis : 0;

    return {
      media: Math.round(media * 10) / 10,
      totalAtendimentos,
      diasUteis,
    };
  }, [agendamentos, agendamentosPacotes, diasFuncionamento]);

  // Dados históricos de média mensal para os últimos 12 meses
  const dadosMediaMensalHistorico = useMemo(() => {
    if (!diasFuncionamento) return [];

    const dados: any[] = [];
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    // Buscar últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);
      const hoje = new Date();

      // Limitar ao dia atual se for o mês corrente
      const dataFinal = i === 0 ? hoje : fimMes;

      // Contar agendamentos regulares do mês
      const atendimentosRegulares = agendamentos.filter((a) => {
        const data = new Date(a.data);
        return data >= inicioMes && data <= dataFinal;
      }).length;

      // Contar agendamentos de pacotes do mês
      const atendimentosPacotes = agendamentosPacotes.reduce((count, p) => {
        const servicos = Array.isArray(p.servicos) ? p.servicos : [];
        return (
          count +
          servicos.filter((s: any) => {
            if (!s.data) return false;
            const data = new Date(s.data);
            return data >= inicioMes && data <= dataFinal;
          }).length
        );
      }, 0);

      const totalAtendimentos = atendimentosRegulares + atendimentosPacotes;

      // Contar dias úteis do mês (até hoje se for mês corrente)
      let diasUteis = 0;
      let dataAtual = new Date(inicioMes);

      while (dataAtual <= dataFinal) {
        const diaDaSemana = diasSemana[dataAtual.getDay()];
        if (diasFuncionamento[diaDaSemana] === true) {
          diasUteis++;
        }
        dataAtual = addDays(dataAtual, 1);
      }

      const media = diasUteis > 0 ? totalAtendimentos / diasUteis : 0;

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        media: Math.round(media * 10) / 10, // Arredondar para 1 casa decimal
      });
    }

    return dados;
  }, [agendamentos, agendamentosPacotes, diasFuncionamento]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      {/* Linha 1: Cards de Indicadores Principais (5 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          titulo="Atendimentos Hoje"
          valor={`${kpis.atendimentosDia} agendamentos`}
          subtitulo=""
          icon={<Calendar />}
          cor="default"
        />

        <KPICard
          titulo="Atendimentos Próximo dia útil"
          valor={`${kpis.atendimentosProximoDia} agendamentos`}
          subtitulo={kpis.proximoDiaUtil ? format(kpis.proximoDiaUtil, "EEEE, dd/MM", { locale: ptBR }) : ""}
          icon={<CalendarDays />}
          cor="default"
        />

        <KPICard
          titulo="Faturamento Mês"
          valor={kpis.faturamentoMes}
          subtitulo="receitas pagas no mês"
          icon={<DollarSign />}
          cor="green"
        />

        <KPICard
          titulo="Entradas Previstas"
          valor={kpis.entradasPrevistas}
          subtitulo="contas a receber"
          icon={<TrendingUp />}
          cor="default"
        />

        <KPICard
          titulo="Saídas Previstas"
          valor={kpis.saidasPrevistas}
          subtitulo="contas a pagar"
          icon={<TrendingDown />}
          cor="red"
        />
      </div>

      {/* Linha 2: Cards de Indicadores Adicionais (5 cards - clicáveis) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          titulo="Taxa de Recorrência"
          valor={`${kpis.taxaRecorrencia.toFixed(1)}%`}
          subtitulo="clientes que retornaram"
          icon={<Users />}
          cor={kpis.taxaRecorrencia >= 70 ? "green" : kpis.taxaRecorrencia >= 50 ? "yellow" : "red"}
        />

        <KPICard
          titulo="Clientes em Risco"
          valor={`${kpisAdicionais.clientesEmRisco} Clientes`}
          subtitulo="sem agendamento há 15+ dias"
          icon={<AlertTriangle />}
          cor={kpisAdicionais.clientesEmRisco > 0 ? "red" : "green"}
          onClick={() => navigate("/relatorios", { state: { tab: "clientes-risco" } })}
        />

        <KPICard
          titulo="Pacotes Vencidos"
          valor={`${kpisAdicionais.pacotesExpirados} Pacotes`}
          subtitulo="sem agendamentos futuros"
          icon={<Package />}
          cor={kpisAdicionais.pacotesExpirados > 0 ? "red" : "green"}
          onClick={() => navigate("/relatorios", { state: { tab: "pacotes-expirados" } })}
        />

        <KPICard
          titulo="Pacotes a Expirar"
          valor={`${kpisAdicionais.pacotesAExpirar} Pacotes`}
          subtitulo="7 dias"
          icon={<Package />}
          cor={kpisAdicionais.pacotesAExpirar > 0 ? "yellow" : "green"}
          onClick={() => navigate("/relatorios", { state: { tab: "pacotes-vencimento" } })}
        />

        <KPICard
          titulo="Produtos Próximos ao Vencimento"
          valor={`${kpisAdicionais.produtosVencimento} Produtos`}
          subtitulo="30 dias"
          icon={<ShoppingCart />}
          cor={kpisAdicionais.produtosVencimento > 0 ? "yellow" : "green"}
          onClick={() => navigate("/relatorios", { state: { tab: "produtos-vencimento" } })}
        />
      </div>

      {/* Linha 2: Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico Fluxo de Caixa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Caixa - Últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFluxoCaixa} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                <YAxis width={30} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(value)
                  }
                />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="#22c55e" name="Receitas" strokeWidth={2} />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Evolução de Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Atendimentos - Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosCrescimentoAgendamentos} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={30} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.mes}</p>
                          <p className="text-sm">Atendimentos: {data.quantidade}</p>
                          {data.variacao !== 0 && (
                            <p
                              className={`text-sm font-medium ${data.variacao > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.variacao > 0 ? "+" : ""}
                              {data.variacao.toFixed(1)}% vs mês anterior
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="quantidade"
                  stroke="#3b82f6"
                  name="Atendimentos"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Média Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Média do Mês de Atendimentos Realizados</CardTitle>
            <p className="text-xs text-muted-foreground">
              Média diária de atendimentos considerando apenas dias úteis trabalhados
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosMediaMensalHistorico} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={30} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.mes}</p>
                          <p className="text-sm">Média: {data.media.toFixed(1)} atendimentos/dia</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="media"
                  stroke="#8b5cf6"
                  name="Média Diária"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Linha 3: Mini Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ContasProximasVencimento lancamentos={lancamentos} />
        <NovosClientes clientes={clientes} />
      </div>
    </div>
  );
};

export default Home;

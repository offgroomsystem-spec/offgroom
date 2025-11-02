import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "../shared/KPICard";
import { AlertCard } from "../shared/AlertCard";
import { DollarSign, TrendingUp, Calendar, Users, Clock, AlertCircle, Package, UserX } from "lucide-react";
import { format } from "date-fns";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
}

interface DashboardExecutivoProps {
  filtros: Filtros;
  onNavigateToReport?: (reportId: string, filtrosIniciais?: any) => void;
}

interface DadosAtendimentos {
  mes: string;
  quantidadeTotal: number;
  mediaDiaria: number;
  variacaoQuantidade: number | null;
  variacaoMedia: number | null;
}

// Função para calcular dias de funcionamento baseado na configuração da empresa
const calcularDiasFuncionamento = (
  ano: number, 
  mes: number, 
  diasConfig: any
): number => {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  let diasFuncionamento = 0;

  // Mapear dias da semana para o objeto de configuração
  const mapaDias: { [key: number]: string } = {
    0: 'domingo',
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado',
  };

  for (let dia = new Date(primeiroDia); dia <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
    const diaSemana = dia.getDay();
    const nomeDia = mapaDias[diaSemana];
    
    // Verificar se esse dia da semana está configurado como dia de funcionamento
    if (diasConfig[nomeDia] === true) {
      diasFuncionamento++;
    }
  }

  return diasFuncionamento;
};

// Função para gerar texto descritivo dos dias de funcionamento
const gerarTextoDiasFuncionamento = (diasConfig: any): string => {
  const diasAtivos: string[] = [];
  const mapaDias: { [key: string]: string } = {
    segunda: 'segunda-feira',
    terca: 'terça-feira',
    quarta: 'quarta-feira',
    quinta: 'quinta-feira',
    sexta: 'sexta-feira',
    sabado: 'sábado',
    domingo: 'domingo',
  };

  Object.keys(mapaDias).forEach((dia) => {
    if (diasConfig[dia] === true) {
      diasAtivos.push(mapaDias[dia]);
    }
  });

  if (diasAtivos.length === 0) return "sem dias de funcionamento configurados";
  if (diasAtivos.length === 7) return "todos os dias da semana";
  
  // Caso especial: Segunda a Sexta
  if (
    diasAtivos.length === 5 &&
    diasConfig.segunda && diasConfig.terca && diasConfig.quarta && 
    diasConfig.quinta && diasConfig.sexta && !diasConfig.sabado && !diasConfig.domingo
  ) {
    return "apenas dias úteis (segunda a sexta-feira)";
  }

  // Caso especial: Segunda a Sábado
  if (
    diasAtivos.length === 6 &&
    diasConfig.segunda && diasConfig.terca && diasConfig.quarta && 
    diasConfig.quinta && diasConfig.sexta && diasConfig.sabado && !diasConfig.domingo
  ) {
    return "de segunda-feira a sábado";
  }

  // Caso geral: listar todos os dias
  if (diasAtivos.length <= 3) {
    return diasAtivos.join(", ");
  }

  return `${diasAtivos.slice(0, -1).join(", ")} e ${diasAtivos[diasAtivos.length - 1]}`;
};

export const DashboardExecutivo = ({ filtros, onNavigateToReport }: DashboardExecutivoProps) => {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [agendamentosPacotes, setAgendamentosPacotes] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaFaturamento, setMetaFaturamento] = useState<number>(10000);
  const [diasFuncionamento, setDiasFuncionamento] = useState<any>({
    segunda: true,
    terca: true,
    quarta: true,
    quinta: true,
    sexta: true,
    sabado: false,
    domingo: false,
  });

  // Calcular intervalo de datas baseado nos filtros
  const calcularIntervaloFiltro = useMemo(() => {
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date = hoje;

    switch (filtros.periodo) {
      case "hoje":
        dataInicio = hoje;
        break;
      case "semana":
        dataInicio = new Date();
        dataInicio.setDate(hoje.getDate() - 7);
        break;
      case "mes":
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case "trimestre":
        const mesAtual = hoje.getMonth();
        const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
        dataInicio = new Date(hoje.getFullYear(), inicioTrimestre, 1);
        break;
      case "ano":
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        break;
      case "customizado":
        dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : new Date(hoje.getFullYear(), 0, 1);
        dataFim = filtros.dataFim ? new Date(filtros.dataFim) : hoje;
        break;
      default:
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }

    return { dataInicio, dataFim };
  }, [filtros]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const { dataInicio, dataFim } = calcularIntervaloFiltro;

        // Carregar Configuração da Empresa (Meta de Faturamento + Dias de Funcionamento)
        const { data: empresaConfig } = await supabase
          .from("empresa_config")
          .select("meta_faturamento_mensal, dias_funcionamento")
          .eq("user_id", user.id)
          .maybeSingle();

        if (empresaConfig?.meta_faturamento_mensal) {
          setMetaFaturamento(Number(empresaConfig.meta_faturamento_mensal));
        }

        if (empresaConfig?.dias_funcionamento) {
          setDiasFuncionamento(empresaConfig.dias_funcionamento);
        }

        // Carregar Clientes
        const { data: clientesData } = await supabase.from("clientes").select("*").eq("user_id", user.id);
        setClientes(clientesData || []);

        // Carregar Produtos
        const { data: produtosData } = await supabase.from("produtos").select("*").eq("user_id", user.id);
        setProdutos(produtosData || []);

        // Carregar Pacotes
        const { data: pacotesData } = await supabase.from("pacotes").select("*").eq("user_id", user.id);
        setPacotes(pacotesData || []);

        // Carregar Agendamentos de Pacotes
        const { data: agendamentosPacotesData } = await supabase
          .from("agendamentos_pacotes")
          .select("*")
          .eq("user_id", user.id);
        setAgendamentosPacotes(agendamentosPacotesData || []);

        // Carregar Agendamentos
        const { data: agendamentosData } = await supabase
          .from("agendamentos")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", dataInicio.toISOString().split("T")[0])
          .lte("data", dataFim.toISOString().split("T")[0]);
        setAgendamentos(agendamentosData || []);

        // Carregar Lançamentos Financeiros
        const { data: lancamentosFinanceirosData } = await supabase
          .from("lancamentos_financeiros")
          .select(`
            *,
            lancamentos_financeiros_itens(*)
          `)
          .eq("user_id", user.id);

        // Converter para formato compatível
        const lancamentosCombinados = (lancamentosFinanceirosData || []).map((l) => ({
          id: l.id,
          tipo: l.tipo,
          descricao: l.descricao1,
          valorTotal: Number(l.valor_total),
          dataPagamento: l.data_pagamento,
          pago: l.pago,
          categoria: null,
          clienteId: l.cliente_id,
          contaId: l.conta_id,
        }));

        setLancamentos(lancamentosCombinados);
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        toast.error("Erro ao carregar dados do dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, filtros, calcularIntervaloFiltro]);

  // Cálculos dos KPIs
  const kpis = useMemo(() => {
    const hoje = new Date();
    const { dataInicio, dataFim } = calcularIntervaloFiltro;

    // Lucro Líquido APENAS DO MÊS ATUAL (independente do filtro de período)
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-11

    const primeiroDiaMesAtual = new Date(anoAtual, mesAtual, 1);
    primeiroDiaMesAtual.setHours(0, 0, 0, 0);

    const ultimoDiaMesAtual = new Date(anoAtual, mesAtual + 1, 0);
    ultimoDiaMesAtual.setHours(23, 59, 59, 999);

    const receitasMesAtual = lancamentos
      .filter((l: any) => {
        if (l.tipo !== "Receita" || !l.pago) return false;
        const dataPag = new Date(l.dataPagamento);
        return dataPag >= primeiroDiaMesAtual && dataPag <= ultimoDiaMesAtual;
      })
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const despesasMesAtual = lancamentos
      .filter((l: any) => {
        if (l.tipo !== "Despesa" || !l.pago) return false;
        const dataPag = new Date(l.dataPagamento);
        return dataPag >= primeiroDiaMesAtual && dataPag <= ultimoDiaMesAtual;
      })
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const lucroLiquido = receitasMesAtual - despesasMesAtual;

    // Ticket Médio = Faturamento Total / Número de Atendimentos (Avulsos + Pacotes)

    // Contar agendamentos avulsos concluídos
    const atendimentosAvulsosConcluidos = agendamentos.filter((a: any) => {
      if (a.status !== "concluido" && a.status !== "confirmado") return false;
      const dataAgend = new Date(a.data);
      return dataAgend >= dataInicio && dataAgend <= dataFim;
    }).length;

    // Contar serviços de pacotes realizados no período
    let servicosPacotesConcluidos = 0;
    agendamentosPacotes.forEach((ap: any) => {
      if (Array.isArray(ap.servicos)) {
        ap.servicos.forEach((s: any) => {
          const dataServico = new Date(s.data);
          if (dataServico >= dataInicio && dataServico <= dataFim) {
            servicosPacotesConcluidos++;
          }
        });
      }
    });

    const totalAtendimentos = atendimentosAvulsosConcluidos + servicosPacotesConcluidos;
    const ticketMedio = totalAtendimentos > 0 ? receitasMesAtual / totalAtendimentos : 0;

    // Agenda do Dia (serviços avulsos + pacotes)
    const hojeStr = format(hoje, "yyyy-MM-dd");

    let agendaDia = 0;

    // Contar agendamentos avulsos do dia
    agendaDia += agendamentos.filter(
      (a: any) => a.data === hojeStr && (a.status === "confirmado" || a.status === "pendente"),
    ).length;

    // Contar serviços de pacotes do dia
    agendamentosPacotes.forEach((ap: any) => {
      if (Array.isArray(ap.servicos)) {
        ap.servicos.forEach((s: any) => {
          if (s.data === hojeStr) {
            agendaDia++;
          }
        });
      }
    });

    // Taxa de Retenção (incluindo pacotes)

    // Clientes do período atual (avulsos + pacotes)
    const clientesMesAtual = new Set([
      ...agendamentos
        .filter((a: any) => {
          const dataAgend = new Date(a.data);
          return dataAgend >= dataInicio && dataAgend <= dataFim;
        })
        .map((a: any) => a.cliente),
      ...agendamentosPacotes
        .filter((ap: any) => {
          const dataVenda = new Date(ap.data_venda);
          return dataVenda >= dataInicio && dataVenda <= dataFim;
        })
        .map((ap: any) => ap.nome_cliente)
    ]);

    const diasNoFiltro = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    const dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - diasNoFiltro);

    // Clientes do período anterior (avulsos + pacotes)
    const clientesMesAnterior = new Set([
      ...agendamentos
        .filter((a: any) => {
          const dataAgend = new Date(a.data);
          return dataAgend >= dataInicioAnterior && dataAgend < dataInicio;
        })
        .map((a: any) => a.cliente),
      ...agendamentosPacotes
        .filter((ap: any) => {
          const dataVenda = new Date(ap.data_venda);
          return dataVenda >= dataInicioAnterior && dataVenda < dataInicio;
        })
        .map((ap: any) => ap.nome_cliente)
    ]);

    const clientesRetidos = [...clientesMesAtual].filter((c) => clientesMesAnterior.has(c)).length;
    const taxaRetencao = clientesMesAnterior.size > 0 ? (clientesRetidos / clientesMesAnterior.size) * 100 : 0;

    return {
      lucroLiquido,
      ticketMedio,
      agendaDia,
      taxaRetencao,
    };
  }, [lancamentos, agendamentos, agendamentosPacotes, pacotes, calcularIntervaloFiltro]);

  // Alertas
  const alertas = useMemo(() => {
    const { dataInicio, dataFim } = calcularIntervaloFiltro;

    // Pacotes a Expirar nos próximos 7 dias (não depende do filtro)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pacotesExpirando = agendamentosPacotes
      .map((ap: any) => {
        // Buscar validade do pacote na tabela de definições
        const pacoteDef = pacotes.find((p: any) => p.nome === ap.nome_pacote);
        if (!pacoteDef || !pacoteDef.validade) return null;
        
        const validadeDias = parseInt(pacoteDef.validade.replace(/\D/g, '')) || 0;
        const dataVenda = new Date(ap.data_venda);
        dataVenda.setHours(0, 0, 0, 0);
        
        const dataExpiracao = new Date(dataVenda);
        dataExpiracao.setDate(dataExpiracao.getDate() + validadeDias);
        
        const diffTime = dataExpiracao.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diasRestantes >= 0 && diasRestantes <= 7) {
          return {
            texto: `${ap.nome_cliente} - ${ap.nome_pacote} (${diasRestantes} dias)`,
            diasRestantes
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.diasRestantes - b.diasRestantes)
      .map((p: any) => p.texto);

    // Pacotes Expirados sem Agendamentos Futuros
    let contadorPacotesExpirados = 0;

    for (const pacoteVendido of agendamentosPacotes) {
      // 1. Buscar definição do pacote
      const definicao = pacotes.find((p: any) => p.nome === pacoteVendido.nome_pacote);
      if (!definicao) continue;

      // 2. Calcular vencimento
      const dataVenda = new Date(pacoteVendido.data_venda);
      const validadeDias = parseInt(definicao.validade) || 0;
      const dataVencimento = new Date(dataVenda);
      dataVencimento.setDate(dataVencimento.getDate() + validadeDias);

      // 3. Verificar se está vencido
      if (dataVencimento >= hoje) continue;

      // 4. Buscar agendamentos do mesmo cliente/pet
      const agendamentosClientePet = agendamentos.filter((ag: any) => {
        const clienteNorm = ag.cliente?.trim().toLowerCase() || '';
        const clientePacoteNorm = pacoteVendido.nome_cliente?.trim().toLowerCase() || '';
        const petNorm = ag.pet?.trim().toLowerCase() || '';
        const petPacoteNorm = pacoteVendido.nome_pet?.trim().toLowerCase() || '';
        
        return clienteNorm === clientePacoteNorm && petNorm === petPacoteNorm;
      });

      // 5a. Verificar agendamentos na tabela
      const temAgendamentoNaTabela = agendamentosClientePet.some((ag: any) => {
        const dataAgendamento = new Date(ag.data);
        dataAgendamento.setHours(0, 0, 0, 0);
        return dataAgendamento >= hoje;
      });

      // 5b. Verificar serviços do próprio pacote
      const temServicoFuturoNoPacote = (pacoteVendido.servicos as any[])?.some((servico: any) => {
        const dataServico = new Date(servico.data);
        dataServico.setHours(0, 0, 0, 0);
        return dataServico >= hoje;
      }) || false;

      // 5c. Verificar outros pacotes do mesmo cliente/pet
      const outrosPacotes = agendamentosPacotes.filter((p: any) => {
        if (p.id === pacoteVendido.id) return false;
        
        const clienteNorm = p.nome_cliente?.trim().toLowerCase() || '';
        const clientePacoteNorm = pacoteVendido.nome_cliente?.trim().toLowerCase() || '';
        const petNorm = p.nome_pet?.trim().toLowerCase() || '';
        const petPacoteNorm = pacoteVendido.nome_pet?.trim().toLowerCase() || '';
        
        return clienteNorm === clientePacoteNorm && petNorm === petPacoteNorm;
      });

      const temServicoFuturoEmOutrosPacotes = outrosPacotes.some((outroPacote: any) => {
        return (outroPacote.servicos as any[])?.some((servico: any) => {
          const dataServico = new Date(servico.data);
          dataServico.setHours(0, 0, 0, 0);
          return dataServico >= hoje;
        });
      });

      // 6. Consolidar verificações
      const temAgendamentoFuturo = 
        temAgendamentoNaTabela || 
        temServicoFuturoNoPacote || 
        temServicoFuturoEmOutrosPacotes;

      // 7. Se não tem agendamento futuro, contar
      if (!temAgendamentoFuturo) {
        contadorPacotesExpirados++;
      }
    }

    const pacotesExpiradosSemAgendamento = contadorPacotesExpirados;

    // Produtos vencendo no período
    const produtosVencendo = produtos
      .filter((p: any) => {
        if (!p.dataValidade) return false;
        const dataVal = new Date(p.dataValidade);
        return dataVal >= dataInicio && dataVal <= dataFim;
      })
      .map((p: any) => `${p.descricao} - ${format(new Date(p.dataValidade), "dd/MM/yyyy")}`);

    // Clientes em Risco (sem agendamento há mais de 30 dias)
    const dataLimite30Dias = new Date();
    dataLimite30Dias.setDate(dataLimite30Dias.getDate() - 30);

    // Mapear último agendamento de cada cliente (avulsos + pacotes)
    const ultimoAgendamentoPorCliente = new Map<string, Date>();

    agendamentos.forEach((a: any) => {
      const dataAgend = new Date(a.data);
      const ultimaData = ultimoAgendamentoPorCliente.get(a.cliente);
      if (!ultimaData || dataAgend > ultimaData) {
        ultimoAgendamentoPorCliente.set(a.cliente, dataAgend);
      }
    });

    agendamentosPacotes.forEach((ap: any) => {
      if (Array.isArray(ap.servicos)) {
        ap.servicos.forEach((s: any) => {
          const dataServico = new Date(s.data);
          const ultimaData = ultimoAgendamentoPorCliente.get(ap.nome_cliente);
          if (!ultimaData || dataServico > ultimaData) {
            ultimoAgendamentoPorCliente.set(ap.nome_cliente, dataServico);
          }
        });
      }
    });

    // Filtrar clientes sem agendamento há mais de 30 dias
    const todosClientes = [...new Set(clientes.map((c: any) => c.nome_cliente))];
    const clientesEmRisco = todosClientes
      .filter((nomeCliente) => {
        const ultimaData = ultimoAgendamentoPorCliente.get(nomeCliente);
        return !ultimaData || ultimaData < dataLimite30Dias;
      })
      .slice(0, 10); // Limitar a 10 clientes

    return {
      pacotesExpirando,
      pacotesExpiradosSemAgendamento,
      produtosVencendo,
      clientesEmRisco,
    };
  }, [lancamentos, pacotes, produtos, clientes, agendamentos, agendamentosPacotes, calcularIntervaloFiltro]);

  // Dados do Gráfico de Tendência
  const dadosGrafico = useMemo(() => {
    const { dataInicio, dataFim } = calcularIntervaloFiltro;
    const dados = [];

    // Detectar se deve agrupar por mês (trimestre/ano) ou por dia
    const agruparPorMes = filtros.periodo === "trimestre" || filtros.periodo === "ano";

    // Calcular meta proporcional baseada no período
    let metaProporcional: number;

    if (agruparPorMes) {
      // Meta por mês (valor completo)
      metaProporcional = metaFaturamento;
    } else if (filtros.periodo === "semana") {
      // Meta semanal = (Meta Mensal / 30 dias) * 7 dias
      metaProporcional = (metaFaturamento / 30) * 7;
    } else {
      // Meta por dia
      metaProporcional = metaFaturamento / 30;
    }

    if (agruparPorMes) {
      // AGRUPAMENTO POR MÊS
      const meses: { [key: string]: { receita: number; despesa: number } } = {};

      // Iterar por todos os lançamentos e agrupar por mês
      lancamentos.forEach((l: any) => {
        if (!l.pago) return;
        const dataLanc = new Date(l.dataPagamento);
        if (dataLanc < dataInicio || dataLanc > dataFim) return;

        const chaveMs = format(dataLanc, "MM/yyyy");

        if (!meses[chaveMs]) {
          meses[chaveMs] = { receita: 0, despesa: 0 };
        }

        if (l.tipo === "Receita") {
          meses[chaveMs].receita += l.valorTotal || 0;
        } else if (l.tipo === "Despesa") {
          meses[chaveMs].despesa += l.valorTotal || 0;
        }
      });

      // Criar array ordenado de meses no intervalo
      const dataAtual = new Date(dataInicio);
      while (dataAtual <= dataFim) {
        const chaveMs = format(dataAtual, "MM/yyyy");
        const dadosMes = meses[chaveMs] || { receita: 0, despesa: 0 };

        dados.push({
          periodo: chaveMs,
          receita: dadosMes.receita,
          despesa: dadosMes.despesa,
          meta: metaProporcional, // Meta mensal completa
        });

        // Avançar para o próximo mês
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
    } else {
      // AGRUPAMENTO POR DIA
      const diasNoIntervalo = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      for (let i = 0; i < Math.min(diasNoIntervalo, 31); i++) {
        const dataAtual = new Date(dataInicio);
        dataAtual.setDate(dataAtual.getDate() + i);

        const receitaDia = lancamentos
          .filter((l: any) => {
            if (l.tipo !== "Receita" || !l.pago) return false;
            const dataLanc = new Date(l.dataPagamento);
            return dataLanc.toDateString() === dataAtual.toDateString();
          })
          .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

        const despesaDia = lancamentos
          .filter((l: any) => {
            if (l.tipo !== "Despesa" || !l.pago) return false;
            const dataLanc = new Date(l.dataPagamento);
            return dataLanc.toDateString() === dataAtual.toDateString();
          })
          .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

        dados.push({
          periodo: format(dataAtual, "dd/MM"),
          receita: receitaDia,
          despesa: despesaDia,
          meta: metaProporcional, // Meta diária
        });
      }
    }

    return dados;
  }, [lancamentos, calcularIntervaloFiltro, filtros.periodo, metaFaturamento]);

  // Calcular dados de atendimentos (quantidade total e média diária)
  const dadosAtendimentos = useMemo(() => {
    // SEMPRE mostrar todos os 12 meses do ano atual
    const anoAtual = new Date().getFullYear();
    const mesInicio = 0; // Janeiro
    const mesFim = 11; // Dezembro

    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const dados: DadosAtendimentos[] = [];
    let quantidadeAnterior = 0;
    let mediaAnterior = 0;

    // Iterar pelos 12 meses do ano atual
    for (let mesIndex = mesInicio; mesIndex <= mesFim; mesIndex++) {
      // ===== CONTAR AGENDAMENTOS AVULSOS =====
      const atendimentosAvulsos = agendamentos.filter((a: any) => {
        if (a.status !== "confirmado" && a.status !== "concluido") return false;
        const dataAgend = new Date(a.data);
        return dataAgend.getFullYear() === anoAtual && dataAgend.getMonth() === mesIndex;
      }).length;

      // ===== CONTAR SERVIÇOS DE PACOTES =====
      let servicosPacotes = 0;
      agendamentosPacotes.forEach((ap: any) => {
        if (Array.isArray(ap.servicos)) {
          ap.servicos.forEach((s: any) => {
            const dataServico = new Date(s.data);
            if (dataServico.getFullYear() === anoAtual && dataServico.getMonth() === mesIndex) {
              servicosPacotes++;
            }
          });
        }
      });

      // ===== TOTAL DE ATENDIMENTOS (AVULSOS + PACOTES) =====
      const quantidadeTotal = atendimentosAvulsos + servicosPacotes;

      // Calcular dias de funcionamento do mês baseado na configuração
      const diasFunc = calcularDiasFuncionamento(anoAtual, mesIndex, diasFuncionamento);

      // Calcular média e arredondar para cima
      const mediaDiaria = diasFunc > 0 ? Math.ceil(quantidadeTotal / diasFunc) : 0;

      // Calcular variação percentual
      const variacaoQuantidade =
        quantidadeAnterior > 0 ? ((quantidadeTotal - quantidadeAnterior) / quantidadeAnterior) * 100 : 0;

      const variacaoMedia = mediaAnterior > 0 ? ((mediaDiaria - mediaAnterior) / mediaAnterior) * 100 : 0;

      dados.push({
        mes: meses[mesIndex],
        quantidadeTotal,
        mediaDiaria,
        variacaoQuantidade: mesIndex === 0 ? null : variacaoQuantidade,
        variacaoMedia: mesIndex === 0 ? null : variacaoMedia,
      });

      // Atualizar valores anteriores para próxima iteração
      quantidadeAnterior = quantidadeTotal;
      mediaAnterior = mediaDiaria;
    }

    return dados;
  }, [agendamentos, agendamentosPacotes, diasFuncionamento]);

  // Texto dinâmico para subtítulo do gráfico
  const textoDiasFuncionamento = useMemo(() => {
    return gerarTextoDiasFuncionamento(diasFuncionamento);
  }, [diasFuncionamento]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  // Componente de Tooltip Customizado
  const CustomTooltip = ({ active, payload, tipo }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const variacao = tipo === "quantidade" ? data.variacaoQuantidade : data.variacaoMedia;

    const valor = tipo === "quantidade" ? data.quantidadeTotal : data.mediaDiaria;

    const unidade = tipo === "quantidade" ? "atendimentos" : "atendimentos/dia";

    // Se for Janeiro ou variação é 0/null
    if (variacao === null || variacao === 0) {
      return (
        <div className="bg-popover border border-border p-3 rounded-md shadow-lg">
          <p className="font-semibold text-foreground">{data.mes}</p>
          <p className="text-foreground">
            {valor} {unidade}
          </p>
        </div>
      );
    }

    const cresceu = variacao > 0;
    const textoVariacao = cresceu
      ? `O mês atual Cresceu ${Math.abs(variacao).toFixed(1)}% em comparação com o mês anterior`
      : `O mês atual Diminuiu ${Math.abs(variacao).toFixed(1)}% em comparação com o mês anterior`;

    const corVariacao = cresceu ? "text-blue-600" : "text-red-600";

    return (
      <div className="bg-popover border border-border p-3 rounded-md shadow-lg">
        <p className="font-semibold text-foreground">{data.mes}</p>
        <p className="text-foreground">
          {valor} {unidade}
        </p>
        <p className={`${corVariacao} font-medium mt-1`}>{textoVariacao}</p>
      </div>
    );
  };

  return (
    // AJUSTE 1: Espaço entre seções reduzido de space-y-3 para space-y-1.5 (6px)
    <div className="space-y-1.5">
      {/* KPIs no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          titulo="Lucro Líquido"
          valor={kpis.lucroLiquido}
          icon={<DollarSign className="h-4 w-4" />}
          periodo="Este Mês"
          cor={kpis.lucroLiquido >= 0 ? "green" : "red"}
          destaque
          onClick={() => {
            if (onNavigateToReport) {
              const hoje = new Date();
              const anoAtual = hoje.getFullYear();
              const mesAtual = hoje.getMonth() + 1; // 1-12
              const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
              
              onNavigateToReport("controle-financeiro", {
                ano: anoAtual.toString(),
                dataInicio: `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`,
                dataFim: `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`,
                foiPago: "sim"
              });
            }
          }}
        />
        <KPICard titulo="Ticket Médio" valor={kpis.ticketMedio} icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard titulo="Agenda do Dia" valor={`${kpis.agendaDia} serviços`} icon={<Calendar className="h-4 w-4" />} />
        <KPICard
          titulo="Taxa de Retenção"
          valor={`${kpis.taxaRetencao.toFixed(1)}%`}
          icon={<Users className="h-4 w-4" />}
          cor={kpis.taxaRetencao >= 70 ? "green" : kpis.taxaRetencao >= 50 ? "yellow" : "red"}
        />
      </div>

      {/* Seção de Alertas */}
      <div>
        {/* AJUSTE 2: Margem abaixo do título reduzida de mb-3 para mb-1 (4px) */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <AlertCard
            tipo="warning"
            titulo="Pacotes a Expirar (7 dias)"
			// A prop 'lista' foi removida daqui
            textoDestaque={
              // Lógica para singular/plural
              `${alertas.pacotesExpirando.length} ${alertas.pacotesExpirando.length === 1 ? 'pacote.' : 'pacotes.'}`
            }
            icone={<Clock className="h-5 w-5" />}
            onClick={() => onNavigateToReport?.("pacotes-vencimento")}
          />
          <AlertCard
            tipo="warning"
            titulo="Pacotes Expirados sem agendamentos futuros"
            textoDestaque={
              `${alertas.pacotesExpiradosSemAgendamento} ${alertas.pacotesExpiradosSemAgendamento === 1 ? 'pacote' : 'pacotes'}`
            }
            icone={<Package className="h-5 w-5" />}
            onClick={() => onNavigateToReport?.("pacotes-expirados")}
          />
          <AlertCard
            tipo="warning"
            titulo="Produtos Próximos ao Vencimento (30 dias)"
            lista={alertas.produtosVencendo}
            icone={<Package className="h-5 w-5" />}
          />
          <AlertCard
            tipo="warning"
            titulo="Clientes em Risco (sem agendamento há 30+ dias)"
            lista={alertas.clientesEmRisco}
            icone={<UserX className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Gráficos Lado a Lado */}
      {/* O espaço aqui agora é controlado pelo 'space-y-1.5' principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Gráfico de Tendência */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filtros.periodo === "trimestre" && "Receitas e Despesas por Mês (Trimestre Atual)"}
              {filtros.periodo === "ano" && "Receitas e Despesas por Mês (Ano Atual)"}
              {!["trimestre", "ano"].includes(filtros.periodo) && "Receitas e Despesas no Período Filtrado"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-1 pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
                <YAxis />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(value)
                  }
                />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="#22c55e" name="Receita" strokeWidth={2} />
                <Line type="monotone" dataKey="despesa" stroke="#ef4444" name="Despesa" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="meta"
                  stroke="#6b7280"
                  name="Meta de Faturamento"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Quantidade Total de Atendimentos */}
        <Card>
          <CardHeader>
            <CardTitle>Quantidade Total de Atendimentos Realizados</CardTitle>
          </CardHeader>

          <CardContent className="p-1 pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosAtendimentos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip tipo="quantidade" />} />
                <Legend />
                <Bar dataKey="quantidadeTotal" fill="hsl(var(--primary))" name="Atendimentos Realizados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Média de Atendimentos por Dia */}
        <Card>
          <CardHeader>
            <CardTitle>Média do Mês de Atendimentos Realizados</CardTitle>
            <CardDescription>
              Média diária de atendimentos considerando {textoDiasFuncionamento}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-1 pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosAtendimentos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip tipo="media" />} />
                <Legend />
                <Bar dataKey="mediaDiaria" fill="hsl(var(--chart-2))" name="Média Diária" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

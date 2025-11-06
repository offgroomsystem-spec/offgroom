import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPICard } from "../shared/KPICard";
import { ExportButton } from "../shared/ExportButton";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
  bancosSelecionados: string[];
}

interface FluxoDeCaixaProps {
  filtros: Filtros;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const aplicarFiltros = (item: any, filtros: Filtros): boolean => {
  // Filtro por banco
  if (filtros.bancosSelecionados && filtros.bancosSelecionados.length > 0) {
    if (!filtros.bancosSelecionados.includes(item.nomeBanco)) {
      return false;
    }
  }
  
  if (!filtros.periodo || filtros.periodo === "todos") return true;
  
  const dataItem = new Date(item.dataPagamento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  switch (filtros.periodo) {
    case "hoje":
      return dataItem.toDateString() === hoje.toDateString();
    case "semana":
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      return dataItem >= inicioSemana;
    case "mes":
      return dataItem.getMonth() === hoje.getMonth() && 
             dataItem.getFullYear() === hoje.getFullYear();
    case "trimestre":
      const trimestreAtual = Math.floor(hoje.getMonth() / 3);
      const trimestreItem = Math.floor(dataItem.getMonth() / 3);
      return trimestreItem === trimestreAtual && 
             dataItem.getFullYear() === hoje.getFullYear();
    case "ano":
      return dataItem.getFullYear() === hoje.getFullYear();
    case "customizado":
      if (!filtros.dataInicio && !filtros.dataFim) return true;
      if (filtros.dataInicio && !filtros.dataFim) {
        return dataItem >= new Date(filtros.dataInicio);
      }
      if (!filtros.dataInicio && filtros.dataFim) {
        return dataItem <= new Date(filtros.dataFim);
      }
      return dataItem >= new Date(filtros.dataInicio) && 
             dataItem <= new Date(filtros.dataFim);
    default:
      return true;
  }
};

export const FluxoDeCaixa = ({ filtros }: FluxoDeCaixaProps) => {
  const { user } = useAuth();
  const [contas, setContas] = useState<{id: string; nomeBanco: string; saldo: number}[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAtualizarSaldoOpen, setIsAtualizarSaldoOpen] = useState(false);
  const [saldosEditados, setSaldosEditados] = useState<{[nomeBanco: string]: number}>({});
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [bancoParaAtualizar, setBancoParaAtualizar] = useState<string | null>(null);

  useEffect(() => {
    const loadContas = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('contas_bancarias')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        const contasFormatadas = (data || []).map(c => ({
          id: c.id,
          nomeBanco: c.nome,
          saldo: Number(c.saldo) || 0
        }));
        
        setContas(contasFormatadas);
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
        toast.error('Erro ao carregar contas bancárias');
      }
    };
    
    loadContas();
  }, [user]);

  useEffect(() => {
    const loadLancamentos = async () => {
      if (!user || contas.length === 0) return;
      
      try {
        setLoading(true);
        
        // Buscar lançamentos financeiros com seus itens
        const { data: lancamentosData, error } = await supabase
          .from('lancamentos_financeiros')
          .select(`
            *,
            lancamentos_financeiros_itens (*)
          `)
          .eq('user_id', user.id)
          .order('data_pagamento', { ascending: true });
        
        if (error) throw error;
        
        // Processar lançamentos com itens
        const lancamentosCombinados = (lancamentosData || []).map(lanc => {
          // Buscar nome do banco pela conta_id
          const conta = contas.find(c => c.id === lanc.conta_id);
          const nomeBanco = conta?.nomeBanco || '';
          
          return {
            id: lanc.id,
            tipo: lanc.tipo, // "Receita" ou "Despesa"
            descricao1: lanc.descricao1,
            valorTotal: Number(lanc.valor_total) || 0,
            dataPagamento: lanc.data_pagamento,
            pago: lanc.pago,
            nomeBanco: nomeBanco,
            cliente_id: lanc.cliente_id,
            itens: lanc.lancamentos_financeiros_itens || []
          };
        });
        
        setLancamentos(lancamentosCombinados);
        
      } catch (error) {
        console.error('Erro ao carregar lançamentos:', error);
        toast.error('Erro ao carregar lançamentos financeiros');
      } finally {
        setLoading(false);
      }
    };
    
    loadLancamentos();
  }, [user, contas]);

  const linhasFluxo = useMemo(() => {
    const lancamentosFiltrados = lancamentos
      .filter((l: any) => l.pago && aplicarFiltros(l, filtros))
      .sort((a: any, b: any) => new Date(a.dataPagamento).getTime() - new Date(b.dataPagamento).getTime());

    let saldoAcumulado = 0;

    return lancamentosFiltrados.map((l: any) => {
      const entrada = l.tipo === "Receita" ? l.valorTotal || 0 : 0;
      const saida = l.tipo === "Despesa" ? l.valorTotal || 0 : 0;
      saldoAcumulado += (entrada - saida);
      
      return {
        data: l.dataPagamento,
        descricao: l.descricao1 || 'Sem descrição',
        entrada,
        saida,
        saldo: saldoAcumulado,
        nomeBanco: l.nomeBanco
      };
    });
  }, [lancamentos, filtros]);

  const resumo = useMemo(() => {
    const saldoInicial = 0; // Pode ser configurável
    const totalEntradas = linhasFluxo.reduce((acc, l) => acc + l.entrada, 0);
    const totalSaidas = linhasFluxo.reduce((acc, l) => acc + l.saida, 0);
    const saldoFinal = saldoInicial + totalEntradas - totalSaidas;

    return {
      saldoInicial,
      totalEntradas,
      totalSaidas,
      saldoFinal
    };
  }, [linhasFluxo]);

  const dadosExportacao = linhasFluxo.map(l => ({
    data: format(new Date(l.data), 'dd/MM/yyyy'),
    descricao: l.descricao,
    entrada: l.entrada,
    saida: l.saida,
    saldo: l.saldo
  }));

  // Calcular saldo atual de cada banco baseado nos lançamentos
  const saldosPorBanco = useMemo(() => {
    const saldos: {[nomeBanco: string]: number} = {};
    
    // Inicializar com saldos iniciais das contas
    contas.forEach(conta => {
      saldos[conta.nomeBanco] = conta.saldo || 0;
    });
    
    // Calcular movimentações
    lancamentos.forEach((l: any) => {
      if (l.pago && l.nomeBanco) {
        if (!saldos[l.nomeBanco]) saldos[l.nomeBanco] = 0;
        
        if (l.tipo === "Receita") {
          saldos[l.nomeBanco] += l.valorTotal || 0;
        } else if (l.tipo === "Despesa") {
          saldos[l.nomeBanco] -= l.valorTotal || 0;
        }
      }
    });
    
    return saldos;
  }, [lancamentos, contas]);

  const saldoTotalAtual = useMemo(() => {
    return Object.values(saldosPorBanco).reduce((acc, valor) => acc + valor, 0);
  }, [saldosPorBanco]);

  const handleEditarSaldo = (nomeBanco: string, novoSaldo: number) => {
    setSaldosEditados(prev => ({
      ...prev,
      [nomeBanco]: novoSaldo
    }));
  };

  const calcularNovoSaldoFinal = () => {
    let total = 0;
    Object.entries(saldosPorBanco).forEach(([nomeBanco, saldoAtual]) => {
      const saldoEditado = saldosEditados[nomeBanco];
      total += saldoEditado !== undefined ? saldoEditado : saldoAtual;
    });
    return total;
  };

  const handleConfirmarAtualizacao = async () => {
    if (!user || !bancoParaAtualizar) return;
    
    const contaSelecionada = contas.find(c => c.nomeBanco === bancoParaAtualizar);
    if (!contaSelecionada) {
      toast.error('Conta bancária não encontrada');
      return;
    }
    
    const saldoAtual = contaSelecionada.saldo;
    const novoSaldo = saldosEditados[bancoParaAtualizar];
    
    if (novoSaldo === undefined || novoSaldo === saldoAtual) {
      setIsConfirmDialogOpen(false);
      setIsAtualizarSaldoOpen(false);
      setBancoParaAtualizar(null);
      setSaldosEditados({});
      return;
    }
    
    const diferenca = novoSaldo - saldoAtual;
    
    try {
      // 1. Atualizar saldo da conta no Supabase
      const { error: updateError } = await supabase
        .from('contas_bancarias')
        .update({ saldo: novoSaldo })
        .eq('id', contaSelecionada.id)
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      // 2. Criar lançamento de ajuste no Supabase
      const hoje = new Date();
      const tipoLancamento = diferenca > 0 ? 'receitas' : 'despesas';
      const descricao = diferenca > 0 
        ? 'Atualização de Saldo Bancário - Receita Não Operacional'
        : 'Atualização de Saldo Bancário - Despesa Variável';
      
      const { error: insertError } = await supabase
        .from(tipoLancamento)
        .insert({
          user_id: user.id,
          descricao: descricao,
          valor: Math.abs(diferenca),
          data: hoje.toISOString().split('T')[0],
          categoria: diferenca > 0 ? 'Outras Receitas Não Operacionais' : 'Outras Despesas Variáveis',
          conta_id: contaSelecionada.id
        });
      
      if (insertError) throw insertError;
      
      // 3. Atualizar estado local
      setContas(contas.map(c => 
        c.id === contaSelecionada.id 
          ? { ...c, saldo: novoSaldo }
          : c
      ));
      
      const tipoMensagem = diferenca > 0 ? "Receita" : "Despesa";
      toast.success(
        `Saldo do ${bancoParaAtualizar} atualizado com sucesso! ` +
        `Lançamento de ${tipoMensagem} de ${formatCurrency(Math.abs(diferenca))} criado.`
      );
      
      // Recarregar página para atualizar todos os dados
      window.location.reload();
      
    } catch (error) {
      console.error('Erro ao atualizar saldo:', error);
      toast.error('Erro ao atualizar saldo bancário');
    } finally {
      setIsConfirmDialogOpen(false);
      setIsAtualizarSaldoOpen(false);
      setBancoParaAtualizar(null);
      setSaldosEditados({});
    }
  };

  const handleCancelarAtualizacao = () => {
    setIsConfirmDialogOpen(false);
    setBancoParaAtualizar(null);
  };

  const handleFecharDialog = () => {
    setIsAtualizarSaldoOpen(false);
    setSaldosEditados({});
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
          
          <div className="flex items-center gap-2">
            {/* Botão Atualizar Saldo */}
            <Dialog open={isAtualizarSaldoOpen} onOpenChange={setIsAtualizarSaldoOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-8 text-xs gap-2">
                  <DollarSign className="h-3 w-3" />
                  Atualizar Saldo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Atualizar Saldo das Contas</DialogTitle>
                  <DialogDescription className="text-xs">
                    O saldo atual total é de {formatCurrency(saldoTotalAtual)}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3 py-2">
                  {contas.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhuma conta bancária cadastrada
                    </p>
                  ) : (
                    contas.map((conta) => {
                      const saldoAtual = saldosPorBanco[conta.nomeBanco] || 0;
                      const saldoEditado = saldosEditados[conta.nomeBanco];
                      const valorExibido = saldoEditado !== undefined ? saldoEditado : saldoAtual;
                      
                      return (
                        <div key={conta.id} className="space-y-1.5">
                          <Label className="text-xs font-medium">{conta.nomeBanco}</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground min-w-[80px]">
                              Atual: {formatCurrency(saldoAtual)}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              value={valorExibido}
                              onChange={(e) => handleEditarSaldo(conta.nomeBanco, parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                  
                  {/* Mostrar mensagem do novo saldo final se houver edições */}
                  {Object.keys(saldosEditados).length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Com a atualização de saldo da conta o saldo final da conta será de{' '}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(calcularNovoSaldoFinal())}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Botão Atualizar Saldo */}
                {Object.keys(saldosEditados).length > 0 && (
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={handleFecharDialog}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => {
                        const bancosEditados = Object.keys(saldosEditados);
                        if (bancosEditados.length > 0) {
                          setBancoParaAtualizar(bancosEditados[0]);
                          setIsConfirmDialogOpen(true);
                        }
                      }}
                    >
                      Atualizar Saldo
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            
            <ExportButton 
              data={dadosExportacao}
              filename="fluxo_caixa"
              columns={[
                { key: 'data', label: 'Data' },
                { key: 'descricao', label: 'Descrição' },
                { key: 'entrada', label: 'Entrada' },
                { key: 'saida', label: 'Saída' },
                { key: 'saldo', label: 'Saldo' }
              ]}
            />
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          titulo="Saldo Inicial" 
          valor={resumo.saldoInicial}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard 
          titulo="Total Entradas" 
          valor={resumo.totalEntradas}
          icon={<TrendingUp className="h-4 w-4" />}
          cor="green"
        />
        <KPICard 
          titulo="Total Saídas" 
          valor={resumo.totalSaidas}
          icon={<TrendingDown className="h-4 w-4" />}
          cor="red"
        />
        <KPICard 
          titulo="Saldo Final" 
          valor={resumo.saldoFinal}
          icon={<DollarSign className="h-4 w-4" />}
          cor={resumo.saldoFinal >= 0 ? 'green' : 'red'}
          destaque
        />
      </div>

      {/* Saldos por Conta */}
      {contas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-sm text-muted-foreground">
          {contas.map((conta, index) => {
            const saldo = saldosPorBanco[conta.nomeBanco] || conta.saldo || 0;
            return (
              <span key={conta.id} className="whitespace-nowrap">
                <span className="font-medium text-foreground">{conta.nomeBanco}</span>
                {": "}
                <span className={saldo >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(saldo)}
                </span>
                {index < contas.length - 1 && (
                  <span className="mx-2 text-muted-foreground/50">|</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Saída</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasFluxo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma movimentação encontrada no período
                    </TableCell>
                  </TableRow>
                ) : (
                  linhasFluxo.map((linha, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(new Date(linha.data), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{linha.descricao}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {linha.entrada > 0 ? formatCurrency(linha.entrada) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {linha.saida > 0 ? formatCurrency(linha.saida) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(linha.saldo)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* AlertDialog de Confirmação */}
    <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Atualização</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que gostaria de atualizar o saldo do {bancoParaAtualizar}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelarAtualizacao}>
            Não
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmarAtualizacao}>
            Sim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};

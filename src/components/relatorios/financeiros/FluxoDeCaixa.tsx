import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, RefreshCw, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ContaBancaria {
  id: string;
  nomeBanco: string;
  saldo: number;
}

interface Lancamento {
  id: string;
  tipo: string;
  descricao1: string;
  valorTotal: number;
  dataPagamento: string;
  pago: boolean;
  nomeBanco: string;
  cliente_id?: string;
  itens?: any[];
}

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FluxoDeCaixa() {
  const user = useUser();
  const { toast } = useToast();

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [saldosEditados, setSaldosEditados] = useState<Record<string, number>>({});
  const [isAtualizarSaldoOpen, setIsAtualizarSaldoOpen] = useState(false);
  const [bancoParaAtualizar, setBancoParaAtualizar] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // =====================================================
  // 🔹 Funções globais reutilizáveis
  // =====================================================

  const loadContas = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("contas_bancarias").select("*").eq("user_id", user.id);
      if (error) throw error;
      const contasFormatadas = (data || []).map((c) => ({
        id: c.id,
        nomeBanco: c.nome,
        saldo: Number(c.saldo) || 0,
      }));
      setContas(contasFormatadas);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      toast.error("Erro ao carregar contas bancárias");
    }
  };

  const loadLancamentos = async () => {
    if (!user || contas.length === 0) return;
    try {
      setLoading(true);
      const { data: lancamentosData, error } = await supabase
        .from("lancamentos_financeiros")
        .select(`*, lancamentos_financeiros_itens (*)`)
        .eq("user_id", user.id)
        .order("data_pagamento", { ascending: true });

      if (error) throw error;

      const lancamentosCombinados = (lancamentosData || []).map((lanc) => {
        const conta = contas.find((c) => c.id === lanc.conta_id);
        const nomeBanco = conta?.nomeBanco || "";
        return {
          id: lanc.id,
          tipo: lanc.tipo,
          descricao1: lanc.descricao1,
          valorTotal: Number(lanc.valor_total) || 0,
          dataPagamento: lanc.data_pagamento,
          pago: lanc.pago,
          nomeBanco,
          cliente_id: lanc.cliente_id,
          itens: lanc.lancamentos_financeiros_itens || [],
        };
      });

      setLancamentos(lancamentosCombinados);
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      toast.error("Erro ao carregar lançamentos financeiros");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 🔹 Efeitos de inicialização
  // =====================================================

  useEffect(() => {
    loadContas();
  }, [user]);

  useEffect(() => {
    loadLancamentos();
  }, [user, contas]);

  // =====================================================
  // 🔹 Manipulação de saldo manual
  // =====================================================

  const handleOpenAtualizarSaldo = (banco: string) => {
    setBancoParaAtualizar(banco);
    setIsAtualizarSaldoOpen(true);
  };

  const handleConfirmarAtualizacao = async () => {
    if (!user || !bancoParaAtualizar) return;

    const contaSelecionada = contas.find((c) => c.nomeBanco === bancoParaAtualizar);
    if (!contaSelecionada) {
      toast.error("Conta bancária não encontrada");
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
      const hoje = new Date();
      const anoAtual = hoje.getFullYear().toString();
      const mesAtual = hoje.toLocaleString("pt-BR", { month: "long" });
      const tipoLancamento = diferenca > 0 ? "Receita" : "Despesa";

      const dadosLancamento = {
        user_id: user.id,
        ano: anoAtual,
        mes_competencia: mesAtual,
        tipo: tipoLancamento,
        descricao1: diferenca > 0 ? "Receita Não Operacional" : "Despesa Não Operacional",
        observacao: "Atualização de Saldo Manual",
        valor_total: Math.abs(diferenca),
        data_pagamento: hoje.toISOString().split("T")[0],
        conta_id: contaSelecionada.id,
        pago: true,
      };

      const { data: lancamentoCriado, error: insertError } = await supabase
        .from("lancamentos_financeiros")
        .insert(dadosLancamento)
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: itemError } = await supabase.from("lancamentos_financeiros_itens").insert({
        lancamento_id: lancamentoCriado.id,
        descricao2: diferenca > 0 ? "Outras Receitas Não Operacionais" : "Outras Despesas Não Operacionais",
        produto_servico: null,
        valor: Math.abs(diferenca),
      });

      if (itemError) throw itemError;

      // ✅ Atualiza saldo localmente
      const novasContas = contas.map((c) => (c.id === contaSelecionada.id ? { ...c, saldo: novoSaldo } : c));
      setContas(novasContas);

      // ✅ Atualiza lista de lançamentos
      setLancamentos((prev) => [
        ...prev,
        {
          id: lancamentoCriado.id,
          tipo: tipoLancamento,
          descricao1: dadosLancamento.descricao1,
          valorTotal: Math.abs(diferenca),
          dataPagamento: dadosLancamento.data_pagamento,
          pago: true,
          nomeBanco: contaSelecionada.nomeBanco,
          itens: [],
        },
      ]);

      // ✅ Recarrega dados sem sair da página
      await loadContas();
      await loadLancamentos();

      toast.success(
        `Saldo do ${bancoParaAtualizar} atualizado com sucesso! Lançamento de ${tipoLancamento} de ${formatCurrency(
          Math.abs(diferenca),
        )} criado.`,
      );
    } catch (error) {
      console.error("Erro ao atualizar saldo:", error);
      toast.error("Erro ao atualizar saldo bancário");
    } finally {
      setIsConfirmDialogOpen(false);
      setIsAtualizarSaldoOpen(false);
      setBancoParaAtualizar(null);
      setSaldosEditados({});
    }
  };

  // =====================================================
  // 🔹 Renderização
  // =====================================================

  const saldosPorBanco = contas.reduce<Record<string, number>>((acc, conta) => {
    acc[conta.nomeBanco] = conta.saldo;
    return acc;
  }, {});

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="w-5 h-5" />
          Fluxo de Caixa
        </CardTitle>
        <CardDescription>Controle de entradas, saídas e saldos bancários.</CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell>{conta.nomeBanco}</TableCell>
                    <TableCell className="text-right">{formatCurrency(conta.saldo)}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="outline" onClick={() => handleOpenAtualizarSaldo(conta.nomeBanco)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar Saldo
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>

      {/* Dialog Atualizar Saldo */}
      <Dialog open={isAtualizarSaldoOpen} onOpenChange={setIsAtualizarSaldoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Saldo</DialogTitle>
          </DialogHeader>
          {bancoParaAtualizar && (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Informe o novo saldo para <strong>{bancoParaAtualizar}</strong>:
              </p>
              <Input
                type="number"
                value={saldosEditados[bancoParaAtualizar] ?? ""}
                onChange={(e) =>
                  setSaldosEditados({
                    ...saldosEditados,
                    [bancoParaAtualizar]: parseFloat(e.target.value),
                  })
                }
              />
              <Button onClick={() => setIsConfirmDialogOpen(true)} className="mt-4 w-full">
                Confirmar Atualização
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar atualização do saldo?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarAtualizacao}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

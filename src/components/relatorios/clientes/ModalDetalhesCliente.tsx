import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface ClienteRisco {
  id: string;
  nomeCliente: string;
  nomePet: string;
  whatsapp: string;
  ultimoAgendamento: Date;
  diasSemAgendar: number;
  faixaRisco: string;
}

interface ModalDetalhesClienteProps {
  aberto: boolean;
  cliente: ClienteRisco | null;
  onFechar: () => void;
}

interface Agendamento {
  data: Date;
  servico: string;
  status: string;
  tipo: "regular" | "pacote";
}

const abrirWhatsApp = (whatsapp: string, nomeCliente: string) => {
  const numeroLimpo = whatsapp.replace(/\D/g, '');
  const numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
  
  const mensagem = encodeURIComponent(
    `Olá ${nomeCliente}! Notamos que faz um tempo que não nos visita. Gostaríamos de saber como você e seu pet estão! 🐾`
  );
  
  window.open(`https://wa.me/${numeroCompleto}?text=${mensagem}`, '_blank');
};

export const ModalDetalhesCliente = ({
  aberto,
  cliente,
  onFechar
}: ModalDetalhesClienteProps) => {
  const { user } = useAuth();
  const [historico, setHistorico] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cliente && aberto) {
      carregarHistoricoAgendamentos();
    }
  }, [cliente, aberto]);

  const carregarHistoricoAgendamentos = async () => {
    if (!cliente || !user) return;

    setLoading(true);
    try {
      // Buscar agendamentos regulares
      const { data: agendamentosRegulares, error: errorRegulares } = await supabase
        .from('agendamentos')
        .select('data, servico, status')
        .eq('user_id', user.id)
        .eq('cliente', cliente.nomeCliente)
        .eq('pet', cliente.nomePet)
        .order('data', { ascending: false })
        .limit(20);

      if (errorRegulares) throw errorRegulares;

      // Buscar agendamentos de pacotes
      const { data: agendamentosPacotes, error: errorPacotes } = await supabase
        .from('agendamentos_pacotes')
        .select('data_venda, nome_pacote, servicos')
        .eq('user_id', user.id)
        .eq('nome_cliente', cliente.nomeCliente)
        .eq('nome_pet', cliente.nomePet)
        .order('data_venda', { ascending: false })
        .limit(20);

      if (errorPacotes) throw errorPacotes;

      // Combinar e formatar histórico
      const historicoCompleto: Agendamento[] = [];

      agendamentosRegulares?.forEach(ag => {
        historicoCompleto.push({
          data: parseISO(ag.data),
          servico: ag.servico,
          status: ag.status,
          tipo: "regular"
        });
      });

      agendamentosPacotes?.forEach(ag => {
        let servicosStr = "Pacote";
        try {
          const servicosArray = JSON.parse(ag.servicos as any);
          if (Array.isArray(servicosArray) && servicosArray.length > 0) {
            servicosStr = `${ag.nome_pacote} (${servicosArray.length} serviços)`;
          }
        } catch {
          servicosStr = ag.nome_pacote;
        }

        historicoCompleto.push({
          data: parseISO(ag.data_venda),
          servico: servicosStr,
          status: "Concluído",
          tipo: "pacote"
        });
      });

      // Ordenar por data
      historicoCompleto.sort((a, b) => b.data.getTime() - a.data.getTime());

      setHistorico(historicoCompleto);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de agendamentos');
    } finally {
      setLoading(false);
    }
  };

  if (!cliente) return null;

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <p className="font-medium">{cliente.nomeCliente}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pet</Label>
              <p className="font-medium">{cliente.nomePet}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">WhatsApp</Label>
              <p className="font-medium">{cliente.whatsapp}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Dias sem Agendar
              </Label>
              <p className="font-medium text-red-600">
                {cliente.diasSemAgendar} dias
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Último Agendamento
              </Label>
              <p className="font-medium">
                {format(cliente.ultimoAgendamento, "dd/MM/yyyy")}
              </p>
            </div>
          </div>

          <Separator />

          {/* Histórico de Agendamentos */}
          <div>
            <h3 className="font-semibold mb-3">Histórico de Agendamentos</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : historico.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum agendamento encontrado
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.map((ag, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{format(ag.data, "dd/MM/yyyy")}</TableCell>
                        <TableCell>{ag.servico}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ag.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ag.tipo === "pacote" ? "secondary" : "default"}>
                            {ag.tipo === "pacote" ? "Pacote" : "Regular"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onFechar}>
              Fechar
            </Button>
            <Button onClick={() => abrirWhatsApp(cliente.whatsapp, cliente.nomeCliente)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Abrir WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCRMMensagens, useCRMLeads, CRMLead, calcularProximoPasso, calcularStatus } from "@/hooks/useCRMLeads";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageHistoryProps {
  lead: CRMLead;
}

const MessageHistory = ({ lead }: MessageHistoryProps) => {
  const [observacao, setObservacao] = useState("");
  const { mensagens, isLoading, createMensagem } = useCRMMensagens(lead.id);
  const { updateLead } = useCRMLeads();

  const handleRegistrarMensagem = async () => {
    // Verificar se é a primeira mensagem
    const isFirstMessage = mensagens.length === 0;
    
    // Registrar a mensagem
    await createMensagem.mutateAsync({
      lead_id: lead.id,
      tentativa: lead.tentativa,
      observacao: observacao || undefined,
    });

    // Se for a primeira mensagem, definir os valores iniciais
    if (isFirstMessage) {
      const updatedLead = {
        ...lead,
        tentativa: 1,
        teve_resposta: false,
        agendou_reuniao: false,
        iniciou_acesso_pago: false,
      };

      await updateLead.mutateAsync({
        id: lead.id,
        tentativa: 1,
        teve_resposta: false,
        agendou_reuniao: false,
        iniciou_acesso_pago: false,
        proximo_passo: calcularProximoPasso(updatedLead),
        status: calcularStatus(updatedLead),
      });
    }

    setObservacao("");
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Histórico de Mensagens
      </h4>

      {/* Formulário para registrar nova mensagem */}
      <div className="space-y-2">
        <Textarea
          placeholder="Observação sobre a mensagem enviada (opcional)..."
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button 
          size="sm" 
          onClick={handleRegistrarMensagem}
          disabled={createMensagem.isPending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {createMensagem.isPending ? "Registrando..." : "Registrar Envio de Mensagem"}
        </Button>
      </div>

      {/* Lista de mensagens */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : mensagens.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma mensagem registrada ainda.
          </p>
        ) : (
          mensagens.map((msg) => (
            <div key={msg.id} className="bg-muted/50 p-2 rounded text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">Tentativa {msg.tentativa}</span>
                <span className="text-muted-foreground">
                  {format(parseISO(msg.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              {msg.observacao && (
                <p className="mt-1 text-muted-foreground">{msg.observacao}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessageHistory;

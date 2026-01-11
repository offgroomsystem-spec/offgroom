import { Phone, Star, MessageSquare, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CRMLead } from "@/hooks/useCRMLeads";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadCardProps {
  lead: CRMLead;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  "Novo": "bg-gray-500",
  "Em contato": "bg-blue-500",
  "Reunião agendada": "bg-yellow-500",
  "Acesso grátis": "bg-emerald-400",
  "Acesso pago": "bg-green-600",
  "Sem interesse": "bg-red-500",
};

const LeadCard = ({ lead, onClick }: LeadCardProps) => {
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleaned = lead.telefone_empresa.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleaned}`, "_blank");
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: statusColors[lead.status]?.replace("bg-", "") || "#6b7280" }}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{lead.nome_empresa}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {lead.nota_google && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  {lead.nota_google}
                </span>
              )}
              {lead.qtd_avaliacoes && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {lead.qtd_avaliacoes}
                </span>
              )}
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={`text-xs text-white ${statusColors[lead.status] || "bg-gray-500"}`}
          >
            {lead.status}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <button
            onClick={handlePhoneClick}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Phone className="h-3 w-3" />
            {formatPhone(lead.telefone_empresa)}
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Tentativa: {lead.tentativa}/5</span>
            {lead.proximo_passo && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(lead.proximo_passo), "dd/MM", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadCard;

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Estadia {
  id: string;
  tipo: string;
  data_entrada: string;
  hora_entrada: string;
  data_saida_prevista: string | null;
  pet_nome: string;
  cliente_nome: string;
  observacoes_entrada: string | null;
}

interface EstadiasAtivasProps {
  estadias: Estadia[];
  onRegistro: (estadiaId: string, petNome: string) => void;
}

const EstadiasAtivas = ({ estadias, onRegistro }: EstadiasAtivasProps) => {
  if (estadias.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhum pet ativo no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Pets Ativos ({estadias.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {estadias.map((e) => (
            <div key={e.id} className="border rounded-md p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{e.pet_nome}</span>
                <Badge variant={e.tipo === "hotel" ? "secondary" : "outline"} className="text-[10px]">
                  {e.tipo === "hotel" ? "Hotel" : "Creche"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{e.cliente_nome}</p>
              <p className="text-xs">
                Entrada: {format(new Date(e.data_entrada + "T00:00:00"), "dd/MM", { locale: ptBR })} {e.hora_entrada?.slice(0, 5)}
              </p>
              {e.data_saida_prevista && (
                <p className="text-xs">
                  Saída prev.: {format(new Date(e.data_saida_prevista + "T00:00:00"), "dd/MM", { locale: ptBR })}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-1 h-7 text-xs"
                onClick={() => onRegistro(e.id, e.pet_nome)}
              >
                <ClipboardList className="h-3 w-3 mr-1" />
                Registro Diário
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EstadiasAtivas;

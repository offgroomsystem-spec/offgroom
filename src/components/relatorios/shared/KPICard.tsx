import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface KPICardProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icon?: ReactNode;
  cor?: "default" | "green" | "red" | "yellow";
  periodo?: string;
  destaque?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const KPICard = ({ titulo, valor, subtitulo, icon, cor = "default", periodo, destaque }: KPICardProps) => {
  const corClasses = {
    default: "text-foreground",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
  };

  return (
    <Card className={destaque ? "border-2 border-primary" : ""}>
      {/* AJUSTE 1: Padding ainda menor (p-2) */}
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between">
          {/* AJUSTE 2: Agrupado Título e Período lado a lado */}
          <div className="flex items-baseline space-x-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
            {/* AJUSTE 2: Período movido para cá */}
            {periodo && <CardDescription className="text-xs">{periodo}</CardDescription>}
          </div>

          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        {/* Período não é mais renderizado aqui */}
      </CardHeader>

      {/* AJUSTE 1: Padding ainda menor (p-2) */}
      <CardContent className="p-2 pt-0">
        <div className={`text-2xl font-bold ${corClasses[cor]}`}>
          {typeof valor === "number" ? formatCurrency(valor) : valor}
        </div>
        {subtitulo && <p className="text-xs text-muted-foreground mt-1">{subtitulo}</p>}
      </CardContent>
    </Card>
  );
};

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface KPICardProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icon?: ReactNode;
  cor?: 'default' | 'green' | 'red' | 'yellow';
  periodo?: string;
  destaque?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const KPICard = ({ 
  titulo, 
  valor, 
  subtitulo, 
  icon, 
  cor = 'default', 
  periodo, 
  destaque 
}: KPICardProps) => {
  const corClasses = {
    default: 'text-foreground',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  };

  return (
    <Card className={destaque ? 'border-2 border-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {titulo}
          </CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        {periodo && <CardDescription className="text-xs">{periodo}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${corClasses[cor]}`}>
          {typeof valor === 'number' ? formatCurrency(valor) : valor}
        </div>
        {subtitulo && <p className="text-xs text-muted-foreground mt-1">{subtitulo}</p>}
      </CardContent>
    </Card>
  );
};

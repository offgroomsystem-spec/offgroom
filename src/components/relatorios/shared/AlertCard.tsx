import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface AlertCardProps {
  tipo: 'warning' | 'error' | 'info';
  titulo: string;
  lista?: any[];
  valor?: number;
  icone?: ReactNode;
  onClick?: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const AlertCard = ({ tipo, titulo, lista, valor, icone, onClick }: AlertCardProps) => {
  const tipoClasses = {
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
    error: 'border-red-500 bg-red-50 dark:bg-red-950',
    info: 'border-blue-500 bg-blue-50 dark:bg-blue-950'
  };

  const tipoIconColor = {
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <Card 
      className={`border-2 ${tipoClasses[tipo]} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow hover:border-primary' : ''}`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icone && <span className={tipoIconColor[tipo]}>{icone}</span>}
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {valor !== undefined && (
          <p className={`text-2xl font-bold ${tipoIconColor[tipo]}`}>
            {formatCurrency(valor)}
          </p>
        )}
        {lista && lista.length > 0 && (
          <ul className="list-disc list-inside space-y-1 text-sm">
            {lista.slice(0, 5).filter(item => item !== undefined && item !== null).map((item, idx) => (
              <li key={idx}>
                {typeof item === 'string' ? item : `${item.nomeCliente || item.cliente} - ${item.nomePet || item.pet || ''}`}
              </li>
            ))}
            {lista.length > 5 && (
              <li className="text-muted-foreground">+ {lista.length - 5} mais</li>
            )}
          </ul>
        )}
        {lista && lista.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
        )}
      </CardContent>
    </Card>
  );
};

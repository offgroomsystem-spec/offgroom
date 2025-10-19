import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, ChevronUp, ChevronDown, Check, X } from "lucide-react";
interface FilterPanelProps {
  filtros: {
    periodo: string;
    dataInicio: string;
    dataFim: string;
  };
  setFiltros: (filtros: any) => void;
  onAplicar: () => void;
  onLimpar: () => void;
}
export const FilterPanel = ({
  filtros,
  setFiltros,
  onAplicar,
  onLimpar
}: FilterPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return <Card className="mb-4">
      <CardHeader onClick={() => setIsOpen(!isOpen)} className="cursor-pointer my-0 px-[18px] py-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle className="text-lg">Filtros</CardTitle>
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>
      
      {isOpen && <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de Período */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filtros.periodo} onValueChange={value => setFiltros({
            ...filtros,
            periodo: value
          })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="trimestre">Este Trimestre</SelectItem>
                  <SelectItem value="ano">Este Ano</SelectItem>
                  <SelectItem value="customizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Se customizado, mostrar seletores de data */}
            {filtros.periodo === "customizado" && <>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input type="date" value={filtros.dataInicio} onChange={e => setFiltros({
              ...filtros,
              dataInicio: e.target.value
            })} />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input type="date" value={filtros.dataFim} onChange={e => setFiltros({
              ...filtros,
              dataFim: e.target.value
            })} />
                </div>
              </>}
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={onAplicar}>
              <Check className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={onLimpar}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>}
    </Card>;
};
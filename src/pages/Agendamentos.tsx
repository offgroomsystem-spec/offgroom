import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock } from "lucide-react";
import { toast } from "sonner";

interface Agendamento {
  id: string;
  cliente: string;
  pet: string;
  servico: string;
  data: string;
  horario: string;
  status: "confirmado" | "pendente" | "concluido";
}

const Agendamentos = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    cliente: "",
    pet: "",
    servico: "",
    data: "",
    horario: "",
  });

  const horarios = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getWeekDates = () => {
    const today = new Date(selectedDate);
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay;
    const sunday = new Date(today.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const novoAgendamento: Agendamento = {
      ...formData,
      id: Date.now().toString(),
      status: "confirmado",
    };
    
    setAgendamentos([...agendamentos, novoAgendamento]);
    toast.success("Agendamento criado com sucesso!");
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      cliente: "",
      pet: "",
      servico: "",
      data: "",
      horario: "",
    });
    setIsDialogOpen(false);
  };

  const getAgendamentoForSlot = (date: Date, horario: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return agendamentos.find(a => a.data === dateStr && a.horario === horario);
  };

  const isHorarioOcupado = (date: Date, horario: string) => {
    return !!getAgendamentoForSlot(date, horario);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda de Serviços</h1>
          <p className="text-muted-foreground mt-1">Visualize e gerencie os agendamentos</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Preencha os dados do agendamento
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  placeholder="Nome do cliente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet">Pet</Label>
                <Input
                  id="pet"
                  value={formData.pet}
                  onChange={(e) => setFormData({ ...formData, pet: e.target.value })}
                  placeholder="Nome do pet"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servico">Serviço</Label>
                <Input
                  id="servico"
                  value={formData.servico}
                  onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                  placeholder="Tipo de serviço"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horario">Horário</Label>
                  <Select value={formData.horario} onValueChange={(value) => setFormData({ ...formData, horario: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {horarios.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Agenda Semanal</CardTitle>
              <CardDescription>
                Semana de {weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} 
                {' '}a {weekDates[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigateWeek(-1)}>
                ← Semana Anterior
              </Button>
              <Button variant="outline" onClick={() => navigateWeek(1)}>
                Próxima Semana →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 gap-2">
                <div className="p-2 font-semibold">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                {weekDates.map((date, idx) => (
                  <div key={idx} className="p-2 text-center">
                    <div className="font-semibold text-sm">{diasSemana[idx]}</div>
                    <div className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>

              {horarios.map((horario) => (
                <div key={horario} className="grid grid-cols-8 gap-2 border-t">
                  <div className="p-2 text-sm font-medium text-muted-foreground">
                    {horario}
                  </div>
                  {weekDates.map((date, idx) => {
                    const agendamento = getAgendamentoForSlot(date, horario);
                    const ocupado = isHorarioOcupado(date, horario);
                    
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg min-h-[60px] transition-colors ${
                          ocupado
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary/30 hover:bg-secondary/50"
                        }`}
                      >
                        {agendamento && (
                          <div className="text-xs">
                            <div className="font-semibold">{agendamento.cliente}</div>
                            <div className="text-xs opacity-80">{agendamento.pet}</div>
                            <div className="text-xs opacity-60">{agendamento.servico}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Agendamentos;

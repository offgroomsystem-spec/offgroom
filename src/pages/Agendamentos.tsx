import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Package, Calendar as CalendarIcon, ChevronUp, ChevronDown, Send } from "lucide-react";
import { toast } from "sonner";
import { TimeInput } from "@/components/TimeInput";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interfaces

interface Agendamento {
  id: string;
  cliente: string;
  pet: string;
  servico: string;
  data: string;
  horario: string;
  status: "confirmado" | "pendente" | "concluido";
}

interface ServicoAgendamento {
  numero: string;
  nomeServico: string;
  data: string;
  horarioInicio: string;
  tempoServico: string; // Agora em formato hh:mm
  horarioTermino: string;
}

interface AgendamentoPacote {
  id: string;
  nomeCliente: string;
  nomePet: string;
  raca: string;
  whatsapp: string;
  nomePacote: string;
  taxiDog: string; // "Sim" ou "Não"
  servicos: ServicoAgendamento[];
}

interface Cliente {
  id: string;
  nomeCliente: string;
  nomePet: string;
  porte: string;
  raca: string;
  whatsapp: string;
  endereco: string;
  observacao: string;
}

interface ServicoSelecionado {
  instanceId: string;
  id: string;
  nome: string;
  valor: number;
}

interface Pacote {
  id: string;
  nome: string;
  servicos: ServicoSelecionado[];
  validade: string;
  descontoPercentual: number;
  descontoValor: number;
  valorFinal: number;
}

interface EmpresaConfig {
  bordao: string;
  horarioInicio: string;
  horarioFim: string;
}

const Agendamentos = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => {
    const saved = localStorage.getItem('agendamentos');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
  }, [agendamentos]);
  
  const [agendamentosPacotes, setAgendamentosPacotes] = useState<AgendamentoPacote[]>(() => {
    const saved = localStorage.getItem('agendamentosPacotes');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('agendamentosPacotes', JSON.stringify(agendamentosPacotes));
  }, [agendamentosPacotes]);
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>({ bordao: "", horarioInicio: "08:00", horarioFim: "18:00" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPacoteDialogOpen, setIsPacoteDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<"semana" | "dia">("semana");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const [formData, setFormData] = useState({
    cliente: "",
    pet: "",
    servico: "",
    data: "",
    horario: "",
  });

  const [pacoteFormData, setPacoteFormData] = useState({
    nomeCliente: "",
    nomePet: "",
    raca: "",
    whatsapp: "",
    nomePacote: "",
    taxiDog: "",
  });

  const [servicosAgendamento, setServicosAgendamento] = useState<ServicoAgendamento[]>([]);

  // Estados para busca inteligente
  const [clienteSearch, setClienteSearch] = useState("");
  const [petSearch, setPetSearch] = useState("");
  const [filteredClientes, setFilteredClientes] = useState<string[]>([]);
  const [filteredPets, setFilteredPets] = useState<string[]>([]);
  const [availableRacas, setAvailableRacas] = useState<string[]>([]);

  // Carregar dados do localStorage
  useEffect(() => {
    const savedClientes = localStorage.getItem('clientes');
    if (savedClientes) {
      setClientes(JSON.parse(savedClientes));
    }
    
    const savedPacotes = localStorage.getItem('pacotes');
    if (savedPacotes) {
      setPacotes(JSON.parse(savedPacotes));
    }

    const savedEmpresa = localStorage.getItem('empresaConfig');
    if (savedEmpresa) {
      setEmpresaConfig(JSON.parse(savedEmpresa));
    }
  }, []);

  // Busca inteligente por cliente
  useEffect(() => {
    if (clienteSearch.length >= 2) {
      const matches = Array.from(new Set(
        clientes
          .filter(c => c.nomeCliente.toLowerCase().startsWith(clienteSearch.toLowerCase()))
          .map(c => c.nomeCliente)
      ));
      setFilteredClientes(matches);
    } else {
      setFilteredClientes([]);
    }
  }, [clienteSearch, clientes]);

  // Busca inteligente por pet
  useEffect(() => {
    if (petSearch.length >= 2) {
      const matches = Array.from(new Set(
        clientes
          .filter(c => c.nomePet.toLowerCase().startsWith(petSearch.toLowerCase()))
          .map(c => c.nomePet)
      ));
      setFilteredPets(matches);
    } else {
      setFilteredPets([]);
    }
  }, [petSearch, clientes]);

  // Atualizar pets disponíveis quando cliente é selecionado
  const handleClienteSelect = (nomeCliente: string) => {
    setClienteSearch(nomeCliente);
    setPacoteFormData({ ...pacoteFormData, nomeCliente, nomePet: "", raca: "", whatsapp: "" });
    
    const clientesComNome = clientes.filter(c => c.nomeCliente === nomeCliente);
    const petsUnicos = Array.from(new Set(clientesComNome.map(c => c.nomePet)));
    setFilteredPets(petsUnicos);
    setFilteredClientes([]);
  };

  // Atualizar raças disponíveis quando pet é selecionado
  const handlePetSelect = (nomePet: string) => {
    setPetSearch(nomePet);
    
    const clientesComPet = clientes.filter(c => 
      c.nomePet === nomePet && 
      (pacoteFormData.nomeCliente === "" || c.nomeCliente === pacoteFormData.nomeCliente)
    );
    
    const racasDisponiveis = Array.from(new Set(clientesComPet.map(c => c.raca)));
    setAvailableRacas(racasDisponiveis);
    
    setPacoteFormData({ ...pacoteFormData, nomePet, raca: "", whatsapp: "" });
    setFilteredPets([]);
  };

  // Preencher WhatsApp quando raça é selecionada
  const handleRacaSelect = (raca: string) => {
    const clienteMatch = clientes.find(c => 
      (pacoteFormData.nomeCliente === "" || c.nomeCliente === pacoteFormData.nomeCliente) &&
      c.nomePet === pacoteFormData.nomePet &&
      c.raca === raca
    );
    
    if (clienteMatch) {
      setPacoteFormData({
        ...pacoteFormData,
        nomeCliente: clienteMatch.nomeCliente,
        raca,
        whatsapp: clienteMatch.whatsapp
      });
      setClienteSearch(clienteMatch.nomeCliente);
      setPetSearch(clienteMatch.nomePet);
    }
  };

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

  const resetPacoteForm = () => {
    setPacoteFormData({
      nomeCliente: "",
      nomePet: "",
      raca: "",
      whatsapp: "",
      nomePacote: "",
      taxiDog: "",
    });
    setServicosAgendamento([]);
    setClienteSearch("");
    setPetSearch("");
    setFilteredClientes([]);
    setFilteredPets([]);
    setAvailableRacas([]);
    setIsPacoteDialogOpen(false);
  };

  // Quando seleciona um pacote, carregar seus serviços
  const handlePacoteSelect = (nomePacote: string) => {
    setPacoteFormData({ ...pacoteFormData, nomePacote });
    
    const pacoteSelecionado = pacotes.find(p => p.nome === nomePacote);
    if (pacoteSelecionado) {
      const servicosInit: ServicoAgendamento[] = pacoteSelecionado.servicos.map((servico, index) => {
        const total = pacoteSelecionado.servicos.length;
        const numero = `${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
        
        return {
          numero,
          nomeServico: servico.nome,
          data: "",
          horarioInicio: "",
          tempoServico: "",
          horarioTermino: ""
        };
      });
      setServicosAgendamento(servicosInit);
    }
  };

  // Calcular horário de término
  const calcularHorarioTermino = (inicio: string, tempo: string): string => {
    if (!inicio || !tempo) return "";
    
    const [inicioH, inicioM] = inicio.split(':').map(Number);
    const [tempoH, tempoM] = tempo.split(':').map(Number);
    
    const totalMinutos = (inicioH * 60 + inicioM) + (tempoH * 60 + tempoM);
    const fimH = Math.floor(totalMinutos / 60);
    const fimM = totalMinutos % 60;
    
    return `${String(fimH).padStart(2, '0')}:${String(fimM).padStart(2, '0')}`;
  };

  // Atualizar serviço individual
  const handleServicoAgendamentoChange = (index: number, field: keyof ServicoAgendamento, value: string) => {
    const updated = [...servicosAgendamento];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calcular horário de término
    if (field === 'horarioInicio' || field === 'tempoServico') {
      const horarioInicio = field === 'horarioInicio' ? value : updated[index].horarioInicio;
      const tempoServico = field === 'tempoServico' ? value : updated[index].tempoServico;
      
      if (horarioInicio && tempoServico) {
        updated[index].horarioTermino = calcularHorarioTermino(horarioInicio, tempoServico);
      }
    }
    
    setServicosAgendamento(updated);
  };

  // Mover serviço para cima/baixo
  const moveServico = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === servicosAgendamento.length - 1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...servicosAgendamento];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    
    // Renumerar
    updated.forEach((servico, idx) => {
      servico.numero = `${String(idx + 1).padStart(2, '0')}/${String(updated.length).padStart(2, '0')}`;
    });
    
    setServicosAgendamento(updated);
  };

  const handlePacoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pacoteFormData.nomeCliente.trim()) {
      toast.error("Favor preencher o Nome do Cliente");
      return;
    }
    if (!pacoteFormData.nomePet.trim()) {
      toast.error("Favor preencher o Nome do Pet");
      return;
    }
    if (!pacoteFormData.raca) {
      toast.error("Favor selecionar a Raça");
      return;
    }
    if (!pacoteFormData.nomePacote) {
      toast.error("Favor selecionar o Pacote");
      return;
    }
    if (!pacoteFormData.taxiDog) {
      toast.error("Favor responder se necessita Taxi Dog");
      return;
    }
    
    // Validar todos os serviços
    for (let i = 0; i < servicosAgendamento.length; i++) {
      const servico = servicosAgendamento[i];
      if (!servico.data) {
        toast.error(`Favor preencher a Data do serviço ${servico.numero}`);
        return;
      }
      if (!servico.horarioInicio) {
        toast.error(`Favor preencher o Horário de Início do serviço ${servico.numero}`);
        return;
      }
      if (!servico.tempoServico) {
        toast.error(`Favor preencher o Tempo de Serviço do serviço ${servico.numero}`);
        return;
      }
    }
    
    const novoAgendamentoPacote: AgendamentoPacote = {
      id: Date.now().toString(),
      nomeCliente: pacoteFormData.nomeCliente,
      nomePet: pacoteFormData.nomePet,
      raca: pacoteFormData.raca,
      whatsapp: pacoteFormData.whatsapp,
      nomePacote: pacoteFormData.nomePacote,
      taxiDog: pacoteFormData.taxiDog,
      servicos: servicosAgendamento,
    };
    
    setAgendamentosPacotes([...agendamentosPacotes, novoAgendamentoPacote]);
    toast.success("Pacote agendado com sucesso!");
    resetPacoteForm();
  };

  const getAgendamentoForSlot = (date: Date, horario: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return agendamentos.find(a => a.data === dateStr && a.horario === horario);
  };

  const getPacoteForSlot = (date: Date, horario: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return agendamentosPacotes.find(a => 
      a.servicos.some(s => s.data === dateStr && s.horarioInicio === horario)
    );
  };

  const isHorarioOcupado = (date: Date, horario: string) => {
    return !!getAgendamentoForSlot(date, horario) || !!getPacoteForSlot(date, horario);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  // Contar agendamentos
  const contarAgendamentos = () => {
    if (viewMode === "semana") {
      let count = 0;
      weekDates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        count += agendamentos.filter(a => a.data === dateStr).length;
        agendamentosPacotes.forEach(p => {
          count += p.servicos.filter(s => s.data === dateStr).length;
        });
      });
      return count;
    } else {
      const dateStr = new Date(selectedDate).toISOString().split('T')[0];
      let count = agendamentos.filter(a => a.data === dateStr).length;
      agendamentosPacotes.forEach(p => {
        count += p.servicos.filter(s => s.data === dateStr).length;
      });
      return count;
    }
  };

  // Gerar mensagem WhatsApp
  const gerarMensagemWhatsApp = (pacote: AgendamentoPacote, servico: ServicoAgendamento) => {
    const primeiroNomeCliente = pacote.nomeCliente.split(' ')[0];
    const nomeClienteFormatado = primeiroNomeCliente.charAt(0).toUpperCase() + primeiroNomeCliente.slice(1).toLowerCase();
    
    const primeiroNomePet = pacote.nomePet.split(' ')[0];
    const nomePetFormatado = primeiroNomePet.charAt(0).toUpperCase() + primeiroNomePet.slice(1).toLowerCase();
    
    const dataFormatada = new Date(servico.data + 'T00:00:00').toLocaleDateString('pt-BR');
    
    const isUltimoServico = servico.numero.split('/')[0] === servico.numero.split('/')[1];
    
    let mensagem = `Oii, ${nomeClienteFormatado}! Passando apenas para confirmar o agendamento de ${nomePetFormatado} com a gente.\n`;
    mensagem += `*Dia:* ${dataFormatada}\n`;
    mensagem += `*Horario:* ${servico.horarioInicio}\n`;
    mensagem += `*Serviço:* ${servico.nomeServico}\n`;
    mensagem += `*Pacote:* ${pacote.nomePacote || "Serviço Avulso"}\n`;
    mensagem += `*Número do Agendamento:* ${servico.numero}\n\n`;
    
    if (isUltimoServico) {
      mensagem += `Percebi que este será o último banho do seu pacote. Que tal já garantirmos a renovação no próximo agendamento e mantermos os banhos sequenciais?\n\n`;
    }
    
    if (empresaConfig.bordao) {
      mensagem += `*${empresaConfig.bordao}*`;
    }
    
    const whatsappUrl = `https://wa.me/55${pacote.whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Obter horários do Gantt baseado na config da empresa
  const getHorariosGantt = () => {
    if (empresaConfig.horarioInicio && empresaConfig.horarioFim) {
      const [inicioH] = empresaConfig.horarioInicio.split(':').map(Number);
      const [fimH] = empresaConfig.horarioFim.split(':').map(Number);
      
      const horarios = [];
      for (let h = inicioH; h <= fimH; h++) {
        horarios.push(`${String(h).padStart(2, '0')}:00`);
      }
      return horarios;
    }
    return horarios;
  };

  const horariosGantt = getHorariosGantt();

  // Obter agendamentos do dia para Gantt
  const getAgendamentosDia = () => {
    const dateStr = new Date(selectedDate).toISOString().split('T')[0];
    
    const agendamentosSimples = agendamentos
      .filter(a => a.data === dateStr)
      .map(a => ({
        tipo: 'simples' as const,
        horarioInicio: a.horario,
        horarioFim: a.horario, // Agendamento simples não tem duração
        cliente: a.cliente,
        pet: a.pet,
        servico: a.servico,
        pacote: null,
        numeroPacote: null,
        taxiDog: null,
        agendamento: a
      }));
    
    const agendamentosPacote = agendamentosPacotes.flatMap(p => 
      p.servicos
        .filter(s => s.data === dateStr)
        .map(s => ({
          tipo: 'pacote' as const,
          horarioInicio: s.horarioInicio,
          horarioFim: s.horarioTermino,
          cliente: p.nomeCliente,
          pet: p.nomePet,
          raca: p.raca,
          servico: s.nomeServico,
          pacote: p.nomePacote,
          numeroPacote: s.numero,
          taxiDog: p.taxiDog,
          agendamentoPacote: p,
          servicoAgendamento: s
        }))
    );
    
    return [...agendamentosSimples, ...agendamentosPacote].sort((a, b) => {
      return a.horarioInicio.localeCompare(b.horarioInicio);
    });
  };

  const agendamentosDia = getAgendamentosDia();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Agenda de Serviços</h1>
          <p className="text-muted-foreground text-xs">Visualize e gerencie os agendamentos</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs">
                <Plus className="h-3 w-3" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-lg">Novo Agendamento</DialogTitle>
                <DialogDescription className="text-xs">
                  Preencha os dados do agendamento
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="cliente" className="text-xs">Cliente</Label>
                  <Input
                    id="cliente"
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    placeholder="Nome do cliente"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pet" className="text-xs">Pet</Label>
                  <Input
                    id="pet"
                    value={formData.pet}
                    onChange={(e) => setFormData({ ...formData, pet: e.target.value })}
                    placeholder="Nome do pet"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="servico" className="text-xs">Serviço</Label>
                  <Input
                    id="servico"
                    value={formData.servico}
                    onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                    placeholder="Tipo de serviço"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="data" className="text-xs">Data</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      className="h-8 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="horario" className="text-xs">Horário</Label>
                    <Select value={formData.horario} onValueChange={(value) => setFormData({ ...formData, horario: value })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {horarios.map(h => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                    Cancelar
                  </Button>
                  <Button type="submit" className="h-8 text-xs">
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPacoteDialogOpen} onOpenChange={setIsPacoteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs" variant="outline">
                <Package className="h-3 w-3" />
                Novo Pacote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Agendar Pacote de Serviços</DialogTitle>
                <DialogDescription className="text-xs">
                  Preencha os dados para agendar um pacote de serviços
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handlePacoteSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1 relative">
                    <Label htmlFor="nomeCliente" className="text-xs">Nome do Cliente *</Label>
                    <Input
                      id="nomeCliente"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      placeholder="Digite o nome do cliente..."
                      className="h-8 text-xs"
                    />
                    {filteredClientes.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredClientes.map((nome, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 hover:bg-accent cursor-pointer text-xs"
                            onClick={() => handleClienteSelect(nome)}
                          >
                            {nome}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <Label htmlFor="nomePet" className="text-xs">Nome do Pet *</Label>
                    <Input
                      id="nomePet"
                      value={petSearch}
                      onChange={(e) => setPetSearch(e.target.value)}
                      placeholder="Digite o nome do pet..."
                      className="h-8 text-xs"
                    />
                    {filteredPets.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredPets.map((nome, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 hover:bg-accent cursor-pointer text-xs"
                            onClick={() => handlePetSelect(nome)}
                          >
                            {nome}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="raca" className="text-xs">Raça *</Label>
                    <Select 
                      value={pacoteFormData.raca} 
                      onValueChange={handleRacaSelect}
                      disabled={availableRacas.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={availableRacas.length === 0 ? "Selecione cliente e pet primeiro" : "Selecione a raça"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRacas.map((raca, idx) => (
                          <SelectItem key={idx} value={raca} className="text-xs">
                            {raca}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="whatsapp" className="text-xs">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={pacoteFormData.whatsapp ? `(${pacoteFormData.whatsapp.slice(0,2)}) ${pacoteFormData.whatsapp.slice(2,7)}-${pacoteFormData.whatsapp.slice(7)}` : ""}
                      readOnly
                      className="h-8 text-xs bg-secondary"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="taxiDog" className="text-xs">Taxi Dog? *</Label>
                    <Select 
                      value={pacoteFormData.taxiDog} 
                      onValueChange={(value) => setPacoteFormData({ ...pacoteFormData, taxiDog: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim" className="text-xs">Sim</SelectItem>
                        <SelectItem value="Não" className="text-xs">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nomePacote" className="text-xs">Nome do Pacote de Serviço *</Label>
                  <Select 
                    value={pacoteFormData.nomePacote} 
                    onValueChange={handlePacoteSelect}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o pacote" />
                    </SelectTrigger>
                    <SelectContent>
                      {pacotes.length === 0 ? (
                        <SelectItem value="sem-pacote" disabled className="text-xs">
                          Nenhum pacote cadastrado
                        </SelectItem>
                      ) : (
                        pacotes.map((pacote) => (
                          <SelectItem key={pacote.id} value={pacote.nome} className="text-xs">
                            {pacote.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {servicosAgendamento.length > 0 && (
                  <div className="space-y-2 border rounded-md p-3 bg-secondary/20">
                    <Label className="text-xs font-semibold">Agendamentos dos Serviços do Pacote</Label>
                    <div className="space-y-2">
                      {servicosAgendamento.map((servico, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveServico(index, 'up')}
                              disabled={index === 0}
                              className="h-6 w-6 p-0"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveServico(index, 'down')}
                              disabled={index === servicosAgendamento.length - 1}
                              className="h-6 w-6 p-0"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="w-14">
                            <Label className="text-xs text-primary font-semibold">{servico.numero}</Label>
                          </div>
                          
                          <div className="flex-1 min-w-[100px]">
                            <Label className="text-xs">{servico.nomeServico}</Label>
                          </div>
                          
                          <div className="w-32">
                            <Input
                              type="date"
                              value={servico.data}
                              onChange={(e) => handleServicoAgendamentoChange(index, 'data', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          
                          <div className="w-20">
                            <TimeInput
                              value={servico.horarioInicio}
                              onChange={(value) => handleServicoAgendamentoChange(index, 'horarioInicio', value)}
                              placeholder="00:00"
                              className="h-8 text-xs"
                            />
                          </div>
                          
                          <div className="w-20">
                            <TimeInput
                              value={servico.tempoServico}
                              onChange={(value) => handleServicoAgendamentoChange(index, 'tempoServico', value)}
                              placeholder="00:00"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetPacoteForm} className="h-8 text-xs">
                    Cancelar
                  </Button>
                  <Button type="submit" className="h-8 text-xs">
                    Agendar Pacote
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex gap-2 items-center mb-2">
                <Button
                  variant={viewMode === "semana" ? "default" : "outline"}
                  onClick={() => setViewMode("semana")}
                  className="h-7 text-xs"
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === "dia" ? "default" : "outline"}
                  onClick={() => {
                    setViewMode("dia");
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="h-7 text-xs"
                >
                  Hoje
                </Button>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-7 text-xs gap-2">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(selectedDate), "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={(date) => {
                        if (date) {
                          setCalendarDate(date);
                          setSelectedDate(date.toISOString().split('T')[0]);
                          setShowCalendar(false);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {viewMode === "semana" ? (
                <>
                  <CardTitle className="text-base">Agenda Semanal</CardTitle>
                  <CardDescription className="text-xs">
                    Semana de {weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} 
                    {' '}a {weekDates[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">
                    Houve {contarAgendamentos()} agendamentos realizados nesta semana.
                  </p>
                </>
              ) : (
                <>
                  <CardTitle className="text-base">Agenda do Dia</CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(selectedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">
                    Houve {contarAgendamentos()} agendamentos realizados neste dia.
                  </p>
                </>
              )}
            </div>
            {viewMode === "semana" && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigateWeek(-1)} className="h-8 text-xs">
                  ← Semana Anterior
                </Button>
                <Button variant="outline" onClick={() => navigateWeek(1)} className="h-8 text-xs">
                  Próxima Semana →
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-3">
          {viewMode === "semana" ? (
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
                      const pacote = getPacoteForSlot(date, horario);
                      const ocupado = isHorarioOcupado(date, horario);
                      
                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg min-h-[60px] transition-colors ${
                            pacote
                              ? "bg-primary/20 text-primary-foreground border border-primary/40"
                              : ocupado
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
                          {pacote && (
                            <div className="text-xs">
                              <div className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                <span className="font-semibold">{pacote.nomeCliente}</span>
                              </div>
                              <div className="text-xs opacity-80">{pacote.nomePet}</div>
                              <div className="text-xs opacity-60">{pacote.nomePacote}</div>
                              {pacote.servicos[0] && (
                                <div className="text-xs opacity-60">{pacote.servicos[0].nomeServico}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              {/* Gantt Chart */}
              <div className="flex-1 overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Header com horários */}
                  <div className="flex border-b pb-2 mb-4">
                    {horariosGantt.map(h => (
                      <div key={h} className="flex-1 text-center text-xs font-semibold text-muted-foreground">
                        {h}
                      </div>
                    ))}
                  </div>
                  
                  {/* Barras de agendamentos */}
                  <div className="space-y-2 relative" style={{ minHeight: `${agendamentosDia.length * 40}px` }}>
                    {agendamentosDia.map((agendamento, index) => {
                      const [inicioH, inicioM] = agendamento.horarioInicio.split(':').map(Number);
                      const [fimH, fimM] = agendamento.horarioFim ? agendamento.horarioFim.split(':').map(Number) : [inicioH + 1, inicioM];
                      
                      const [primeiroH] = horariosGantt[0].split(':').map(Number);
                      const [ultimoH] = horariosGantt[horariosGantt.length - 1].split(':').map(Number);
                      
                      const totalMinutos = (ultimoH - primeiroH + 1) * 60;
                      const inicioMinutos = (inicioH - primeiroH) * 60 + inicioM;
                      const duracaoMinutos = (fimH - inicioH) * 60 + (fimM - inicioM);
                      
                      const left = (inicioMinutos / totalMinutos) * 100;
                      const width = (duracaoMinutos / totalMinutos) * 100;
                      
                      return (
                        <div
                          key={index}
                          className="absolute h-8 bg-orange-500 rounded flex items-center justify-center text-xs font-semibold text-black"
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 5)}%`,
                            top: `${index * 40}px`
                          }}
                        >
                          {agendamento.horarioInicio} - {agendamento.horarioFim || agendamento.horarioInicio}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Tabela de informações */}
              <div className="w-[400px] overflow-auto max-h-[600px]">
                <table className="w-full text-xs border">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="p-2 border text-left">Início</th>
                      <th className="p-2 border text-left">Fim</th>
                      <th className="p-2 border text-left">Tutor</th>
                      <th className="p-2 border text-left">Pet</th>
                      <th className="p-2 border text-left">Raça</th>
                      <th className="p-2 border text-left">Serviço</th>
                      <th className="p-2 border text-left">Pacote</th>
                      <th className="p-2 border text-left">N° PCT</th>
                      <th className="p-2 border text-left">Taxi Dog</th>
                      <th className="p-2 border text-left">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentosDia.map((agendamento, index) => (
                      <tr key={index} className="hover:bg-accent/50">
                        <td className="p-2 border">{agendamento.horarioInicio}</td>
                        <td className="p-2 border">{agendamento.horarioFim || '-'}</td>
                        <td className="p-2 border">{agendamento.cliente}</td>
                        <td className="p-2 border">{agendamento.pet}</td>
                        <td className="p-2 border">{agendamento.tipo === 'pacote' ? agendamento.raca : '-'}</td>
                        <td className="p-2 border">{agendamento.servico}</td>
                        <td className="p-2 border">{agendamento.pacote || '-'}</td>
                        <td className="p-2 border">{agendamento.numeroPacote || ''}</td>
                        <td className="p-2 border">{agendamento.taxiDog || ''}</td>
                        <td className="p-2 border">
                          {agendamento.tipo === 'pacote' && agendamento.agendamentoPacote && agendamento.servicoAgendamento && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => gerarMensagemWhatsApp(agendamento.agendamentoPacote, agendamento.servicoAgendamento)}
                              className="h-6 w-6 p-0"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Agendamentos;

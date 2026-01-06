import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Clock,
  Package,
  Calendar as CalendarIcon,
  ChevronUp,
  ChevronDown,
  Copy,
  Settings,
  Trash2,
  Search,
  Check,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TimeInput } from "@/components/TimeInput";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { criarLancamentoFinanceiroAvulso, criarLancamentoFinanceiroPacote, criarLancamentoFinanceiroMultiplosServicos } from "@/hooks/useCriarLancamentoAutomatico";

// Interfaces

interface Groomer {
  id: string;
  nome: string;
}

interface Agendamento {
  id: string;
  cliente: string;
  pet: string;
  raca: string;
  whatsapp: string;
  servico: string;
  data: string;
  horario: string;
  tempoServico: string;
  horarioTermino: string;
  dataVenda: string;
  groomer: string;
  taxiDog: string;
  status: "confirmado" | "pendente" | "concluido";
  numeroServicoPacote?: string;
}
interface ServicoAgendamento {
  numero: string;
  nomeServico: string;
  data: string;
  horarioInicio: string;
  tempoServico: string; // Agora em formato hh:mm
  horarioTermino: string;
  servicosExtras?: { id: string; nome: string; valor: number }[];
}
interface AgendamentoPacote {
  id: string;
  nomeCliente: string;
  nomePet: string;
  raca: string;
  whatsapp: string;
  nomePacote: string;
  taxiDog: string; // "Sim" ou "Não"
  dataVenda: string;
  servicos: ServicoAgendamento[];
}
interface Pet {
  id: string;
  nome: string;
  porte: string;
  raca: string;
  observacao: string;
}

interface Cliente {
  id: string;
  nomeCliente: string;
  whatsapp: string;
  endereco: string;
  observacao: string;
  pets: Pet[];
}
interface ServicoSelecionado {
  instanceId: string;
  id: string;
  nome: string;
  valor: number;
}

// Interface para serviços selecionados no agendamento simples
interface ServicoAgendamentoSimples {
  instanceId: string;
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
interface Servico {
  id: string;
  nome: string;
  valor: number;
}
interface EmpresaConfig {
  bordao: string;
  horarioInicio: string;
  horarioFim: string;
  diasFuncionamento: {
    domingo: boolean;
    segunda: boolean;
    terca: boolean;
    quarta: boolean;
    quinta: boolean;
    sexta: boolean;
    sabado: boolean;
  };
}
interface AgendamentoUnificado {
  id: string;
  tipo: "simples" | "pacote";
  data: string;
  horarioInicio: string;
  horarioTermino: string;
  cliente: string;
  pet: string;
  raca: string;
  servico: string;
  nomePacote: string;
  numeroPacote: string;
  taxiDog: string;
  dataVenda: string;
  whatsapp: string;
  tempoServico: string;
  groomer: string;
  agendamentoOriginal?: Agendamento;
  pacoteOriginal?: AgendamentoPacote;
  servicoOriginal?: ServicoAgendamento;
}

// Componente auxiliar para combobox de serviço extra
const ServicoExtraCombobox = ({ 
  extra, 
  index, 
  servicos, 
  onSelect 
}: { 
  extra: { id: string; nome: string; valor: number }; 
  index: number;
  servicos: Servico[];
  onSelect: (servico: Servico) => void;
}) => {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 h-8 text-xs justify-between"
        >
          {extra.nome || "Selecione serviço extra..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50 bg-popover">
        <Command>
          <CommandInput placeholder="Buscar serviço..." className="h-9" />
          <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-y-auto">
            {servicos.map((s) => (
              <CommandItem
                key={s.id}
                value={s.nome}
                onSelect={() => {
                  onSelect(s);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    extra.nome === s.nome ? "opacity-100" : "opacity-0"
                  )}
                />
                {s.nome} - R$ {s.valor?.toFixed(2)}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Agendamentos = () => {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);

  // Função para formatar data sem problemas de timezone
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Função para formatar data de exibição sem problemas de timezone
  const formatDateForDisplay = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day); // Cria data no timezone local
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [agendamentosPacotes, setAgendamentosPacotes] = useState<AgendamentoPacote[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>({
    bordao: "",
    horarioInicio: "08:00",
    horarioFim: "18:00",
    diasFuncionamento: {
      domingo: false,
      segunda: true,
      terca: true,
      quarta: true,
      quinta: true,
      sexta: true,
      sabado: false,
    },
  });

  // Load agendamentos from Supabase
  const loadAgendamentos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("user_id", ownerId)
        .order("data", { ascending: true })
        .order("horario", { ascending: true });

      if (error) throw error;

      const agendamentosFormatados = (data || []).map((ag: any) => ({
        id: ag.id,
        cliente: ag.cliente,
        pet: ag.pet,
        raca: ag.raca,
        whatsapp: ag.whatsapp,
        servico: ag.servico,
        data: ag.data,
        horario: ag.horario ? ag.horario.substring(0, 5) : "",
        tempoServico: ag.tempo_servico ? ag.tempo_servico.substring(0, 5) : "",
        horarioTermino: ag.horario_termino ? ag.horario_termino.substring(0, 5) : "",
        dataVenda: ag.data_venda,
        groomer: ag.groomer,
        taxiDog: ag.taxi_dog,
        status: ag.status as "confirmado" | "pendente" | "concluido",
        numeroServicoPacote: ag.numero_servico_pacote || undefined,
      }));

      setAgendamentos(agendamentosFormatados);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  // Load groomers, clientes, pacotes, servicos from Supabase
  const loadRelatedData = async () => {
    if (!user || !ownerId) return;

    try {
      // Load groomers
      const { data: groomersData } = await (supabase as any).from("groomers").select("*").eq("user_id", ownerId);

      if (groomersData) {
        setGroomers(groomersData.map((g: any) => ({ id: g.id, nome: g.nome })));
      }

      // Load clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nome_cliente, whatsapp, endereco, observacao")
        .eq("user_id", ownerId);

      if (clientesError) throw clientesError;

      // Load pets
      const { data: petsData, error: petsError } = await supabase.from("pets").select("*").eq("user_id", ownerId);

      if (petsError) throw petsError;

      // Agrupar pets por cliente_id
      const petsPorCliente = (petsData || []).reduce(
        (acc, pet: any) => {
          if (!acc[pet.cliente_id]) {
            acc[pet.cliente_id] = [];
          }
          acc[pet.cliente_id].push({
            id: pet.id,
            nome: pet.nome_pet,
            porte: pet.porte,
            raca: pet.raca,
            observacao: pet.observacao || "",
          });
          return acc;
        },
        {} as Record<string, Pet[]>,
      );

      // Montar estrutura final
      const clientesComPets: Cliente[] = (clientesData || []).map((c: any) => ({
        id: c.id,
        nomeCliente: c.nome_cliente,
        whatsapp: c.whatsapp,
        endereco: c.endereco || "",
        observacao: c.observacao || "",
        pets: petsPorCliente[c.id] || [],
      }));

      setClientes(clientesComPets);

      // Load pacotes
      const { data: pacotesData } = await supabase.from("pacotes").select("*").eq("user_id", ownerId);

      if (pacotesData) {
        setPacotes(
          pacotesData.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            servicos: p.servicos || [],
            validade: p.validade,
            descontoPercentual: Number(p.desconto_percentual),
            descontoValor: Number(p.desconto_valor),
            valorFinal: Number(p.valor_final),
          })),
        );
      }

      // Load servicos
      const { data: servicosData } = await supabase.from("servicos").select("*").eq("user_id", ownerId);

      if (servicosData) {
        setServicos(
          servicosData.map((s: any) => ({
            id: s.id,
            nome: s.nome,
            valor: Number(s.valor),
          })),
        );
      }

      // Load empresa config
      const { data: empresaData } = await (supabase as any)
        .from("empresa_config")
        .select("*")
        .eq("user_id", ownerId)
        .single();

      if (empresaData) {
        const empresa = empresaData as any;
        setEmpresaConfig({
          bordao: empresa.bordao || "",
          horarioInicio: empresa.horario_inicio || "08:00",
          horarioFim: empresa.horario_fim || "18:00",
          diasFuncionamento: empresa.dias_funcionamento || {
            domingo: false,
            segunda: true,
            terca: true,
            quarta: true,
            quinta: true,
            sexta: true,
            sabado: false,
          },
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados relacionados:", error);
    }
  };

  useEffect(() => {
    if (user && ownerId) {
      loadAgendamentos();
      loadRelatedData();
    }
  }, [user, ownerId]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPacoteDialogOpen, setIsPacoteDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [viewMode, setViewMode] = useState<"semana" | "dia">("semana");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    data: "",
    horarioInicio: "",
    tempoServico: "",
    servico: "",
  });
  const [formData, setFormData] = useState({
    cliente: "",
    pet: "",
    raca: "",
    whatsapp: "",
    servico: "",
    data: "",
    horario: "",
    tempoServico: "",
    horarioTermino: "",
    dataVenda: "",
    numeroServicoPacote: "",
    groomer: "",
    taxiDog: "",
  });
  const [isPacoteSelecionado, setIsPacoteSelecionado] = useState(false);
  const [openServicoCombobox, setOpenServicoCombobox] = useState(false);
  const [openEditServicoCombobox, setOpenEditServicoCombobox] = useState(false);
  
  // Estado para múltiplos serviços no agendamento simples
  const [servicosSelecionadosSimples, setServicosSelecionadosSimples] = useState<ServicoAgendamentoSimples[]>([
    { instanceId: crypto.randomUUID(), nome: "", valor: 0 }
  ]);
  const [openServicoComboboxIndex, setOpenServicoComboboxIndex] = useState<number | null>(null);
  const [pacoteFormData, setPacoteFormData] = useState({
    nomeCliente: "",
    nomePet: "",
    raca: "",
    whatsapp: "",
    nomePacote: "",
    taxiDog: "",
    dataVenda: "",
  });
  const [servicosAgendamento, setServicosAgendamento] = useState<ServicoAgendamento[]>([]);

  // Estados para busca inteligente (Pacotes)
  const [clienteSearch, setClienteSearch] = useState("");
  const [petSearch, setPetSearch] = useState("");
  const [filteredClientes, setFilteredClientes] = useState<string[]>([]);
  const [filteredPets, setFilteredPets] = useState<string[]>([]);
  const [availableRacas, setAvailableRacas] = useState<string[]>([]);
  const [searchStartedWith, setSearchStartedWith] = useState<"cliente" | "pet" | null>(null);

  // Estados para busca inteligente (Agendamento Simples)
  const [simpleClienteSearch, setSimpleClienteSearch] = useState("");
  const [simplePetSearch, setSimplePetSearch] = useState("");
  const [simpleFilteredClientes, setSimpleFilteredClientes] = useState<string[]>([]);
  const [simpleFilteredPets, setSimpleFilteredPets] = useState<string[]>([]);
  const [simpleAvailableRacas, setSimpleAvailableRacas] = useState<string[]>([]);
  const [simpleSearchStartedWith, setSimpleSearchStartedWith] = useState<"cliente" | "pet" | null>(null);

  // Estados para Gerenciamento de Agendamentos
  const [gerenciamentoOpen, setGerenciamentoOpen] = useState(false);
  const [filtros, setFiltros] = useState({
    nomePet: "",
    nomeCliente: "",
    dataAgendada: "",
    dataVenda: "",
    nomePacote: "",
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    nomePet: "",
    nomeCliente: "",
    dataAgendada: "",
    dataVenda: "",
    nomePacote: "",
  });
  const [editandoAgendamento, setEditandoAgendamento] = useState<AgendamentoUnificado | null>(null);
  const [editDialogGerenciamento, setEditDialogGerenciamento] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agendamentoParaDeletar, setAgendamentoParaDeletar] = useState<AgendamentoUnificado | null>(null);
  
  // Estados para edição de serviços extras
  const [servicosExtrasEdicao, setServicosExtrasEdicao] = useState<{id: string; nome: string; valor: number}[]>([]);
  const [openServicoEdicao, setOpenServicoEdicao] = useState(false);
  const [servicoPrincipalEdicao, setServicoPrincipalEdicao] = useState("");

  // Load agendamentos pacotes from Supabase
  const loadAgendamentosPacotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", ownerId)
        .order("data_venda", { ascending: false });

      if (error) throw error;

      const pacotesFormatados = (data || []).map((ap: any) => ({
        id: ap.id,
        nomeCliente: ap.nome_cliente,
        nomePet: ap.nome_pet,
        raca: ap.raca,
        whatsapp: ap.whatsapp,
        nomePacote: ap.nome_pacote,
        taxiDog: ap.taxi_dog,
        dataVenda: ap.data_venda,
        servicos: ap.servicos || [],
      }));

      setAgendamentosPacotes(pacotesFormatados);
    } catch (error) {
      console.error("Erro ao carregar agendamentos de pacotes:", error);
      toast.error("Erro ao carregar agendamentos de pacotes");
    }
  };

  useEffect(() => {
    if (user) {
      loadAgendamentosPacotes();
    }
  }, [user]);

  // Busca inteligente por cliente (Pacotes)
  useEffect(() => {
    if (clienteSearch.length >= 2) {
      const matches = Array.from(
        new Set(
          clientes
            .filter((c) => c.nomeCliente.toLowerCase().startsWith(clienteSearch.toLowerCase()))
            .map((c) => c.nomeCliente),
        ),
      );
      setFilteredClientes(matches);
    } else {
      setFilteredClientes([]);
    }
  }, [clienteSearch, clientes]);

  // Busca inteligente por pet (Pacotes)
  useEffect(() => {
    if (petSearch.length >= 2) {
      const matchingPets = new Set<string>();
      clientes.forEach((cliente) => {
        cliente.pets.forEach((pet) => {
          if (pet.nome.toLowerCase().startsWith(petSearch.toLowerCase())) {
            matchingPets.add(pet.nome);
          }
        });
      });
      setFilteredPets(Array.from(matchingPets));
    } else {
      setFilteredPets([]);
    }
  }, [petSearch, clientes]);

  // Busca inteligente por cliente (Agendamento Simples)
  useEffect(() => {
    if (simpleClienteSearch.length >= 2) {
      const matches = Array.from(
        new Set(
          clientes
            .filter((c) => c.nomeCliente.toLowerCase().startsWith(simpleClienteSearch.toLowerCase()))
            .map((c) => c.nomeCliente),
        ),
      );
      setSimpleFilteredClientes(matches);
    } else {
      setSimpleFilteredClientes([]);
    }
  }, [simpleClienteSearch, clientes]);

  // Busca inteligente por pet (Agendamento Simples)
  useEffect(() => {
    if (simplePetSearch.length >= 2) {
      const matchingPets = new Set<string>();
      clientes.forEach((cliente) => {
        cliente.pets.forEach((pet) => {
          if (pet.nome.toLowerCase().startsWith(simplePetSearch.toLowerCase())) {
            matchingPets.add(pet.nome);
          }
        });
      });
      setSimpleFilteredPets(Array.from(matchingPets));
    } else {
      setSimpleFilteredPets([]);
    }
  }, [simplePetSearch, clientes]);

  // Atualizar pets disponíveis quando cliente é selecionado (Pacotes)
  const handleClienteSelect = (nomeCliente: string) => {
    setClienteSearch(nomeCliente);
    setSearchStartedWith("cliente");

    // Buscar TODOS os clientes com esse nome (não apenas o primeiro)
    const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === nomeCliente);

    if (clientesComMesmoNome.length > 0) {
      // Pegar o primeiro cliente para definir whatsapp (poderia ser qualquer um)
      const primeiroCliente = clientesComMesmoNome[0];
      
      setPacoteFormData({
        ...pacoteFormData,
        nomeCliente,
        nomePet: "",
        raca: "",
        whatsapp: primeiroCliente.whatsapp,
      });

      // Coletar pets de TODOS os clientes com esse nome
      const todosPetsDoNome = clientesComMesmoNome.flatMap((cliente) => 
        cliente.pets.map((p) => p.nome)
      );
      
      setFilteredPets(todosPetsDoNome);
      setFilteredClientes([]);
      setAvailableRacas([]);
    }
  };

  // Atualizar raças disponíveis quando pet é selecionado (Pacotes)
  const handlePetSelect = (nomePet: string) => {
    setPetSearch(nomePet);

    if (searchStartedWith === "cliente" || pacoteFormData.nomeCliente) {
      // Buscar TODOS os clientes com esse nome
      const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === pacoteFormData.nomeCliente);
      
      // Encontrar qual cliente específico possui esse pet
      let clienteCorreto: Cliente | undefined;
      let petEncontrado: Pet | undefined;
      
      for (const cliente of clientesComMesmoNome) {
        const pet = cliente.pets.find((p) => p.nome === nomePet);
        if (pet) {
          clienteCorreto = cliente;
          petEncontrado = pet;
          break;
        }
      }

      if (clienteCorreto && petEncontrado) {
        setAvailableRacas([petEncontrado.raca]);
        setPacoteFormData({
          ...pacoteFormData,
          nomePet,
          raca: petEncontrado.raca,
          whatsapp: clienteCorreto.whatsapp,
        });
      }
    } else {
      // Se começou pelo pet, mostrar clientes que têm esse pet
      setSearchStartedWith("pet");

      const clientesComEssePet = clientes.filter((c) => c.pets.some((p) => p.nome === nomePet));
      const nomesClientes = clientesComEssePet.map((c) => c.nomeCliente);
      setFilteredClientes(nomesClientes);

      const racasDisponiveis = new Set<string>();
      clientesComEssePet.forEach((c) => {
        const pet = c.pets.find((p) => p.nome === nomePet);
        if (pet) racasDisponiveis.add(pet.raca);
      });

      setAvailableRacas(Array.from(racasDisponiveis));
      setPacoteFormData({
        ...pacoteFormData,
        nomePet,
        nomeCliente: "",
        raca: "",
        whatsapp: "",
      });
    }
    setFilteredPets([]);
  };

  // Preencher WhatsApp quando raça é selecionada (Pacotes)
  const handleRacaSelect = (raca: string) => {
    let clienteCorreto: Cliente | undefined;
    let petEncontrado: Pet | undefined;

    if (pacoteFormData.nomeCliente) {
      // Buscar TODOS os clientes com esse nome
      const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === pacoteFormData.nomeCliente);
      
      for (const cliente of clientesComMesmoNome) {
        const pet = cliente.pets.find((p) => p.nome === pacoteFormData.nomePet && p.raca === raca);
        if (pet) {
          clienteCorreto = cliente;
          petEncontrado = pet;
          break;
        }
      }
    } else if (pacoteFormData.nomePet) {
      clienteCorreto = clientes.find((c) =>
        c.pets.some((p) => p.nome === pacoteFormData.nomePet && p.raca === raca),
      );

      if (clienteCorreto) {
        petEncontrado = clienteCorreto.pets.find((p) => p.nome === pacoteFormData.nomePet && p.raca === raca);
      }
    }

    if (clienteCorreto && petEncontrado) {
      setPacoteFormData({
        ...pacoteFormData,
        nomeCliente: clienteCorreto.nomeCliente,
        nomePet: petEncontrado.nome,
        raca: petEncontrado.raca,
        whatsapp: clienteCorreto.whatsapp,
      });
      setClienteSearch(clienteCorreto.nomeCliente);
      setPetSearch(petEncontrado.nome);
      setFilteredClientes([]);
      setAvailableRacas([]);
    }
  };

  // Atualizar pets disponíveis quando cliente é selecionado (Agendamento Simples)
  const handleSimpleClienteSelect = (nomeCliente: string) => {
    setSimpleClienteSearch(nomeCliente);
    setSimpleSearchStartedWith("cliente");

    // Buscar TODOS os clientes com esse nome (não apenas o primeiro)
    const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === nomeCliente);

    if (clientesComMesmoNome.length > 0) {
      // Pegar o primeiro cliente para definir whatsapp (poderia ser qualquer um)
      const primeiroCliente = clientesComMesmoNome[0];
      
      setFormData({
        ...formData,
        cliente: nomeCliente,
        pet: "",
        raca: "",
        whatsapp: primeiroCliente.whatsapp,
      });

      // Coletar pets de TODOS os clientes com esse nome
      const todosPetsDoNome = clientesComMesmoNome.flatMap((cliente) => 
        cliente.pets.map((p) => p.nome)
      );
      
      setSimpleFilteredPets(todosPetsDoNome);
      setSimpleFilteredClientes([]);
      setSimpleAvailableRacas([]);
    }
  };

  // Atualizar raças disponíveis quando pet é selecionado (Agendamento Simples)
  const handleSimplePetSelect = (nomePet: string) => {
    setSimplePetSearch(nomePet);

    if (simpleSearchStartedWith === "cliente" || formData.cliente) {
      // Buscar TODOS os clientes com esse nome
      const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.cliente);
      
      // Encontrar qual cliente específico possui esse pet
      let clienteCorreto: Cliente | undefined;
      let petEncontrado: Pet | undefined;
      
      for (const cliente of clientesComMesmoNome) {
        const pet = cliente.pets.find((p) => p.nome === nomePet);
        if (pet) {
          clienteCorreto = cliente;
          petEncontrado = pet;
          break;
        }
      }

      if (clienteCorreto && petEncontrado) {
        setSimpleAvailableRacas([petEncontrado.raca]);
        setFormData({
          ...formData,
          pet: nomePet,
          raca: petEncontrado.raca,
          whatsapp: clienteCorreto.whatsapp,
        });
      }
    } else {
      // Se começou pelo pet, mostrar clientes que têm esse pet
      setSimpleSearchStartedWith("pet");

      const clientesComEssePet = clientes.filter((c) => c.pets.some((p) => p.nome === nomePet));
      const nomesClientes = clientesComEssePet.map((c) => c.nomeCliente);
      setSimpleFilteredClientes(nomesClientes);

      const racasDisponiveis = new Set<string>();
      clientesComEssePet.forEach((c) => {
        const pet = c.pets.find((p) => p.nome === nomePet);
        if (pet) racasDisponiveis.add(pet.raca);
      });

      setSimpleAvailableRacas(Array.from(racasDisponiveis));
      setFormData({
        ...formData,
        pet: nomePet,
        cliente: "",
        raca: "",
        whatsapp: "",
      });
    }
    setSimpleFilteredPets([]);
  };

  // Preencher WhatsApp quando raça é selecionada (Agendamento Simples)
  const handleSimpleRacaSelect = (raca: string) => {
    let clienteCorreto: Cliente | undefined;
    let petEncontrado: Pet | undefined;

    if (formData.cliente) {
      // Buscar TODOS os clientes com esse nome
      const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.cliente);
      
      for (const cliente of clientesComMesmoNome) {
        const pet = cliente.pets.find((p) => p.nome === formData.pet && p.raca === raca);
        if (pet) {
          clienteCorreto = cliente;
          petEncontrado = pet;
          break;
        }
      }
    } else if (formData.pet) {
      clienteCorreto = clientes.find((c) => c.pets.some((p) => p.nome === formData.pet && p.raca === raca));

      if (clienteCorreto) {
        petEncontrado = clienteCorreto.pets.find((p) => p.nome === formData.pet && p.raca === raca);
      }
    }

    if (clienteCorreto && petEncontrado) {
      setFormData({
        ...formData,
        cliente: clienteCorreto.nomeCliente,
        pet: petEncontrado.nome,
        raca: petEncontrado.raca,
        whatsapp: clienteCorreto.whatsapp,
      });
      setSimpleClienteSearch(clienteCorreto.nomeCliente);
      setSimplePetSearch(petEncontrado.nome);
      setSimpleFilteredClientes([]);
      setSimpleAvailableRacas([]);
    }
  };
  const horarios = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const mapDiaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;

  // Sincronizar Data da Venda com Data do Agendamento
  useEffect(() => {
    if (formData.data && !formData.dataVenda) {
      setFormData((prev) => ({
        ...prev,
        dataVenda: formData.data,
      }));
    }
  }, [formData.data]);
  const getWeekDates = () => {
    const today = new Date(selectedDate);
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay;
    const sunday = new Date(today.setDate(diff));
    return Array.from(
      {
        length: 7,
      },
      (_, i) => {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        return date;
      },
    );
  };
  const weekDates = getWeekDates();
  
  // Filtrar apenas dias de funcionamento
  const filteredWeekDates = weekDates.filter((date) => {
    const dayIndex = date.getDay();
    const dayName = mapDiaSemana[dayIndex];
    return empresaConfig.diasFuncionamento[dayName];
  });
  
  // Funções para buscar TODOS os agendamentos de um slot
  const getAllAgendamentosForSlot = (date: Date, horario: string) => {
    const dateStr = formatDateForInput(date);
    return agendamentos.filter((a) => a.data === dateStr && a.horario === horario);
  };

  const getAllPacotesForSlot = (date: Date, horario: string) => {
    const dateStr = formatDateForInput(date);
    return agendamentosPacotes.filter((p) =>
      p.servicos.some((s) => s.data === dateStr && s.horarioInicio === horario)
    );
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validar se pelo menos um serviço foi selecionado
    const servicosValidos = servicosSelecionadosSimples.filter((s) => s.nome);
    if (servicosValidos.length === 0) {
      toast.error("Favor selecionar pelo menos um serviço");
      return;
    }

    if (!formData.data) {
      toast.error("Favor preencher a Data do Agendamento");
      return;
    }
    if (!formData.horario) {
      toast.error("Favor preencher o Horário de Início do Serviço");
      return;
    }
    if (!formData.tempoServico) {
      toast.error("Favor preencher o Tempo do Serviço");
      return;
    }
    if (!formData.dataVenda) {
      toast.error("Favor preencher a Data da Venda do Serviço");
      return;
    }
    if (!formData.taxiDog) {
      toast.error("Favor selecionar a opção se será necessário o uso de Taxi Dog!");
      return;
    }
    if (isPacoteSelecionado && !formData.numeroServicoPacote) {
      toast.error("Favor selecionar o número do serviço!");
      return;
    }

    const horarioTermino = calcularHorarioTermino(formData.horario, formData.tempoServico);
    
    // Criar string concatenada para exibição no calendário
    const servicosNomes = servicosValidos.map((s) => s.nome).join(" + ");

    try {
      // Inserir agendamento e obter o ID
      const { data: agendamentoData, error } = await supabase.from("agendamentos").insert([
        {
          user_id: user.id,
          cliente: formData.cliente,
          pet: formData.pet,
          raca: formData.raca,
          whatsapp: formData.whatsapp,
          servico: servicosNomes, // Ex: "Banho + Tosa"
          servicos: servicosValidos.map((s) => ({ nome: s.nome, valor: s.valor })), // Array JSON
          data: formData.data,
          horario: formData.horario,
          tempo_servico: formData.tempoServico,
          horario_termino: horarioTermino,
          data_venda: formData.dataVenda,
          numero_servico_pacote: formData.numeroServicoPacote || null,
          groomer: formData.groomer,
          taxi_dog: formData.taxiDog,
          status: "confirmado",
        },
      ]).select("id").single();

      if (error) throw error;

      // Criar UM ÚNICO lançamento financeiro consolidado com múltiplos itens
      await criarLancamentoFinanceiroMultiplosServicos({
        agendamentoId: agendamentoData.id,
        nomeCliente: formData.cliente,
        nomePet: formData.pet,
        servicos: servicosValidos.map((s) => ({ nome: s.nome, valor: s.valor })),
        dataAgendamento: formData.data,
        dataVenda: formData.dataVenda,
        ownerId: ownerId || user.id,
      });

      toast.success("Agendamento criado com sucesso!");
      await loadAgendamentos();
      resetForm();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao criar agendamento");
    }
  };
  const resetForm = () => {
    setFormData({
      cliente: "",
      pet: "",
      raca: "",
      whatsapp: "",
      servico: "",
      data: "",
      horario: "",
      tempoServico: "",
      horarioTermino: "",
      dataVenda: "",
      numeroServicoPacote: "",
      groomer: "",
      taxiDog: "",
    });
    setIsPacoteSelecionado(false);
    setSimpleClienteSearch("");
    setSimplePetSearch("");
    setSimpleFilteredClientes([]);
    setSimpleFilteredPets([]);
    setSimpleAvailableRacas([]);
    setSimpleSearchStartedWith(null);
    setServicosSelecionadosSimples([{ instanceId: crypto.randomUUID(), nome: "", valor: 0 }]);
    setOpenServicoComboboxIndex(null);
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
      dataVenda: "",
    });
    setServicosAgendamento([]);
    setClienteSearch("");
    setPetSearch("");
    setFilteredClientes([]);
    setFilteredPets([]);
    setAvailableRacas([]);
    setSearchStartedWith(null);
    setIsPacoteDialogOpen(false);
  };

  // Funções para gerenciar múltiplos serviços no agendamento simples
  const adicionarServicoSimples = () => {
    setServicosSelecionadosSimples([
      ...servicosSelecionadosSimples,
      { instanceId: crypto.randomUUID(), nome: "", valor: 0 }
    ]);
  };

  const removerServicoSimples = (instanceId: string) => {
    if (servicosSelecionadosSimples.length > 1) {
      setServicosSelecionadosSimples(
        servicosSelecionadosSimples.filter((s) => s.instanceId !== instanceId)
      );
    }
  };

  const atualizarServicoSimples = (instanceId: string, servicoNome: string) => {
    const servicoEncontrado = servicos.find((s) => s.nome === servicoNome);
    setServicosSelecionadosSimples(
      servicosSelecionadosSimples.map((s) =>
        s.instanceId === instanceId
          ? { ...s, nome: servicoNome, valor: servicoEncontrado?.valor || 0 }
          : s
      )
    );
    setOpenServicoComboboxIndex(null);
  };

  const handlePacoteSelect = (nomePacote: string) => {
    setPacoteFormData({
      ...pacoteFormData,
      nomePacote,
    });
    const pacoteSelecionado = pacotes.find((p) => p.nome === nomePacote);
    if (pacoteSelecionado) {
      const servicosInit: ServicoAgendamento[] = pacoteSelecionado.servicos.map((servico, index) => {
        const total = pacoteSelecionado.servicos.length;
        const numero = `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
        // Preservar servicosExtras do pacote
        const extras = (servico as any).servicosExtras || [];
        return {
          numero,
          nomeServico: servico.nome,
          data: "",
          horarioInicio: "",
          tempoServico: "",
          horarioTermino: "",
          servicosExtras: extras,
        };
      });
      setServicosAgendamento(servicosInit);
    }
  };

  // Calcular horário de término
  const calcularHorarioTermino = (inicio: string, tempo: string): string => {
    if (!inicio || !tempo) return "";
    const [inicioH, inicioM] = inicio.split(":").map(Number);
    const [tempoH, tempoM] = tempo.split(":").map(Number);
    const totalMinutos = inicioH * 60 + inicioM + (tempoH * 60 + tempoM);
    const fimH = Math.floor(totalMinutos / 60);
    const fimM = totalMinutos % 60;
    return `${String(fimH).padStart(2, "0")}:${String(fimM).padStart(2, "0")}`;
  };

  // Atualizar serviço individual
  const handleServicoAgendamentoChange = (index: number, field: keyof ServicoAgendamento, value: string) => {
    const updated = [...servicosAgendamento];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    // Calcular horário de término
    if (field === "horarioInicio" || field === "tempoServico") {
      const horarioInicio = field === "horarioInicio" ? value : updated[index].horarioInicio;
      const tempoServico = field === "tempoServico" ? value : updated[index].tempoServico;
      if (horarioInicio && tempoServico) {
        updated[index].horarioTermino = calcularHorarioTermino(horarioInicio, tempoServico);
      }
    }
    setServicosAgendamento(updated);
  };

  // Mover serviço para cima/baixo
  const moveServico = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === servicosAgendamento.length - 1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...servicosAgendamento];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Renumerar
    updated.forEach((servico, idx) => {
      servico.numero = `${String(idx + 1).padStart(2, "0")}/${String(updated.length).padStart(2, "0")}`;
    });
    setServicosAgendamento(updated);
  };
  const handlePacoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

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
    if (!pacoteFormData.dataVenda) {
      toast.error("Favor preencher a Data da Venda");
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

    try {
      const { error } = await supabase.from("agendamentos_pacotes").insert([
        {
          user_id: ownerId,
          nome_cliente: pacoteFormData.nomeCliente,
          nome_pet: pacoteFormData.nomePet,
          raca: pacoteFormData.raca,
          whatsapp: pacoteFormData.whatsapp,
          nome_pacote: pacoteFormData.nomePacote,
          taxi_dog: pacoteFormData.taxiDog,
          data_venda: pacoteFormData.dataVenda,
          servicos: servicosAgendamento as any,
        },
      ]);

      if (error) throw error;

      // Automação: criar lançamento financeiro automaticamente
      // Usar a primeira data de serviço para definir mês/ano
      const primeiraDataServico = servicosAgendamento[0]?.data || pacoteFormData.dataVenda;
      
      criarLancamentoFinanceiroPacote({
        nomeCliente: pacoteFormData.nomeCliente,
        nomePet: pacoteFormData.nomePet,
        nomePacote: pacoteFormData.nomePacote,
        dataVenda: pacoteFormData.dataVenda,
        primeiraDataServico: primeiraDataServico,
        ownerId: ownerId || "",
      });

      toast.success("Pacote agendado com sucesso!");
      await loadAgendamentosPacotes();
      resetPacoteForm();
    } catch (error) {
      console.error("Erro ao agendar pacote:", error);
      toast.error("Erro ao agendar pacote");
    }
  };
  const getAgendamentoForSlot = (date: Date, horario: string) => {
    const dateStr = formatDateForInput(date);
    return agendamentos.find((a) => a.data === dateStr && a.horario === horario);
  };
  const getPacoteForSlot = (date: Date, horario: string) => {
    const dateStr = formatDateForInput(date);
    return agendamentosPacotes.find((a) => a.servicos.some((s) => s.data === dateStr && s.horarioInicio === horario));
  };
  const isHorarioOcupado = (date: Date, horario: string) => {
    return !!getAgendamentoForSlot(date, horario) || !!getPacoteForSlot(date, horario);
  };
  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(formatDateForInput(newDate));
  };

  // Contar agendamentos
  const contarAgendamentos = () => {
    if (viewMode === "semana") {
      let count = 0;
      weekDates.forEach((date) => {
        const dateStr = formatDateForInput(date);
        count += agendamentos.filter((a) => a.data === dateStr).length;
        agendamentosPacotes.forEach((p) => {
          count += p.servicos.filter((s) => s.data === dateStr).length;
        });
      });
      return count;
    } else {
      const dateStr = selectedDate;
      let count = agendamentos.filter((a) => a.data === dateStr).length;
      agendamentosPacotes.forEach((p) => {
        count += p.servicos.filter((s) => s.data === dateStr).length;
      });
      return count;
    }
  };

  // Gerar mensagem WhatsApp
  const gerarMensagemWhatsApp = (pacote: AgendamentoPacote, servico: ServicoAgendamento) => {
    const primeiroNomeCliente = pacote.nomeCliente.split(" ")[0];
    const nomeClienteFormatado =
      primeiroNomeCliente.charAt(0).toUpperCase() + primeiroNomeCliente.slice(1).toLowerCase();
    const primeiroNomePet = pacote.nomePet.split(" ")[0];
    const nomePetFormatado = primeiroNomePet.charAt(0).toUpperCase() + primeiroNomePet.slice(1).toLowerCase();
    const dataFormatada = new Date(servico.data + "T00:00:00").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    const isUltimoServico = servico.numero.split("/")[0] === servico.numero.split("/")[1];
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

    // Criar link dinâmico para evitar bloqueio
    const link = document.createElement("a");
    link.href = whatsappUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gerar mensagem WhatsApp para agendamento simples
  const gerarMensagemWhatsAppSimples = (agendamento: Agendamento) => {
    const primeiroNomeCliente = agendamento.cliente.split(" ")[0];
    const nomeClienteFormatado =
      primeiroNomeCliente.charAt(0).toUpperCase() + primeiroNomeCliente.slice(1).toLowerCase();
    const primeiroNomePet = agendamento.pet.split(" ")[0];
    const nomePetFormatado = primeiroNomePet.charAt(0).toUpperCase() + primeiroNomePet.slice(1).toLowerCase();
    const dataFormatada = new Date(agendamento.data + "T00:00:00").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    let mensagem = `Oii, ${nomeClienteFormatado}! Passando apenas para confirmar o agendamento de ${nomePetFormatado} com a gente.\n`;
    mensagem += `*Dia:* ${dataFormatada}\n`;
    mensagem += `*Horario:* ${agendamento.horario}\n`;
    mensagem += `*Serviço:* ${agendamento.servico}\n`;

    if (agendamento.taxiDog === "Sim") {
      mensagem += `\n⚠️ *Lembrete:* Você optou pelo Taxi Dog.\n`;
    }

    if (empresaConfig.bordao) {
      mensagem += `\n*${empresaConfig.bordao}*`;
    }

    const numeroWhatsApp = agendamento.whatsapp.replace(/\D/g, "");
    const urlWhatsApp = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;

    // Criar link dinâmico para evitar bloqueio
    const link = document.createElement("a");
    link.href = urlWhatsApp;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========== FUNÇÕES AUXILIARES PARA FORMATAÇÃO ==========

  // Capitalizar primeira letra de cada palavra
  const capitalizarPrimeiraLetra = (texto: string): string => {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  };

  // Obter apenas o primeiro nome
  const obterPrimeiroNome = (nomeCompleto: string): string => {
    if (!nomeCompleto) return "";
    const primeiroNome = nomeCompleto.trim().split(" ")[0];
    return capitalizarPrimeiraLetra(primeiroNome);
  };

  // Verificar se é o último serviço do pacote
  const ehUltimoServicoPacote = (numeroServico: string): boolean => {
    if (!numeroServico || !numeroServico.includes("/")) return false;
    const [atual, total] = numeroServico.split("/").map((n) => parseInt(n.trim()));
    return atual === total;
  };

  // Formatar número do pacote
  const formatarNumeroPacote = (numeroServico?: string): string => {
    if (!numeroServico || numeroServico.trim() === "") {
      return "Sem pacote.";
    }
    return numeroServico;
  };

  // Gerar URL do WhatsApp sem abrir (para uso em links nativos)
  const gerarUrlWhatsAppSimples = (agendamento: Agendamento): string => {
    const primeiroNome = obterPrimeiroNome(agendamento.cliente);
    const nomePet = capitalizarPrimeiraLetra(agendamento.pet);
    const nomeServico = capitalizarPrimeiraLetra(agendamento.servico);
    const dataFormatada = new Date(agendamento.data + "T00:00:00").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    const horarioFormatado = agendamento.horario.substring(0, 5); // HH:MM
    const numeroPacote = formatarNumeroPacote(agendamento.numeroServicoPacote);
    const taxiDog = agendamento.taxiDog === "Sim" ? "Sim" : "Não";

    let mensagem = `Oii, ${primeiroNome}! Passando apenas para confirmar o agendamento de ${nomePet} com a gente.\n\n`;
    mensagem += `*Dia:* ${dataFormatada}\n`;
    mensagem += `*Horario:* ${horarioFormatado}\n`;
    mensagem += `*Serviço:* ${nomeServico}\n`;
    mensagem += `*N° do Pacote:* ${numeroPacote}\n`;
    mensagem += `*Taxi Dog:* ${taxiDog}\n`;

    // Se for último serviço do pacote, adicionar mensagem especial
    if (agendamento.numeroServicoPacote && ehUltimoServicoPacote(agendamento.numeroServicoPacote)) {
      mensagem += `\nPercebi que este será o último banho do seu pacote. Que tal já garantirmos a renovação no próximo agendamento e mantermos os banhos sequenciais?\n`;
    }

    if (empresaConfig.bordao) {
      mensagem += `\n*${empresaConfig.bordao}*`;
    }

    const numeroWhatsApp = agendamento.whatsapp.replace(/\D/g, "");
    return `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
  };

  // Gerar URL do WhatsApp para pacote sem abrir (para uso em links nativos)
  const gerarUrlWhatsAppPacote = (pacote: AgendamentoPacote, servico: ServicoAgendamento): string => {
    const primeiroNome = obterPrimeiroNome(pacote.nomeCliente);
    const nomePet = capitalizarPrimeiraLetra(pacote.nomePet);
    const nomePacote = capitalizarPrimeiraLetra(pacote.nomePacote);
    const dataFormatada = new Date(servico.data + "T00:00:00").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    const horarioFormatado = servico.horarioInicio.substring(0, 5); // HH:MM
    const numeroPacote = servico.numero; // Ex: "03/04"
    const taxiDog = pacote.taxiDog === "Sim" ? "Sim" : "Não";

    let mensagem = `Oii, ${primeiroNome}! Passando apenas para confirmar o agendamento de ${nomePet} com a gente.\n\n`;
    mensagem += `*Dia:* ${dataFormatada}\n`;
    mensagem += `*Horario:* ${horarioFormatado}\n`;
    mensagem += `*Serviço:* ${nomePacote}\n`;
    mensagem += `*N° do Pacote:* ${numeroPacote}\n`;
    mensagem += `*Taxi Dog:* ${taxiDog}\n`;

    // Se for último serviço do pacote, adicionar mensagem especial
    if (ehUltimoServicoPacote(numeroPacote)) {
      mensagem += `\nPercebi que este será o último banho do seu pacote. Que tal já garantirmos a renovação no próximo agendamento e mantermos os banhos sequenciais?\n`;
    }

    if (empresaConfig.bordao) {
      mensagem += `\n*${empresaConfig.bordao}*`;
    }

    return `https://wa.me/55${pacote.whatsapp}?text=${encodeURIComponent(mensagem)}`;
  };

  // Copiar link do WhatsApp para clipboard e mostrar notificação
  const copiarLinkWhatsApp = async (url: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(url);
      toast.success("✅ Link copiado!", {
        description: "Cole no navegador (Ctrl+V) para abrir o WhatsApp",
        duration: 5000,
      });
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast.error("⚠️ Não foi possível copiar", {
        description: "Tente novamente ou copie manualmente",
        duration: 4000,
      });
    }
  };

  // Abrir link do WhatsApp em nova aba
  const abrirWhatsApp = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  // Obter horários do Gantt baseado na config da empresa
  const getHorariosGantt = () => {
    if (empresaConfig.horarioInicio && empresaConfig.horarioFim) {
      const [inicioH] = empresaConfig.horarioInicio.split(":").map(Number);
      const [fimH] = empresaConfig.horarioFim.split(":").map(Number);
      const horarios = [];
      for (let h = inicioH; h <= fimH; h++) {
        horarios.push(`${String(h).padStart(2, "0")}:00`);
      }
      return horarios;
    }
    return horarios;
  };
  const horariosGantt = getHorariosGantt();

  // Obter agendamentos do dia para Gantt
  const getAgendamentosDia = () => {
    const dateStr = selectedDate;
    const agendamentosSimples = agendamentos
      .filter((a) => a.data === dateStr)
      .map((a) => ({
        tipo: "simples" as const,
        horarioInicio: a.horario,
        horarioFim: a.horarioTermino || a.horario,
        cliente: a.cliente,
        pet: a.pet,
        raca: a.raca,
        servico: a.servico,
        pacote: null,
        numeroPacote: null,
        taxiDog: a.taxiDog,
        agendamento: a,
        agendamentoOriginal: a,
      }));
    const agendamentosPacote = agendamentosPacotes.flatMap((p) =>
      p.servicos
        .filter((s) => s.data === dateStr)
        .map((s) => {
          // Montar nome do serviço com extras
          const extras = (s as any).servicosExtras || [];
          const nomesExtras = extras.map((e: any) => e.nome).join(' + ');
          const servicoCompleto = nomesExtras 
            ? `${s.nomeServico} + ${nomesExtras}` 
            : s.nomeServico;
          
          return {
            tipo: "pacote" as const,
            horarioInicio: s.horarioInicio,
            horarioFim: s.horarioTermino,
            cliente: p.nomeCliente,
            pet: p.nomePet,
            raca: p.raca,
            servico: servicoCompleto,
            pacote: p.nomePacote,
            numeroPacote: s.numero,
            taxiDog: p.taxiDog,
            agendamentoPacote: p,
            servicoAgendamento: s,
          };
        }),
    );
    return [...agendamentosSimples, ...agendamentosPacote].sort((a, b) => {
      return a.horarioInicio.localeCompare(b.horarioInicio);
    });
  };
  const agendamentosDia = getAgendamentosDia();

  // Unificar todos os agendamentos (simples + pacotes)
  const unificarAgendamentos = (): AgendamentoUnificado[] => {
    const agendamentosSimples: AgendamentoUnificado[] = agendamentos.map((a) => ({
      id: a.id,
      tipo: "simples" as const,
      data: a.data,
      horarioInicio: a.horario,
      horarioTermino: a.horarioTermino,
      cliente: a.cliente,
      pet: a.pet,
      raca: a.raca,
      servico: a.servico,
      nomePacote: "",
      numeroPacote: "",
      taxiDog: a.taxiDog || "",
      dataVenda: a.dataVenda,
      whatsapp: a.whatsapp,
      tempoServico: "",
      groomer: a.groomer || "",
      agendamentoOriginal: a,
    }));
    const agendamentosPacote: AgendamentoUnificado[] = agendamentosPacotes.flatMap((p) =>
      p.servicos.map((s) => {
        // Montar nome do serviço com extras
        const extras = (s as any).servicosExtras || [];
        const nomesExtras = extras.map((e: any) => e.nome).join(' + ');
        const servicoCompleto = nomesExtras 
          ? `${s.nomeServico} + ${nomesExtras}` 
          : s.nomeServico;
        
        return {
          id: `${p.id}-${s.numero}`,
          tipo: "pacote" as const,
          data: s.data,
          horarioInicio: s.horarioInicio,
          horarioTermino: s.horarioTermino,
          cliente: p.nomeCliente,
          pet: p.nomePet,
          raca: p.raca,
          servico: servicoCompleto,
          nomePacote: p.nomePacote,
          numeroPacote: s.numero,
          taxiDog: p.taxiDog,
          dataVenda: p.dataVenda,
          whatsapp: p.whatsapp,
          tempoServico: s.tempoServico,
          groomer: "",
          pacoteOriginal: p,
          servicoOriginal: s,
        };
      }),
    );
    return [...agendamentosSimples, ...agendamentosPacote].sort((a, b) => {
      const dataCompare = a.data.localeCompare(b.data);
      if (dataCompare !== 0) return dataCompare;
      return a.horarioInicio.localeCompare(b.horarioInicio);
    });
  };

  // Aplicar filtros
  const aplicarFiltros = (agendamentos: AgendamentoUnificado[]): AgendamentoUnificado[] => {
    return agendamentos.filter((a) => {
      if (filtrosAplicados.nomePet && !a.pet.toLowerCase().includes(filtrosAplicados.nomePet.toLowerCase())) {
        return false;
      }
      if (
        filtrosAplicados.nomeCliente &&
        !a.cliente.toLowerCase().includes(filtrosAplicados.nomeCliente.toLowerCase())
      ) {
        return false;
      }
      if (filtrosAplicados.dataAgendada && a.data !== filtrosAplicados.dataAgendada) {
        return false;
      }
      if (filtrosAplicados.dataVenda && a.dataVenda !== filtrosAplicados.dataVenda) {
        return false;
      }
      if (
        filtrosAplicados.nomePacote &&
        !a.nomePacote.toLowerCase().includes(filtrosAplicados.nomePacote.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  };

  // Agendamentos filtrados
  const agendamentosUnificados = useMemo(() => unificarAgendamentos(), [agendamentos, agendamentosPacotes]);
  const agendamentosFiltrados = useMemo(
    () => {
      const filtrados = aplicarFiltros(agendamentosUnificados);
      // Ordenação: primeiro por Horário (crescente), depois por Agendamento (decrescente)
      return filtrados.sort((a, b) => {
        // Primeiro critério: Horário (crescente)
        const horarioCompare = a.horarioInicio.localeCompare(b.horarioInicio);
        if (horarioCompare !== 0) return horarioCompare;
        
        // Segundo critério: Data do Agendamento (decrescente)
        return b.data.localeCompare(a.data);
      });
    },
    [agendamentosUnificados, filtrosAplicados],
  );

  // Contador total
  const totalAgendamentos = agendamentosUnificados.length;

  // Buscar
  const handleBuscar = () => {
    setFiltrosAplicados({
      ...filtros,
    });
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({
      nomePet: "",
      nomeCliente: "",
      dataAgendada: "",
      dataVenda: "",
      nomePacote: "",
    });
    setFiltrosAplicados({
      nomePet: "",
      nomeCliente: "",
      dataAgendada: "",
      dataVenda: "",
      nomePacote: "",
    });
  };

  // Handler para gerenciar abertura/fechamento do modal de gerenciamento
  const handleGerenciamentoOpenChange = (open: boolean) => {
    setGerenciamentoOpen(open);
    
    // Se o modal está fechando, limpar todos os filtros
    if (!open) {
      limparFiltros();
    }
  };

  // Abrir edição
  const handleEditarClick = (agendamento: AgendamentoUnificado) => {
    setEditandoAgendamento(agendamento);
    
    // Inicializar serviços extras a partir do agendamento
    if (agendamento.tipo === "pacote" && agendamento.servicoOriginal) {
      const extras = (agendamento.servicoOriginal as any).servicosExtras || [];
      setServicosExtrasEdicao(extras);
      // O serviço principal é o nomeServico sem os extras concatenados
      setServicoPrincipalEdicao(agendamento.servicoOriginal.nomeServico);
    } else if (agendamento.tipo === "simples" && agendamento.agendamentoOriginal) {
      // Para agendamentos simples, verificar se há servicos no campo JSON
      const todosServicos = (agendamento.agendamentoOriginal as any).servicos || [];
      if (todosServicos.length > 1) {
        // O primeiro é o principal, os demais são extras
        setServicoPrincipalEdicao(todosServicos[0]?.nome || agendamento.servico.split(' + ')[0]);
        setServicosExtrasEdicao(todosServicos.slice(1).map((s: any) => ({
          id: s.id || crypto.randomUUID(),
          nome: s.nome,
          valor: s.valor || 0
        })));
      } else {
        // Sem extras, usar o serviço direto (pode ter sido salvo concatenado)
        const partesServico = agendamento.servico.split(' + ');
        setServicoPrincipalEdicao(partesServico[0]);
        if (partesServico.length > 1) {
          setServicosExtrasEdicao(partesServico.slice(1).map(nome => ({
            id: crypto.randomUUID(),
            nome: nome.trim(),
            valor: 0
          })));
        } else {
          setServicosExtrasEdicao([]);
        }
      }
    } else {
      setServicosExtrasEdicao([]);
      setServicoPrincipalEdicao(agendamento.servico.split(' + ')[0]);
    }
    
    setEditDialogGerenciamento(true);
  };

  // Atualizar agendamento
  const handleAtualizarAgendamento = async () => {
    if (!editandoAgendamento || !user) return;

    try {
      // Montar nome do serviço concatenado (principal + extras)
      const extrasNomes = servicosExtrasEdicao
        .filter(e => e.nome)
        .map(e => e.nome);
      const servicoCompleto = extrasNomes.length > 0
        ? `${servicoPrincipalEdicao} + ${extrasNomes.join(' + ')}`
        : servicoPrincipalEdicao;

      // Montar array de serviços para persistência
      const servicoPrincipalObj = servicos.find(s => s.nome === servicoPrincipalEdicao);
      const todosServicosArray = [
        { id: servicoPrincipalObj?.id || '', nome: servicoPrincipalEdicao, valor: servicoPrincipalObj?.valor || 0 },
        ...servicosExtrasEdicao.filter(e => e.nome)
      ];

      if (editandoAgendamento.tipo === "simples" && editandoAgendamento.agendamentoOriginal) {
        const { error } = await supabase
          .from("agendamentos")
          .update({
            cliente: editandoAgendamento.cliente,
            pet: editandoAgendamento.pet,
            raca: editandoAgendamento.raca,
            whatsapp: editandoAgendamento.whatsapp,
            servico: servicoCompleto,
            servicos: todosServicosArray,
            data: editandoAgendamento.data,
            horario: editandoAgendamento.horarioInicio,
            data_venda: editandoAgendamento.dataVenda,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editandoAgendamento.agendamentoOriginal.id);

        if (error) throw error;

        toast.success("Agendamento atualizado com sucesso!");
        await loadAgendamentos();
      } else if (
        editandoAgendamento.tipo === "pacote" &&
        editandoAgendamento.pacoteOriginal &&
        editandoAgendamento.servicoOriginal
      ) {
        const updatedServicos = editandoAgendamento.pacoteOriginal.servicos.map((s) =>
          s.numero === editandoAgendamento.servicoOriginal!.numero
            ? {
                ...s,
                nomeServico: servicoPrincipalEdicao,
                servicosExtras: servicosExtrasEdicao.filter(e => e.nome),
                data: editandoAgendamento.data,
                horarioInicio: editandoAgendamento.horarioInicio,
                tempoServico: editandoAgendamento.tempoServico,
                horarioTermino: calcularHorarioTermino(
                  editandoAgendamento.horarioInicio,
                  editandoAgendamento.tempoServico,
                ),
              }
            : s,
        );

        // Também atualizar whatsapp no pacote se foi alterado
        const { error } = await supabase
          .from("agendamentos_pacotes")
          .update({
            servicos: updatedServicos as any,
            whatsapp: editandoAgendamento.whatsapp,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editandoAgendamento.pacoteOriginal.id);

        if (error) throw error;

        toast.success("Agendamento atualizado com sucesso!");
        await loadAgendamentosPacotes();
      }

      setEditDialogGerenciamento(false);
      setEditandoAgendamento(null);
      setServicosExtrasEdicao([]);
      setServicoPrincipalEdicao("");
    } catch (error) {
      console.error("Erro ao atualizar agendamento:", error);
      toast.error("Erro ao atualizar agendamento");
    }
  };

  // Excluir agendamento
  const handleExcluirAgendamento = (agendamento: AgendamentoUnificado) => {
    setAgendamentoParaDeletar(agendamento);
    setDeleteDialogOpen(true);
  };
  const confirmarExclusao = async () => {
    if (!agendamentoParaDeletar || !user) return;

    try {
      if (agendamentoParaDeletar.tipo === "simples" && agendamentoParaDeletar.agendamentoOriginal) {
        const { error } = await supabase
          .from("agendamentos")
          .delete()
          .eq("id", agendamentoParaDeletar.agendamentoOriginal.id);

        if (error) throw error;

        toast.success("Agendamento excluído com sucesso!");
        await loadAgendamentos();
      } else if (
        agendamentoParaDeletar.tipo === "pacote" &&
        agendamentoParaDeletar.pacoteOriginal &&
        agendamentoParaDeletar.servicoOriginal
      ) {
        // Remove specific service from package or delete entire package if it's the last service
        const servicosAtualizados = agendamentoParaDeletar.pacoteOriginal.servicos.filter(
          (s) => s.numero !== agendamentoParaDeletar.servicoOriginal!.numero,
        );

        if (servicosAtualizados.length === 0) {
          // Delete entire package if no services left
          const { error } = await supabase
            .from("agendamentos_pacotes")
            .delete()
            .eq("id", agendamentoParaDeletar.pacoteOriginal.id);

          if (error) throw error;
        } else {
          // Update package with remaining services
          const { error } = await supabase
            .from("agendamentos_pacotes")
            .update({
              servicos: servicosAtualizados as any,
              updated_at: new Date().toISOString(),
            })
            .eq("id", agendamentoParaDeletar.pacoteOriginal.id);

          if (error) throw error;
        }

        toast.success("Agendamento excluído com sucesso!");
        await loadAgendamentosPacotes();
      }

      setDeleteDialogOpen(false);
      setAgendamentoParaDeletar(null);
      setEditDialogGerenciamento(false);
      setEditandoAgendamento(null);
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error("Erro ao excluir agendamento");
    }
  };
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
                <DialogDescription className="text-xs">Preencha os dados do agendamento</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1 relative">
                    <Label htmlFor="cliente" className="text-xs">
                      Cliente *
                    </Label>
                    <Input
                      id="cliente"
                      value={simpleClienteSearch}
                      onChange={(e) => setSimpleClienteSearch(e.target.value)}
                      placeholder="Digite o nome do cliente..."
                      className="h-8 text-xs"
                    />
                    {simpleFilteredClientes.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {simpleFilteredClientes.map((nome, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 hover:bg-accent cursor-pointer text-xs"
                            onClick={() => handleSimpleClienteSelect(nome)}
                          >
                            {nome}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <Label htmlFor="pet" className="text-xs">
                      Pet *
                    </Label>
                    <Input
                      id="pet"
                      value={simplePetSearch}
                      onChange={(e) => setSimplePetSearch(e.target.value)}
                      placeholder="Digite o nome do pet..."
                      className="h-8 text-xs"
                    />
                    {simpleFilteredPets.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {simpleFilteredPets.map((nome, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 hover:bg-accent cursor-pointer text-xs"
                            onClick={() => handleSimplePetSelect(nome)}
                          >
                            {nome}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="raca" className="text-xs">
                      Raça *
                    </Label>
                    <Select
                      value={formData.raca}
                      onValueChange={handleSimpleRacaSelect}
                      disabled={simpleAvailableRacas.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue
                          placeholder={
                            simpleAvailableRacas.length === 0 ? "Selecione cliente e pet primeiro" : "Selecione a raça"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {simpleAvailableRacas.map((raca, idx) => (
                          <SelectItem key={idx} value={raca} className="text-xs">
                            {raca}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="whatsapp" className="text-xs">
                      WhatsApp
                    </Label>
                    <Input
                      id="whatsapp"
                      value={
                        formData.whatsapp
                          ? `(${formData.whatsapp.slice(0, 2)}) ${formData.whatsapp.slice(2, 7)}-${formData.whatsapp.slice(7)}`
                          : ""
                      }
                      readOnly
                      className="h-8 text-xs bg-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="data" className="text-xs">
                      Data do Agendamento *
                    </Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          data: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="horario" className="text-xs">
                      Horário de Início do Serviço *
                    </Label>
                    <TimeInput
                      value={formData.horario}
                      onChange={(value) => {
                        const horarioTermino = calcularHorarioTermino(value, formData.tempoServico);
                        setFormData({
                          ...formData,
                          horario: value,
                          horarioTermino,
                        });
                      }}
                      placeholder="00:00"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Tempo de Serviço e Serviço (Horário Término oculto sem ocupar espaço) */}
                <div className="grid grid-cols-[28%_72%] gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="tempoServico" className="text-xs">
                      Tempo de Serviço *
                    </Label>
                    <Input
                      id="tempoServico"
                      type="text"
                      value={formData.tempoServico}
                      onChange={(event) => {
                        // Captura o valor digitado no campo
                        let valorDigitado = event.target.value;

                        // Remove todos os caracteres que não sejam números
                        valorDigitado = valorDigitado.replace(/\D/g, "");

                        // Limita o número total de dígitos a 3 (por exemplo: 130 -> 130, 1234 -> 123)
                        if (valorDigitado.length > 3) {
                          valorDigitado = valorDigitado.slice(0, 3);
                        }

                        // Aplica a máscara automática no formato h:mm
                        if (valorDigitado.length === 0) {
                          valorDigitado = "";
                        } else if (valorDigitado.length === 1) {
                          // Exemplo: "1" continua "1"
                          valorDigitado = valorDigitado;
                        } else if (valorDigitado.length === 2) {
                          // Exemplo: "12" vira "1:2"
                          valorDigitado = `${valorDigitado[0]}:${valorDigitado[1]}`;
                        } else if (valorDigitado.length === 3) {
                          // Exemplo: "130" vira "1:30"
                          valorDigitado = `${valorDigitado[0]}:${valorDigitado.slice(1, 3)}`;
                        }

                        // Impede que os minutos sejam maiores que 59
                        const partes = valorDigitado.split(":");
                        if (partes.length === 2 && parseInt(partes[1], 10) > 59) {
                          partes[1] = "59";
                          valorDigitado = `${partes[0]}:${partes[1]}`;
                        }

                        // Atualiza o estado do formulário com o novo valor
                        setFormData({
                          cliente: formData.cliente,
                          pet: formData.pet,
                          raca: formData.raca,
                          whatsapp: formData.whatsapp,
                          data: formData.data,
                          horario: formData.horario,
                          tempoServico: valorDigitado,
                          horarioTermino: formData.horarioTermino,
                          servico: formData.servico,
                          numeroServicoPacote: formData.numeroServicoPacote,
                          groomer: formData.groomer,
                          dataVenda: formData.dataVenda,
                          taxiDog: formData.taxiDog,
                        });
                      }}
                      onBlur={(event) => {
                        // Valida o formato final do campo quando o usuário sai dele
                        const regexFinal = /^[0-9]{1}:[0-5][0-9]$/;
                        if (event.target.value && !regexFinal.test(event.target.value)) {
                          alert("Formato inválido! Use o formato h:mm (exemplo: 1:30)");
                        }
                      }}
                      placeholder="0:00"
                      className="h-8 text-xs"
                      required
                      maxLength={4}
                      pattern="[0-9]{1}:[0-5][0-9]"
                    />
                  </div>

                  {/* Campo oculto fora do grid para não ocupar espaço */}
                  <div className="hidden">
                    <Input
                      id="horarioTermino"
                      value={formData.horarioTermino}
                      readOnly
                      className="h-8 text-xs bg-secondary cursor-not-allowed"
                      placeholder="--:--"
                    />
                  </div>

                  <div className="space-y-1 col-span-1">
                    <Label className="text-xs">Serviço(s) *</Label>
                    <div className="space-y-2">
                      {servicosSelecionadosSimples.map((servicoItem, index) => (
                        <div key={servicoItem.instanceId} className="flex items-center gap-1">
                          <Popover 
                            open={openServicoComboboxIndex === index} 
                            onOpenChange={(open) => setOpenServicoComboboxIndex(open ? index : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openServicoComboboxIndex === index}
                                className="h-8 flex-1 justify-between text-xs font-normal"
                              >
                                {servicoItem.nome || "Selecione um serviço"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 bg-background z-50">
                              <Command>
                                <CommandInput placeholder="Buscar serviço..." className="h-9 text-xs" />
                                <CommandEmpty className="text-xs py-6 text-center text-muted-foreground">
                                  Nenhum serviço encontrado.
                                </CommandEmpty>
                                {servicos.length > 0 && (
                                  <CommandGroup heading="Serviços" className="text-xs">
                                    {servicos.map((servico) => (
                                      <CommandItem
                                        key={`servico-${servico.id}`}
                                        value={servico.nome}
                                        onSelect={(currentValue) => {
                                          atualizarServicoSimples(servicoItem.instanceId, currentValue);
                                        }}
                                        className="text-xs"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            servicoItem.nome === servico.nome ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {servico.nome}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {/* Botão X para remover (vermelho, discreto) */}
                          {servicosSelecionadosSimples.length > 1 && (
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removerServicoSimples(servicoItem.instanceId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {/* Botão "+ Serviço" ao lado do último campo */}
                          {index === servicosSelecionadosSimples.length - 1 && servicoItem.nome && (
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                              onClick={adicionarServicoSimples}
                            >
                              + Serviço
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>


                <div className="space-y-1">
                  <Label htmlFor="groomer" className="text-xs">
                    Groomer
                  </Label>
                  <Select
                    value={formData.groomer}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        groomer: value,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o groomer" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {groomers.length === 0 ? (
                        <SelectItem value="none" disabled className="text-xs">
                          Nenhum groomer cadastrado
                        </SelectItem>
                      ) : (
                        groomers.map((g) => (
                          <SelectItem key={g.id} value={g.nome} className="text-xs">
                            {g.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="dataVenda" className="text-xs">
                      Data da Venda do Serviço *
                    </Label>
                    <Input
                      id="dataVenda"
                      type="date"
                      value={formData.dataVenda}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dataVenda: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="taxiDog" className="text-xs">
                      Taxi Dog *
                    </Label>
                    <Select
                      value={formData.taxiDog}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          taxiDog: value,
                        })
                      }
                      required
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Sim" className="text-xs">
                          Sim
                        </SelectItem>
                        <SelectItem value="Não" className="text-xs">
                          Não
                        </SelectItem>
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
                    <Label htmlFor="nomeCliente" className="text-xs">
                      Nome do Cliente *
                    </Label>
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
                    <Label htmlFor="nomePet" className="text-xs">
                      Nome do Pet *
                    </Label>
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
                    <Label htmlFor="raca" className="text-xs">
                      Raça *
                    </Label>
                    <Select
                      value={pacoteFormData.raca}
                      onValueChange={handleRacaSelect}
                      disabled={availableRacas.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue
                          placeholder={
                            availableRacas.length === 0 ? "Selecione cliente e pet primeiro" : "Selecione a raça"
                          }
                        />
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
                    <Label htmlFor="whatsapp" className="text-xs">
                      WhatsApp
                    </Label>
                    <Input
                      id="whatsapp"
                      value={
                        pacoteFormData.whatsapp
                          ? `(${pacoteFormData.whatsapp.slice(0, 2)}) ${pacoteFormData.whatsapp.slice(2, 7)}-${pacoteFormData.whatsapp.slice(7)}`
                          : ""
                      }
                      readOnly
                      className="h-8 text-xs bg-secondary"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="taxiDog" className="text-xs">
                      Taxi Dog? *
                    </Label>
                    <Select
                      value={pacoteFormData.taxiDog}
                      onValueChange={(value) =>
                        setPacoteFormData({
                          ...pacoteFormData,
                          taxiDog: value,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim" className="text-xs">
                          Sim
                        </SelectItem>
                        <SelectItem value="Não" className="text-xs">
                          Não
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nomePacote" className="text-xs">
                    Nome do Pacote de Serviço *
                  </Label>
                  <Select value={pacoteFormData.nomePacote} onValueChange={handlePacoteSelect}>
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

                <div className="space-y-1">
                  <Label htmlFor="dataVendaPacote" className="text-xs">
                    Data da Venda do Serviço *
                  </Label>
                  <Input
                    id="dataVendaPacote"
                    type="date"
                    value={pacoteFormData.dataVenda}
                    onChange={(e) =>
                      setPacoteFormData({
                        ...pacoteFormData,
                        dataVenda: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                    required
                  />
                </div>

                {servicosAgendamento.length > 0 && (
                  <div className="space-y-2 border rounded-md p-3 bg-secondary/20">
                    <Label className="text-xs font-semibold">Agendamentos dos Serviços do Pacote</Label>

                    {/* Header com títulos das colunas */}
                    <div className="flex gap-2 items-center pb-1">
                      <div className="w-12"></div>
                      <div className="w-14"></div>
                      <div className="flex-1 min-w-[100px]"></div>
                      <div className="w-32">
                        <Label className="text-muted-foreground text-[[10px]] font-bold px-px mx-0 my-px py-0">
                          Dia Agendamento
                        </Label>
                      </div>
                      <div className="w-20">
                        <Label className="text-muted-foreground font-bold text-xs">Hora Início</Label>
                      </div>
                      <div className="w-20 px-[13px]">
                        <Label className="text-muted-foreground font-bold text-xs text-right my-0 mx-0 px-0">
                          Tempo de Serviço *
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {servicosAgendamento.map((servico, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveServico(index, "up")}
                              disabled={index === 0}
                              className="h-6 w-6 p-0"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveServico(index, "down")}
                              disabled={index === servicosAgendamento.length - 1}
                              className="h-6 w-6 p-0"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="w-14 py-[16px]">
                            <Label className="text-xs text-primary font-semibold">{servico.numero}</Label>
                          </div>

                          <div className="flex-1 min-w-[100px] py-[16px] px-0 mx-0 my-0">
                            <Label className="text-xs text-left py-0 my-px mx-[3px] px-0">{servico.nomeServico}</Label>
                          </div>

                          <div className="w-32">
                            <Input
                              type="date"
                              value={servico.data}
                              onChange={(e) => handleServicoAgendamentoChange(index, "data", e.target.value)}
                              className="h-8 text-xs py-0 px-[11px] my-[9px]"
                            />
                          </div>

                          <div className="w-20 my-[9px]">
                            <TimeInput
                              value={servico.horarioInicio}
                              onChange={(value) => handleServicoAgendamentoChange(index, "horarioInicio", value)}
                              placeholder="00:00"
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="w-20 my-[9px]">
                            <TimeInput
                              value={servico.tempoServico}
                              onChange={(value) => handleServicoAgendamentoChange(index, "tempoServico", value)}
                              placeholder="0:00"
                              className="h-8 text-xs"
                              allowSingleDigitHour={true}
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

          <Dialog open={gerenciamentoOpen} onOpenChange={handleGerenciamentoOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs" variant="secondary">
                <Settings className="h-3 w-3" />
                Gerenciamento de Agendamentos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Gerenciamento de Agendamento</DialogTitle>
                <p className="text-[10px] text-muted-foreground mt-1 my-0 px-0 py-[2px] mx-0">
                  Houve {totalAgendamentos} agendamentos realizados.
                </p>
              </DialogHeader>

              {/* Filtros */}
              <div className="space-y-3 border-b py-0 my-0">
                <div className="grid grid-cols-5 gap-2 mx-0 my-0 py-0">
                  <Input
                    placeholder="Buscar por Nome do Pet"
                    value={filtros.nomePet}
                    onChange={(e) =>
                      setFiltros({
                        ...filtros,
                        nomePet: e.target.value,
                      })
                    }
                    className="h-8 text-xs my-[28px]"
                  />
                  <Input
                    placeholder="Buscar por Nome do Cliente"
                    value={filtros.nomeCliente}
                    onChange={(e) =>
                      setFiltros({
                        ...filtros,
                        nomeCliente: e.target.value,
                      })
                    }
                    className="h-8 text-xs py-0 my-[28px]"
                  />
                  <div className="space-y-1 py-0">
                    <Label htmlFor="dataAgendada" className="text-[10px] font-medium">
                      Buscar por Data Agendada
                    </Label>
                    <Input
                      id="dataAgendada"
                      type="date"
                      value={filtros.dataAgendada}
                      onChange={(e) =>
                        setFiltros({
                          ...filtros,
                          dataAgendada: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1 my-0 px-0 py-0">
                    <Label htmlFor="dataVenda" className="text-[10px] font-medium">
                      Buscar por Data da Venda do Serviço
                    </Label>
                    <Input
                      id="dataVenda"
                      type="date"
                      value={filtros.dataVenda}
                      onChange={(e) =>
                        setFiltros({
                          ...filtros,
                          dataVenda: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <Input
                    placeholder="Nome do Pacote"
                    value={filtros.nomePacote}
                    onChange={(e) =>
                      setFiltros({
                        ...filtros,
                        nomePacote: e.target.value,
                      })
                    }
                    className="h-8 text-xs my-[28px]"
                  />
                </div>
                <div className="flex gap-2 py-0 my-0">
                  <Button onClick={handleBuscar} className="h-8 text-xs">
                    Buscar
                  </Button>
                  <Button onClick={limparFiltros} variant="outline" className="h-8 text-xs">
                    Limpar Filtros
                  </Button>
                </div>
              </div>

              {/* Tabela */}
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-[10px] p-1.5 h-8">Agendamento</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Horário</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Término</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Tutor</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Nome Pet</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Raça</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Serviço</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Pacote</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">N° Pacote</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Taxi Dog</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Data da Venda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendamentosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-8">
                          Nenhum agendamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      agendamentosFiltrados.map((agendamento) => (
                        <TableRow
                          key={agendamento.id}
                          className="cursor-pointer hover:bg-cyan-500/20"
                          onClick={() => handleEditarClick(agendamento)}
                        >
                          <TableCell className="text-[10px] p-1.5">
                            {agendamento.data
                              ? new Date(agendamento.data + "T00:00:00").toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] p-1.5">
                            {agendamento.horarioInicio ? agendamento.horarioInicio.substring(0, 5) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] p-1.5">
                            {agendamento.horarioTermino ? agendamento.horarioTermino.substring(0, 5) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.cliente || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.pet || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.raca || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.servico || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.nomePacote || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.numeroPacote || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.taxiDog || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">
                            {agendamento.dataVenda
                              ? new Date(agendamento.dataVenda + "T00:00:00").toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog de Edição */}
          <Dialog open={editDialogGerenciamento} onOpenChange={setEditDialogGerenciamento}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Agendamento</DialogTitle>
                <DialogDescription className="text-xs">
                  {editandoAgendamento?.tipo === "simples" ? "Agendamento Simples" : "Agendamento de Pacote"}
                </DialogDescription>
              </DialogHeader>

              {editandoAgendamento && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data do Agendamento</Label>
                      <Input
                        type="date"
                        value={editandoAgendamento.data}
                        onChange={(e) =>
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            data: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Horário do Agendamento</Label>
                      <TimeInput
                        value={editandoAgendamento.horarioInicio}
                        onChange={(value) => {
                          const horarioTermino = calcularHorarioTermino(value, editandoAgendamento.tempoServico);
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            horarioInicio: value,
                            horarioTermino,
                          });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Tempo de Serviço *</Label>
                      <TimeInput
                        value={editandoAgendamento.tempoServico}
                        onChange={(value) => {
                          const horarioTermino = calcularHorarioTermino(editandoAgendamento.horarioInicio, value);
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            tempoServico: value,
                            horarioTermino,
                          });
                        }}
                        placeholder="0:00"
                        className="h-8 text-xs"
                        allowSingleDigitHour={true}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Horário de Término</Label>
                      <Input
                        value={editandoAgendamento.horarioTermino || "--:--"}
                        readOnly
                        className="h-8 text-xs bg-secondary cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do Cliente</Label>
                      <Input
                        value={editandoAgendamento.cliente}
                        onChange={(e) =>
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            cliente: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do Pet</Label>
                      <Input
                        value={editandoAgendamento.pet}
                        onChange={(e) =>
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            pet: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Raça</Label>
                      <Input
                        value={editandoAgendamento.raca}
                        onChange={(e) =>
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            raca: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input
                        value={editandoAgendamento.whatsapp}
                        onChange={(e) =>
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            whatsapp: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Serviço Principal - Dropdown Pesquisável */}
                  <div className="space-y-1">
                    <Label className="text-xs">Serviço</Label>
                    <div className="flex gap-2">
                      <Popover open={openServicoEdicao} onOpenChange={setOpenServicoEdicao}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openServicoEdicao}
                            className="flex-1 h-8 text-xs justify-between"
                          >
                            {servicoPrincipalEdicao || "Selecione o serviço..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 z-50 bg-popover">
                          <Command>
                            <CommandInput placeholder="Buscar serviço..." className="h-9" />
                            <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                              {servicos.map((s) => (
                                <CommandItem
                                  key={s.id}
                                  value={s.nome}
                                  onSelect={() => {
                                    setServicoPrincipalEdicao(s.nome);
                                    setOpenServicoEdicao(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      servicoPrincipalEdicao === s.nome ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {s.nome} - R$ {s.valor?.toFixed(2)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Botão + Serviço */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs whitespace-nowrap"
                        onClick={() => {
                          setServicosExtrasEdicao([
                            ...servicosExtrasEdicao,
                            { id: crypto.randomUUID(), nome: "", valor: 0 }
                          ]);
                        }}
                      >
                        + Serviço
                      </Button>
                    </div>
                  </div>

                  {/* Serviços Extras */}
                  {servicosExtrasEdicao.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Serviços Extras</Label>
                      {servicosExtrasEdicao.map((extra, index) => (
                        <div key={extra.id} className="flex gap-2 items-center">
                          <ServicoExtraCombobox
                            extra={extra}
                            index={index}
                            servicos={servicos}
                            onSelect={(selectedServico) => {
                              const novosExtras = [...servicosExtrasEdicao];
                              novosExtras[index] = { 
                                id: selectedServico.id, 
                                nome: selectedServico.nome, 
                                valor: selectedServico.valor 
                              };
                              setServicosExtrasEdicao(novosExtras);
                            }}
                          />
                          
                          {/* Botão Remover */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              setServicosExtrasEdicao(servicosExtrasEdicao.filter((_, i) => i !== index));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {editandoAgendamento.tipo === "simples" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Groomer</Label>
                      <Select
                        value={editandoAgendamento.groomer}
                        onValueChange={(value) =>
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            groomer: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecione o groomer" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {groomers.length === 0 ? (
                            <SelectItem value="none" disabled className="text-xs">
                              Nenhum groomer cadastrado
                            </SelectItem>
                          ) : (
                            groomers.map((g) => (
                              <SelectItem key={g.id} value={g.nome} className="text-xs">
                                {g.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {editandoAgendamento.tipo === "pacote" && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome do Pacote</Label>
                        <Input
                          value={editandoAgendamento.nomePacote}
                          onChange={(e) =>
                            setEditandoAgendamento({
                              ...editandoAgendamento,
                              nomePacote: e.target.value,
                            })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">N° do Serviço do Pacote</Label>
                          <Input
                            value={editandoAgendamento.numeroPacote}
                            readOnly
                            className="h-8 text-xs bg-secondary"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Taxi Dog</Label>
                          <Select
                            value={editandoAgendamento.taxiDog}
                            onValueChange={(value) =>
                              setEditandoAgendamento({
                                ...editandoAgendamento,
                                taxiDog: value,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="Sim" className="text-xs">
                                Sim
                              </SelectItem>
                              <SelectItem value="Não" className="text-xs">
                                Não
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}

                  {editandoAgendamento.tipo === "simples" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Data da Venda</Label>
                        <Input
                          type="date"
                          value={editandoAgendamento.dataVenda}
                          onChange={(e) =>
                            setEditandoAgendamento({
                              ...editandoAgendamento,
                              dataVenda: e.target.value,
                            })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Taxi Dog *</Label>
                        <Select
                          value={editandoAgendamento.taxiDog}
                          onValueChange={(value) =>
                            setEditandoAgendamento({
                              ...editandoAgendamento,
                              taxiDog: value,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="Sim" className="text-xs">
                              Sim
                            </SelectItem>
                            <SelectItem value="Não" className="text-xs">
                              Não
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {editandoAgendamento.tipo === "pacote" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Data da Venda</Label>
                      <Input
                        type="date"
                        value={editandoAgendamento.dataVenda}
                        onChange={(e) =>
                          setEditandoAgendamento({
                            ...editandoAgendamento,
                            dataVenda: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  <div className="flex justify-between gap-2 pt-4">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleExcluirAgendamento(editandoAgendamento)}
                      className="h-8 text-xs gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir Agendamento
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditDialogGerenciamento(false);
                          setEditandoAgendamento(null);
                        }}
                        className="h-8 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleAtualizarAgendamento} className="h-8 text-xs">
                        Atualizar Agendamento
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog de Confirmação de Exclusão */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setAgendamentoParaDeletar(null);
                  }}
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmarExclusao}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="py-2">
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
                  variant={
                    selectedDate === formatDateForInput(new Date()) && viewMode === "dia" ? "default" : "outline"
                  }
                  onClick={() => {
                    setViewMode("dia");
                    const today = formatDateForInput(new Date());
                    setSelectedDate(today);
                    setCalendarDate(new Date());
                  }}
                  className="h-7 text-xs"
                >
                  Hoje
                </Button>
                {viewMode === "dia" && (
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={selectedDate !== formatDateForInput(new Date()) ? "default" : "outline"}
                        className="h-7 text-xs gap-2"
                      >
                        <CalendarIcon className="h-3 w-3" />
                        {format(calendarDate, "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={calendarDate}
                        onSelect={(date) => {
                          if (date) {
                            setCalendarDate(date);
                            setSelectedDate(formatDateForInput(date));
                            setShowCalendar(false);
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {viewMode === "semana" ? (
                <>
                  <CardTitle className="text-base">Agenda Semanal</CardTitle>
                  <CardDescription className="text-xs">
                    Semana de{" "}
                    {weekDates[0].toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                    })}{" "}
                    a{" "}
                    {weekDates[6].toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                    })}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">
                    Houve {contarAgendamentos()} agendamentos realizados nesta semana.
                  </p>
                </>
              ) : (
                <>
                  <CardTitle className="text-base">Agenda do Dia</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
        <CardContent className="py-2">
          {viewMode === "semana" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid gap-2" style={{ gridTemplateColumns: `auto repeat(${filteredWeekDates.length}, 1fr)` }}>
                  <div className="p-2 font-semibold">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {filteredWeekDates.map((date, idx) => (
                    <div key={idx} className="p-2 text-center">
                      <div className="font-semibold text-sm">{diasSemana[date.getDay()]}</div>
                      <div className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {horarios.map((horario) => (
                  <div key={horario} className="grid gap-2 border-t" style={{ gridTemplateColumns: `auto repeat(${filteredWeekDates.length}, 1fr)` }}>
                    <div className="p-2 text-sm font-medium text-muted-foreground">{horario}</div>
                    {filteredWeekDates.map((date, idx) => {
                      const allAgendamentos = getAllAgendamentosForSlot(date, horario);
                      const allPacotes = getAllPacotesForSlot(date, horario);
                      const total = allAgendamentos.length + allPacotes.length;
                      return (
                        <div
                          key={idx}
                          className={`p-1 rounded-lg min-h-[60px] transition-colors ${total > 0 ? "bg-accent/50" : "bg-secondary/30 hover:bg-secondary/50"}`}
                        >
                          <div className="flex flex-wrap gap-1">
                            {allAgendamentos.map((ag, i) => (
                              <div key={`ag-${i}`} className="flex-1 min-w-[45%] p-1 rounded bg-accent text-xs text-[#4590DB] dark:text-accent-foreground">
                                <div className="font-semibold truncate">{ag.pet}</div>
                                <div className="text-[10px] text-[#4590DB]/80 dark:text-accent-foreground/80 truncate">{ag.cliente}</div>
                                <div className="text-[10px] text-[#4590DB]/60 dark:text-accent-foreground/60 truncate">{ag.servico}</div>
                              </div>
                            ))}
                            {allPacotes.map((p, i) => {
                              const servicoDoHorario = p.servicos.find(s => s.data === formatDateForInput(date) && s.horarioInicio === horario);
                              return (
                                <div key={`pk-${i}`} className="flex-1 min-w-[45%] p-1 rounded bg-primary/20 border border-primary/40 text-xs text-[#4590DB] dark:text-primary-foreground">
                                  <div className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    <span className="font-semibold truncate">{p.nomePet}</span>
                                  </div>
                                  <div className="text-[10px] text-[#4590DB]/80 dark:text-primary-foreground/80 truncate">{p.nomeCliente}</div>
                                  <div className="text-[10px] text-[#4590DB]/60 dark:text-primary-foreground/60 truncate">{p.nomePacote}</div>
                                  {servicoDoHorario && (
                                    <div className="text-[10px] text-[#4590DB]/60 dark:text-primary-foreground/60 truncate">{servicoDoHorario.nomeServico}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Gantt Chart */}
              <div className="flex-1 overflow-x-auto">
                <div className="min-w-[400px] relative">
                  {/* Header com horários */}
                  <div className="flex border-b pb-1 mb-2 relative">
                    {/* Linhas verticais de fundo */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({
                        length: (horariosGantt.length - 1) * 2 + 1,
                      }).map((_, i) => (
                        <div key={i} className="flex-1 border-r border-gray-300/30" />
                      ))}
                    </div>

                    {horariosGantt.map((h) => (
                      <div
                        key={h}
                        className="flex-1 text-center text-[10px] font-semibold text-muted-foreground relative z-10"
                      >
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* Barras de agendamentos */}
                  <div
                    className="space-y-0 relative"
                    style={{
                      minHeight: `${Math.max(agendamentosDia.length * 8 + 16, 200)}px`,
                    }}
                  >
                    {/* Linhas verticais estendidas para a área de barras */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({
                        length: (horariosGantt.length - 1) * 2 + 1,
                      }).map((_, i) => (
                        <div key={i} className="flex-1 border-r border-gray-300/30 h-full" />
                      ))}
                    </div>

                    {agendamentosDia.map((agendamento, index) => {
                      const [inicioH, inicioM] = agendamento.horarioInicio.split(":").map(Number);
                      const [fimH, fimM] = agendamento.horarioFim
                        ? agendamento.horarioFim.split(":").map(Number)
                        : [inicioH + 1, inicioM];
                      const [primeiroH] = horariosGantt[0].split(":").map(Number);
                      const [ultimoH] = horariosGantt[horariosGantt.length - 1].split(":").map(Number);
                      const totalMinutos = (ultimoH - primeiroH + 1) * 60;
                      const inicioMinutos = (inicioH - primeiroH) * 60 + inicioM;
                      const duracaoMinutos = (fimH - inicioH) * 60 + (fimM - inicioM);
                      const left = (inicioMinutos / totalMinutos) * 100;
                      const width = (duracaoMinutos / totalMinutos) * 100;
                      return (
                        <div
                          key={index}
                          className="absolute h-4 bg-orange-500 rounded flex items-center justify-center text-[8px] font-semibold text-black relative z-10"
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 5)}%`,
                            top: `${index * 8}px`,
                          }}
                        >
                          {agendamento.horarioInicio.substring(0, 5)} -{" "}
                          {agendamento.horarioFim?.substring(0, 5) || agendamento.horarioInicio.substring(0, 5)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tabela de informações */}
              <div className="flex-1 overflow-visible">
                <table className="w-full text-[10px] border">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      {/* Colunas A e B (Início e Fim) - Mais estreitas */}
                      <th className="p-1.5 border text-left w-[35px]">Início</th>
                      <th className="p-1.5 border text-left w-[35px]">Fim</th>

                      {/* Colunas C, D, E, F (Tutor, Pet, Raça, Serviço) - Deixe o navegador ajustar ou defina larguras maiores */}
                      <th className="p-1.5 border text-left">Tutor</th>
                      <th className="p-1.5 border text-left">Pet</th>
                      <th className="p-1.5 border text-left">Raça</th>
                      <th className="p-1.5 border text-left">Serviço</th>

                      {/* Colunas G, H, I (N° PCT, Taxi Dog, Whatsapp) - Mais estreitas */}
                      <th className="p-1.5 border text-left w-[50px]">N° PCT</th>
                      <th className="p-1.5 border text-left w-[30px]">Taxi Dog</th>
                      <th className="p-1.5 border text-left w-[40px]">Whatsapp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentosDia.map((agendamento, index) => (
                      <tr key={index} className="hover:bg-cyan-500/20 transition-colors">
                        <td className="p-1.5 border">
                          {agendamento.horarioInicio ? agendamento.horarioInicio.substring(0, 5) : "-"}
                        </td>
                        <td className="p-1.5 border">
                          {agendamento.horarioFim ? agendamento.horarioFim.substring(0, 5) : "-"}
                        </td>
                        <td className="p-1.5 border">{agendamento.cliente}</td>
                        <td className="p-1.5 border">{agendamento.pet}</td>
                        <td className="p-1.5 border">{agendamento.raca || "-"}</td>
                        <td className="p-1.5 border">{agendamento.servico}</td>
                        <td className="p-1.5 border">{agendamento.numeroPacote || ""}</td>
                        <td className="p-1.5 border">
                          {agendamento.taxiDog === "Sim" ? "Sim" : agendamento.taxiDog === "Não" ? "Não" : ""}
                        </td>
                        <td className="p-1.5 border">
                          {agendamento.tipo === "pacote" &&
                          agendamento.agendamentoPacote &&
                          agendamento.servicoAgendamento ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) =>
                                abrirWhatsApp(
                                  gerarUrlWhatsAppPacote(agendamento.agendamentoPacote, agendamento.servicoAgendamento),
                                  e,
                                )
                              }
                              className="h-5 w-5 p-0"
                            >
                              <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '12px' }}></i>
                            </Button>
                          ) : agendamento.tipo === "simples" && agendamento.agendamentoOriginal ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) =>
                                abrirWhatsApp(gerarUrlWhatsAppSimples(agendamento.agendamentoOriginal), e)
                              }
                              className="h-5 w-5 p-0"
                            >
                              <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '12px' }}></i>
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dialog de edição */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg">Editar Agendamento</DialogTitle>
                <DialogDescription className="text-xs">Altere as informações do agendamento</DialogDescription>
              </DialogHeader>

              {editingAgendamento && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cliente</Label>
                    <Input value={editingAgendamento.cliente} disabled className="h-8 text-xs bg-secondary" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Pet</Label>
                    <Input value={editingAgendamento.pet} disabled className="h-8 text-xs bg-secondary" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Serviço</Label>
                    <Popover open={openEditServicoCombobox} onOpenChange={setOpenEditServicoCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openEditServicoCombobox}
                          className="h-8 w-full justify-between text-xs font-normal"
                        >
                          {editFormData.servico || "Selecione um serviço"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 bg-background z-50">
                        <Command>
                          <CommandInput placeholder="Buscar serviço..." className="h-9 text-xs" />
                          <CommandEmpty className="text-xs py-6 text-center text-muted-foreground">
                            Nenhum serviço encontrado.
                          </CommandEmpty>
                          {servicos.length > 0 && (
                            <CommandGroup heading="Serviços Individuais" className="text-xs">
                              {servicos.map((servico) => (
                                <CommandItem
                                  key={`servico-${servico.id}`}
                                  value={servico.nome}
                                  onSelect={(currentValue) => {
                                    setEditFormData({
                                      ...editFormData,
                                      servico: currentValue,
                                    });
                                    setOpenEditServicoCombobox(false);
                                  }}
                                  className="text-xs"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      editFormData.servico === servico.nome ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {servico.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {pacotes.length > 0 && (
                            <CommandGroup heading="Pacotes de Serviços" className="text-xs">
                              {pacotes.map((pacote) => (
                                <CommandItem
                                  key={`pacote-${pacote.id}`}
                                  value={pacote.nome}
                                  onSelect={(currentValue) => {
                                    setEditFormData({
                                      ...editFormData,
                                      servico: currentValue,
                                    });
                                    setOpenEditServicoCombobox(false);
                                  }}
                                  className="text-xs"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      editFormData.servico === pacote.nome ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {pacote.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={editFormData.data}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          data: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Horário de Início</Label>
                    <TimeInput
                      value={editFormData.horarioInicio}
                      onChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          horarioInicio: value,
                        })
                      }
                      placeholder="00:00"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tempo de Serviço (horas)</Label>
                    <TimeInput
                      value={editFormData.tempoServico}
                      onChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          tempoServico: value,
                        })
                      }
                      placeholder="00:00"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (editingAgendamento.tipo === "pacote") {
                          const updated = agendamentosPacotes
                            .map((p) => {
                              if (p.id === editingAgendamento.agendamentoPacote.id) {
                                return {
                                  ...p,
                                  servicos: p.servicos.filter(
                                    (s) => s.numero !== editingAgendamento.servicoAgendamento.numero,
                                  ),
                                };
                              }
                              return p;
                            })
                            .filter((p) => p.servicos.length > 0);
                          setAgendamentosPacotes(updated);
                          toast.success("Agendamento excluído!");
                          setEditDialogOpen(false);
                        }
                      }}
                      className="h-8 text-xs"
                    >
                      Excluir Agendamento
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (editingAgendamento.tipo === "pacote") {
                          const horarioTermino = calcularHorarioTermino(
                            editFormData.horarioInicio,
                            editFormData.tempoServico,
                          );
                          const updated = agendamentosPacotes.map((p) => {
                            if (p.id === editingAgendamento.agendamentoPacote.id) {
                              return {
                                ...p,
                                servicos: p.servicos.map((s) => {
                                  if (s.numero === editingAgendamento.servicoAgendamento.numero) {
                                    return {
                                      ...s,
                                      nomeServico: editFormData.servico,
                                      data: editFormData.data,
                                      horarioInicio: editFormData.horarioInicio,
                                      tempoServico: editFormData.tempoServico,
                                      horarioTermino,
                                    };
                                  }
                                  return s;
                                }),
                              };
                            }
                            return p;
                          });
                          setAgendamentosPacotes(updated);
                          toast.success("Agendamento atualizado!");
                          setEditDialogOpen(false);
                        }
                      }}
                      className="h-8 text-xs"
                    >
                      Atualizar Agendamento
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};
export default Agendamentos;

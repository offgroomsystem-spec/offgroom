import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionInfoCard } from "@/components/SubscriptionInfoCard";
import { Search, Loader2 } from "lucide-react";
import { 
  formatCNPJ, 
  formatCEP, 
  validarCNPJ, 
  buscarCEP, 
  UF_BRASIL, 
  REGIMES_TRIBUTARIOS,
  unformatDocument
} from "@/utils/fiscalUtils";

interface DiasSemana {
  segunda: boolean;
  terca: boolean;
  quarta: boolean;
  quinta: boolean;
  sexta: boolean;
  sabado: boolean;
  domingo: boolean;
}

interface EmpresaConfig {
  id?: string;
  bordao: string;
  horarioInicio: string;
  horarioFim: string;
  metaFaturamentoMensal: number;
  diasFuncionamento: DiasSemana;
  // Dados Fiscais
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  regimeTributario: string;
  cepFiscal: string;
  logradouroFiscal: string;
  numeroEnderecoFiscal: string;
  complementoFiscal: string;
  bairroFiscal: string;
  cidadeFiscal: string;
  codigoIbgeCidade: string;
  ufFiscal: string;
  emailFiscal: string;
  codigoCnae: string;
  ambienteFiscal: string;
}

interface Groomer {
  id: string;
  nome: string;
}

const Empresa = () => {
  const { user, ownerId } = useAuth();
  const [formData, setFormData] = useState<EmpresaConfig>({
    bordao: "",
    horarioInicio: "",
    horarioFim: "",
    metaFaturamentoMensal: 10000,
    diasFuncionamento: {
      segunda: true,
      terca: true,
      quarta: true,
      quinta: true,
      sexta: true,
      sabado: false,
      domingo: false,
    },
    // Dados Fiscais
    cnpj: "",
    razaoSocial: "",
    inscricaoEstadual: "",
    inscricaoMunicipal: "",
    regimeTributario: "",
    cepFiscal: "",
    logradouroFiscal: "",
    numeroEnderecoFiscal: "",
    complementoFiscal: "",
    bairroFiscal: "",
    cidadeFiscal: "",
    codigoIbgeCidade: "",
    ufFiscal: "",
    emailFiscal: "",
    codigoCnae: "",
    ambienteFiscal: "homologacao",
  });
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [novoGroomer, setNovoGroomer] = useState("");
  const [editandoGroomer, setEditandoGroomer] = useState<Groomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Fetch empresa config from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchEmpresa = async () => {
      const { data, error } = await supabase
        .from('empresa_config')
        .select('*')
        .eq('user_id', ownerId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching empresa:', error);
      } else if (data) {
        const empresaData = data as any;
        setFormData({
          id: empresaData.id,
          bordao: empresaData.bordao || '',
          horarioInicio: empresaData.horario_inicio || '',
          horarioFim: empresaData.horario_fim || '',
          metaFaturamentoMensal: empresaData.meta_faturamento_mensal || 10000,
          diasFuncionamento: empresaData.dias_funcionamento || {
            segunda: true,
            terca: true,
            quarta: true,
            quinta: true,
            sexta: true,
            sabado: false,
            domingo: false,
          },
          // Dados Fiscais
          cnpj: empresaData.cnpj || '',
          razaoSocial: empresaData.razao_social || '',
          inscricaoEstadual: empresaData.inscricao_estadual || '',
          inscricaoMunicipal: empresaData.inscricao_municipal || '',
          regimeTributario: empresaData.regime_tributario || '',
          cepFiscal: empresaData.cep_fiscal || '',
          logradouroFiscal: empresaData.logradouro_fiscal || '',
          numeroEnderecoFiscal: empresaData.numero_endereco_fiscal || '',
          complementoFiscal: empresaData.complemento_fiscal || '',
          bairroFiscal: empresaData.bairro_fiscal || '',
          cidadeFiscal: empresaData.cidade_fiscal || '',
          codigoIbgeCidade: empresaData.codigo_ibge_cidade || '',
          ufFiscal: empresaData.uf_fiscal || '',
          emailFiscal: empresaData.email_fiscal || '',
          codigoCnae: empresaData.codigo_cnae || '',
          ambienteFiscal: empresaData.ambiente_fiscal || 'homologacao',
        });
      }
      setLoading(false);
    };
    
    fetchEmpresa();
  }, [user]);

  // Fetch groomers from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchGroomers = async () => {
      const { data, error } = await (supabase as any)
        .from('groomers')
        .select('id, nome')
        .eq('user_id', ownerId);
        
      if (error) {
        console.error('Error fetching groomers:', error);
      } else if (data) {
        const groomersData: Groomer[] = data.map((g: any) => ({
          id: g.id,
          nome: g.nome
        }));
        setGroomers(groomersData);
      }
    };
    
    fetchGroomers();
  }, [user]);

  const handleBuscarCep = async () => {
    if (!formData.cepFiscal || formData.cepFiscal.replace(/\D/g, '').length !== 8) {
      toast.error("CEP inválido. Informe 8 dígitos.");
      return;
    }

    setBuscandoCep(true);
    const resultado = await buscarCEP(formData.cepFiscal);
    setBuscandoCep(false);

    if (resultado) {
      setFormData({
        ...formData,
        logradouroFiscal: resultado.logradouro,
        bairroFiscal: resultado.bairro,
        cidadeFiscal: resultado.localidade,
        ufFiscal: resultado.uf,
        codigoIbgeCidade: resultado.ibge,
        complementoFiscal: resultado.complemento || formData.complementoFiscal,
      });
      toast.success("Endereço preenchido automaticamente!");
    } else {
      toast.error("CEP não encontrado.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    
    // Validar bordão (máximo 50 caracteres)
    if (formData.bordao.length > 50) {
      toast.error("Bordão da empresa deve ter no máximo 50 caracteres");
      return;
    }

    const updateData: any = {
      bordao: formData.bordao,
      horario_inicio: formData.horarioInicio,
      horario_fim: formData.horarioFim,
      meta_faturamento_mensal: formData.metaFaturamentoMensal,
      dias_funcionamento: formData.diasFuncionamento as any,
      // Dados Fiscais
      cnpj: unformatDocument(formData.cnpj),
      razao_social: formData.razaoSocial,
      inscricao_estadual: formData.inscricaoEstadual,
      inscricao_municipal: formData.inscricaoMunicipal,
      regime_tributario: formData.regimeTributario,
      cep_fiscal: unformatDocument(formData.cepFiscal),
      logradouro_fiscal: formData.logradouroFiscal,
      numero_endereco_fiscal: formData.numeroEnderecoFiscal,
      complemento_fiscal: formData.complementoFiscal,
      bairro_fiscal: formData.bairroFiscal,
      cidade_fiscal: formData.cidadeFiscal,
      codigo_ibge_cidade: formData.codigoIbgeCidade,
      uf_fiscal: formData.ufFiscal,
      email_fiscal: formData.emailFiscal,
      codigo_cnae: formData.codigoCnae,
      ambiente_fiscal: formData.ambienteFiscal,
    };

    if (formData.id) {
      // Update existing
      const { error } = await supabase
        .from('empresa_config')
        .update(updateData)
        .eq('id', formData.id)
        .eq('user_id', ownerId);
        
      if (error) {
        console.error('Error updating empresa:', error);
        toast.error('Erro ao atualizar dados da empresa');
      } else {
        toast.success("Dados da empresa salvos com sucesso!");
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('empresa_config')
        .insert({
          user_id: ownerId,
          ...updateData,
        } as any)
        .select()
        .single();
        
      if (error) {
        console.error('Error inserting empresa:', error);
        toast.error('Erro ao salvar dados da empresa');
      } else {
        setFormData({ ...formData, id: data.id });
        toast.success("Dados da empresa salvos com sucesso!");
      }
    }
  };

  const handleAdicionarGroomer = async () => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    
    if (!novoGroomer.trim()) {
      toast.error("Nome do groomer não pode estar vazio");
      return;
    }

    if (groomers.some(g => g.nome.toLowerCase() === novoGroomer.trim().toLowerCase())) {
      toast.error("Groomer já cadastrado");
      return;
    }

    const { data, error } = await (supabase as any)
      .from('groomers')
      .insert({
        user_id: ownerId,
        nome: novoGroomer.trim()
      })
      .select('id, nome')
      .single();
      
    if (error) {
      console.error('Error adding groomer:', error);
      toast.error('Erro ao adicionar groomer');
    } else if (data) {
      const newGroomer: Groomer = {
        id: (data as any).id,
        nome: (data as any).nome
      };
      setGroomers([...groomers, newGroomer]);
      setNovoGroomer("");
      toast.success("Groomer adicionado com sucesso!");
    }
  };

  const handleEditarGroomer = (groomer: Groomer) => {
    setEditandoGroomer(groomer);
    setNovoGroomer(groomer.nome);
  };

  const handleSalvarEdicaoGroomer = async () => {
    if (!editandoGroomer || !user) return;
    
    if (!novoGroomer.trim()) {
      toast.error("Nome do groomer não pode estar vazio");
      return;
    }

    const { error } = await (supabase as any)
      .from('groomers')
      .update({ nome: novoGroomer.trim() })
      .eq('id', editandoGroomer.id)
      .eq('user_id', ownerId);
      
    if (error) {
      console.error('Error updating groomer:', error);
      toast.error('Erro ao atualizar groomer');
    } else {
      const updatedGroomers = groomers.map(g => 
        g.id === editandoGroomer.id ? { id: g.id, nome: novoGroomer.trim() } : g
      );
      setGroomers(updatedGroomers);
      setEditandoGroomer(null);
      setNovoGroomer("");
      toast.success("Groomer atualizado com sucesso!");
    }
  };

  const handleExcluirGroomer = async (id: string) => {
    if (!user) return;
    
    const { error } = await (supabase as any)
      .from('groomers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error deleting groomer:', error);
      toast.error('Erro ao excluir groomer');
    } else {
      const updatedGroomers = groomers.filter(g => g.id !== id);
      setGroomers(updatedGroomers);
      toast.success("Groomer excluído com sucesso!");
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastro da Empresa</h1>
        <p className="text-muted-foreground">
          Configure as informações da sua empresa
        </p>
      </div>

      <SubscriptionInfoCard />

      {/* Card Dados Fiscais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Fiscais da Empresa</CardTitle>
          <CardDescription>
            Informações necessárias para emissão de NFe/NFSe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identificação da Empresa */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Identificação</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    maxLength={18}
                  />
                  {formData.cnpj && formData.cnpj.replace(/\D/g, '').length === 14 && !validarCNPJ(formData.cnpj) && (
                    <p className="text-xs text-destructive">CNPJ inválido</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razaoSocial">Razão Social *</Label>
                  <Input
                    id="razaoSocial"
                    placeholder="Razão Social da empresa"
                    value={formData.razaoSocial}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regimeTributario">Regime Tributário *</Label>
                  <Select
                    value={formData.regimeTributario}
                    onValueChange={(value) => setFormData({ ...formData, regimeTributario: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o regime" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIMES_TRIBUTARIOS.map((regime) => (
                        <SelectItem key={regime.value} value={regime.value}>
                          {regime.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricaoEstadual">Inscrição Estadual (IE)</Label>
                  <Input
                    id="inscricaoEstadual"
                    placeholder="Somente números"
                    value={formData.inscricaoEstadual}
                    onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value.replace(/\D/g, '') })}
                  />
                  <p className="text-xs text-muted-foreground">Obrigatório para NFe de produto</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricaoMunicipal">Inscrição Municipal (IM)</Label>
                  <Input
                    id="inscricaoMunicipal"
                    placeholder="Somente números"
                    value={formData.inscricaoMunicipal}
                    onChange={(e) => setFormData({ ...formData, inscricaoMunicipal: e.target.value.replace(/\D/g, '') })}
                  />
                  <p className="text-xs text-muted-foreground">Obrigatório para NFSe de serviço</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Endereço Fiscal */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Endereço Fiscal</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cepFiscal">CEP *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cepFiscal"
                      placeholder="00000-000"
                      value={formData.cepFiscal}
                      onChange={(e) => setFormData({ ...formData, cepFiscal: formatCEP(e.target.value) })}
                      maxLength={9}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleBuscarCep}
                      disabled={buscandoCep}
                    >
                      {buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="logradouroFiscal">Logradouro *</Label>
                  <Input
                    id="logradouroFiscal"
                    placeholder="Rua, Avenida, etc."
                    value={formData.logradouroFiscal}
                    onChange={(e) => setFormData({ ...formData, logradouroFiscal: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroEnderecoFiscal">Número *</Label>
                  <Input
                    id="numeroEnderecoFiscal"
                    placeholder="Nº"
                    value={formData.numeroEnderecoFiscal}
                    onChange={(e) => setFormData({ ...formData, numeroEnderecoFiscal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complementoFiscal">Complemento</Label>
                  <Input
                    id="complementoFiscal"
                    placeholder="Sala, Bloco, etc."
                    value={formData.complementoFiscal}
                    onChange={(e) => setFormData({ ...formData, complementoFiscal: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bairroFiscal">Bairro *</Label>
                  <Input
                    id="bairroFiscal"
                    placeholder="Bairro"
                    value={formData.bairroFiscal}
                    onChange={(e) => setFormData({ ...formData, bairroFiscal: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cidadeFiscal">Cidade *</Label>
                  <Input
                    id="cidadeFiscal"
                    placeholder="Cidade"
                    value={formData.cidadeFiscal}
                    onChange={(e) => setFormData({ ...formData, cidadeFiscal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoIbgeCidade">Código IBGE *</Label>
                  <Input
                    id="codigoIbgeCidade"
                    placeholder="7 dígitos"
                    value={formData.codigoIbgeCidade}
                    onChange={(e) => setFormData({ ...formData, codigoIbgeCidade: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                    maxLength={7}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ufFiscal">UF *</Label>
                  <Select
                    value={formData.ufFiscal}
                    onValueChange={(value) => setFormData({ ...formData, ufFiscal: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {UF_BRASIL.map((uf) => (
                        <SelectItem key={uf.sigla} value={uf.sigla}>
                          {uf.sigla}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Informações Adicionais */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Informações Adicionais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ambienteFiscal">Ambiente Fiscal *</Label>
                  <Select
                    value={formData.ambienteFiscal}
                    onValueChange={(value) => setFormData({ ...formData, ambienteFiscal: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.ambienteFiscal === "producao" 
                      ? "⚠️ Notas serão emitidas com validade fiscal" 
                      : "Notas emitidas apenas para testes"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailFiscal">Email Fiscal</Label>
                  <Input
                    id="emailFiscal"
                    type="email"
                    placeholder="fiscal@empresa.com.br"
                    value={formData.emailFiscal}
                    onChange={(e) => setFormData({ ...formData, emailFiscal: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Email para recebimento de notas fiscais</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoCnae">CNAE Principal</Label>
                  <Input
                    id="codigoCnae"
                    placeholder="Ex: 9609-2/08"
                    value={formData.codigoCnae}
                    onChange={(e) => setFormData({ ...formData, codigoCnae: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Salvar Dados Fiscais
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card Dados Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>
            Preencha as informações gerais da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bordao">Bordão da Empresa</Label>
              <Input
                id="bordao"
                placeholder="Digite o bordão da empresa (máx. 50 caracteres)"
                value={formData.bordao}
                onChange={(e) => setFormData({ ...formData, bordao: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bordao.length}/50 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label>Horário de Funcionamento da Empresa</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horarioInicio" className="text-sm">Horário Início</Label>
                  <Input
                    id="horarioInicio"
                    type="time"
                    value={formData.horarioInicio}
                    onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horarioFim" className="text-sm">Horário Fim</Label>
                  <Input
                    id="horarioFim"
                    type="time"
                    value={formData.horarioFim}
                    onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Dias de Funcionamento da Empresa</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { key: 'segunda', label: 'Segunda-feira' },
                  { key: 'terca', label: 'Terça-feira' },
                  { key: 'quarta', label: 'Quarta-feira' },
                  { key: 'quinta', label: 'Quinta-feira' },
                  { key: 'sexta', label: 'Sexta-feira' },
                  { key: 'sabado', label: 'Sábado' },
                  { key: 'domingo', label: 'Domingo' },
                ].map((dia) => (
                  <div key={dia.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={dia.key}
                      checked={formData.diasFuncionamento[dia.key as keyof DiasSemana]}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          diasFuncionamento: {
                            ...formData.diasFuncionamento,
                            [dia.key]: checked === true,
                          },
                        });
                      }}
                    />
                    <Label
                      htmlFor={dia.key}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {dia.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              Salvar Configurações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meta de Faturamento Mensal</CardTitle>
          <CardDescription>
            Defina a meta de faturamento mensal da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaFaturamento">Meta Mensal (R$)</Label>
              <Input
                id="metaFaturamento"
                type="number"
                step="0.01"
                min="0"
                placeholder="10.000,00"
                value={formData.metaFaturamentoMensal}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  metaFaturamentoMensal: parseFloat(e.target.value) || 0 
                })}
              />
              <p className="text-sm text-muted-foreground">
                Valor atual: {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(formData.metaFaturamentoMensal)}
              </p>
            </div>

            <Button type="submit" className="w-full">
              Salvar Meta
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Groomers</CardTitle>
          <CardDescription>
            Gerencie os groomers da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="Digite o nome do groomer"
                value={novoGroomer}
                onChange={(e) => setNovoGroomer(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (editandoGroomer) {
                      handleSalvarEdicaoGroomer();
                    } else {
                      handleAdicionarGroomer();
                    }
                  }
                }}
              />
              {editandoGroomer ? (
                <>
                  <Button onClick={handleSalvarEdicaoGroomer}>
                    Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditandoGroomer(null);
                      setNovoGroomer("");
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={handleAdicionarGroomer}>
                  Adicionar Groomer
                </Button>
              )}
            </div>

            {groomers.length > 0 && (
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold">Nome do Groomer</th>
                      <th className="p-3 text-right text-sm font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groomers.map((groomer) => (
                      <tr key={groomer.id} className="border-t hover:bg-accent/50">
                        <td className="p-3">{groomer.nome}</td>
                        <td className="p-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditarGroomer(groomer)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja excluir o groomer ${groomer.nome}?`)) {
                                  handleExcluirGroomer(groomer.id);
                                }
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {groomers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum groomer cadastrado ainda.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Empresa;

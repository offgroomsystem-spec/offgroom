import {
  Calendar,
  Users,
  DollarSign,
  Package,
  BarChart3,
  Gift,
  Clock,
  Bell,
  FileText,
  TrendingUp,
  Shield,
  Smartphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Calendar,
    title: "Agendamentos Inteligentes",
    description:
      "Calendário visual completo com notificações automáticas e gestão eficiente de horários para sua equipe.",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description:
      "Cadastro completo de pets, histórico de atendimentos e fichas detalhadas em um só lugar.",
  },
  {
    icon: DollarSign,
    title: "Controle Financeiro",
    description:
      "Contas a pagar e receber, fluxo de caixa e relatórios financeiros completos (DRE).",
  },
  {
    icon: Package,
    title: "Estoque e Produtos",
    description:
      "Controle de inventário, alerta de estoque mínimo e gestão completa de fornecedores.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Gerenciais",
    description:
      "Dashboard executivo com análise de vendas, clientes em risco e indicadores de performance.",
  },
  {
    icon: Gift,
    title: "Pacotes e Combos",
    description:
      "Criação de pacotes personalizados, controle de vencimento e rastreamento de uso.",
  },
  {
    icon: Clock,
    title: "Gestão de Tempo",
    description:
      "Controle preciso do tempo de cada serviço para otimizar sua agenda e produtividade.",
  },
  {
    icon: Bell,
    title: "Notificações Automáticas",
    description:
      "Lembretes de agendamentos, vencimentos de pacotes e alertas importantes via sistema.",
  },
  {
    icon: FileText,
    title: "Documentação Completa",
    description:
      "Geração de recibos, notas fiscais e relatórios personalizados para seu negócio.",
  },
  {
    icon: TrendingUp,
    title: "Análise de Performance",
    description:
      "Acompanhe o desempenho do seu petshop com métricas e gráficos em tempo real.",
  },
  {
    icon: Shield,
    title: "Dados Seguros",
    description:
      "Seus dados protegidos com criptografia e backup automático na nuvem.",
  },
  {
    icon: Smartphone,
    title: "Acesso Multiplataforma",
    description:
      "Acesse de qualquer dispositivo: computador, tablet ou smartphone, onde estiver.",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="bg-muted/30 py-20 md:py-32">
      <div className="container">
        {/* Cabeçalho da seção */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Funcionalidades Completas
          </h2>
          <p className="text-lg text-muted-foreground">
            Tudo o que você precisa para gerenciar seu petshop de forma
            profissional e eficiente
          </p>
        </div>

        {/* Grid de funcionalidades */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
            >
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

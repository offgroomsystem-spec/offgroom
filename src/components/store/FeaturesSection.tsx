import {
  Calendar,
  Users,
  DollarSign,
  Package,
  BarChart3,
  Gift,
  Shield,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agendamentos Inteligentes",
    description: "Agenda completa com controle de horários e lembretes",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Cadastro de clientes e pets com histórico completo",
  },
  {
    icon: DollarSign,
    title: "Controle Financeiro",
    description: "Receitas, despesas e fluxo de caixa em um só lugar",
  },
  {
    icon: Package,
    title: "Estoque e Produtos",
    description: "Controle de estoque com alertas de reposição",
  },
  {
    icon: BarChart3,
    title: "Relatórios Gerenciais",
    description: "Dashboards para decisões baseadas em dados",
  },
  {
    icon: Gift,
    title: "Pacotes e Combos",
    description: "Crie pacotes de serviços com descontos",
  },
  {
    icon: Shield,
    title: "Dados Seguros",
    description: "Backup automático e segurança empresarial",
  },
  {
    icon: Smartphone,
    title: "Acesso Multiplataforma",
    description: "Desktop, tablet e celular. Acesse de qualquer lugar",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="bg-white py-12">
      <div className="container">
        <h2 className="mb-8 text-center text-2xl font-medium text-gray-900">
          Funcionalidades
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
              >
                <Icon className="mb-2 h-5 w-5 text-gray-700" />
                <h3 className="mb-1 text-sm font-medium text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

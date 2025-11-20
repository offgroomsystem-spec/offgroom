import { Calendar, DollarSign, BarChart3, Check } from "lucide-react";

const featuredFeatures = [
  {
    icon: Calendar,
    title: "Agendamentos Recorrentes",
    description: "Configure serviços que se repetem automaticamente e nunca mais perca uma marcação",
    benefits: [
      "Lembretes automáticos por WhatsApp",
      "Confirmação de presença",
      "Calendário inteligente"
    ],
    color: "blue"
  },
  {
    icon: DollarSign,
    title: "Controles Inteligentes",
    description: "Tenha visão completa das finanças e tome decisões baseadas em dados reais",
    benefits: [
      "Fluxo de caixa em tempo real",
      "Contas a pagar e receber",
      "DRE e ponto de equilíbrio"
    ],
    color: "green"
  },
  {
    icon: BarChart3,
    title: "Relatórios Gerenciais",
    description: "Dashboards completos para acompanhar o crescimento do seu negócio",
    benefits: [
      "Análise de faturamento",
      "Clientes em risco",
      "Performance por serviço"
    ],
    color: "purple"
  },
];

const colorClasses = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600"
};

export const FeaturedFeatures = () => {
  return (
    <section className="bg-muted py-16 md:py-24">
      <div className="container max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Recursos poderosos para simplificar sua rotina e aumentar seus resultados
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {featuredFeatures.map((feature, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow border border-border"
            >
              <div className={`w-12 h-12 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center mb-6`}>
                <feature.icon className="h-6 w-6" />
              </div>
              
              <h3 className="text-xl font-semibold text-card-foreground mb-3">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground mb-6">
                {feature.description}
              </p>
              
              <ul className="space-y-3">
                {feature.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-card-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

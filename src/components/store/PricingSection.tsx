import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { abrirHotmart } from "./StoreLayout";

const plans = [
  {
    name: "Básico",
    price: "97",
    description: "Perfeito para petshops que estão começando",
    popular: false,
    features: [
      "Até 50 agendamentos/mês",
      "1 usuário",
      "Gestão de clientes e pets",
      "Controle financeiro básico",
      "Suporte por email",
      "Relatórios essenciais",
    ],
  },
  {
    name: "Profissional",
    price: "197",
    description: "Ideal para petshops em crescimento",
    popular: true,
    features: [
      "Agendamentos ilimitados",
      "Até 3 usuários",
      "Todas as funcionalidades",
      "Controle financeiro completo (DRE)",
      "Suporte prioritário",
      "Relatórios avançados",
      "Gestão de pacotes",
      "Controle de estoque",
    ],
  },
  {
    name: "Empresarial",
    price: "397",
    description: "Para petshops que precisam do máximo",
    popular: false,
    features: [
      "Tudo do Profissional",
      "Usuários ilimitados",
      "API de integração",
      "Gerente de conta dedicado",
      "Treinamento personalizado",
      "Customizações sob demanda",
      "SLA garantido",
      "Relatórios personalizados",
    ],
  },
];

export const PricingSection = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container">
        {/* Cabeçalho */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Planos para todo tipo de negócio
          </h2>
          <p className="text-lg text-muted-foreground">
            Escolha o plano ideal para o seu petshop e comece hoje mesmo
          </p>
        </div>

        {/* Grid de planos */}
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative flex flex-col ${
                plan.popular
                  ? "border-primary shadow-xl shadow-primary/20 ring-2 ring-primary"
                  : ""
              }`}
            >
              {/* Badge "Mais Popular" */}
              {plan.popular && (
                <Badge
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-4 py-1"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Mais Popular
                </Badge>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
                
                {/* Preço */}
                <div className="mt-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      R$ {plan.price}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                {/* Lista de features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Botão CTA */}
                <Button
                  onClick={abrirHotmart}
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  className="w-full font-semibold"
                >
                  Comprar Agora
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Nota adicional */}
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Todos os planos incluem 7 dias de garantia. Cancele quando quiser, sem multas.
        </p>
      </div>
    </section>
  );
};

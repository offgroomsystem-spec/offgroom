import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { abrirHotmart } from "./StoreLayout";

const plans = [
  {
    name: "Básico",
    price: "99",
    popular: false,
    features: [
      "Até 100 agendamentos/mês",
      "1 usuário",
      "Gestão básica de clientes",
      "Suporte por email",
    ],
  },
  {
    name: "Profissional",
    price: "199",
    popular: true,
    features: [
      "Agendamentos ilimitados",
      "Até 3 usuários",
      "Relatórios gerenciais",
      "Suporte prioritário",
    ],
  },
  {
    name: "Empresarial",
    price: "349",
    popular: false,
    features: [
      "Usuários ilimitados",
      "Múltiplas unidades",
      "Suporte 24/7",
      "Treinamento personalizado",
    ],
  },
];

export const PricingSection = () => {
  return (
    <section id="pricing" className="bg-white py-12">
      <div className="container">
        <h2 className="mb-8 text-center text-2xl font-medium text-gray-900">
          Planos
        </h2>

        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                plan.popular ? "border-blue-500" : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="mb-2 text-xs font-medium text-blue-600">
                  Mais Popular
                </div>
              )}
              
              <h3 className="mb-1 text-lg font-medium text-gray-900">
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-medium text-gray-900">
                  R$ {plan.price}
                </span>
                <span className="text-sm text-gray-600">/mês</span>
              </div>
              
              <ul className="mb-4 space-y-1.5">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button
                onClick={abrirHotmart}
                variant={plan.popular ? "default" : "outline"}
                className={plan.popular ? "w-full bg-blue-600 hover:bg-blue-700" : "w-full"}
                size="sm"
              >
                Comprar
              </Button>
            </div>
          ))}
        </div>
        
        <p className="mt-6 text-center text-xs text-gray-500">
          7 dias de garantia • Cancele quando quiser
        </p>
      </div>
    </section>
  );
};

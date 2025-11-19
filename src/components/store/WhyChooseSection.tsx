import { Check } from "lucide-react";

const benefits = [
  "Interface intuitiva",
  "Dados seguros",
  "Sem instalação",
  "Suporte em português",
  "Atualizações incluídas",
  "Multiplataforma",
];

export const WhyChooseSection = () => {
  return (
    <section className="bg-gray-50 py-12">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-medium text-gray-900">
            Por que escolher?
          </h2>
          
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

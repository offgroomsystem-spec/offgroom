import { Check } from "lucide-react";

const benefits = [
  "Interface moderna e intuitiva",
  "Suporte completo em português",
  "Atualizações constantes e gratuitas",
  "Multiplataforma (web, tablet, mobile)",
  "Dados seguros e criptografados",
  "Sem custo de instalação",
  "Relatórios personalizados",
  "Integração com WhatsApp",
  "Backup automático na nuvem",
  "Treinamento e suporte dedicado",
  "Implementação rápida e fácil",
  "Escalável para qualquer tamanho de negócio",
];

export const WhyChooseSection = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container">
        <div className="mx-auto max-w-6xl">
          {/* Cabeçalho */}
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Por que escolher o{" "}
              <span className="text-primary">Offgroom</span>?
            </h2>
            <p className="text-lg text-muted-foreground">
              Benefícios e diferenciais que fazem a diferença no seu dia a dia
            </p>
          </div>

          {/* Grid de benefícios */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-md"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <Check className="h-4 w-4 text-accent" />
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  {benefit}
                </p>
              </div>
            ))}
          </div>

          {/* CTA adicional */}
          <div className="mt-16 text-center">
            <p className="text-lg text-muted-foreground">
              Junte-se a centenas de petshops que já transformaram sua gestão
              com o Offgroom
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Maria Silva",
    role: "Proprietária - Petshop Vida Animal",
    photo: "/placeholder.svg",
    text: "O Offgroom revolucionou a gestão do meu petshop. Agora tenho controle total do negócio e economizo horas de trabalho manual todos os dias!",
    rating: 5,
  },
  {
    name: "João Santos",
    role: "Gerente - Dog Center",
    photo: "/placeholder.svg",
    text: "Sistema completo e fácil de usar. A equipe se adaptou rapidamente e nossos clientes adoram receber as notificações automáticas de agendamento.",
    rating: 5,
  },
  {
    name: "Ana Paula",
    role: "Diretora - PetCare Premium",
    photo: "/placeholder.svg",
    text: "Melhor investimento que fiz para o meu negócio. Os relatórios financeiros me ajudam a tomar decisões estratégicas com dados reais.",
    rating: 5,
  },
  {
    name: "Carlos Mendes",
    role: "Proprietário - Banho & Tosa Express",
    photo: "/placeholder.svg",
    text: "Suporte excelente e atualizações constantes. O sistema evolui junto com as necessidades do meu petshop. Recomendo!",
    rating: 5,
  },
  {
    name: "Patricia Costa",
    role: "Gerente - Pet Paradise",
    photo: "/placeholder.svg",
    text: "Acabou a bagunça de agendamentos! O calendário visual e os lembretes automáticos reduziram drasticamente os esquecimentos dos clientes.",
    rating: 5,
  },
  {
    name: "Roberto Lima",
    role: "Proprietário - Meu Pet Feliz",
    photo: "/placeholder.svg",
    text: "Interface moderna e intuitiva. Consigo acessar de qualquer lugar e acompanhar meu negócio em tempo real, mesmo quando não estou no petshop.",
    rating: 5,
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="bg-muted/30 py-20 md:py-32">
      <div className="container">
        {/* Cabeçalho */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg text-muted-foreground">
            Histórias de sucesso de quem transformou a gestão do petshop
          </p>
        </div>

        {/* Grid de depoimentos */}
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                {/* Avatar e info */}
                <div className="mb-4 flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={testimonial.photo} alt={testimonial.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>

                {/* Estrelas */}
                <div className="mb-3 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Texto do depoimento */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  "{testimonial.text}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

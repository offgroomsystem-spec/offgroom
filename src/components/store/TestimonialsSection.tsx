const testimonials = [
  {
    name: "Maria Silva",
    role: "Proprietária - PetShop Amigo Fiel",
    text: "O Offgroom transformou completamente a gestão do meu petshop.",
  },
  {
    name: "João Santos",
    role: "Gerente - Banho & Tosa Elite",
    text: "Sistema muito intuitivo e completo. A equipe se adaptou rapidamente.",
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="bg-gray-50 py-12">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="mb-3 text-sm text-gray-700">"{testimonial.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

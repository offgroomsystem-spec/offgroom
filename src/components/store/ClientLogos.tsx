export const ClientLogos = () => {
  return (
    <section className="bg-muted py-12 md:py-16">
      <div className="container max-w-6xl">
        <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
          Usado por mais de 500 petshops no Brasil
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center opacity-40">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-center">
              <div className="h-12 w-32 bg-foreground/20 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { abrirHotmart } from "./StoreLayout";

export const HeroSection = () => {
  return (
    <section className="bg-white py-12 md:py-20">
      <div className="container">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-medium tracking-tight text-gray-900 md:text-5xl">
            Offgroom
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Sistema de gestão completo para petshops
          </p>
          
          <Button 
            onClick={abrirHotmart}
            className="bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          >
            Comprar Agora
          </Button>
        </div>
      </div>
    </section>
  );
};

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoOffgroom from "@/assets/logo-offgroom.png";

interface StoreLayoutProps {
  children: React.ReactNode;
}

export const abrirHotmart = () => {
  const hotmartUrl = "https://pay.hotmart.com/XXXXXXXX"; // Placeholder - será substituído
  window.open(hotmartUrl, "_blank");
};

export const StoreLayout = ({ children }: StoreLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header simples sem autenticação */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/store" className="flex items-center">
            <img src={logoOffgroom} alt="Offgroom" className="h-10" />
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button onClick={abrirHotmart} className="font-semibold">
              Comprar Agora
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
};

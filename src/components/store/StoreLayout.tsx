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
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="container flex h-12 items-center justify-between">
          <Link to="/store" className="flex items-center">
            <img src={logoOffgroom} alt="Offgroom" className="h-8" />
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login" className="text-sm text-gray-600">Entrar</Link>
            </Button>
            <Button 
              onClick={abrirHotmart} 
              size="sm"
              className="bg-blue-600 text-sm text-white hover:bg-blue-700"
            >
              Comprar
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
};

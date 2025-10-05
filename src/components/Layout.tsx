import { Link, useLocation } from "react-router-dom";
import { Users, PawPrint, Scissors, Calendar, ChevronDown, FileText } from "lucide-react";
import logoOffgroom from "@/assets/logo-offgroom.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const cadastroItems = [
    { path: "/clientes", label: "Clientes", icon: Users },
    { path: "/servicos", label: "Serviços", icon: Scissors },
    { path: "/racas", label: "Raças", icon: PawPrint },
    { path: "/pacotes", label: "Pacotes", icon: Scissors },
  ];

  const isCadastroActive = cadastroItems.some(item => location.pathname === item.path);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-12 items-center">
          <div className="flex items-center gap-2 mr-8">
            <img 
              src={logoOffgroom} 
              alt="Offgroom" 
              className="h-8 w-auto"
              style={{ filter: 'brightness(0) saturate(100%) invert(56%) sepia(76%) saturate(461%) hue-rotate(178deg) brightness(92%) contrast(88%)' }}
            />
          </div>
          
          <nav className="flex gap-1 items-center">
            <Link
              to="/agendamentos"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                location.pathname === "/agendamentos"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Agendamentos</span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-2 px-3 py-1.5 h-auto text-sm ${
                    isCadastroActive
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <PawPrint className="h-4 w-4" />
                  <span className="font-medium">Cadastros</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {cadastroItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        to={item.path}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/relatorios"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                location.pathname === "/relatorios"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span className="font-medium">Relatórios</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container py-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;

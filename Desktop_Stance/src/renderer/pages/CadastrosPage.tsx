import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsuariosPage } from "@/pages/UsuariosPage";
import { ClientesPage } from "@/pages/ClientesPage";
import { ProdutosPage } from "@/pages/ProdutosPage";
import { TecidosPage } from "@/pages/TecidosPage";
import { MesasCortePage } from "@/pages/MesasCortePage";
import { useAuth } from "@/lib/auth-context";

export function CadastrosPage() {
  const { isAdmin } = useAuth();

  return (
    <Tabs defaultValue={isAdmin ? "usuarios" : "clientes"} className="h-full">
      <TabsList className="shrink-0">
        {isAdmin && <TabsTrigger value="usuarios">Usuários</TabsTrigger>}
        <TabsTrigger value="clientes">Clientes</TabsTrigger>
        <TabsTrigger value="produtos">Produtos</TabsTrigger>
        <TabsTrigger value="tecidos">Materiais</TabsTrigger>
        <TabsTrigger value="mesas">Mesas de Corte</TabsTrigger>
      </TabsList>
      {isAdmin && (
        <TabsContent value="usuarios" className="min-h-0 overflow-hidden">
          <UsuariosPage />
        </TabsContent>
      )}
      <TabsContent value="clientes" className="min-h-0 overflow-hidden">
        <ClientesPage />
      </TabsContent>
      <TabsContent value="produtos" className="min-h-0 overflow-hidden">
        <ProdutosPage />
      </TabsContent>
      <TabsContent value="tecidos" className="min-h-0 overflow-hidden">
        <TecidosPage />
      </TabsContent>
      <TabsContent value="mesas" className="min-h-0 overflow-hidden">
        <MesasCortePage />
      </TabsContent>
    </Tabs>
  );
}

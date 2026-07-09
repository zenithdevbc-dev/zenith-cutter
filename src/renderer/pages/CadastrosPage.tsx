import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsuariosPage } from "@/pages/UsuariosPage";
import { ClientesPage } from "@/pages/ClientesPage";
import { ProdutosPage } from "@/pages/ProdutosPage";
import { TecidosPage } from "@/pages/TecidosPage";
import { MesasCortePage } from "@/pages/MesasCortePage";

export function CadastrosPage() {
  return (
    <Tabs defaultValue="usuarios">
      <TabsList>
        <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        <TabsTrigger value="clientes">Clientes</TabsTrigger>
        <TabsTrigger value="produtos">Produtos</TabsTrigger>
        <TabsTrigger value="tecidos">Tecidos</TabsTrigger>
        <TabsTrigger value="mesas">Mesas de Corte</TabsTrigger>
      </TabsList>
      <TabsContent value="usuarios">
        <UsuariosPage />
      </TabsContent>
      <TabsContent value="clientes">
        <ClientesPage />
      </TabsContent>
      <TabsContent value="produtos">
        <ProdutosPage />
      </TabsContent>
      <TabsContent value="tecidos">
        <TecidosPage />
      </TabsContent>
      <TabsContent value="mesas">
        <MesasCortePage />
      </TabsContent>
    </Tabs>
  );
}

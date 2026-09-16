import { ModuleRoute, resolveModule } from "@/app/module-routes";

export default async function ModuleDetailPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await params;
  return <ModuleRoute module={resolveModule(module)} view="detail" recordId={id} />;
}

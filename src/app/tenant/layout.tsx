import Shell from "@/components/Shell";
import { requireRole } from "@/lib/auth";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TENANT");
  return (
    <Shell title="ผู้เช่า" name={session.name} links={[{ href: "/tenant", label: "บิลของฉัน" }]}>
      {children}
    </Shell>
  );
}

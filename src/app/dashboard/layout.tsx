import AuthGuard from "@/components/layout/AuthGuard";
import AppLayout from "@/components/layout/AppLayout";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}

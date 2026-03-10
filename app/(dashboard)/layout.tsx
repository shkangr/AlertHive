import { PageLayout } from "@/components/page-layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}

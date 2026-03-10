import { AlertTriangle } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1F1F3D]">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#06AC38]">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-white tracking-tight">
          AlertHive
        </span>
      </div>
      {children}
    </div>
  );
}

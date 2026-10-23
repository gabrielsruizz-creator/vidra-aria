export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-screen place-items-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-sidebar-foreground">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            VA
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold">Vidra Aria</span>
            <span className="text-xs text-sidebar-muted">Custos, preços e orçamentos</span>
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}

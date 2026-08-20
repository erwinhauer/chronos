import Image from "next/image";
import { ChronosLogo, ChronosMark } from "@/components/chronos-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <Image src="/login_image.png" alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-primary/75" />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--coral) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, var(--coral) 0%, transparent 70%)" }}
        />
        <ChronosLogo className="relative z-10 text-primary-foreground" />
        <div className="relative z-10 flex flex-col gap-4">
          <ChronosMark className="h-10 w-10 text-primary-foreground/40" />
          <p className="max-w-sm text-2xl font-medium leading-snug tracking-tight">
            Uren, werkzaamheden en facturatie van Knijff, op één centrale plek.
          </p>
          <p className="max-w-sm text-sm text-primary-foreground/60">
            Registreren, goedkeuren en factureren — van dossier tot specificatie.
          </p>
        </div>
        <p className="relative z-10 text-xs text-primary-foreground/40">Knijff &middot; intern gebruik</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-3">
            <ChronosLogo className="text-foreground [&>span]:text-[2rem]" />
            <p className="text-sm text-muted-foreground">Tijdschrijf- en facturatiesysteem</p>
          </div>
          <LoginForm next={next ?? "/dashboard"} />
        </div>
      </div>
    </div>
  );
}

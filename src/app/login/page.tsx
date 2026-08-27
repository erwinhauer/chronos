import Image from "next/image";
import { ChronosLogo, ChronosMark } from "@/components/chronos-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fout?: string }>;
}) {
  const { next, fout } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col gap-5 overflow-hidden bg-primary p-8 text-primary-foreground lg:justify-between lg:gap-0 lg:p-10 lg:min-h-screen">
        <Image
          src="/login_image.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
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
        <div className="relative z-10 flex flex-col gap-3 lg:gap-4">
          <ChronosMark className="h-8 w-8 text-primary-foreground/40 lg:h-10 lg:w-10" />
          <p className="max-w-sm text-lg font-medium leading-snug tracking-tight lg:text-2xl">
            Uren, werkzaamheden en facturatie van Knijff, op één centrale plek.
          </p>
          <p className="hidden max-w-sm text-sm text-primary-foreground/60 lg:block">
            Registreren, goedkeuren en factureren — van dossier tot specificatie.
          </p>
        </div>
        <p className="relative z-10 hidden text-xs text-primary-foreground/40 lg:block">Knijff &middot; intern gebruik</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 bg-background px-6 py-10 lg:py-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-3">
            <ChronosLogo className="hidden text-foreground [&>span]:text-[2rem] lg:flex" />
            <p className="text-sm text-muted-foreground">Tijdschrijf- en facturatiesysteem</p>
          </div>
          <LoginForm next={next ?? "/dashboard"} foutmelding={fout} />
        </div>
      </div>
    </div>
  );
}

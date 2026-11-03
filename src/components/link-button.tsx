import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type LinkButtonProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & {
    // Grijze, niet-klikbare knop in plaats van een link; `disabledTitle` legt uit waarom.
    disabled?: boolean;
    disabledTitle?: string;
  };

export function LinkButton({
  variant,
  size,
  className,
  children,
  disabled,
  disabledTitle,
  ...linkProps
}: LinkButtonProps) {
  if (disabled) {
    // De span draagt de tooltip: een uitgeschakelde knop ontvangt zelf geen muisgebeurtenissen.
    return (
      <span title={disabledTitle} className={cn("inline-flex", className?.includes("w-full") && "w-full", className?.includes("mt-auto") && "mt-auto")}>
        <Button
          variant={variant}
          size={size}
          disabled
          className={cn("border-transparent bg-muted text-muted-foreground opacity-100", className)}
        >
          {children}
        </Button>
      </span>
    );
  }
  return (
    <Button variant={variant} size={size} className={className} nativeButton={false} render={<Link {...linkProps} />}>
      {children}
    </Button>
  );
}

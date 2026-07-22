import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type LinkButtonProps = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

export function LinkButton({ variant, size, className, children, ...linkProps }: LinkButtonProps) {
  return (
    <Button variant={variant} size={size} className={className} nativeButton={false} render={<Link {...linkProps} />}>
      {children}
    </Button>
  );
}

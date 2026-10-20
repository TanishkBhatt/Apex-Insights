import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  heightClass = "h-9",
  className,
}: {
  href?: string;
  heightClass?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Apex Insights home"
      className="inline-flex shrink-0 items-center"
    >
      <Image
        src="/logo.png"
        alt="Apex Insights"
        width={669}
        height={168}
        className={cn(heightClass, "w-auto dark:hidden", className)}
      />
      <Image
        src="/logo-light.png"
        alt=""
        aria-hidden
        width={669}
        height={168}
        className={cn("hidden", heightClass, "w-auto dark:block", className)}
      />
    </Link>
  );
}

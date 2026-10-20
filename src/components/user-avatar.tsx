import Image from "next/image";
import { resolveAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function UserAvatar({
  image,
  className,
}: {
  image?: string | null;
  className?: string;
}) {
  return (
    <Image
      src={resolveAvatar(image)}
      alt=""
      width={192}
      height={192}
      className={cn("h-8 w-8 rounded-full", className)}
    />
  );
}

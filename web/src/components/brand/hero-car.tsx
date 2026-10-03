import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The landing-page cars. /public/hero/cars-trio.png is a cut-out (transparent
 * background), so the cars stand directly on the hero's blue.
 */
export function HeroCar({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* soft light on the floor under the cars */}
      <div className="absolute inset-x-[10%] bottom-[2%] h-[16%] rounded-[100%] bg-brand-300/25 blur-2xl" aria-hidden />
      <Image
        src="/hero/cars-trio.png"
        alt="A silver Audi, a white Buick and an orange Chevrolet parked side by side"
        width={860}
        height={321}
        priority
        sizes="(min-width: 1024px) 640px, 100vw"
        className="relative h-auto w-full drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)]"
      />
    </div>
  );
}

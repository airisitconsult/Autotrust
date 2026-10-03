import Image from "next/image";
import { cn } from "@/lib/cn";

// Fade every edge of the photo to transparent so it melts into the hero
// background instead of sitting on it as a rectangle. Two linear fades
// (across and down) are intersected.
const FEATHER = "linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)";
const FEATHER_Y = "linear-gradient(to bottom, transparent 0%, #000 26%, #000 70%, transparent 100%)";

/** The landing-page photo (public/hero/lineup.png), blended into the hero background. */
export function HeroCar({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="relative"
        style={{
          maskImage: `${FEATHER}, ${FEATHER_Y}`,
          maskComposite: "intersect",
          WebkitMaskImage: `${FEATHER}, ${FEATHER_Y}`,
          WebkitMaskComposite: "source-in",
        }}
      >
        <Image
          src="/hero/lineup.png"
          alt="Used cars lined up and ready to view"
          width={500}
          height={310}
          priority
          sizes="(min-width: 1024px) 560px, 100vw"
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}

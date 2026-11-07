import Image from "next/image";
import { Logo } from "@/components/ui";

export function EventHero({
  name,
  date,
  venue,
  image,
}: {
  name: string;
  date: string;
  venue: string;
  image?: string | null;
}) {
  return (
    <section
      aria-label="Event invitation"
      className="relative isolate overflow-hidden rounded-3xl bg-[#18313c] text-white"
    >
      {image && (
        // Blending a heavily blurred copy carries the poster's own palette into
        // the backdrop, without reading pixels or introducing a palette library.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <Image
            src={image}
            alt=""
            fill
            unoptimized
            sizes="700px"
            className="scale-150 object-cover opacity-80 blur-[80px] saturate-150"
          />
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-black/50 via-black/25 to-black/40"
      />
      <div className="grid min-h-72 grid-cols-[1fr_1.12fr] items-center gap-4 p-5 sm:min-h-96 sm:gap-7 sm:p-8">
        <div className="flex h-full min-w-0 flex-col items-start justify-center py-2">
          <p className="mb-4 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium leading-relaxed sm:text-sm">
            {date}
          </p>
          <h2 className="font-display text-[1.1rem] font-bold leading-tight tracking-tight sm:text-[1.65rem]">
            {name}
          </h2>
          <p className="mt-4 text-sm leading-snug text-white/85 sm:text-base">
            {venue}
          </p>
          <div className="event-banner-brand mt-8 sm:mt-12">
            <Logo className="text-lg text-white sm:text-xl" />
          </div>
        </div>
        {image && (
          <div className="w-full max-w-72 justify-self-end overflow-hidden rounded-2xl shadow-2xl">
            <Image
              src={image}
              alt={`${name} event cover`}
              width={1080}
              height={1440}
              unoptimized
              priority
              sizes="(min-width: 1024px) 300px, 45vw"
              className="block h-auto w-full object-contain"
            />
          </div>
        )}
      </div>
    </section>
  );
}

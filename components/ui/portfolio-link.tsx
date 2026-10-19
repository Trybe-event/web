import { profileLinkHref } from "@/lib/connection-action";

export function PortfolioLink({ value }: { value: string }) {
  const href = profileLinkHref("portfolio", value);
  const website = href ? new URL(href) : null;
  const canOpen = website && !website.username && !website.password;
  const className =
    "inline-flex w-fit shrink-0 items-center justify-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink";
  return canOpen ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Portfolio (opens in a new tab)"
      className={`${className} transition-colors hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      Portfolio
    </a>
  ) : (
    <span className={className}>Portfolio</span>
  );
}

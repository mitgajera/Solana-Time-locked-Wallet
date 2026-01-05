import Link from "next/link";
import { Button } from "../ui/button";
import { ArrowUpRight } from "lucide-react";
import ThemeToggler from "../theme/toggler";
import { ConnetWalletButton } from "../murphy/connect-wallet-button";
import { siteConfig } from "../config/site.config";

export default function Header() {
  return (
    <div
      id="nav"
      className="w-full h-14 flex items-center justify-end border border-dashed divide-x"
    >
      <div
        id="brand"
        className="font-mono text-sm flex-1 flex items-center h-full px-3 border-dashed"
      >
        <Link href="/" className="hover:underline hidden md:inline-block">
          TIME-LOCKED WALLET
        </Link>
        <Link href="/" className="hover:underline md:hidden">
          TL WALLET
        </Link>
      </div>

      <Button
        className="h-full border-dashed"
        size="lg"
        variant="ghost"
        asChild
      >
      </Button>

      {Object.entries(siteConfig.socials).map(([key, value]) => {
        const Icon = value.icon;
        return (
          <Button
            key={key}
            variant="ghost"
            asChild
            className="h-full border-dashed aspect-square hidden md:flex"
          >
            <Link href={value.href} target="_blank" className="gap-2">
              <Icon className="size-4" />
            </Link>
          </Button>
        );
      })}

      <ConnetWalletButton className="h-full" />
      <ThemeToggler className="border-dashed h-full" />
    </div>
  );
}

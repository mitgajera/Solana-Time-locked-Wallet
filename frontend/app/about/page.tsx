import Link from "next/link";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="flex p-4 w-full items-center justify-center bg-background">
      <Card className="w-full max-w-6xl border-dashed border rounded-none shadow-none">
        <CardHeader className="border-b border-dashed pb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5" />
            <span className="text-sm font-mono">about_project.sh</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-0 font-mono">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">$</span>
              <span>project_info</span>
            </div>
            <div className="space-y-1 pl-6">
              <p className="text-lg font-semibold">Solana Time-Locked Wallet</p>
              <p className="text-muted-foreground">
                A decentralized application built on Solana blockchain that
                allows users to lock their SOL tokens for a specified duration.
                Features include secure time-based locking, automatic unlocking,
                and withdrawal functionality.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <span className="text-muted-foreground">$</span>
              <span>tech_stack</span>
            </div>
            <div className="pl-6 text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>Next.js (App Router)</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
                <li>Solana Web3.js</li>
                <li>@coral-xyz/anchor</li>
                <li>@solana/wallet-adapter</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <span className="text-muted-foreground">$</span>
              <span>features</span>
            </div>
            <div className="pl-6 text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>Create time-locked SOL deposits</li>
                <li>Customizable lock duration (minutes/hours/days)</li>
                <li>Real-time countdown timers</li>
                <li>Automatic unlocking at maturity</li>
                <li>Secure withdrawal mechanism</li>
                <li>Tabbed view for different timelock states</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <span className="text-muted-foreground">$</span>
              <span>blockchain</span>
            </div>
            <div className="pl-6 text-muted-foreground">
              <p>Built on Solana Devnet with Anchor Framework</p>
              <p>Program ID: 81YhjpVcTKih7aR8ruyHW9m5cmD6SskiJtwGj4sGFGgy</p>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <span className="text-muted-foreground">$</span>
              <span>status</span>
            </div>
            <div className="pl-6 text-muted-foreground">
              <p>Active Development 🚧</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 pt-6 border-t border-dashed mt-6">
          <Button
            variant="outline"
            className="flex-1 rounded-none border-dashed"
            asChild
          >
            <Link href="/">$ cd home</Link>
          </Button>
          <Button
            variant="outline"
            className="flex-1 w-full rounded-none border-dashed"
            asChild
          >
            <Link href="/">$ cd ..</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

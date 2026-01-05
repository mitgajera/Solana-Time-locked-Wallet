import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { WalletProvider } from "./wallet-provider";

export default function RootProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <Toaster position="top-right" closeButton />
      <WalletProvider>{children}</WalletProvider>
    </ThemeProvider>
  );
}

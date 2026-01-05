import HowItWorkCard from "@/components/how-it-work-card";
import Header from "@/components/layouts/header";
import TimeLockedWalletCard from "@/components/time-locked-wallet-card";

export default function Home() {
  return (
    <div className="w-full md:overflow-hidden flex flex-col items-center justify-center">
      <div className="flex w-full flex-col gap-4 my-10 items-center">
        <Header />
        <TimeLockedWalletCard />
        <HowItWorkCard />
      </div>
    </div>
  );
}

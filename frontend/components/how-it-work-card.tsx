import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Lock, Timer, Unlock } from "lucide-react";

export default function HowItWorkCard() {
  return (
    <Card className="mt-4 border-border">
      <CardHeader>
        <CardTitle>How It Works</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">Lock Funds</h3>
            <p className="text-sm text-muted-foreground">
              Deposit SOL or USDC into a secure time-locked account with your
              chosen unlock date.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Timer className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">Wait Period</h3>
            <p className="text-sm text-muted-foreground">
              Your funds are safely stored on-chain. Track the countdown until
              your unlock date.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Unlock className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">Withdraw</h3>
            <p className="text-sm text-muted-foreground">
              Once unlocked, withdraw your funds plus any earned rewards
              directly to your wallet.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

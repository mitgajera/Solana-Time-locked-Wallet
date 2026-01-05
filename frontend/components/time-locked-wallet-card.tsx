"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  Clock,
  RefreshCw,
  Unlock,
  CheckCircle,
  List,
} from "lucide-react";
import { useTimelockWallet } from "@/hook/use-timelock-wallet";
import { MINIMUM_AMOUNTS } from "@/lib/constants";
import Image from "next/image";

// Custom Coin Icon component for SOL
const CoinIcon = () => (
  <div className="flex items-center gap-2">
    <Image
      src="/sol.svg"
      alt="SOL"
      width={24}
      height={24}
      className="w-6 h-6"
    />
    <span>SOL</span>
  </div>
);

const CountdownTimer = ({ seconds }: { seconds: number }) => {
  if (seconds <= 0)
    return <span className="text-green-500 font-medium">Ready to unlock!</span>;

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {days}d {hours}h {minutes}m {secs}s left
      </span>
    );
  } else if (hours > 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {hours}h {minutes}m {secs}s left
      </span>
    );
  } else if (minutes > 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {minutes}m {secs}s left
      </span>
    );
  } else {
    return <span className="text-sm text-muted-foreground">{secs}s left</span>;
  }
};

export default function TimeLockedWalletCard() {
  const { publicKey } = useWallet();
  const { createSollock, getUserTimelocks, withdraw, loading } =
    useTimelockWallet();
  const [amount, setAmount] = useState("");
  const [lockDuration, setLockDuration] = useState("");
  const [durationType, setDurationType] = useState<
    "minutes" | "hours" | "days"
  >("hours");
  const [timelocks, setTimelocks] = useState<any[]>([]);
  const [loadingTimelocks, setLoadingTimelocks] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<{ [key: string]: number }>({});
  const [activeTab, setActiveTab] = useState<
    "all" | "ready" | "waiting" | "withdrawn"
  >("all");

  const categorizedTimelocks = {
    all: timelocks,
    ready: timelocks.filter((t) => t.isUnlocked && !t.isWithdrawn),
    waiting: timelocks.filter((t) => !t.isUnlocked && !t.isWithdrawn),
    withdrawn: timelocks.filter((t) => t.isWithdrawn),
  };

  const fetchTimelocks = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoadingTimelocks(true);
      const userTimelocks = await getUserTimelocks();
      setTimelocks(userTimelocks);
    } catch (error) {
      console.error("Failed to fetch timelocks:", error);
      toast.error("Failed to fetch timelocks", {
        description: "Please try refreshing the page",
      });
    } finally {
      setLoadingTimelocks(false);
    }
  }, [publicKey, getUserTimelocks]);

  // Countdown timer effect
  useEffect(() => {
    if (timelocks.length === 0) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const newCountdown: { [key: string]: number } = {};
      let shouldRefresh = false;

      timelocks.forEach((timelock) => {
        if (!timelock.isUnlocked && !timelock.isWithdrawn) {
          const timeRemaining = timelock.unlockTimestamp - now;
          if (timeRemaining > 0) {
            newCountdown[timelock.publicKey] = timeRemaining;
          } else {
            newCountdown[timelock.publicKey] = 0;
            shouldRefresh = true;
          }
        }
      });

      setCountdown(newCountdown);

      if (shouldRefresh) {
        setTimeout(() => {
          fetchTimelocks();
        }, 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timelocks, fetchTimelocks]);

  useEffect(() => {
    if (publicKey) {
      fetchTimelocks();
    } else {
      setTimelocks([]);
    }
  }, [publicKey, fetchTimelocks]);

  const handleCreateLock = async () => {
    if (!publicKey) {
      toast.error("Wallet Not Connected", {
        description: "Please connect your wallet first to create timelocks",
      });
      return;
    }

    const numAmount = parseFloat(amount);
    const numDuration = parseInt(lockDuration);

    if (isNaN(numAmount) || isNaN(numDuration)) {
      toast.error("Invalid Input", {
        description: "Please enter valid amount and duration values",
      });
      return;
    }

    // Validate minimum amount for SOL
    if (numAmount < MINIMUM_AMOUNTS.SOL) {
      toast.error("Amount Too Low", {
        description: `Minimum amount for SOL is ${MINIMUM_AMOUNTS.SOL}`,
      });
      return;
    }

    try {
      console.log("Creating SOL timelock with:", {
        amount: numAmount,
        duration: numDuration,
        durationType,
        token: "SOL",
        publicKey: publicKey.toString(),
      });

      const result = await createSollock(numAmount, numDuration, durationType);

      if (result) {
        console.log("SOL timelock created successfully:", result);
        toast.success("SOL Timelock Created!", {
          description: `Account: ${result.timelockAccount.slice(
            0,
            8
          )}...${result.timelockAccount.slice(
            -8
          )}\nSignature: ${result.signature.slice(
            0,
            8
          )}...${result.signature.slice(-8)}`,
          duration: 5000,
        });
        // Reset form
        setAmount("");
        setLockDuration("");
        fetchTimelocks();
      } else {
        toast.error("Failed to create SOL timelock", {
          description: "Please check your wallet balance and try again",
        });
      }
    } catch (err) {
      console.error("Failed to create timelock:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast.error("Timelock Creation Failed", {
        description: errorMessage,
        duration: 6000,
      });
    }
  };

  const handleWithdraw = async (timelockPublicKey: string) => {
    if (!publicKey) {
      toast.error("Wallet Not Connected", {
        description: "Please connect your wallet first to withdraw",
      });
      return;
    }

    try {
      setWithdrawing(timelockPublicKey);
      console.log("Withdrawing from timelock:", timelockPublicKey);

      const result = await withdraw(timelockPublicKey);

      if (result?.success) {
        console.log("Withdrawal successful:", result);
        toast.success("Withdrawal Successful!", {
          description: `Signature: ${result.signature.slice(
            0,
            8
          )}...${result.signature.slice(-8)}`,
          duration: 5000,
        });
        // Refresh timelocks after withdrawal
        fetchTimelocks();
      } else {
        toast.error("Withdrawal Failed", {
          description: "Please try again or check if the timelock is unlocked",
        });
      }
    } catch (err) {
      console.error("Failed to withdraw:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast.error("Withdrawal Failed", {
        description: errorMessage,
        duration: 6000,
      });
    } finally {
      setWithdrawing(null);
    }
  };

  const isFormValid =
    amount &&
    lockDuration &&
    parseFloat(amount) > 0 &&
    parseInt(lockDuration) > 0;

  return (
    <main className="w-full">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Create Time Lock */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Create SOL Time Lock
            </CardTitle>
            <CardDescription>
              Lock your SOL for a specified period. Funds will be secure until
              the unlock time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (SOL)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pr-24"
                  min={MINIMUM_AMOUNTS.SOL}
                  step="0.001"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <CoinIcon />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum: {MINIMUM_AMOUNTS.SOL} SOL
              </p>
            </div>

            {/* Duration Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="enter duration"
                  value={lockDuration}
                  onChange={(e) => setLockDuration(e.target.value)}
                  className="w-full"
                  min="1"
                />
                <Select
                  value={durationType}
                  onValueChange={(value: "minutes" | "hours" | "days") =>
                    setDurationType(value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreateLock}
              disabled={!isFormValid || loading}
              className="w-full h-10"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Create SOL Lock
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Time Locks */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Your Time Locks
                </CardTitle>
                <CardDescription>
                  View and manage your existing time-locked SOL
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTimelocks}
                disabled={loadingTimelocks}
                className="h-8 w-8 p-0"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loadingTimelocks ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTimelocks ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin" />
                <p>Loading your time locks...</p>
              </div>
            ) : timelocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No time locks created yet</p>
                <p className="text-sm">
                  Create your first SOL time lock to get started
                </p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex space-x-1 mb-4 p-1 bg-muted rounded-lg">
                  <Button
                    variant={activeTab === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("all")}
                    className="flex-1 h-8"
                  >
                    <List className="h-4 w-4 mr-2 hidden sm:inline" />
                    All ({timelocks.length})
                  </Button>
                  <Button
                    variant={activeTab === "ready" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("ready")}
                    className="flex-1 h-8"
                  >
                    <Unlock className="h-4 w-4 mr-2 hidden sm:inline" />
                    Ready ({categorizedTimelocks.ready.length})
                  </Button>
                  <Button
                    variant={activeTab === "waiting" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("waiting")}
                    className="flex-1 h-8"
                  >
                    <Clock className="h-4 w-4 mr-2 hidden sm:inline" />
                    Waiting ({categorizedTimelocks.waiting.length})
                  </Button>
                  <Button
                    variant={activeTab === "withdrawn" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("withdrawn")}
                    className="flex-1 h-8"
                  >
                    <CheckCircle className="h-4 w-4 mr-2 hidden sm:inline" />
                    Withdrawn ({categorizedTimelocks.withdrawn.length})
                  </Button>
                </div>

                {/* Tab Content */}
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {categorizedTimelocks[activeTab].map((timelock) => (
                    <div
                      key={timelock.publicKey}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src="/sol.svg"
                          alt="SOL"
                          width={40}
                          height={40}
                          className="w-10 h-10"
                        />
                        <div>
                          <p className="font-medium">{timelock.amount} SOL</p>
                          <p className="text-sm text-muted-foreground">
                            {timelock.isWithdrawn ? (
                              <>
                                <CheckCircle className="h-3 w-3 inline mr-1 text-gray-500" />
                                Withdrawn{" "}
                                {new Date(
                                  timelock.unlockTimestamp * 1000
                                ).toLocaleDateString()}
                              </>
                            ) : timelock.isUnlocked ? (
                              <>
                                <Unlock className="h-3 w-3 inline mr-1 text-green-500" />
                                Unlocked{" "}
                                {new Date(
                                  timelock.unlockTimestamp * 1000
                                ).toLocaleDateString()}
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 inline mr-1" />
                                Unlocks{" "}
                                {new Date(
                                  timelock.unlockTimestamp * 1000
                                ).toLocaleDateString()}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {timelock.isUnlocked && !timelock.isWithdrawn ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWithdraw(timelock.publicKey)}
                            disabled={withdrawing === timelock.publicKey}
                          >
                            {withdrawing === timelock.publicKey ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                                Withdrawing...
                              </>
                            ) : (
                              "Withdraw"
                            )}
                          </Button>
                        ) : timelock.isWithdrawn ? (
                          <span className="text-sm text-muted-foreground">
                            Already Withdrawn
                          </span>
                        ) : (
                          <CountdownTimer
                            seconds={
                              countdown[timelock.publicKey] ||
                              timelock.timeRemaining
                            }
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty state for active tab */}
                {categorizedTimelocks[activeTab].length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {activeTab === "all" && (
                      <>
                        <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No timelocks found</p>
                        <p className="text-sm">
                          Create a new SOL time lock to get started
                        </p>
                      </>
                    )}
                    {activeTab === "ready" && (
                      <>
                        <Unlock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No timelocks ready to withdraw</p>
                        <p className="text-sm">
                          Check the Waiting tab for locked timelocks
                        </p>
                      </>
                    )}
                    {activeTab === "waiting" && (
                      <>
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No timelocks waiting</p>
                        <p className="text-sm">
                          All your timelocks are either ready or withdrawn
                        </p>
                      </>
                    )}
                    {activeTab === "withdrawn" && (
                      <>
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No withdrawn timelocks</p>
                        <p className="text-sm">
                          Withdraw from your ready timelocks to see them here
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

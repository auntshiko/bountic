"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { approveBounty } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

type Props = {
  owner: string;
  repo: string;
  issueNumber: number;
  totalAmount: number;
};

export function ApproveButton({ owner, repo, issueNumber, totalAmount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const [splitText, setSplitText] = useState("");

  const onApprove = () => {
    setError(null);
    setSuccessTxHash(null);

    startTransition(async () => {
      try {
        const splitPayouts = splitText.trim() ? splitText.trim().split(/\\r?\\n/).map((line) => {
          const [githubUsername, rawAmount] = line.split(",").map((value) => value.trim());
          const amount = Number(rawAmount);
          if (!githubUsername || !Number.isFinite(amount) || amount <= 0) {
            throw new Error("Use one GitHub username and dollar amount per line, for example: alice, 6.00");
          }
          return { githubUsername, amount };
        }) : undefined;
        if (splitPayouts && Math.round(splitPayouts.reduce((sum, entry) => sum + entry.amount, 0) * 100) !== Math.round(totalAmount * 100)) {
          throw new Error("Split amounts must equal the bounty total exactly");
        }
        const response = await approveBounty({ owner, repo, issueNumber, splitPayouts });
        const { payoutType, recipientEmail, recipientWallet } = response.payout;
        
        let message = "";
        if (payoutType === "wallet" && recipientWallet) {
          message = `Payout sent to wallet ${recipientWallet.slice(0, 6)}...${recipientWallet.slice(-4)}`;
        } else if (payoutType === "email" && recipientEmail) {
          message = `Payout sent to ${recipientEmail}`;
        } else if (payoutType === "unclaimed") {
          message = "Winner not connected. Notified via issue comment to claim.";
        }
        
        setSuccessTxHash(message);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to approve payout");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Maintainer Action</p>
      <p className="mt-2 text-sm text-zinc-300">PR is merged and bounty is locked. Approve payout to release funds.</p>
      <label className="mt-4 block text-sm text-zinc-300">\n        Split payout (optional)\n        <textarea\n          className="mt-2 block w-full rounded border border-zinc-600 bg-zinc-950 p-2 text-white"\n          value={splitText}\n          onChange={(event) => setSplitText(event.target.value)}\n          disabled={isPending}\n          rows={3}\n          placeholder={"alice, 6.00\\nbob, 4.00"}\n        />\n      </label>\n      <p className="mt-2 text-xs text-zinc-400">One GitHub username and USDC amount per line. Total must equal ${totalAmount.toFixed(2)}. Leave blank for the winning PR author.</p>\n      <Button\n        onClick={onApprove}
        disabled={isPending}
        className="mt-4 h-10 w-full bg-emerald-400 text-black hover:bg-emerald-300"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Approving...
          </>
        ) : (
          "Approve Payment"
        )}
      </Button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {successTxHash ? (
        <p className="mt-3 text-sm text-emerald-300">{successTxHash}</p>
      ) : null}
    </div>
  );
}

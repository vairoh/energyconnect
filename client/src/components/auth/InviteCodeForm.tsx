import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface InviteCodeFormProps {
  onSuccess: (invitedByUserId: number, code: string) => void;
}

export function InviteCodeForm({ onSuccess }: InviteCodeFormProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!code.trim()) {
      toast({
        title: "Enter a code",
        description: "Invite code cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data.invitedByUserId, code.trim());
      } else {
        toast({
          title: "Invalid Code",
          description: data.message || "This code is invalid or already used.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while validating the code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow-sm rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-center">
        Enter Invite Code
      </h2>
      <Input
        placeholder="Enter your invite code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <Button
        className="w-full mt-4"
        onClick={handleValidate}
        disabled={loading}
      >
        {loading ? "Validating..." : "Continue"}
      </Button>
    </div>
  );
}

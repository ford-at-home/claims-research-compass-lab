import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Sign in — Claims Research Lab" },
      { name: "description", content: "Sign in to run and store live research in the Claims Research Lab." },
      { property: "og:title", content: "Sign in — Claims Research Lab" },
      { property: "og:description", content: "Authenticated access for live research runs." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg(error.message);
        else { setPassword(""); await nav({ to: "/" }); }
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (error) setMsg(error.message);
        else if (!data.session) { setPassword(""); setMsg("Check your email to confirm the account, then sign in."); }
        else { setPassword(""); await nav({ to: "/" }); }
      }
    } catch {
      setMsg("Sign-in service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border bg-card p-6">
      <h1 className="text-lg font-semibold">{mode === "in" ? "Sign in" : "Create account"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live research and stored runs are scoped to your account. Fixture mode works without signing in.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
        </div>
        <div>
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
        </div>
        {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}
        </Button>
      </form>
      <Button variant="link" className="mt-3 h-auto whitespace-normal px-0 text-sm" disabled={busy} onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); setPassword(""); }}>
        {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </Button>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function AuthStatus() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user)
    return (
      <Button asChild size="sm" variant="outline">
        <Link to="/auth">Sign in for live research</Link>
      </Button>
    );
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline">{user.email}</span>
      <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </div>
  );
}

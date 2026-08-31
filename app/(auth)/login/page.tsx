"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { getClientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Zadejte platný e-mail"),
  password: z.string().min(1, "Zadejte heslo"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setError(null);

    try {
      const auth = getClientAuth();
      const credential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        throw new Error("Session creation failed");
      }

      const defaultPage =
        typeof window !== "undefined"
          ? localStorage.getItem("spx-default-page")
          : null;
      router.push(defaultPage || "/");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string }).code;
      switch (code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Nesprávný e-mail nebo heslo");
          break;
        case "auth/too-many-requests":
          setError("Příliš mnoho pokusů. Zkuste to později.");
          break;
        case "auth/user-disabled":
          setError("Účet byl deaktivován");
          break;
        default:
          setError("Přihlášení se nezdařilo");
      }
    }
  }

  async function handleReset() {
    setError(null);
    const email = getValues("email");
    if (!email) {
      setError("Nejdřív vyplňte e-mail, pošleme na něj odkaz pro reset.");
      return;
    }
    try {
      const auth = getClientAuth();
      await sendPasswordResetEmail(auth, email);
    } catch {
      // Neutrální hláška — neprozrazujeme, jestli účet existuje.
    }
    setResetSent(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="vy@solopixel.cz"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Heslo</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    onClick={handleReset}
                  >
                    Zapomenuté heslo?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {resetSent && (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Pokud účet existuje, poslali jsme e-mail s odkazem pro reset
                  hesla.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Přihlašování..." : "Přihlásit se"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

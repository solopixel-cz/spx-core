"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getClientAuth } from "@/lib/firebase/client";
import { getClientStorage } from "@/lib/firebase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { Camera, Trash2, Save } from "lucide-react";
import { useTheme } from "next-themes";

const profileSchema = z.object({
  displayName: z.string().min(2, "Jméno musí mít alespoň 2 znaky"),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Zadejte současné heslo"),
    newPassword: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
    confirmPassword: z.string().min(1, "Potvrďte nové heslo"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hesla se neshodují",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof changePasswordSchema>;

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  phone: string | null;
  photoURL: string | null;
  commissionRate: number | null;
  createdAt: string | null;
  lastSignIn: string | null;
}

const roleLabels: Record<string, string> = {
  admin: "Administrátor",
  member: "Člen",
  sales: "Obchodník",
};

const defaultPages = [
  { value: "/", label: "Dashboard" },
  { value: "/leady", label: "Leady" },
  { value: "/klienti", label: "Klienti" },
  { value: "/prospekti", label: "Prospekti" },
  { value: "/ukoly", label: "Úkoly" },
  { value: "/tickety", label: "Tickety" },
];

export default function ProfilPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [defaultPage, setDefaultPage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("spx-default-page") || "/";
    }
    return "/";
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UserProfile | null) => {
        if (data) {
          setProfile(data);
          profileForm.reset({
            displayName: data.displayName,
            phone: data.phone ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onProfileSubmit(data: ProfileForm) {
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: data.displayName,
          phone: data.phone?.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profil uložen");
      setProfile((prev) => prev ? { ...prev, displayName: data.displayName, phone: data.phone || null } : null);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se uložit profil");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Nahrajte obrázek");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Maximální velikost je 2 MB");
      return;
    }

    setUploading(true);
    try {
      // Client-side resize to 256x256
      const bitmap = await createImageBitmap(file);
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;

      // Center crop to square
      const minDim = Math.min(bitmap.width, bitmap.height);
      const sx = (bitmap.width - minDim) / 2;
      const sy = (bitmap.height - minDim) / 2;
      ctx.drawImage(bitmap, sx, sy, minDim, minDim, 0, 0, size, size);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85)
      );

      const storage = getClientStorage();
      const storageRef = ref(storage, `avatars/${profile!.uid}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const downloadURL = await getDownloadURL(storageRef);

      // Save to profile
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoURL: downloadURL }),
      });

      setProfile((prev) => prev ? { ...prev, photoURL: downloadURL } : null);
      toast.success("Fotka nahrána");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se nahrát fotku");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    setSaving(true);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoURL: null }),
      });
      setProfile((prev) => prev ? { ...prev, photoURL: null } : null);
      toast.success("Fotka odebrána");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odebrat fotku");
    } finally {
      setSaving(false);
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setPasswordError(null);
    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Uživatel není přihlášen");

      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);

      toast.success("Heslo bylo změněno");
      passwordForm.reset();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPasswordError("Nesprávné současné heslo");
      } else if (code === "auth/weak-password") {
        setPasswordError("Nové heslo je příliš slabé");
      } else {
        setPasswordError("Nepodařilo se změnit heslo");
      }
    }
  }

  function handleDefaultPageChange(value: string | null) {
    if (!value) return;
    setDefaultPage(value);
    localStorage.setItem("spx-default-page", value);
    toast.success("Výchozí stránka uložena");
  }

  if (loading) return <p className="text-muted-foreground">Načítám...</p>;
  if (!profile) return <p className="text-muted-foreground">Nepodařilo se načíst profil</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={profile.displayName}>
        <p className="text-sm text-muted-foreground">{roleLabels[profile.role] ?? profile.role}</p>
      </PageHeader>

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="zabezpeceni">Zabezpečení</TabsTrigger>
          <TabsTrigger value="preference">Preference</TabsTrigger>
        </TabsList>

        {/* Tab: Profil */}
        <TabsContent value="profil" className="mt-6 space-y-6">
          {/* Photo */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <UserAvatar
                  uid={profile.uid}
                  name={profile.displayName}
                  photoURL={profile.photoURL}
                  size="lg"
                  className="h-20 w-20"
                />
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {uploading ? "Nahrávám..." : "Nahrát fotku"}
                    </Button>
                    {profile.photoURL && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePhoto}
                        disabled={saving}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Odebrat
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max 2 MB, obrázek bude zmenšen na 256×256
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile form */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Jméno</Label>
                  <Input id="displayName" {...profileForm.register("displayName")} />
                  {profileForm.formState.errors.displayName && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.displayName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" {...profileForm.register("phone")} placeholder="+420..." />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={profile.email} disabled />
                  <p className="text-xs text-muted-foreground">E-mail mění administrátor</p>
                </div>
                {profile.role === "sales" && (
                  <div className="space-y-2">
                    <Label>Sazba provize</Label>
                    <Input
                      value={profile.commissionRate !== null ? `${Math.round(profile.commissionRate * 100)} %` : "Výchozí"}
                      disabled
                    />
                  </div>
                )}
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Ukládám..." : "Uložit"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Zabezpečení */}
        <TabsContent value="zabezpeceni" className="mt-6 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Změna hesla</h3>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Současné heslo</Label>
                  <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword")} />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nové heslo</Label>
                  <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Potvrzení nového hesla</Label>
                  <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? "Měním heslo..." : "Změnit heslo"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Informace o účtu</h3>
              <dl className="space-y-2 text-sm max-w-md">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vytvořen</dt>
                  <dd>{profile.createdAt ? new Date(profile.createdAt).toLocaleString("cs-CZ") : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Poslední přihlášení</dt>
                  <dd>{profile.lastSignIn ? new Date(profile.lastSignIn).toLocaleString("cs-CZ") : "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Preference */}
        <TabsContent value="preference" className="mt-6 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6 max-w-md">
              <div className="space-y-2">
                <Label>Vzhled</Label>
                <Select value={theme ?? "system"} onValueChange={(val: string | null) => val && setTheme(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Světlý</SelectItem>
                    <SelectItem value="dark">Tmavý</SelectItem>
                    <SelectItem value="system">Podle systému</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Výchozí stránka po přihlášení</Label>
                <Select value={defaultPage} onValueChange={handleDefaultPageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultPages.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Po přihlášení budete přesměrováni na tuto stránku</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

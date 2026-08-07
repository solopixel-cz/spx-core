import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { RefreshProvider } from "@/components/refresh-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user document for displayName and photoURL
  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(user.uid).get();
  const userData = userDoc.data();
  const displayName = (userData?.displayName as string) ?? user.email;
  const photoURL = (userData?.photoURL as string) ?? null;

  return (
    <div className="flex h-screen">
      <div className="hidden md:flex">
        <AppSidebar role={user.role} />
      </div>
      <RefreshProvider>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppTopbar user={user} displayName={displayName} photoURL={photoURL} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </RefreshProvider>
    </div>
  );
}

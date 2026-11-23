import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { RefreshProvider } from "@/components/refresh-context";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  /** Modály přes intercepting routes (`@modal`), např. detail ticketu. */
  modal: React.ReactNode;
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
          {/* Od lg je obsah box uprostřed (max. šířka pro pohodlnou
              práci na širokém monitoru); menší displeje mají obsah přes celou šířku. */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-8 md:py-8 lg:p-6">
            <div className="mx-auto w-full max-w-[1600px] lg:min-h-full lg:rounded-xl lg:border lg:bg-background lg:p-8">
              {children}
            </div>
          </main>
          {modal}
        </div>
      </RefreshProvider>
    </div>
  );
}

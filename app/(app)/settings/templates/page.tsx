import { redirect } from "next/navigation";

// E-mailové šablony jsou v Email marketingu → Šablony.
export default function SablonyPage() {
  redirect("/email-marketing?tab=templates");
}

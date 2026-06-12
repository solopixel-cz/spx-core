import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const avatarColors = [
  "bg-teal-600", "bg-sky-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-emerald-600", "bg-indigo-600", "bg-orange-600",
];

function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

interface UserAvatarProps {
  uid: string;
  name: string;
  photoURL?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function UserAvatar({ uid, name, photoURL, size = "default", className }: UserAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {photoURL && <AvatarImage src={photoURL} alt={name} />}
      <AvatarFallback className={cn("text-white font-medium", getAvatarColor(uid))}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

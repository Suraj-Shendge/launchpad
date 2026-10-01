import { Check } from "lucide-react";
import type { ProfileTier } from "@/lib/profile";

export function ProfileBadge({tier}:{tier:ProfileTier}){
 if(!tier.isVerified)return null;
 return <span className={"profile-badge "+tier.badgeClass} title={tier.badgeLabel} aria-label={tier.badgeLabel}><Check size={11} strokeWidth={3}/></span>;
}

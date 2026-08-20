"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/actions/profiel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { suggestInitialen } from "@/lib/initials";
import type { Profile } from "@/lib/supabase/types";

export function AvatarUpload({ profile }: { profile: Profile }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [bezig, setBezig] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBezig(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/avatar.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) {
        setError("Uploaden van de foto is mislukt.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const nieuweUrl = `${data.publicUrl}?v=${Date.now()}`;
      const result = await updateAvatarUrl(nieuweUrl);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAvatarUrl(nieuweUrl);
      router.refresh();
    } finally {
      setBezig(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="h-16 w-16">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="bg-primary text-lg text-primary-foreground font-medium">
          {profile.initialen || suggestInitialen(profile.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
        <Button type="button" variant="outline" size="sm" disabled={bezig} onClick={() => inputRef.current?.click()}>
          {bezig ? "Bezig…" : "Foto wijzigen"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

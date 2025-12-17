import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { PlaylistCard } from "@/components/PlaylistCard";
import { ResourcePlaylist } from "@/types/learning";

export default async function PlaylistsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch active playlists with platform info
  const { data: playlists, error } = await supabase
    .from("resource_playlists")
    .select(`
      *,
      platform:resource_platforms (
        id,
        name,
        name_ar,
        base_url
      )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching playlists:", error);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Learning Playlists
          </h1>
          <p className="text-slate-600">
            Curated collections of learning resources to help you master your skills
          </p>
        </div>

        {/* Playlists Grid */}
        {playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist: ResourcePlaylist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">No playlists available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}


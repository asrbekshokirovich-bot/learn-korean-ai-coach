import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Search, Download, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Recording {
  id: string;
  title: string | null;
  recording_url: string;
  lesson_date: string;
  duration_seconds: number | null;
  file_size: number | null;
  thumbnail_url: string | null;
  created_at: string;
  groups: {
    id: string;
    name: string;
    level: string;
  } | null;
}

const Recordings = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  const [deleteRecording, setDeleteRecording] = useState<Recording | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    filterRecordings();
  }, [searchQuery, recordings]);

  const loadRecordings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("lesson_recordings")
        .select(`
          *,
          groups:groups!lesson_recordings_group_id_fkey(
            id,
            name,
            level
          )
        `)
        .eq("created_by", user.id)
        .order("lesson_date", { ascending: false });

      if (error) throw error;

      setRecordings(data || []);
    } catch (error: any) {
      toast.error("Failed to load recordings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecordings = () => {
    if (!searchQuery.trim()) {
      setFilteredRecordings(recordings);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = recordings.filter((rec) => {
      const groupName = rec.groups?.name?.toLowerCase() || "";
      const title = rec.title?.toLowerCase() || "";
      const level = rec.groups?.level?.toLowerCase() || "";
      return groupName.includes(query) || title.includes(query) || level.includes(query);
    });

    setFilteredRecordings(filtered);
  };

  const handleDelete = async () => {
    if (!deleteRecording) return;

    try {
      // Delete from storage
      const urlParts = deleteRecording.recording_url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const { error: storageError } = await supabase.storage
        .from("lesson-recordings")
        .remove([fileName]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("lesson_recordings")
        .delete()
        .eq("id", deleteRecording.id);

      if (dbError) throw dbError;

      toast.success("Recording deleted successfully");
      setRecordings(recordings.filter((r) => r.id !== deleteRecording.id));
      setDeleteRecording(null);
    } catch (error: any) {
      toast.error("Failed to delete recording");
      console.error(error);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading recordings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Lesson Recordings</h2>
        <p className="text-muted-foreground">
          Access and manage recordings from your lessons
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {playingRecording && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Now Playing</span>
              <Button variant="ghost" onClick={() => setPlayingRecording(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <video
              src={playingRecording.recording_url}
              controls
              className="w-full rounded-lg"
              autoPlay
            />
            <div className="mt-4">
              <h3 className="font-semibold text-lg">
                {playingRecording.title || "Untitled Recording"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {playingRecording.groups?.name} - {playingRecording.groups?.level}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredRecordings.length === 0 ? (
        <Card className="p-8 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Recordings Found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "No recordings match your search."
              : "Your lesson recordings will appear here."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRecordings.map((recording) => (
            <Card key={recording.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-32 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    {recording.thumbnail_url ? (
                      <img
                        src={recording.thumbnail_url}
                        alt="Thumbnail"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Video className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {recording.title || "Untitled Recording"}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {recording.groups?.name || "Unknown Group"}
                      </Badge>
                      <Badge variant="secondary">
                        {recording.groups?.level || "N/A"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {format(new Date(recording.lesson_date), "MMM dd, yyyy")}
                      </span>
                      <span>{formatDuration(recording.duration_seconds)}</span>
                      <span>{formatFileSize(recording.file_size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPlayingRecording(recording)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = recording.recording_url;
                        a.download = `recording-${recording.lesson_date}.webm`;
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteRecording(recording)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteRecording} onOpenChange={(open) => !open && setDeleteRecording(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recording? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Recordings;

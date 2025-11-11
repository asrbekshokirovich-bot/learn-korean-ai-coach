import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Play, Calendar, Clock, Download, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Recordings = () => {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [selectedRecording, setSelectedRecording] = useState<any>(null);

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

      // Get all group enrollments
      const { data: enrollments } = await supabase
        .from("group_enrollments")
        .select("group_id")
        .eq("student_id", user.id)
        .eq("status", "active");

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const groupIds = enrollments.map(e => e.group_id);

      // Load recordings for enrolled groups
      const { data, error } = await supabase
        .from("lesson_recordings")
        .select(`
          *,
          groups:groups!lesson_recordings_group_id_fkey(name, level)
        `)
        .in("group_id", groupIds)
        .order("lesson_date", { ascending: false });

      if (error) throw error;

      setRecordings(data || []);

      // Build group names map
      if (data) {
        const names = Object.fromEntries(
          data.map((r: any) => [r.group_id, r.groups?.name || 'Unknown Group'])
        );
        setGroupNames(names);
      }
    } catch (error: any) {
      console.error("Error loading recordings:", error);
      toast.error("Failed to load recordings");
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
    const filtered = recordings.filter((recording) => {
      const groupName = groupNames[recording.group_id]?.toLowerCase() || "";
      const title = recording.title?.toLowerCase() || "";
      const level = recording.groups?.level?.toLowerCase() || "";
      const date = format(new Date(recording.lesson_date), "PPP").toLowerCase();

      return (
        groupName.includes(query) ||
        title.includes(query) ||
        level.includes(query) ||
        date.includes(query)
      );
    });

    setFilteredRecordings(filtered);
  };

  const getSignedUrl = async (recording: any) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('lesson-recordings')
        .createSignedUrl(recording.recording_url, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      toast.error("Failed to load video");
      return null;
    }
  };

  const playRecording = async (recording: any) => {
    const url = await getSignedUrl(recording);
    if (url) {
      setSelectedRecording({ ...recording, playbackUrl: url });
    }
  };

  const downloadRecording = async (recording: any) => {
    try {
      const url = await getSignedUrl(recording);
      if (!url) return;

      const link = document.createElement('a');
      link.href = url;
      link.download = recording.title || `lesson-${format(new Date(recording.lesson_date), 'yyyy-MM-dd')}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download started");
    } catch (error) {
      console.error("Error downloading recording:", error);
      toast.error("Failed to download recording");
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading recordings...</div>;
  }

  if (selectedRecording) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedRecording(null)}>
          ← Back to Recordings
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{selectedRecording.title || `Lesson - ${format(new Date(selectedRecording.lesson_date), "PPP")}`}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{groupNames[selectedRecording.group_id]}</Badge>
              <Badge variant="outline">{selectedRecording.groups?.level}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <video
              src={selectedRecording.playbackUrl}
              controls
              className="w-full rounded-lg bg-black"
              controlsList="nodownload"
            />
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedRecording.lesson_date), "PPP")}
                </span>
                {selectedRecording.duration_seconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(selectedRecording.duration_seconds)}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadRecording(selectedRecording)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Lesson Recordings</h2>
        <p className="text-muted-foreground">Watch recordings of your past group lessons</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by group name, level, or date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Recordings Grid */}
      {filteredRecordings.length === 0 ? (
        <Card className="p-12 text-center">
          <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? "No recordings found" : "No Recordings Yet"}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search query"
              : "Lesson recordings will appear here after your classes"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecordings.map((recording) => (
            <Card key={recording.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-muted">
                {recording.thumbnail_url ? (
                  <img
                    src={recording.thumbnail_url}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    size="lg"
                    onClick={() => playRecording(recording)}
                    className="rounded-full"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Play
                  </Button>
                </div>
              </div>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-2 line-clamp-1">
                  {recording.title || `Lesson - ${format(new Date(recording.lesson_date), "MMM d, yyyy")}`}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{groupNames[recording.group_id]}</Badge>
                    <Badge variant="outline">{recording.groups?.level}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(recording.lesson_date), "MMM d, yyyy")}
                    </span>
                    {recording.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.duration_seconds)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recordings;
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";

export const StoryUpload = () => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Please select an image or video file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setFileType(file.type.startsWith('image/') ? 'image' : 'video');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('student-stories')
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('student-stories')
        .getPublicUrl(filePath);

      // Create story record
      const { error: insertError } = await supabase
        .from('student_stories')
        .insert({
          student_id: user.id,
          file_url: publicUrl,
          file_type: fileType!,
          caption: caption.trim() || null
        });

      if (insertError) throw insertError;

      toast.success('Story uploaded successfully!');
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Error uploading story');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setPreview(null);
    setFileType(null);
    setCaption("");
    setSelectedFile(null);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 shadow-elegant hover:shadow-glow transition-all duration-300"
      >
        <Plus className="w-4 h-4" />
        Add Story
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Your Story</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!preview ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <label htmlFor="story-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-primary" />
                      </div>
                      <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                        <Video className="w-8 h-8 text-accent" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Click to upload</p>
                      <p className="text-sm text-muted-foreground">Image or Video (max 50MB)</p>
                    </div>
                  </div>
                </label>
                <input
                  id="story-upload"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black max-h-[400px] flex items-center justify-center">
                  {fileType === 'image' ? (
                    <img src={preview} alt="Preview" className="max-w-full max-h-[400px] object-contain" />
                  ) : (
                    <video src={preview} controls className="max-w-full max-h-[400px] object-contain" />
                  )}
                </div>

                <Textarea
                  placeholder="Add a caption (optional)..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="resize-none"
                  rows={3}
                  maxLength={200}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={uploading}
                    className="flex-1"
                  >
                    Change
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Share Story'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
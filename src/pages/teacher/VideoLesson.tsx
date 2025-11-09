import DashboardRoute from "@/components/DashboardRoute";
import { VideoLessonRoom } from "@/components/VideoLessonRoom";

const VideoLesson = () => {
  return (
    <DashboardRoute>
      <VideoLessonRoom userRole="teacher" />
    </DashboardRoute>
  );
};

export default VideoLesson;
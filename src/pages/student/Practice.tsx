import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Mic, BookOpen, Brain } from "lucide-react";
import AIConversation from "@/components/practice/AIConversation";
import PronunciationPractice from "@/components/practice/PronunciationPractice";
import GrammarDrills from "@/components/practice/GrammarDrills";
import VocabularyBuilder from "@/components/practice/VocabularyBuilder";

const Practice = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">AI Practice</h2>
        <p className="text-muted-foreground">
          Practice Korean with AI-powered tools
        </p>
      </div>

      <Tabs defaultValue="conversation" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="conversation" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Conversation</span>
          </TabsTrigger>
          <TabsTrigger value="pronunciation" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Pronunciation</span>
          </TabsTrigger>
          <TabsTrigger value="grammar" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Grammar</span>
          </TabsTrigger>
          <TabsTrigger value="vocabulary" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Vocabulary</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversation" className="mt-6">
          <AIConversation />
        </TabsContent>

        <TabsContent value="pronunciation" className="mt-6">
          <PronunciationPractice />
        </TabsContent>

        <TabsContent value="grammar" className="mt-6">
          <GrammarDrills />
        </TabsContent>

        <TabsContent value="vocabulary" className="mt-6">
          <VocabularyBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Practice;

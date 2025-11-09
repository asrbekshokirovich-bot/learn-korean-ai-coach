import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, TrendingUp } from "lucide-react";

interface AIAssistancePanelProps {
  liveFeedback: any[];
  onRequestHelp: () => void;
}

export const AIAssistancePanel = ({ liveFeedback, onRequestHelp }: AIAssistancePanelProps) => {
  const latestFeedback = liveFeedback[liveFeedback.length - 1];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Assistant
        </h3>
        <Button size="sm" variant="outline" onClick={onRequestHelp}>
          Ask AI
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {/* Latest Feedback */}
          {latestFeedback && (
            <div className="space-y-2">
              {/* Pronunciation Score */}
              {latestFeedback.pronunciationScore && (
                <div className="bg-primary/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Pronunciation</span>
                    <span className="text-sm font-bold text-primary">{latestFeedback.pronunciationScore}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${latestFeedback.pronunciationScore}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Live Tip */}
              {latestFeedback.tip && (
                <div className="bg-accent/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">💡 Tip</p>
                  <p className="text-sm">{latestFeedback.tip}</p>
                </div>
              )}

              {/* Grammar Fix */}
              {latestFeedback.grammarFix && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">✏️ Grammar</p>
                  <p className="text-sm">{latestFeedback.grammarFix}</p>
                </div>
              )}

              {/* Suggested Phrase */}
              {latestFeedback.suggestedPhrase && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">📝 Try This</p>
                  <p className="text-sm font-medium">{latestFeedback.suggestedPhrase}</p>
                </div>
              )}
            </div>
          )}

          {/* Previous Feedback History */}
          {liveFeedback.length > 1 && (
            <div className="pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Recent Tips
              </p>
              <div className="space-y-2">
                {liveFeedback.slice(-5, -1).reverse().map((feedback, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    {feedback.tip || feedback.grammarFix}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {liveFeedback.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">AI will provide live feedback as you speak</p>
              <p className="text-xs mt-1">Click "Ask AI" anytime for help</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
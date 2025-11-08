import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "student" | "teacher";
}

const SignUpDialog = ({ open, onOpenChange, defaultTab = "student" }: SignUpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Get Started with Korean AI</DialogTitle>
          <DialogDescription>
            Choose your role to create your account
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student">I'm a Student</TabsTrigger>
            <TabsTrigger value="teacher">I'm a Teacher</TabsTrigger>
          </TabsList>

          <TabsContent value="student" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="student-email">Email</Label>
              <Input id="student-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password">Password</Label>
              <Input id="student-password" type="password" placeholder="••••••••" />
            </div>
            <Button className="w-full" variant="hero">
              Start Learning Free
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By signing up, you agree to our Terms & Privacy Policy
            </p>
          </TabsContent>

          <TabsContent value="teacher" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-email">Email</Label>
              <Input id="teacher-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-password">Password</Label>
              <Input id="teacher-password" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-cert">TOPIK Certification (Optional)</Label>
              <Input id="teacher-cert" placeholder="Level 6" />
            </div>
            <Button className="w-full" variant="hero">
              Join as Teacher
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Earn 75-80% of lesson fees. Platform fee: 20-25%
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpDialog;
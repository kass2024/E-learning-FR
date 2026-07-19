import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Construction } from "lucide-react";

type Props = {
  title: string;
  description: string;
  backTo?: string;
  backLabel?: string;
};

const ComingSoonPanel = ({ title, description, backTo = "/dashboard/learner", backLabel = "Back to dashboard" }: Props) => {
  const navigate = useNavigate();

  return (
    <Card className="max-w-lg mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
          <Construction className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          This feature is planned for a future release. Your enrolled courses and live classes are available now.
        </p>
        <Button onClick={() => navigate(backTo)}>{backLabel}</Button>
      </CardContent>
    </Card>
  );
};

export default ComingSoonPanel;

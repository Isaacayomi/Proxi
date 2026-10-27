import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-3 text-muted-foreground max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8">
        <Link href="/">
          <Button variant="primary">Return to Home</Button>
        </Link>
      </div>
    </div>
  );
}

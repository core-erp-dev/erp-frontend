import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <FileX className="h-8 w-8 text-gray-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Page not found</h2>
      <p className="text-gray-500">The page you are looking for does not exist.</p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">Go back home</Link>
      </Button>
    </div>
  );
}

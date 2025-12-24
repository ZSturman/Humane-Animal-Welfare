import { Heart } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Heart className="h-12 w-12 text-primary-600 animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

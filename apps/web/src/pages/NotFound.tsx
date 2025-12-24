import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, PawPrint } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page Not Found | Shelter Link</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <PawPrint className="h-24 w-24 text-slate-200" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-slate-400">
                404
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Page not found
          </h1>
          <p className="text-slate-500 mb-8 max-w-md">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved or doesn't exist.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="btn btn-primary">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
            <Link to="/animals" className="btn btn-secondary">
              <PawPrint className="h-4 w-4" />
              View Animals
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

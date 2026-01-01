import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  PawPrint,
  ChevronDown,
  X,
  Globe,
} from 'lucide-react';
import { api } from '@/lib/api';
import RiskSeverityBadge from '@/components/risk/RiskSeverityBadge';
import clsx from 'clsx';

interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  estimatedAge: string;
  status: string;
  daysInShelter: number;
  locationName: string;
  urgencyScore: number;
  riskSeverity: string;
  primaryPhotoUrl: string | null;
}

interface AnimalsResponse {
  animals: Animal[];
  total: number;
}

const speciesOptions = [
  'DOG',
  'CAT',
  'RABBIT',
  'BIRD',
  'REPTILE',
  'SMALL_MAMMAL',
  'OTHER',
];

const statusOptions = [
  'IN_SHELTER',
  'IN_FOSTER',
  'IN_MEDICAL',
  'AVAILABLE',
  'ON_HOLD',
  'PENDING_ADOPTION',
];

export default function Animals() {
  const { t } = useTranslation(['animals', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const species = searchParams.get('species') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading } = useQuery({
    queryKey: ['animals', search, species, status, page],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit: '20',
        offset: String((page - 1) * 20),
      };
      if (search) params.search = search;
      if (species) params.species = species;
      if (status) params.status = status;

      const response = await api.get<AnimalsResponse>('/animals', params);
      return response;
    },
  });

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('page'); // Reset to page 1
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasFilters = search || species || status;

  return (
    <>
      <Helmet>
        <title>Animals | Shelter Link</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Animals</h1>
            <p className="text-slate-500 mt-1">
              {data?.meta?.total ?? 0} animals in your organization
            </p>
          </div>

          <Link to="/animals/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Animal
          </Link>
        </div>

        {/* Search and filters */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder={t('search.placeholder')}
                value={search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'btn btn-secondary',
                hasFilters && 'ring-2 ring-primary-500'
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasFilters && (
                <span className="ml-1 h-5 w-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
                  {[species, status].filter(Boolean).length}
                </span>
              )}
              <ChevronDown
                className={clsx(
                  'h-4 w-4 transition-transform',
                  showFilters && 'rotate-180'
                )}
              />
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-3 gap-4">
              {/* Species filter */}
              <div>
                <label className="label">Species</label>
                <select
                  value={species}
                  onChange={(e) => updateFilter('species', e.target.value)}
                  className="input"
                >
                  <option value="">All Species</option>
                  {speciesOptions.map((s) => (
                    <option key={s} value={s}>
                      {t(`species.${s.toLowerCase()}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div>
                <label className="label">Status</label>
                <select
                  value={status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="input"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {t(`status.${s.toLowerCase()}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters */}
              {hasFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="btn btn-ghost text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton h-48 rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-5 w-24" />
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.data?.animals?.length === 0 ? (
          <div className="card p-12 text-center">
            <PawPrint className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              No animals found
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              {hasFilters
                ? 'Try adjusting your filters or search term.'
                : 'Start by adding your first animal to the system.'}
            </p>
            {hasFilters ? (
              <button onClick={clearFilters} className="btn btn-secondary">
                Clear Filters
              </button>
            ) : (
              <Link to="/animals/new" className="btn btn-primary">
                <Plus className="h-4 w-4" />
                Add First Animal
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data?.data?.animals?.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} />
              ))}
            </div>

            {/* Pagination */}
            {data?.meta && data.meta.total > 20 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    updateFilter('page', String(Math.max(1, page - 1)))
                  }
                  disabled={page <= 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} of {Math.ceil(data.meta.total / 20)}
                </span>
                <button
                  onClick={() => updateFilter('page', String(page + 1))}
                  disabled={page >= Math.ceil(data.meta.total / 20)}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function AnimalCard({ animal }: { animal: Animal }) {
  const { t } = useTranslation('animals');

  return (
    <Link to={`/animals/${animal.id}`} className="card group">
      {/* Photo */}
      <div className="relative h-48 bg-slate-200">
        {animal.primaryPhotoUrl ? (
          <img
            src={animal.primaryPhotoUrl}
            alt={animal.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <PawPrint className="h-16 w-16 text-slate-300" />
          </div>
        )}

        {/* Risk badge overlay */}
        {animal.urgencyScore >= 40 && (
          <div className="absolute top-2 right-2">
            <RiskSeverityBadge severity={animal.riskSeverity} />
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-slate-700">
            {t(`status.${animal.status.toLowerCase()}`)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
          {animal.name}
        </h3>
        <p className="text-sm text-slate-500 mt-0.5">
          {animal.breed || t(`species.${animal.species.toLowerCase()}`)}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <span>{animal.estimatedAge || 'Unknown age'}</span>
          <span>•</span>
          <span>{animal.sex?.toLowerCase()}</span>
          <span>•</span>
          <span>{animal.daysInShelter}d</span>
        </div>
      </div>
    </Link>
  );
}

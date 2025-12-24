import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  PawPrint,
  RefreshCw,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import RiskSeverityBadge from '@/components/risk/RiskSeverityBadge';
import clsx from 'clsx';

interface AtRiskAnimal {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  estimatedAge: string;
  daysInShelter: number;
  locationName: string;
  urgencyScore: number;
  riskSeverity: string;
  riskReasons: string[];
  primaryPhotoUrl: string | null;
}

type FilterSeverity = 'all' | 'critical' | 'high' | 'elevated';

export default function AtRisk() {
  const { t } = useTranslation(['risk', 'animals', 'common']);
  const [severity, setSeverity] = useState<FilterSeverity>('all');
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['at-risk-animals', severity],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '50' };
      if (severity !== 'all') {
        params.severity = severity.toUpperCase();
      }
      const response = await api.get<AtRiskAnimal[]>('/animals/at-risk', params);
      return response.data ?? [];
    },
  });

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await api.post('/risk/recalculate');
      await refetch();
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>At-Risk Animals | Shelter Link</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              At-Risk Animals
            </h1>
            <p className="text-slate-500 mt-1">
              Animals requiring immediate attention and advocacy
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw
                className={clsx('h-4 w-4', isRecalculating && 'animate-spin')}
              />
              <span className="hidden sm:inline">
                {isRecalculating ? 'Recalculating...' : 'Recalculate'}
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex gap-2">
            {(['all', 'critical', 'high', 'elevated'] as FilterSeverity[]).map(
              (level) => (
                <button
                  key={level}
                  onClick={() => setSeverity(level)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                    severity === level
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {level === 'all' ? 'All' : t(`severity.${level}`)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-16 w-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-5 w-24" />
                    <div className="skeleton h-4 w-32" />
                  </div>
                </div>
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : data?.length === 0 ? (
          <div className="card p-12 text-center">
            <PawPrint className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {t('empty.title')}
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((animal) => (
              <AnimalRiskCard key={animal.id} animal={animal} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AnimalRiskCard({ animal }: { animal: AtRiskAnimal }) {
  const { t } = useTranslation(['risk', 'animals']);
  const [showReasons, setShowReasons] = useState(false);

  const reasons = animal.riskReasons ?? [];

  const urgencyColor =
    animal.urgencyScore >= 80
      ? 'text-red-600'
      : animal.urgencyScore >= 60
      ? 'text-orange-600'
      : 'text-yellow-600';

  return (
    <div className="card overflow-hidden">
      {/* Critical pulse indicator */}
      {animal.riskSeverity === 'CRITICAL' && (
        <div className="h-1 bg-red-500 animate-pulse-risk" />
      )}

      <div className="p-4">
        {/* Animal info */}
        <div className="flex items-start gap-3">
          <Link
            to={`/animals/${animal.id}`}
            className="h-16 w-16 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0"
          >
            {animal.primaryPhotoUrl ? (
              <img
                src={animal.primaryPhotoUrl}
                alt={animal.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <PawPrint className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/animals/${animal.id}`}
                className="font-semibold text-slate-900 hover:text-primary-600 truncate"
              >
                {animal.name}
              </Link>
              <RiskSeverityBadge
                severity={animal.riskSeverity}
                showPulse={animal.riskSeverity === 'CRITICAL'}
              />
            </div>

            <p className="text-sm text-slate-500 mt-0.5">
              {animal.breed || t(`animals:species.${animal.species.toLowerCase()}`)}
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {animal.daysInShelter} days
              </span>
              <span>{animal.locationName}</span>
            </div>
          </div>
        </div>

        {/* Urgency score bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">{t('score.label')}</span>
            <span className={clsx('text-sm font-bold', urgencyColor)}>
              {animal.urgencyScore}/100
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                animal.urgencyScore >= 80
                  ? 'bg-red-500'
                  : animal.urgencyScore >= 60
                  ? 'bg-orange-500'
                  : 'bg-yellow-500'
              )}
              style={{ width: `${animal.urgencyScore}%` }}
            />
          </div>
        </div>

        {/* Risk reasons */}
        {reasons.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowReasons(!showReasons)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <span>
                {reasons.length} risk factor
                {reasons.length !== 1 ? 's' : ''}
              </span>
              <ChevronDown
                className={clsx(
                  'h-3 w-3 transition-transform',
                  showReasons && 'rotate-180'
                )}
              />
            </button>

            {showReasons && (
              <ul className="mt-2 space-y-1">
                {reasons.map((reason) => (
                  <li
                    key={reason}
                    className="text-xs text-slate-600 flex items-center gap-1"
                  >
                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                    {t(`reasons.${reason.toLowerCase()}`, { defaultValue: reason })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-4 flex gap-2">
          <Link
            to={`/animals/${animal.id}`}
            className="btn btn-primary btn-sm flex-1"
          >
            View Details
          </Link>
          <Link
            to={`/transfers/new?animal=${animal.id}`}
            className="btn btn-secondary btn-sm flex-1"
          >
            Transfer
          </Link>
        </div>
      </div>
    </div>
  );
}

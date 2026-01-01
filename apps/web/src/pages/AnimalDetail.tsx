import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  MapPin,
  PawPrint,
  Share,
  Weight,
} from 'lucide-react';
import { api } from '@/lib/api';
import RiskSeverityBadge from '@/components/risk/RiskSeverityBadge';
import LoadingScreen from '@/components/common/LoadingScreen';

interface AnimalDetails {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  estimatedAge: string;
  color: string;
  weight: number;
  status: string;
  intakeDate: string;
  daysInShelter: number;
  description: string;
  locationName: string;
  riskProfile: {
    urgencyScore: number;
    riskSeverity: string;
    riskReasons: string[];
    medicalScore: number;
    behavioralScore: number;
    kennelStressLevel: string;
    isSenior: boolean;
    isSpecialNeeds: boolean;
    specialNeedsCategories: string[];
  };
  microchips: Array<{
    chipNumber: string;
    registryName: string;
  }>;
  media: Array<{
    id: string;
    url: string;
    type: string;
    isPrimary: boolean;
  }>;
  medicalRecords: Array<{
    id: string;
    type: string;
    description: string;
    date: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }>;
}

export default function AnimalDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['animals', 'risk']);

  const { data: animal, isLoading } = useQuery({
    queryKey: ['animal', id],
    queryFn: async () => {
      const response = await api.get<AnimalDetails>(`/animals/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!animal) {
    return (
      <div className="card p-12 text-center">
        <PawPrint className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Animal not found
        </h2>
        <Link to="/animals" className="btn btn-primary mt-4">
          Back to Animals
        </Link>
      </div>
    );
  }

  const primaryPhoto = animal.media?.find((m) => m.isPrimary) || animal.media?.[0];

  return (
    <>
      <Helmet>
        <title>{animal.name} | Shelter Link</title>
      </Helmet>

      <div className="space-y-6">
        {/* Back link */}
        <Link
          to="/animals"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Animals
        </Link>

        {/* Header with photo */}
        <div className="card overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Photo */}
            <div className="relative h-64 lg:h-auto bg-slate-200">
              {primaryPhoto ? (
                <img
                  src={primaryPhoto.url}
                  alt={animal.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <PawPrint className="h-24 w-24 text-slate-300" />
                </div>
              )}

              {/* Risk badge */}
              {animal.riskProfile.urgencyScore >= 40 && (
                <div className="absolute top-4 right-4">
                  <RiskSeverityBadge
                    severity={animal.riskProfile.riskSeverity}
                    size="lg"
                    showPulse={animal.riskProfile.riskSeverity === 'CRITICAL'}
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {animal.name}
                  </h1>
                  <p className="text-slate-500 mt-1">
                    {animal.breed || t(`species.${animal.species.toLowerCase()}`)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-icon">
                    <Share className="h-4 w-4" />
                  </button>
                  <Link to={`/animals/${id}/edit`} className="btn btn-secondary">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Age</p>
                    <p className="font-medium text-slate-900">
                      {animal.estimatedAge || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Weight className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Weight</p>
                    <p className="font-medium text-slate-900">
                      {animal.weight ? `${animal.weight} lbs` : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Clock className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Days in Care</p>
                    <p className="font-medium text-slate-900">
                      {animal.daysInShelter}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <MapPin className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Location</p>
                    <p className="font-medium text-slate-900">
                      {animal.locationName || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                  {t(`status.${animal.status.toLowerCase()}`)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk profile card */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Risk Assessment</h2>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-900">
                  {animal.riskProfile.urgencyScore}
                </div>
                <div className="text-sm text-slate-500">Urgency Score</div>
              </div>
              <RiskSeverityBadge
                severity={animal.riskProfile.riskSeverity}
                size="lg"
              />
            </div>

            {/* Risk factors */}
            {animal.riskProfile.riskReasons?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  Risk Factors
                </h3>
                <ul className="space-y-1">
                  {animal.riskProfile.riskReasons?.map((reason) => (
                    <li
                      key={reason}
                      className="text-sm text-slate-600 flex items-center gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      {t(`risk:reasons.${reason.toLowerCase()}`, {
                        defaultValue: reason,
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick actions */}
            <div className="mt-6 flex gap-2">
              <Link
                to={`/transfers/new?animal=${id}`}
                className="btn btn-secondary"
              >
                Request Transfer
              </Link>
              <button className="btn btn-ghost">Quick Update</button>
            </div>
          </div>
        </div>

        {/* Description */}
        {animal.description && (
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-900">About</h2>
            </div>
            <div className="card-body">
              <p className="text-slate-600 whitespace-pre-wrap">
                {animal.description}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        {animal.notes?.length > 0 && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Notes</h2>
              <button className="btn btn-ghost btn-sm">Add Note</button>
            </div>
            <div className="divide-y divide-slate-100">
              {animal.notes?.map((note) => (
                <div key={note.id} className="p-4">
                  <p className="text-slate-600">{note.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {note.author} •{' '}
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

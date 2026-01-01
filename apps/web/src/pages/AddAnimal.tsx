import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface CreateAnimalForm {
  name: string;
  species: string;
  breedPrimary?: string;
  breedSecondary?: string;
  sex: string;
  ageCategory?: string;
  colorPrimary?: string;
  colorSecondary?: string;
  weightKg?: number;
  size?: string;
  description?: string;
  intake: {
    intakeType: string;
    condition?: string;
    foundLocation?: string;
    notes?: string;
  };
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

const sizeOptions = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];

const ageOptions = ['KITTEN/PUPPY', 'YOUNG', 'ADULT', 'SENIOR'];

const intakeTypes = ['STRAY', 'OWNER_SURRENDER', 'TRANSFER_IN', 'CONFISCATED', 'OTHER'];

const conditions = ['HEALTHY', 'INJURED', 'ILL', 'NURSING', 'PREGNANT', 'UNKNOWN'];

export default function AddAnimal() {
  const { t } = useTranslation(['animals']);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAnimalForm>({
    name: '',
    species: 'DOG',
    sex: 'UNKNOWN',
    intake: {
      intakeType: 'STRAY',
      condition: 'HEALTHY',
    },
  });

  const createAnimalMutation = useMutation({
    mutationFn: async (data: CreateAnimalForm) => {
      const response = await api.post('/animals', data);
      return response.data;
    },
    onSuccess: (data) => {
      navigate(`/animals/${data.id}`);
    },
    onError: (error: any) => {
      setError(error.response?.data?.error?.message || 'Failed to create animal');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.species) {
      setError('Species is required');
      return;
    }

    setError(null);
    createAnimalMutation.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    section?: 'intake'
  ) => {
    const { name, value } = e.target;
    
    if (section === 'intake') {
      setFormData({
        ...formData,
        intake: {
          ...formData.intake,
          [name]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value === '' ? undefined : value,
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Add Animal | Shelter Link</title>
      </Helmet>

      <div className="space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate('/animals')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Animals
        </button>

        {/* Form card */}
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold text-slate-900">Add New Animal</h1>
            <p className="text-slate-600 text-sm mt-1">
              Register a new animal in the shelter system
            </p>
          </div>

          {error && (
            <div className="mx-6 mt-6 rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Basic Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Max"
                      className="input w-full"
                      required
                    />
                  </div>

                  {/* Species */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Species *
                    </label>
                    <select
                      name="species"
                      value={formData.species}
                      onChange={handleChange}
                      className="input w-full"
                      required
                    >
                      {speciesOptions.map((species) => (
                        <option key={species} value={species}>
                          {species}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sex */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sex
                    </label>
                    <select
                      name="sex"
                      value={formData.sex}
                      onChange={handleChange}
                      className="input w-full"
                    >
                      <option value="UNKNOWN">Unknown</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>

                  {/* Age Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Age Category
                    </label>
                    <select
                      name="ageCategory"
                      value={formData.ageCategory || ''}
                      onChange={handleChange}
                      className="input w-full"
                    >
                      <option value="">Select...</option>
                      {ageOptions.map((age) => (
                        <option key={age} value={age}>
                          {age}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    placeholder="Any relevant details about the animal..."
                    rows={4}
                    className="input w-full resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Physical Characteristics */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Physical Characteristics
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Breed */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Primary Breed
                    </label>
                    <input
                      type="text"
                      name="breedPrimary"
                      value={formData.breedPrimary || ''}
                      onChange={handleChange}
                      placeholder="e.g., Golden Retriever"
                      className="input w-full"
                    />
                  </div>

                  {/* Secondary Breed */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Secondary Breed
                    </label>
                    <input
                      type="text"
                      name="breedSecondary"
                      value={formData.breedSecondary || ''}
                      onChange={handleChange}
                      placeholder="e.g., Lab Mix"
                      className="input w-full"
                    />
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Primary Color
                    </label>
                    <input
                      type="text"
                      name="colorPrimary"
                      value={formData.colorPrimary || ''}
                      onChange={handleChange}
                      placeholder="e.g., Golden"
                      className="input w-full"
                    />
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Secondary Color
                    </label>
                    <input
                      type="text"
                      name="colorSecondary"
                      value={formData.colorSecondary || ''}
                      onChange={handleChange}
                      placeholder="e.g., White"
                      className="input w-full"
                    />
                  </div>

                  {/* Size */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Size
                    </label>
                    <select
                      name="size"
                      value={formData.size || ''}
                      onChange={handleChange}
                      className="input w-full"
                    >
                      <option value="">Select...</option>
                      {sizeOptions.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="weightKg"
                      value={formData.weightKg || ''}
                      onChange={handleChange}
                      placeholder="0"
                      step="0.1"
                      min="0"
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Intake Information */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Intake Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Intake Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Intake Type *
                    </label>
                    <select
                      name="intakeType"
                      value={formData.intake.intakeType}
                      onChange={(e) => handleChange(e, 'intake')}
                      className="input w-full"
                      required
                    >
                      {intakeTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Health Condition
                    </label>
                    <select
                      name="condition"
                      value={formData.intake.condition || 'HEALTHY'}
                      onChange={(e) => handleChange(e, 'intake')}
                      className="input w-full"
                    >
                      {conditions.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Found Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Found Location / Origin
                  </label>
                  <input
                    type="text"
                    name="foundLocation"
                    value={formData.intake.foundLocation || ''}
                    onChange={(e) => handleChange(e, 'intake')}
                    placeholder="Where was the animal found or transferred from?"
                    className="input w-full"
                  />
                </div>

                {/* Intake Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Intake Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.intake.notes || ''}
                    onChange={(e) => handleChange(e, 'intake')}
                    placeholder="Any additional notes about intake..."
                    rows={3}
                    className="input w-full resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/animals')}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAnimalMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {createAnimalMutation.isPending ? 'Creating...' : 'Create Animal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

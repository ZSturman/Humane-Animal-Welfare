/**
 * API Types
 * 
 * Request/response types for the Shelter Link REST API
 */

import type { RiskProfile, RiskSeverity } from './risk.js';

// =============================================================================
// COMMON API TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationError[];
}

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  version: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// ANIMAL API TYPES
// =============================================================================

/**
 * Animal summary for list views
 */
export interface AnimalSummary {
  id: string;
  name: string;
  species: string;
  breedDisplay: string;
  sex: string;
  ageDisplay: string;
  ageCategory: string | null;
  size: string | null;
  primaryPhotoUrl: string | null;
  status: string;
  isPublic: boolean;
  isFeatured: boolean;
  daysInShelter: number;
  intakeDate: string;
  adoptionFee: number | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  location: {
    id: string;
    name: string;
  } | null;
  riskSummary: {
    urgencyScore: number;
    severity: RiskSeverity;
    isSenior: boolean;
    hasSpecialNeeds: boolean;
  } | null;
}

/**
 * Full animal details
 */
export interface AnimalDetails extends AnimalSummary {
  breedPrimary: string | null;
  breedSecondary: string | null;
  breedConfirmed: boolean;
  colorPrimary: string | null;
  colorSecondary: string | null;
  pattern: string | null;
  coatType: string | null;
  weightKg: number | null;
  birthDate: string | null;
  birthDateEstimated: string | null;
  alteredStatus: string;
  alteredDate: string | null;
  microchips: MicrochipInfo[];
  internalId: string | null;
  kennelNumber: string | null;
  description: LocalizedContent | null;
  specialNeeds: string | null;
  characteristics: string[];
  goodWithChildren: boolean | null;
  goodWithDogs: boolean | null;
  goodWithCats: boolean | null;
  houseTrained: boolean | null;
  crateTrained: boolean | null;
  leashTrained: boolean | null;
  specialDiet: string | null;
  exerciseNeeds: string | null;
  energyLevel: string | null;
  holdStatus: string;
  holdExpiryDate: string | null;
  feeWaived: boolean;
  sponsorshipAmount: number | null;
  media: MediaItem[];
  riskProfile: RiskProfile | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Microchip information
 */
export interface MicrochipInfo {
  id: string;
  chipNumber: string;
  chipType: string | null;
  manufacturer: string | null;
  isPrimary: boolean;
  isRegistered: boolean;
  registryName: string | null;
}

/**
 * Localized content (i18n support)
 */
export interface LocalizedContent {
  [locale: string]: string;
}

/**
 * Media item
 */
export interface MediaItem {
  id: string;
  type: 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  caption: string | null;
  isPrimary: boolean;
  isPublic: boolean;
  sortOrder: number;
}

/**
 * Create animal request
 */
export interface CreateAnimalRequest {
  name: string;
  species: string;
  breedPrimary?: string;
  breedSecondary?: string;
  breedDescription?: string;
  sex: string;
  birthDate?: string;
  birthDateEstimated?: string;
  ageCategory?: string;
  colorPrimary?: string;
  colorSecondary?: string;
  pattern?: string;
  coatType?: string;
  weightKg?: number;
  size?: string;
  alteredStatus?: string;
  alteredDate?: string;
  microchips?: CreateMicrochipRequest[];
  internalId?: string;
  locationId?: string;
  description?: LocalizedContent;
  specialNeeds?: string;
  characteristics?: string[];
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  houseTrained?: boolean;
  crateTrained?: boolean;
  leashTrained?: boolean;
  specialDiet?: string;
  exerciseNeeds?: string;
  energyLevel?: string;
  adoptionFee?: number;
  isPublic?: boolean;
  // Intake info
  intake: CreateIntakeRequest;
}

/**
 * Create microchip request
 */
export interface CreateMicrochipRequest {
  chipNumber: string;
  chipType?: string;
  isPrimary?: boolean;
  implantDate?: string;
}

/**
 * Create intake request
 */
export interface CreateIntakeRequest {
  intakeType: string;
  intakeSubtype?: string;
  intakeDate?: string;
  condition?: string;
  conditionNotes?: string;
  foundLocation?: string;
  foundAddress?: AddressInput;
  surrenderReasonId?: string;
  sourceOrgId?: string;
  sourceOrgName?: string;
  notes?: string;
}

/**
 * Address input
 */
export interface AddressInput {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Update animal request
 */
export interface UpdateAnimalRequest extends Partial<Omit<CreateAnimalRequest, 'intake'>> {
  // All fields optional for partial updates
}

/**
 * Animal search/filter parameters
 */
export interface AnimalSearchParams extends PaginationParams {
  // Basic filters
  species?: string | string[];
  breed?: string;
  sex?: string | string[];
  size?: string | string[];
  ageCategory?: string | string[];
  status?: string | string[];
  
  // Location filters
  organizationId?: string | string[];
  locationId?: string;
  
  // Risk filters
  minUrgencyScore?: number;
  maxUrgencyScore?: number;
  riskSeverity?: RiskSeverity | RiskSeverity[];
  isSenior?: boolean;
  hasSpecialNeeds?: boolean;
  
  // Date filters
  intakeDateFrom?: string;
  intakeDateTo?: string;
  minDaysInShelter?: number;
  maxDaysInShelter?: number;
  
  // Boolean filters
  isPublic?: boolean;
  isFeatured?: boolean;
  isAltered?: boolean;
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  
  // Text search
  q?: string; // Full-text search
  
  // Include options
  includeRiskProfile?: boolean;
  includeMedia?: boolean;
}

// =============================================================================
// ORGANIZATION API TYPES
// =============================================================================

/**
 * Organization summary
 */
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  animalCount: number;
  availableCount: number;
}

/**
 * Organization details
 */
export interface OrganizationDetails extends OrganizationSummary {
  address: AddressInput | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  operatingHours: OperatingHours | null;
  locations: LocationSummary[];
  stats: OrganizationStats;
  createdAt: string;
  updatedAt: string;
}

/**
 * Operating hours
 */
export interface OperatingHours {
  monday?: DayHours | null;
  tuesday?: DayHours | null;
  wednesday?: DayHours | null;
  thursday?: DayHours | null;
  friday?: DayHours | null;
  saturday?: DayHours | null;
  sunday?: DayHours | null;
}

export interface DayHours {
  open: string; // HH:mm
  close: string; // HH:mm
}

/**
 * Location summary
 */
export interface LocationSummary {
  id: string;
  name: string;
  type: string;
  isPublic: boolean;
  currentCapacity: number | null;
  maxCapacity: number | null;
}

/**
 * Organization statistics
 */
export interface OrganizationStats {
  totalAnimals: number;
  availableAnimals: number;
  inFoster: number;
  avgLengthOfStay: number;
  adoptionsThisMonth: number;
  adoptionsThisYear: number;
  intakesThisMonth: number;
  liveReleaseRate: number;
  capacityPercentage: number;
}

// =============================================================================
// TRANSFER API TYPES
// =============================================================================

/**
 * Transfer request summary
 */
export interface TransferRequestSummary {
  id: string;
  animal: {
    id: string;
    name: string;
    species: string;
    breedDisplay: string;
    primaryPhotoUrl: string | null;
  };
  fromOrganization: {
    id: string;
    name: string;
    slug: string;
  };
  toOrganization: {
    id: string;
    name: string;
    slug: string;
  };
  status: string;
  type: string;
  urgency: string;
  reason: string | null;
  requestedAt: string;
  scheduledDate: string | null;
}

/**
 * Create transfer request
 */
export interface CreateTransferRequest {
  animalId: string;
  toOrganizationId: string;
  type: string;
  urgency: string;
  reason?: string;
  scheduledDate?: string;
  medicalSummary?: string;
  behavioralSummary?: string;
  notes?: string;
}

/**
 * Transfer request response (accept/decline)
 */
export interface TransferRequestResponse {
  status: 'APPROVED' | 'DECLINED';
  responseNotes?: string;
  scheduledDate?: string;
}

// =============================================================================
// RISK UPDATE API TYPES
// =============================================================================

/**
 * Manual risk override request
 */
export interface RiskOverrideRequest {
  urgencyScore: number;
  riskSeverity: RiskSeverity;
  reason: string;
  publicVisibility?: boolean;
  rescueVisibility?: boolean;
}

/**
 * Quick risk status update (for staff efficiency)
 */
export interface QuickRiskUpdate {
  kennelStressLevel?: string;
  medicalScore?: number;
  behavioralScore?: number;
  notes?: string;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'animal.created'
  | 'animal.updated'
  | 'animal.status_changed'
  | 'animal.risk_elevated'
  | 'intake.created'
  | 'outcome.created'
  | 'transfer.requested'
  | 'transfer.status_changed'
  | 'alert.created';

/**
 * Webhook payload
 */
export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  organizationId: string;
  data: T;
  signature: string;
}

// =============================================================================
// AUTH API TYPES
// =============================================================================

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
  organizationSlug?: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

/**
 * User info
 */
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  organizations: UserOrganizationInfo[];
}

/**
 * User's organization membership
 */
export interface UserOrganizationInfo {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role: string;
  isPrimary: boolean;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

// =============================================================================
// IMPORT API TYPES
// =============================================================================

/**
 * Import job status response
 */
export interface ImportJobStatus {
  id: string;
  sourceType: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  successRecords: number;
  failedRecords: number;
  skippedRecords: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  startedAt: string | null;
  completedAt: string | null;
  progressPercentage: number;
}

/**
 * Import error
 */
export interface ImportError {
  row: number;
  field: string | null;
  message: string;
  data: Record<string, unknown>;
}

/**
 * Import warning
 */
export interface ImportWarning {
  row: number;
  field: string | null;
  message: string;
}

/**
 * Field mapping for import
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  defaultValue?: string;
}

/**
 * Create import job request
 */
export interface CreateImportRequest {
  sourceType: string;
  fieldMappings: FieldMapping[];
  defaults?: Record<string, unknown>;
  validateOnly?: boolean;
}

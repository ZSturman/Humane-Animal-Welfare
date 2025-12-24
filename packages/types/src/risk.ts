/**
 * Risk Scoring Types
 * 
 * Defines the structured risk and urgency assessment system
 * for prioritizing vulnerable animals.
 */

// =============================================================================
// RISK SEVERITY & URGENCY
// =============================================================================

/**
 * Risk severity levels for animal prioritization
 * Used to surface animals most in need of attention
 */
export enum RiskSeverity {
  /** Immediate action required - euthanasia list, critical medical */
  CRITICAL = 'CRITICAL',
  /** Urgent attention needed within 24-48 hours */
  HIGH = 'HIGH',
  /** Above normal concern - needs monitoring */
  ELEVATED = 'ELEVATED',
  /** Standard monitoring */
  MODERATE = 'MODERATE',
  /** No immediate concerns */
  LOW = 'LOW',
}

/**
 * Kennel stress levels observed in shelter animals
 */
export enum KennelStressLevel {
  NONE = 'NONE',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL',
}

/**
 * Reasons contributing to elevated risk
 */
export enum RiskReason {
  /** Length of stay exceeds target for species/age */
  LONG_LOS = 'LONG_LOS',
  /** Critical medical condition */
  MEDICAL_CRITICAL = 'MEDICAL_CRITICAL',
  /** Medical condition requiring timely treatment */
  MEDICAL_URGENT = 'MEDICAL_URGENT',
  /** Showing signs of kennel stress */
  KENNEL_STRESS = 'KENNEL_STRESS',
  /** Behavioral deterioration observed */
  BEHAVIORAL_DECLINE = 'BEHAVIORAL_DECLINE',
  /** Hold period expiring soon */
  HOLD_EXPIRING = 'HOLD_EXPIRING',
  /** Shelter is at or over capacity */
  CAPACITY_PRESSURE = 'CAPACITY_PRESSURE',
  /** Senior animal (harder to place) */
  SENIOR = 'SENIOR',
  /** Special needs requiring specific placement */
  SPECIAL_NEEDS = 'SPECIAL_NEEDS',
  /** Low adoption interest (views/applications) */
  LOW_INTEREST = 'LOW_INTEREST',
  /** Bonded pair or group */
  BONDED = 'BONDED',
  /** Large breed dog (harder to place) */
  LARGE_BREED = 'LARGE_BREED',
  /** Black dog/cat syndrome */
  BLACK_ANIMAL = 'BLACK_ANIMAL',
  /** Breed-specific legislation concerns */
  BSL_AFFECTED = 'BSL_AFFECTED',
  /** FIV/FeLV positive cat */
  FIV_FELV = 'FIV_FELV',
  /** Heartworm positive */
  HEARTWORM_POSITIVE = 'HEARTWORM_POSITIVE',
  /** Age-related vulnerability (very young) */
  UNDERAGE = 'UNDERAGE',
  /** On euthanasia list */
  EUTH_LIST = 'EUTH_LIST',
  /** Manual override by staff */
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
}

/**
 * Special needs categories for matching with appropriate adopters
 */
export enum SpecialNeedsCategory {
  /** Requires ongoing medication */
  MEDICATION = 'MEDICATION',
  /** Requires special diet */
  SPECIAL_DIET = 'SPECIAL_DIET',
  /** Mobility impairment */
  MOBILITY = 'MOBILITY',
  /** Vision impairment */
  VISION = 'VISION',
  /** Hearing impairment */
  HEARING = 'HEARING',
  /** Chronic condition requiring monitoring */
  CHRONIC_CONDITION = 'CHRONIC_CONDITION',
  /** Behavioral needs (anxiety, reactivity) */
  BEHAVIORAL = 'BEHAVIORAL',
  /** Requires experienced handler */
  EXPERIENCED_OWNER = 'EXPERIENCED_OWNER',
  /** Must be only pet */
  ONLY_PET = 'ONLY_PET',
  /** Needs fenced yard */
  FENCED_YARD = 'FENCED_YARD',
  /** No children */
  NO_CHILDREN = 'NO_CHILDREN',
  /** Hospice/palliative care */
  HOSPICE = 'HOSPICE',
}

// =============================================================================
// RISK PROFILE
// =============================================================================

/**
 * Deadline type for time-sensitive situations
 */
export interface RiskDeadline {
  /** Deadline date/time */
  date: Date;
  /** Type of deadline */
  type: 'HOLD_EXPIRY' | 'MEDICAL_TREATMENT' | 'TRANSFER_WINDOW' | 'EUTH_LIST' | 'OTHER';
  /** Description */
  description?: string;
  /** Is this deadline flexible? */
  isFlexible: boolean;
}

/**
 * Factor contribution to risk score
 */
export interface RiskFactor {
  /** Factor identifier */
  factor: RiskReason;
  /** Weight of this factor (0-1) */
  weight: number;
  /** Contribution to overall score */
  contribution: number;
  /** Human-readable explanation */
  explanation: string;
  /** When this factor was last evaluated */
  evaluatedAt: Date;
}

/**
 * Complete risk profile for an animal
 */
export interface RiskProfile {
  /** Animal ID */
  animalId: string;
  
  // === COMPOSITE SCORE ===
  /** Overall urgency score (0-100, higher = more urgent) */
  urgencyScore: number;
  /** Categorized severity level */
  riskSeverity: RiskSeverity;
  /** Individual factors contributing to score */
  riskFactors: RiskFactor[];
  /** Primary reasons for elevated risk */
  riskReasons: RiskReason[];
  
  // === TIME-BASED ===
  /** Days in current shelter */
  lengthOfStay: number;
  /** Target LOS for this animal type */
  targetLos: number | null;
  /** Percentile vs similar animals */
  losPercentile: number | null;
  /** Active deadlines */
  deadlines: RiskDeadline[];
  
  // === MEDICAL ===
  /** Medical urgency score (0-10) */
  medicalScore: number;
  /** Has time-sensitive medical needs */
  hasMedicalDeadline: boolean;
  /** Active medical conditions affecting risk */
  medicalConditions: string[];
  
  // === BEHAVIORAL ===
  /** Behavioral concern score (0-10) */
  behavioralScore: number;
  /** Current kennel stress level */
  kennelStressLevel: KennelStressLevel;
  /** Enrichment needs not being met */
  enrichmentDeficit: boolean;
  
  // === CAPACITY ===
  /** Current shelter capacity % */
  shelterCapacity: number | null;
  /** Species-specific capacity % */
  speciesCapacity: number | null;
  /** Is shelter over capacity? */
  isOverCapacity: boolean;
  
  // === ADOPTABILITY ===
  /** Predicted adoptability (0-100, ML-generated) */
  adoptabilityScore: number | null;
  /** Profile views */
  profileViews: number;
  /** Inquiries/applications */
  inquiryCount: number;
  /** Views to application ratio */
  viewsToAppsRatio: number | null;
  
  // === SPECIAL CATEGORIES ===
  /** Is senior animal */
  isSenior: boolean;
  /** Has special needs */
  hasSpecialNeeds: boolean;
  /** Specific special needs */
  specialNeedsCategories: SpecialNeedsCategory[];
  /** Vulnerable category */
  vulnerableCategory: string | null;
  
  // === VISIBILITY ===
  /** Risk info visible to public */
  publicVisibility: boolean;
  /** Fields visible publicly */
  publicFields: string[];
  /** Visible to rescue partners */
  rescueVisibility: boolean;
  
  // === METADATA ===
  /** Last calculation timestamp */
  lastCalculated: Date;
  /** Algorithm version */
  algorithmVersion: string;
  /** Is manually overridden */
  isManualOverride: boolean;
  /** Override reason */
  overrideReason: string | null;
  /** User who set override */
  overrideBy: string | null;
}

// =============================================================================
// RISK SCORING CONFIGURATION
// =============================================================================

/**
 * Configuration for risk scoring weights
 */
export interface RiskScoringConfig {
  /** Version of this configuration */
  version: string;
  
  /** Factor weights (must sum to 1.0) */
  weights: {
    /** Length of stay weight */
    lengthOfStay: number;
    /** Medical factors weight */
    medical: number;
    /** Behavioral factors weight */
    behavioral: number;
    /** Capacity pressure weight */
    capacity: number;
    /** Adoptability prediction weight */
    adoptability: number;
    /** Special categories weight */
    specialCategories: number;
  };
  
  /** Thresholds for severity levels */
  severityThresholds: {
    critical: number;
    high: number;
    elevated: number;
    moderate: number;
  };
  
  /** Target LOS by species and age */
  targetLos: {
    [species: string]: {
      baby: number;
      young: number;
      adult: number;
      senior: number;
    };
  };
  
  /** LOS percentile thresholds for escalation */
  losPercentileThresholds: {
    elevated: number;
    high: number;
    critical: number;
  };
}

/**
 * Default risk scoring configuration
 */
export const DEFAULT_RISK_SCORING_CONFIG: RiskScoringConfig = {
  version: '1.0',
  weights: {
    lengthOfStay: 0.25,
    medical: 0.20,
    behavioral: 0.15,
    capacity: 0.15,
    adoptability: 0.15,
    specialCategories: 0.10,
  },
  severityThresholds: {
    critical: 80,
    high: 60,
    elevated: 40,
    moderate: 20,
  },
  targetLos: {
    DOG: { baby: 14, young: 21, adult: 30, senior: 45 },
    CAT: { baby: 14, young: 21, adult: 30, senior: 45 },
    RABBIT: { baby: 21, young: 30, adult: 45, senior: 60 },
    // Add more species as needed
  },
  losPercentileThresholds: {
    elevated: 75,
    high: 90,
    critical: 95,
  },
};

// =============================================================================
// RISK ALERTS
// =============================================================================

/**
 * Alert generated when animal crosses risk threshold
 */
export interface RiskAlert {
  /** Unique alert ID */
  id: string;
  /** Animal ID */
  animalId: string;
  /** Organization ID */
  organizationId: string;
  
  /** Alert type */
  alertType: 'THRESHOLD_CROSSED' | 'DEADLINE_APPROACHING' | 'CONDITION_CHANGE' | 'EUTH_LIST';
  /** Severity of alert */
  severity: RiskSeverity;
  
  /** Previous risk score */
  previousScore: number;
  /** New risk score */
  newScore: number;
  /** Previous severity */
  previousSeverity: RiskSeverity;
  /** New severity */
  newSeverity: RiskSeverity;
  
  /** Triggering factors */
  triggeringFactors: RiskReason[];
  
  /** Alert message */
  message: string;
  /** Recommended actions */
  recommendedActions: string[];
  
  /** When alert was generated */
  createdAt: Date;
  /** Has been acknowledged */
  acknowledged: boolean;
  /** Who acknowledged */
  acknowledgedBy: string | null;
  /** When acknowledged */
  acknowledgedAt: Date | null;
  /** Resolution notes */
  resolutionNotes: string | null;
}

/**
 * Notification preferences for risk alerts
 */
export interface RiskAlertPreferences {
  /** User or organization ID */
  ownerId: string;
  /** Owner type */
  ownerType: 'USER' | 'ORGANIZATION';
  
  /** Enable alerts */
  enabled: boolean;
  
  /** Minimum severity to alert on */
  minimumSeverity: RiskSeverity;
  
  /** Specific reasons to alert on (empty = all) */
  reasonFilters: RiskReason[];
  
  /** Species filter (empty = all) */
  speciesFilter: string[];
  
  /** Channels to notify */
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
    webhook: boolean;
  };
  
  /** Digest vs immediate */
  deliveryMode: 'IMMEDIATE' | 'HOURLY_DIGEST' | 'DAILY_DIGEST';
  
  /** Quiet hours (no notifications) */
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
    timezone: string;
  } | null;
}

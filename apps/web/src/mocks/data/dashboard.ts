/**
 * Mock dashboard statistics for demo mode
 */

import { mockAnimals, getAtRiskAnimals } from './animals';
import { mockLocations } from './users';

export interface MockDashboardStats {
  totalAnimals: number;
  inShelter: number;
  inFoster: number;
  available: number;
  atRisk: {
    critical: number;
    high: number;
    elevated: number;
    total: number;
  };
  recentIntakes: number;
  recentOutcomes: number;
  adoptionsThisMonth: number;
  transfersThisMonth: number;
  averageLOS: number;
  capacityUtilization: number;
}

export interface MockRiskDashboard {
  summary: {
    total: number;
    critical: number;
    high: number;
    elevated: number;
    moderate: number;
    low: number;
  };
  topAtRisk: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    urgencyScore: number;
    severity: string;
    riskReasons: string[];
    daysInShelter: number;
    photoUrl: string | null;
  }[];
  recentChanges: {
    animalId: string;
    animalName: string;
    previousScore: number;
    currentScore: number;
    change: number;
    changedAt: string;
  }[];
  bySpecies: {
    species: string;
    total: number;
    atRisk: number;
  }[];
  trendData: {
    date: string;
    critical: number;
    high: number;
    elevated: number;
  }[];
}

export interface MockOrgStats {
  animals: {
    total: number;
    bySpecies: { species: string; count: number }[];
    byStatus: { status: string; count: number }[];
    byAge: { category: string; count: number }[];
  };
  outcomes: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    byType: { type: string; count: number }[];
  };
  capacity: {
    locations: {
      id: string;
      name: string;
      capacity: number;
      current: number;
      percentage: number;
    }[];
    totalCapacity: number;
    totalCurrent: number;
    overallPercentage: number;
  };
  performance: {
    averageLOS: number;
    liveReleaseRate: number;
    returnRate: number;
  };
}

// Calculate dashboard stats from mock animals
export const calculateDashboardStats = (): MockDashboardStats => {
  const inShelter = mockAnimals.filter((a) => a.status === 'IN_SHELTER').length;
  const inFoster = mockAnimals.filter((a) => a.status === 'IN_FOSTER').length;
  const available = mockAnimals.filter((a) => a.status === 'AVAILABLE').length;

  const atRiskAnimals = getAtRiskAnimals();
  const critical = atRiskAnimals.filter(
    (a) => a.riskProfile?.severity === 'CRITICAL'
  ).length;
  const high = atRiskAnimals.filter(
    (a) => a.riskProfile?.severity === 'HIGH'
  ).length;
  const elevated = atRiskAnimals.filter(
    (a) => a.riskProfile?.severity === 'ELEVATED'
  ).length;

  const totalCapacity = mockLocations.reduce((sum, loc) => sum + loc.capacity, 0);
  const totalCurrent = mockLocations.reduce(
    (sum, loc) => sum + loc.currentCount,
    0
  );

  return {
    totalAnimals: mockAnimals.length,
    inShelter,
    inFoster,
    available,
    atRisk: {
      critical,
      high,
      elevated,
      total: atRiskAnimals.length,
    },
    recentIntakes: 8,
    recentOutcomes: 12,
    adoptionsThisMonth: 23,
    transfersThisMonth: 5,
    averageLOS: 18.5,
    capacityUtilization: Math.round((totalCurrent / totalCapacity) * 100),
  };
};

// Calculate risk dashboard data
export const calculateRiskDashboard = (): MockRiskDashboard => {
  const summary = {
    total: mockAnimals.length,
    critical: 0,
    high: 0,
    elevated: 0,
    moderate: 0,
    low: 0,
  };

  mockAnimals.forEach((animal) => {
    const severity = animal.riskProfile?.severity || 'LOW';
    switch (severity) {
      case 'CRITICAL':
        summary.critical++;
        break;
      case 'HIGH':
        summary.high++;
        break;
      case 'ELEVATED':
        summary.elevated++;
        break;
      case 'MODERATE':
        summary.moderate++;
        break;
      default:
        summary.low++;
    }
  });

  // Top 10 at-risk animals
  const topAtRisk = mockAnimals
    .filter((a) => a.riskProfile && a.riskProfile.urgencyScore >= 40)
    .sort((a, b) => (b.riskProfile?.urgencyScore || 0) - (a.riskProfile?.urgencyScore || 0))
    .slice(0, 10)
    .map((animal) => {
      const intakeDate = new Date(animal.intakeDate);
      const today = new Date();
      const daysInShelter = Math.floor(
        (today.getTime() - intakeDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: animal.id,
        name: animal.name,
        species: animal.species,
        breed: animal.breed,
        urgencyScore: animal.riskProfile?.urgencyScore || 0,
        severity: animal.riskProfile?.severity || 'LOW',
        riskReasons: animal.riskProfile?.riskReasons || [],
        daysInShelter,
        photoUrl: animal.photos[0]?.url || null,
      };
    });

  // Mock recent score changes
  const recentChanges = [
    {
      animalId: 'animal-003',
      animalName: 'Bella',
      previousScore: 78,
      currentScore: 85,
      change: 7,
      changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      animalId: 'animal-006',
      animalName: 'Luna',
      previousScore: 58,
      currentScore: 65,
      change: 7,
      changedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      animalId: 'animal-016',
      animalName: 'Sadie',
      previousScore: 38,
      currentScore: 32,
      change: -6,
      changedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      animalId: 'animal-021',
      animalName: 'Charlie',
      previousScore: 30,
      currentScore: 25,
      change: -5,
      changedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // By species breakdown
  const speciesCount: Record<string, { total: number; atRisk: number }> = {};
  mockAnimals.forEach((animal) => {
    if (!speciesCount[animal.species]) {
      speciesCount[animal.species] = { total: 0, atRisk: 0 };
    }
    speciesCount[animal.species].total++;
    if (
      animal.riskProfile &&
      ['CRITICAL', 'HIGH', 'ELEVATED'].includes(animal.riskProfile.severity)
    ) {
      speciesCount[animal.species].atRisk++;
    }
  });

  const bySpecies = Object.entries(speciesCount).map(([species, counts]) => ({
    species,
    ...counts,
  }));

  // Trend data (last 7 days)
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trendData.push({
      date: date.toISOString().split('T')[0],
      critical: summary.critical + Math.floor(Math.random() * 2) - 1,
      high: summary.high + Math.floor(Math.random() * 3) - 1,
      elevated: summary.elevated + Math.floor(Math.random() * 2) - 1,
    });
  }

  return {
    summary,
    topAtRisk,
    recentChanges,
    bySpecies,
    trendData,
  };
};

// Calculate organization stats
export const calculateOrgStats = (): MockOrgStats => {
  // Animals by species
  const speciesCount: Record<string, number> = {};
  const statusCount: Record<string, number> = {};
  const ageCategories = {
    puppy_kitten: 0,
    young: 0,
    adult: 0,
    senior: 0,
  };

  mockAnimals.forEach((animal) => {
    // By species
    speciesCount[animal.species] = (speciesCount[animal.species] || 0) + 1;

    // By status
    statusCount[animal.status] = (statusCount[animal.status] || 0) + 1;

    // By age
    const age = animal.age || 0;
    const unit = animal.ageUnit;
    let ageInYears = age;
    if (unit === 'MONTHS') ageInYears = age / 12;
    else if (unit === 'WEEKS') ageInYears = age / 52;
    else if (unit === 'DAYS') ageInYears = age / 365;

    if (ageInYears < 1) ageCategories.puppy_kitten++;
    else if (ageInYears < 3) ageCategories.young++;
    else if (ageInYears < 7) ageCategories.adult++;
    else ageCategories.senior++;
  });

  // Capacity
  const capacityLocations = mockLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    capacity: loc.capacity,
    current: loc.currentCount,
    percentage: Math.round((loc.currentCount / loc.capacity) * 100),
  }));

  const totalCapacity = mockLocations.reduce((sum, loc) => sum + loc.capacity, 0);
  const totalCurrent = mockLocations.reduce(
    (sum, loc) => sum + loc.currentCount,
    0
  );

  return {
    animals: {
      total: mockAnimals.length,
      bySpecies: Object.entries(speciesCount).map(([species, count]) => ({
        species,
        count,
      })),
      byStatus: Object.entries(statusCount).map(([status, count]) => ({
        status,
        count,
      })),
      byAge: [
        { category: 'Puppy/Kitten (<1 yr)', count: ageCategories.puppy_kitten },
        { category: 'Young (1-3 yrs)', count: ageCategories.young },
        { category: 'Adult (3-7 yrs)', count: ageCategories.adult },
        { category: 'Senior (7+ yrs)', count: ageCategories.senior },
      ],
    },
    outcomes: {
      thisMonth: 23,
      lastMonth: 28,
      thisYear: 312,
      byType: [
        { type: 'ADOPTION', count: 18 },
        { type: 'TRANSFER_OUT', count: 3 },
        { type: 'RETURN_TO_OWNER', count: 2 },
      ],
    },
    capacity: {
      locations: capacityLocations,
      totalCapacity,
      totalCurrent,
      overallPercentage: Math.round((totalCurrent / totalCapacity) * 100),
    },
    performance: {
      averageLOS: 18.5,
      liveReleaseRate: 94.2,
      returnRate: 3.1,
    },
  };
};

export default {
  calculateDashboardStats,
  calculateRiskDashboard,
  calculateOrgStats,
};

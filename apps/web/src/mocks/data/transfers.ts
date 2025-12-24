/**
 * Mock transfer request data for demo mode
 */

import { mockAnimals } from './animals';
import { mockOrganization, mockPartnerOrganizations } from './users';

export interface MockTransfer {
  id: string;
  animalId: string;
  animal: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    primaryPhotoUrl: string | null;
  };
  sourceOrganizationId: string;
  sourceOrganization: {
    id: string;
    name: string;
    slug: string;
  };
  destinationOrganizationId: string;
  destinationOrganization: {
    id: string;
    name: string;
    slug: string;
  };
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  requestedById: string;
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approvedById: string | null;
  approvedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  notes: string | null;
  declineReason: string | null;
  transportDetails: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Helper to generate dates
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const daysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

// Get specific animals for transfers
const maxAnimal = mockAnimals.find((a) => a.id === 'animal-001');
const dukeAnimal = mockAnimals.find((a) => a.id === 'animal-005');
const buddyAnimal = mockAnimals.find((a) => a.id === 'animal-008');
const whiskersAnimal = mockAnimals.find((a) => a.id === 'animal-004');
const bellaAnimal = mockAnimals.find((a) => a.id === 'animal-003');

export const mockTransfers: MockTransfer[] = [
  // Incoming transfers (other orgs requesting to take our animals)
  {
    id: 'transfer-001',
    animalId: 'animal-001',
    animal: {
      id: maxAnimal?.id || 'animal-001',
      name: maxAnimal?.name || 'Max',
      species: maxAnimal?.species || 'DOG',
      breed: maxAnimal?.breed || 'Pit Bull Mix',
      primaryPhotoUrl: maxAnimal?.photos[0]?.url || null,
    },
    sourceOrganizationId: mockOrganization.id,
    sourceOrganization: {
      id: mockOrganization.id,
      name: mockOrganization.name,
      slug: mockOrganization.slug,
    },
    destinationOrganizationId: mockPartnerOrganizations[0].id,
    destinationOrganization: {
      id: mockPartnerOrganizations[0].id,
      name: mockPartnerOrganizations[0].name,
      slug: mockPartnerOrganizations[0].slug,
    },
    status: 'PENDING',
    requestedById: 'user-external-001',
    requestedBy: {
      id: 'user-external-001',
      firstName: 'Jennifer',
      lastName: 'Martinez',
    },
    approvedById: null,
    approvedBy: null,
    notes:
      'We have an approved adopter specifically looking for a senior pit bull. Max would be perfect for their home. They have experience with the breed and no other pets.',
    declineReason: null,
    transportDetails: null,
    scheduledDate: daysFromNow(3),
    completedAt: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'transfer-002',
    animalId: 'animal-005',
    animal: {
      id: dukeAnimal?.id || 'animal-005',
      name: dukeAnimal?.name || 'Duke',
      species: dukeAnimal?.species || 'DOG',
      breed: dukeAnimal?.breed || 'Rottweiler',
      primaryPhotoUrl: dukeAnimal?.photos[0]?.url || null,
    },
    sourceOrganizationId: mockOrganization.id,
    sourceOrganization: {
      id: mockOrganization.id,
      name: mockOrganization.name,
      slug: mockOrganization.slug,
    },
    destinationOrganizationId: mockPartnerOrganizations[1].id,
    destinationOrganization: {
      id: mockPartnerOrganizations[1].id,
      name: mockPartnerOrganizations[1].name,
      slug: mockPartnerOrganizations[1].slug,
    },
    status: 'APPROVED',
    requestedById: 'user-external-002',
    requestedBy: {
      id: 'user-external-002',
      firstName: 'David',
      lastName: 'Wong',
    },
    approvedById: 'user-001',
    approvedBy: {
      id: 'user-001',
      firstName: 'Demo',
      lastName: 'User',
    },
    notes:
      'Duke needs more space than we can provide. Second Chance has 50 acres and specializes in large breed dogs.',
    declineReason: null,
    transportDetails: 'Volunteer transport arranged. Will use crate in SUV.',
    scheduledDate: daysFromNow(5),
    completedAt: null,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    id: 'transfer-003',
    animalId: 'animal-008',
    animal: {
      id: buddyAnimal?.id || 'animal-008',
      name: buddyAnimal?.name || 'Buddy',
      species: buddyAnimal?.species || 'DOG',
      breed: buddyAnimal?.breed || 'Beagle Mix',
      primaryPhotoUrl: buddyAnimal?.photos[0]?.url || null,
    },
    sourceOrganizationId: mockOrganization.id,
    sourceOrganization: {
      id: mockOrganization.id,
      name: mockOrganization.name,
      slug: mockOrganization.slug,
    },
    destinationOrganizationId: mockPartnerOrganizations[0].id,
    destinationOrganization: {
      id: mockPartnerOrganizations[0].id,
      name: mockPartnerOrganizations[0].name,
      slug: mockPartnerOrganizations[0].slug,
    },
    status: 'IN_TRANSIT',
    requestedById: 'user-external-001',
    requestedBy: {
      id: 'user-external-001',
      firstName: 'Jennifer',
      lastName: 'Martinez',
    },
    approvedById: 'user-001',
    approvedBy: {
      id: 'user-001',
      firstName: 'Demo',
      lastName: 'User',
    },
    notes:
      'Furry Friends has a foster who is a vet tech and can continue his heartworm treatment at home.',
    declineReason: null,
    transportDetails:
      'Currently in transport with volunteer driver. ETA 2 hours. Contact: (555) 777-8888',
    scheduledDate: new Date().toISOString(),
    completedAt: null,
    createdAt: daysAgo(7),
    updatedAt: new Date().toISOString(),
  },

  // Outgoing transfers (we're requesting animals from other orgs)
  {
    id: 'transfer-004',
    animalId: 'external-animal-001',
    animal: {
      id: 'external-animal-001',
      name: 'Rosie',
      species: 'DOG',
      breed: 'Labrador Mix',
      primaryPhotoUrl: 'https://picsum.photos/seed/rosie/400/400',
    },
    sourceOrganizationId: mockPartnerOrganizations[0].id,
    sourceOrganization: {
      id: mockPartnerOrganizations[0].id,
      name: mockPartnerOrganizations[0].name,
      slug: mockPartnerOrganizations[0].slug,
    },
    destinationOrganizationId: mockOrganization.id,
    destinationOrganization: {
      id: mockOrganization.id,
      name: mockOrganization.name,
      slug: mockOrganization.slug,
    },
    status: 'PENDING',
    requestedById: 'user-001',
    requestedBy: {
      id: 'user-001',
      firstName: 'Demo',
      lastName: 'User',
    },
    approvedById: null,
    approvedBy: null,
    notes:
      'We have high demand for labs and available kennel space. Rosie would be adopted quickly here.',
    declineReason: null,
    transportDetails: null,
    scheduledDate: null,
    completedAt: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: 'transfer-005',
    animalId: 'external-animal-002',
    animal: {
      id: 'external-animal-002',
      name: 'Felix',
      species: 'CAT',
      breed: 'Domestic Shorthair',
      primaryPhotoUrl: 'https://picsum.photos/seed/felix/400/400',
    },
    sourceOrganizationId: mockPartnerOrganizations[1].id,
    sourceOrganization: {
      id: mockPartnerOrganizations[1].id,
      name: mockPartnerOrganizations[1].name,
      slug: mockPartnerOrganizations[1].slug,
    },
    destinationOrganizationId: mockOrganization.id,
    destinationOrganization: {
      id: mockOrganization.id,
      name: mockOrganization.name,
      slug: mockOrganization.slug,
    },
    status: 'COMPLETED',
    requestedById: 'user-001',
    requestedBy: {
      id: 'user-001',
      firstName: 'Demo',
      lastName: 'User',
    },
    approvedById: 'user-external-002',
    approvedBy: {
      id: 'user-external-002',
      firstName: 'David',
      lastName: 'Wong',
    },
    notes: 'Felix needed a more social environment to thrive.',
    declineReason: null,
    transportDetails: 'Completed via volunteer transport.',
    scheduledDate: daysAgo(3),
    completedAt: daysAgo(3),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
  },
];

// Helper to get incoming transfers
export const getIncomingTransfers = (): MockTransfer[] => {
  return mockTransfers.filter(
    (t) => t.sourceOrganizationId === mockOrganization.id
  );
};

// Helper to get outgoing transfers
export const getOutgoingTransfers = (): MockTransfer[] => {
  return mockTransfers.filter(
    (t) => t.destinationOrganizationId === mockOrganization.id
  );
};

// Helper to get pending transfers
export const getPendingTransfers = (): MockTransfer[] => {
  return mockTransfers.filter((t) => t.status === 'PENDING');
};

export default mockTransfers;

/**
 * Mock user and organization data for demo mode
 */

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  organizations: MockUserOrganization[];
}

export interface MockUserOrganization {
  organizationId: string;
  role: string;
  isPrimary: boolean;
  organization: MockOrganization;
}

export interface MockOrganization {
  id: string;
  name: string;
  slug: string;
  type: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string | null;
  description: string;
  address: MockAddress;
  settings: MockOrgSettings;
  createdAt: string;
  updatedAt: string;
}

export interface MockAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface MockOrgSettings {
  timezone: string;
  dateFormat: string;
  defaultAnimalPhotoUrl: string;
  riskScoringEnabled: boolean;
  autoCalculateRisk: boolean;
  transfersEnabled: boolean;
  publicProfileEnabled: boolean;
}

export interface MockLocation {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  capacity: number;
  currentCount: number;
  address: MockAddress | null;
}

// Demo organization
export const mockOrganization: MockOrganization = {
  id: 'org-001',
  name: 'Happy Paws Shelter',
  slug: 'happy-paws',
  type: 'SHELTER',
  email: 'info@happypaws.org',
  phone: '(555) 123-4567',
  website: 'https://happypaws.org',
  logoUrl: 'https://picsum.photos/seed/happypaws/200/200',
  description:
    'Happy Paws Shelter is a no-kill animal shelter dedicated to finding loving homes for dogs, cats, and small animals. We believe every animal deserves a second chance.',
  address: {
    street: '123 Shelter Lane',
    city: 'Petsville',
    state: 'CA',
    zipCode: '90210',
    country: 'USA',
  },
  settings: {
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    defaultAnimalPhotoUrl: 'https://picsum.photos/400/400?grayscale',
    riskScoringEnabled: true,
    autoCalculateRisk: true,
    transfersEnabled: true,
    publicProfileEnabled: true,
  },
  createdAt: '2023-01-15T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

// Partner organizations for transfers
export const mockPartnerOrganizations: MockOrganization[] = [
  {
    id: 'org-002',
    name: 'Furry Friends Rescue',
    slug: 'furry-friends',
    type: 'RESCUE',
    email: 'adopt@furryfriends.org',
    phone: '(555) 234-5678',
    website: 'https://furryfriends.org',
    logoUrl: 'https://picsum.photos/seed/furryfriends/200/200',
    description: 'Foster-based rescue focusing on dogs with special needs.',
    address: {
      street: '456 Rescue Road',
      city: 'Dogtown',
      state: 'CA',
      zipCode: '90211',
      country: 'USA',
    },
    settings: {
      timezone: 'America/Los_Angeles',
      dateFormat: 'MM/DD/YYYY',
      defaultAnimalPhotoUrl: '',
      riskScoringEnabled: true,
      autoCalculateRisk: true,
      transfersEnabled: true,
      publicProfileEnabled: true,
    },
    createdAt: '2023-03-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'org-003',
    name: 'Second Chance Sanctuary',
    slug: 'second-chance',
    type: 'SANCTUARY',
    email: 'hello@secondchance.org',
    phone: '(555) 345-6789',
    website: 'https://secondchance.org',
    logoUrl: 'https://picsum.photos/seed/secondchance/200/200',
    description: 'Lifetime sanctuary for animals who cannot be adopted.',
    address: {
      street: '789 Sanctuary Way',
      city: 'Haven',
      state: 'CA',
      zipCode: '90212',
      country: 'USA',
    },
    settings: {
      timezone: 'America/Los_Angeles',
      dateFormat: 'MM/DD/YYYY',
      defaultAnimalPhotoUrl: '',
      riskScoringEnabled: false,
      autoCalculateRisk: false,
      transfersEnabled: true,
      publicProfileEnabled: true,
    },
    createdAt: '2022-06-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

// Demo locations within the organization
export const mockLocations: MockLocation[] = [
  {
    id: 'loc-001',
    organizationId: 'org-001',
    name: 'Main Dog Kennel',
    type: 'KENNEL',
    capacity: 50,
    currentCount: 28,
    address: null,
  },
  {
    id: 'loc-002',
    organizationId: 'org-001',
    name: 'Cat Cottage',
    type: 'CATTERY',
    capacity: 40,
    currentCount: 22,
    address: null,
  },
  {
    id: 'loc-003',
    organizationId: 'org-001',
    name: 'Small Animal Room',
    type: 'OTHER',
    capacity: 20,
    currentCount: 8,
    address: null,
  },
];

// Demo user
export const mockUser: MockUser = {
  id: 'user-001',
  email: 'demo@shelterlink.dev',
  firstName: 'Demo',
  lastName: 'User',
  role: 'ADMIN',
  avatarUrl: 'https://picsum.photos/seed/demouser/200/200',
  phone: '(555) 999-8888',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
  organizations: [
    {
      organizationId: 'org-001',
      role: 'ADMIN',
      isPrimary: true,
      organization: mockOrganization,
    },
  ],
};

// Additional staff users for display
export const mockStaffUsers: MockUser[] = [
  {
    id: 'user-002',
    email: 'sarah@happypaws.org',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'STAFF',
    avatarUrl: 'https://picsum.photos/seed/sarah/200/200',
    phone: '(555) 111-2222',
    createdAt: '2024-02-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    organizations: [
      {
        organizationId: 'org-001',
        role: 'STAFF',
        isPrimary: true,
        organization: mockOrganization,
      },
    ],
  },
  {
    id: 'user-003',
    email: 'mike@happypaws.org',
    firstName: 'Mike',
    lastName: 'Chen',
    role: 'VETERINARIAN',
    avatarUrl: 'https://picsum.photos/seed/mike/200/200',
    phone: '(555) 333-4444',
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    organizations: [
      {
        organizationId: 'org-001',
        role: 'VETERINARIAN',
        isPrimary: true,
        organization: mockOrganization,
      },
    ],
  },
  {
    id: 'user-004',
    email: 'volunteer@happypaws.org',
    firstName: 'Alex',
    lastName: 'Rivera',
    role: 'VOLUNTEER',
    avatarUrl: 'https://picsum.photos/seed/alex/200/200',
    phone: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    organizations: [
      {
        organizationId: 'org-001',
        role: 'VOLUNTEER',
        isPrimary: true,
        organization: mockOrganization,
      },
    ],
  },
];

export default {
  user: mockUser,
  organization: mockOrganization,
  partnerOrganizations: mockPartnerOrganizations,
  locations: mockLocations,
  staffUsers: mockStaffUsers,
};

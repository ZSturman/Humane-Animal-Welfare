/**
 * Animals Route Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// Mock Prisma responses
const mockAnimals = [
  {
    id: 'animal-001',
    name: 'Max',
    species: 'DOG',
    breed: 'Golden Retriever',
    age: 3,
    ageUnit: 'YEARS',
    gender: 'MALE',
    weight: 65,
    weightUnit: 'LB',
    color: 'Golden',
    status: 'AVAILABLE',
    intakeDate: new Date('2024-01-15'),
    organizationId: 'org-001',
    locationId: 'loc-001',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    riskProfile: {
      id: 'risk-001',
      animalId: 'animal-001',
      totalScore: 45,
      severity: 'MODERATE',
      lengthOfStayScore: 15,
      medicalScore: 10,
      behavioralScore: 5,
      ageScore: 10,
      specialNeedsScore: 5,
      riskReasons: ['In shelter 60+ days'],
    },
    medicalRecords: [],
    behavioralNotes: [],
    photos: [{ id: 'photo-001', url: 'https://example.com/max.jpg', isPrimary: true }],
    location: { id: 'loc-001', name: 'Main Building', type: 'KENNEL' },
  },
  {
    id: 'animal-002',
    name: 'Luna',
    species: 'CAT',
    breed: 'Siamese',
    age: 2,
    ageUnit: 'YEARS',
    gender: 'FEMALE',
    weight: 10,
    weightUnit: 'LB',
    color: 'Cream',
    status: 'AVAILABLE',
    intakeDate: new Date('2024-02-01'),
    organizationId: 'org-001',
    locationId: 'loc-002',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    riskProfile: {
      id: 'risk-002',
      animalId: 'animal-002',
      totalScore: 25,
      severity: 'LOW',
      lengthOfStayScore: 5,
      medicalScore: 5,
      behavioralScore: 5,
      ageScore: 5,
      specialNeedsScore: 5,
      riskReasons: [],
    },
    medicalRecords: [],
    behavioralNotes: [],
    photos: [],
    location: { id: 'loc-002', name: 'Cat Room', type: 'ROOM' },
  },
];

// Mock Prisma client
const mockPrisma = {
  animal: {
    findMany: vi.fn().mockResolvedValue(mockAnimals),
    findUnique: vi.fn().mockImplementation(({ where }) => {
      const animal = mockAnimals.find((a) => a.id === where.id);
      return Promise.resolve(animal || null);
    }),
    findFirst: vi.fn().mockImplementation(({ where }) => {
      const animal = mockAnimals.find((a) => a.id === where.id);
      return Promise.resolve(animal || null);
    }),
    create: vi.fn().mockImplementation(({ data }) => {
      const newAnimal = {
        id: `animal-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return Promise.resolve(newAnimal);
    }),
    update: vi.fn().mockImplementation(({ where, data }) => {
      const animal = mockAnimals.find((a) => a.id === where.id);
      if (!animal) return Promise.resolve(null);
      return Promise.resolve({ ...animal, ...data, updatedAt: new Date() });
    }),
    delete: vi.fn().mockResolvedValue({ id: 'animal-001' }),
    count: vi.fn().mockResolvedValue(mockAnimals.length),
  },
  riskProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

// Simulated route handlers (mimicking the actual routes)
const buildTestServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });

  // Decorate with mock prisma
  app.decorate('prisma', mockPrisma);

  // Mock authentication hook
  app.addHook('preHandler', async (request, reply) => {
    // @ts-ignore
    request.user = {
      id: 'user-001',
      email: 'test@example.com',
      role: 'STAFF',
      organizationId: 'org-001',
    };
  });

  // GET /animals - List all animals
  app.get('/animals', async (request, reply) => {
    const { species, status, search, page = 1, limit = 20 } = request.query as any;
    
    let animals = await mockPrisma.animal.findMany();
    
    // Filter by species
    if (species) {
      animals = animals.filter((a: any) => a.species === species);
    }
    
    // Filter by status
    if (status) {
      animals = animals.filter((a: any) => a.status === status);
    }
    
    // Search by name
    if (search) {
      animals = animals.filter((a: any) => 
        a.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedAnimals = animals.slice(startIndex, startIndex + limit);
    
    return {
      data: paginatedAnimals,
      total: animals.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(animals.length / limit),
    };
  });

  // GET /animals/:id - Get single animal
  app.get('/animals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const animal = await mockPrisma.animal.findUnique({ where: { id } });
    
    if (!animal) {
      return reply.status(404).send({ error: 'Animal not found' });
    }
    
    return animal;
  });

  // POST /animals - Create new animal
  app.post('/animals', async (request, reply) => {
    const body = request.body as any;
    
    // Validate required fields
    if (!body.name || !body.species) {
      return reply.status(400).send({ error: 'Name and species are required' });
    }
    
    const animal = await mockPrisma.animal.create({
      data: {
        ...body,
        // @ts-ignore
        organizationId: request.user.organizationId,
      },
    });
    
    return reply.status(201).send(animal);
  });

  // PUT /animals/:id - Update animal
  app.put('/animals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    
    const existing = await mockPrisma.animal.findUnique({ where: { id } });
    
    if (!existing) {
      return reply.status(404).send({ error: 'Animal not found' });
    }
    
    const animal = await mockPrisma.animal.update({
      where: { id },
      data: body,
    });
    
    return animal;
  });

  // DELETE /animals/:id - Delete animal
  app.delete('/animals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = await mockPrisma.animal.findUnique({ where: { id } });
    
    if (!existing) {
      return reply.status(404).send({ error: 'Animal not found' });
    }
    
    await mockPrisma.animal.delete({ where: { id } });
    
    return reply.status(204).send();
  });

  // GET /animals/:id/risk - Get risk profile
  app.get('/animals/:id/risk', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const animal = await mockPrisma.animal.findUnique({ where: { id } });
    
    if (!animal) {
      return reply.status(404).send({ error: 'Animal not found' });
    }
    
    return animal.riskProfile || null;
  });

  // GET /animals/at-risk - Get at-risk animals
  app.get('/animals/at-risk', async (request, reply) => {
    const { severity, limit = 10 } = request.query as any;
    
    const animals = await mockPrisma.animal.findMany();
    let atRisk = animals.filter((a: any) => 
      a.riskProfile && ['CRITICAL', 'HIGH', 'MODERATE'].includes(a.riskProfile.severity)
    );
    
    if (severity) {
      atRisk = atRisk.filter((a: any) => a.riskProfile.severity === severity);
    }
    
    // Sort by total score descending
    atRisk.sort((a: any, b: any) => b.riskProfile.totalScore - a.riskProfile.totalScore);
    
    return {
      data: atRisk.slice(0, Number(limit)),
      total: atRisk.length,
    };
  });

  return app;
};

describe('Animals Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestServer();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /animals', () => {
    it('should return list of animals', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.total).toBe(2);
    });

    it('should include pagination metadata', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals?page=1&limit=10',
      });

      const body = JSON.parse(response.body);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
      expect(body.totalPages).toBeDefined();
    });

    it('should filter by species', async () => {
      mockPrisma.animal.findMany.mockResolvedValueOnce(mockAnimals);
      
      const response = await app.inject({
        method: 'GET',
        url: '/animals?species=DOG',
      });

      const body = JSON.parse(response.body);
      expect(body.data.every((a: any) => a.species === 'DOG')).toBe(true);
    });

    it('should filter by status', async () => {
      mockPrisma.animal.findMany.mockResolvedValueOnce(mockAnimals);
      
      const response = await app.inject({
        method: 'GET',
        url: '/animals?status=AVAILABLE',
      });

      const body = JSON.parse(response.body);
      expect(body.data.every((a: any) => a.status === 'AVAILABLE')).toBe(true);
    });

    it('should search by name', async () => {
      mockPrisma.animal.findMany.mockResolvedValueOnce(mockAnimals);
      
      const response = await app.inject({
        method: 'GET',
        url: '/animals?search=max',
      });

      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Max');
    });
  });

  describe('GET /animals/:id', () => {
    it('should return single animal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals/animal-001',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.id).toBe('animal-001');
      expect(body.name).toBe('Max');
    });

    it('should return 404 for non-existent animal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Animal not found');
    });

    it('should include related data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals/animal-001',
      });

      const body = JSON.parse(response.body);
      expect(body.riskProfile).toBeDefined();
      expect(body.location).toBeDefined();
      expect(body.photos).toBeDefined();
    });
  });

  describe('POST /animals', () => {
    it('should create new animal', async () => {
      const newAnimal = {
        name: 'Buddy',
        species: 'DOG',
        breed: 'Labrador',
        age: 2,
        ageUnit: 'YEARS',
        gender: 'MALE',
        status: 'AVAILABLE',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/animals',
        payload: newAnimal,
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Buddy');
      expect(body.species).toBe('DOG');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/animals',
        payload: { breed: 'Labrador' }, // Missing name and species
      });

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('required');
    });

    it('should set organizationId from authenticated user', async () => {
      const newAnimal = {
        name: 'Buddy',
        species: 'DOG',
      };

      await app.inject({
        method: 'POST',
        url: '/animals',
        payload: newAnimal,
      });

      expect(mockPrisma.animal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-001',
          }),
        })
      );
    });
  });

  describe('PUT /animals/:id', () => {
    it('should update existing animal', async () => {
      const updates = {
        name: 'Maximus',
        weight: 70,
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/animals/animal-001',
        payload: updates,
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Maximus');
    });

    it('should return 404 for non-existent animal', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/animals/non-existent-id',
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /animals/:id', () => {
    it('should delete existing animal', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/animals/animal-001',
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 404 for non-existent animal', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/animals/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /animals/:id/risk', () => {
    it('should return risk profile for animal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals/animal-001/risk',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.totalScore).toBeDefined();
      expect(body.severity).toBe('MODERATE');
    });

    it('should return 404 for non-existent animal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals/non-existent-id/risk',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /animals/at-risk', () => {
    it('should return at-risk animals', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals/at-risk',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter by severity', async () => {
      mockPrisma.animal.findMany.mockResolvedValueOnce(mockAnimals);
      
      const response = await app.inject({
        method: 'GET',
        url: '/animals/at-risk?severity=MODERATE',
      });

      const body = JSON.parse(response.body);
      expect(body.data.every((a: any) => a.riskProfile.severity === 'MODERATE')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/animals/at-risk?limit=5',
      });

      const body = JSON.parse(response.body);
      expect(body.data.length).toBeLessThanOrEqual(5);
    });

    it('should sort by risk score descending', async () => {
      mockPrisma.animal.findMany.mockResolvedValueOnce(mockAnimals);
      
      const response = await app.inject({
        method: 'GET',
        url: '/animals/at-risk',
      });

      const body = JSON.parse(response.body);
      
      // Verify sorted by totalScore descending
      for (let i = 1; i < body.data.length; i++) {
        expect(body.data[i - 1].riskProfile.totalScore)
          .toBeGreaterThanOrEqual(body.data[i].riskProfile.totalScore);
      }
    });
  });
});

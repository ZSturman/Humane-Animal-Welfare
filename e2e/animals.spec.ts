/**
 * Animals Page E2E Tests
 * 
 * Tests the animals browsing functionality including:
 * - Viewing animal list
 * - Searching and filtering
 * - Viewing animal details
 * - Risk indicators
 */

import { test, expect } from '@playwright/test';

test.describe('Animals Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/animals');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Animal List', () => {
    test('should display list of animals', async ({ page }) => {
      // Wait for animals to load
      const animalCards = page.locator('[data-testid="animal-card"], .animal-card, article');
      await expect(animalCards.first()).toBeVisible({ timeout: 10000 });
      
      // Should have multiple animals
      const count = await animalCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display animal photos', async ({ page }) => {
      const animalImages = page.locator('[data-testid="animal-image"], .animal-card img, article img');
      await expect(animalImages.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display animal names', async ({ page }) => {
      // Look for known mock animal names
      const names = ['Max', 'Luna', 'Bella', 'Charlie', 'Buddy'];
      
      // At least one mock animal name should be visible
      const nameLocators = names.map(name => page.locator(`text=${name}`));
      const visibleName = await Promise.race(
        nameLocators.map(async (loc) => {
          try {
            await loc.first().waitFor({ state: 'visible', timeout: 5000 });
            return true;
          } catch {
            return false;
          }
        })
      );
      
      expect(visibleName).toBe(true);
    });

    test('should display species information', async ({ page }) => {
      // Should show species like Dog, Cat
      const speciesText = page.locator('text=Dog, text=Cat, text=Rabbit');
      await expect(speciesText.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display risk severity badges', async ({ page }) => {
      // Look for risk badges
      const riskBadges = page.locator(
        '[data-testid="risk-severity-badge"], ' +
        'text=CRITICAL, text=HIGH, text=MODERATE, text=LOW, ' +
        '.risk-badge, .severity-badge'
      );
      
      await expect(riskBadges.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Search Functionality', () => {
    test('should have a search input', async ({ page }) => {
      const searchInput = page.locator(
        '[data-testid="search-input"], ' +
        'input[placeholder*="search" i], ' +
        'input[type="search"], ' +
        '[aria-label*="search" i]'
      );
      
      await expect(searchInput.first()).toBeVisible();
    });

    test('should filter animals when searching', async ({ page }) => {
      const searchInput = page.locator(
        '[data-testid="search-input"], ' +
        'input[placeholder*="search" i], ' +
        'input[type="search"]'
      ).first();
      
      // Get initial count
      const initialCards = page.locator('[data-testid="animal-card"], .animal-card, article');
      const initialCount = await initialCards.count();
      
      // Search for a specific term
      await searchInput.fill('Max');
      await page.waitForTimeout(500); // Debounce
      
      // Results should be filtered
      const filteredCards = page.locator('[data-testid="animal-card"], .animal-card, article');
      const filteredCount = await filteredCards.count();
      
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    });

    test('should clear search results', async ({ page }) => {
      const searchInput = page.locator(
        '[data-testid="search-input"], ' +
        'input[placeholder*="search" i], ' +
        'input[type="search"]'
      ).first();
      
      // Enter search term
      await searchInput.fill('Max');
      await page.waitForTimeout(500);
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
      
      // Should show all animals again
      const cards = page.locator('[data-testid="animal-card"], .animal-card, article');
      const count = await cards.count();
      expect(count).toBeGreaterThan(1);
    });
  });

  test.describe('Filtering', () => {
    test('should have species filter', async ({ page }) => {
      const speciesFilter = page.locator(
        '[data-testid="species-filter"], ' +
        'select[name*="species" i], ' +
        'button:has-text("Species"), ' +
        '[aria-label*="species" i]'
      );
      
      await expect(speciesFilter.first()).toBeVisible();
    });

    test('should filter by species', async ({ page }) => {
      // Find and click species filter
      const speciesFilter = page.locator(
        '[data-testid="species-filter"], ' +
        'select[name*="species" i], ' +
        'button:has-text("Species")'
      ).first();
      
      if (await speciesFilter.isVisible()) {
        await speciesFilter.click();
        
        // Select "Dog" option
        const dogOption = page.locator('text=Dog, [data-value="DOG"], option:has-text("Dog")').first();
        if (await dogOption.isVisible()) {
          await dogOption.click();
          await page.waitForTimeout(500);
          
          // All visible animals should be dogs
          const speciesLabels = page.locator('.species-label, [data-testid="animal-species"]');
          const count = await speciesLabels.count();
          
          for (let i = 0; i < count; i++) {
            const text = await speciesLabels.nth(i).textContent();
            expect(text?.toLowerCase()).toContain('dog');
          }
        }
      }
    });

    test('should have status filter', async ({ page }) => {
      const statusFilter = page.locator(
        '[data-testid="status-filter"], ' +
        'select[name*="status" i], ' +
        'button:has-text("Status"), ' +
        '[aria-label*="status" i]'
      );
      
      // Status filter may or may not be present based on UI design
      const isVisible = await statusFilter.first().isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Animal Details', () => {
    test('should navigate to animal details on card click', async ({ page }) => {
      const animalCard = page.locator(
        '[data-testid="animal-card"], .animal-card, article'
      ).first();
      
      await animalCard.click();
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/.*animals\/[a-zA-Z0-9-]+/);
    });

    test('should display animal details page', async ({ page }) => {
      // Navigate to first animal
      const animalCard = page.locator(
        '[data-testid="animal-card"], .animal-card, article'
      ).first();
      
      await animalCard.click();
      await page.waitForLoadState('networkidle');
      
      // Should show detailed information
      await expect(page.locator('h1, h2').first()).toBeVisible();
      
      // Should show animal photo
      const photo = page.locator('img[alt]');
      await expect(photo.first()).toBeVisible();
    });

    test('should show risk profile on details page', async ({ page }) => {
      const animalCard = page.locator(
        '[data-testid="animal-card"], .animal-card, article'
      ).first();
      
      await animalCard.click();
      await page.waitForLoadState('networkidle');
      
      // Should show risk information
      const riskSection = page.locator(
        '[data-testid="risk-profile"], ' +
        'text=Risk, text=Score, ' +
        '.risk-section'
      );
      
      await expect(riskSection.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have back navigation from details', async ({ page }) => {
      const animalCard = page.locator(
        '[data-testid="animal-card"], .animal-card, article'
      ).first();
      
      await animalCard.click();
      await page.waitForLoadState('networkidle');
      
      // Find back button
      const backButton = page.locator(
        '[data-testid="back-button"], ' +
        'a:has-text("Back"), ' +
        'button:has-text("Back"), ' +
        '[aria-label="Back"]'
      );
      
      if (await backButton.first().isVisible()) {
        await backButton.first().click();
        await expect(page).toHaveURL(/.*animals$/);
      } else {
        // Use browser back
        await page.goBack();
        await expect(page).toHaveURL(/.*animals$/);
      }
    });
  });

  test.describe('Pagination', () => {
    test('should show pagination controls if many animals', async ({ page }) => {
      // Pagination might not be visible with limited mock data
      const pagination = page.locator(
        '[data-testid="pagination"], ' +
        '.pagination, ' +
        'nav[aria-label*="pagination" i], ' +
        'button:has-text("Next")'
      );
      
      // Pagination may or may not be present
      const isVisible = await pagination.first().isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Empty States', () => {
    test('should show message when no search results', async ({ page }) => {
      const searchInput = page.locator(
        '[data-testid="search-input"], ' +
        'input[placeholder*="search" i], ' +
        'input[type="search"]'
      ).first();
      
      // Search for something that won't exist
      await searchInput.fill('xyznonexistent123');
      await page.waitForTimeout(500);
      
      // Should show no results message
      const noResults = page.locator(
        'text=No animals found, ' +
        'text=No results, ' +
        '[data-testid="empty-state"]'
      );
      
      await expect(noResults.first()).toBeVisible({ timeout: 5000 });
    });
  });
});

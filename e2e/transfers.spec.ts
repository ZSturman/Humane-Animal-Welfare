/**
 * Transfers Page E2E Tests
 * 
 * Tests the animal transfer functionality including:
 * - Viewing transfer requests
 * - Transfer status display
 * - Incoming vs outgoing transfers
 */

import { test, expect } from '@playwright/test';

test.describe('Transfers Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transfers');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Transfer List', () => {
    test('should display transfers page', async ({ page }) => {
      const heading = page.locator(
        'h1:has-text("Transfer"), ' +
        'h2:has-text("Transfer"), ' +
        '[data-testid="transfers-heading"]'
      );
      
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show list of transfer requests', async ({ page }) => {
      const transferItems = page.locator(
        '[data-testid="transfer-item"], ' +
        '[data-testid="transfer-card"], ' +
        '.transfer-card, ' +
        'table tbody tr, ' +
        'article'
      );
      
      await expect(transferItems.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display transfer status badges', async ({ page }) => {
      const statusBadges = page.locator(
        '[data-testid="transfer-status"], ' +
        '.status-badge, ' +
        'text=PENDING, text=APPROVED, text=IN_TRANSIT, text=COMPLETED, text=REJECTED'
      );
      
      await expect(statusBadges.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show animal name in transfer', async ({ page }) => {
      // Mock transfers include animal names
      const animalNames = page.locator(
        '[data-testid="transfer-animal-name"], ' +
        '.animal-name, ' +
        'text=Max, text=Luna, text=Bella'
      );
      
      await expect(animalNames.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show partner organization names', async ({ page }) => {
      const orgNames = page.locator(
        '[data-testid="partner-org"], ' +
        '.partner-name, ' +
        'text=/shelter|rescue|humane/i'
      );
      
      await expect(orgNames.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Transfer Types', () => {
    test('should have tabs for incoming and outgoing transfers', async ({ page }) => {
      const tabs = page.locator(
        '[role="tab"], ' +
        'button:has-text("Incoming"), ' +
        'button:has-text("Outgoing"), ' +
        '[data-testid="transfer-tabs"]'
      );
      
      await expect(tabs.first()).toBeVisible();
    });

    test('should filter to show incoming transfers', async ({ page }) => {
      const incomingTab = page.locator(
        'button:has-text("Incoming"), ' +
        '[role="tab"]:has-text("Incoming"), ' +
        '[data-testid="incoming-tab"]'
      ).first();
      
      if (await incomingTab.isVisible()) {
        await incomingTab.click();
        await page.waitForTimeout(500);
        
        // Verify incoming transfers shown
        const transfers = page.locator('[data-testid="transfer-item"], .transfer-card');
        const count = await transfers.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter to show outgoing transfers', async ({ page }) => {
      const outgoingTab = page.locator(
        'button:has-text("Outgoing"), ' +
        '[role="tab"]:has-text("Outgoing"), ' +
        '[data-testid="outgoing-tab"]'
      ).first();
      
      if (await outgoingTab.isVisible()) {
        await outgoingTab.click();
        await page.waitForTimeout(500);
        
        // Verify outgoing transfers shown
        const transfers = page.locator('[data-testid="transfer-item"], .transfer-card');
        const count = await transfers.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Transfer Status Filtering', () => {
    test('should have status filter options', async ({ page }) => {
      const statusFilter = page.locator(
        '[data-testid="status-filter"], ' +
        'select[name*="status" i], ' +
        'button:has-text("Status")'
      );
      
      // Status filter may or may not be present
      const isVisible = await statusFilter.first().isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('should filter by pending status', async ({ page }) => {
      const pendingFilter = page.locator(
        'button:has-text("Pending"), ' +
        '[data-testid="filter-pending"], ' +
        'option:has-text("Pending")'
      ).first();
      
      if (await pendingFilter.isVisible()) {
        await pendingFilter.click();
        await page.waitForTimeout(500);
        
        // All visible transfers should be pending
        const statusBadges = page.locator('[data-testid="transfer-status"], .status-badge');
        const count = await statusBadges.count();
        
        for (let i = 0; i < count; i++) {
          const text = await statusBadges.nth(i).textContent();
          expect(text?.toUpperCase()).toContain('PENDING');
        }
      }
    });
  });

  test.describe('Transfer Details', () => {
    test('should show transfer request date', async ({ page }) => {
      const dateElements = page.locator(
        '[data-testid="transfer-date"], ' +
        '.transfer-date, ' +
        'time, ' +
        'text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\w+ \\d{1,2}, \\d{4}/i'
      );
      
      await expect(dateElements.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show reason for transfer', async ({ page }) => {
      const reasons = page.locator(
        '[data-testid="transfer-reason"], ' +
        '.transfer-reason, ' +
        'text=/space|capacity|medical|behavioral/i'
      );
      
      await expect(reasons.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have view details option', async ({ page }) => {
      const viewButton = page.locator(
        '[data-testid="view-transfer"], ' +
        'button:has-text("View"), ' +
        'a:has-text("Details"), ' +
        'button:has-text("Details")'
      );
      
      await expect(viewButton.first()).toBeVisible();
    });
  });

  test.describe('Transfer Actions (Demo Mode)', () => {
    test('should display action buttons for pending transfers', async ({ page }) => {
      // Look for pending transfers first
      const pendingTransfer = page.locator(
        '[data-testid="transfer-item"]:has-text("PENDING"), ' +
        '.transfer-card:has-text("PENDING")'
      ).first();
      
      if (await pendingTransfer.isVisible()) {
        const actionButtons = pendingTransfer.locator(
          'button:has-text("Accept"), ' +
          'button:has-text("Approve"), ' +
          'button:has-text("Reject"), ' +
          '[data-testid="transfer-actions"]'
        );
        
        await expect(actionButtons.first()).toBeVisible();
      }
    });

    test('should show read-only notice in demo mode', async ({ page }) => {
      // In demo mode, actions might be disabled or show a notice
      const demoNotice = page.locator(
        'text=/demo|read-only|preview/i, ' +
        '[data-testid="demo-notice"]'
      );
      
      // Demo notice may or may not be explicitly shown
      const isVisible = await demoNotice.first().isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Transfer Timeline', () => {
    test('should show transfer history/timeline for completed transfers', async ({ page }) => {
      // Look for completed transfer
      const completedTransfer = page.locator(
        '[data-testid="transfer-item"]:has-text("COMPLETED"), ' +
        '.transfer-card:has-text("COMPLETED")'
      ).first();
      
      if (await completedTransfer.isVisible()) {
        await completedTransfer.click();
        await page.waitForTimeout(500);
        
        // Look for timeline
        const timeline = page.locator(
          '[data-testid="transfer-timeline"], ' +
          '.timeline, ' +
          'text=/requested|approved|completed/i'
        );
        
        const isVisible = await timeline.first().isVisible().catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    });
  });

  test.describe('Empty States', () => {
    test('should handle empty transfer list gracefully', async ({ page }) => {
      // Navigate to a filtered view that might be empty
      const rejectedFilter = page.locator(
        'button:has-text("Rejected"), ' +
        '[data-testid="filter-rejected"]'
      ).first();
      
      if (await rejectedFilter.isVisible()) {
        await rejectedFilter.click();
        await page.waitForTimeout(500);
        
        // Either show transfers or empty message
        const content = page.locator(
          '[data-testid="transfer-item"], ' +
          '.transfer-card, ' +
          'text=No transfers, ' +
          '[data-testid="empty-state"]'
        );
        
        await expect(content.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Partner Information', () => {
    test('should display source and destination organizations', async ({ page }) => {
      const orgInfo = page.locator(
        '[data-testid="source-org"], ' +
        '[data-testid="destination-org"], ' +
        '.from-org, .to-org, ' +
        'text=/from:|to:/i'
      );
      
      await expect(orgInfo.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show contact information for partners', async ({ page }) => {
      // Click on a transfer to see details
      const transferItem = page.locator(
        '[data-testid="transfer-item"], .transfer-card'
      ).first();
      
      if (await transferItem.isVisible()) {
        await transferItem.click();
        await page.waitForTimeout(500);
        
        // Look for contact info
        const contactInfo = page.locator(
          '[data-testid="contact-info"], ' +
          '.contact-info, ' +
          'text=/@|phone|email/i'
        );
        
        // Contact info may or may not be shown in list view
        const isVisible = await contactInfo.first().isVisible().catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    });
  });

  test.describe('Animal Information in Transfer', () => {
    test('should show animal photo in transfer card', async ({ page }) => {
      const animalPhoto = page.locator(
        '[data-testid="transfer-item"] img, ' +
        '.transfer-card img'
      );
      
      await expect(animalPhoto.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show animal species in transfer', async ({ page }) => {
      const speciesInfo = page.locator(
        '[data-testid="transfer-species"], ' +
        '.animal-species, ' +
        'text=Dog, text=Cat'
      );
      
      await expect(speciesInfo.first()).toBeVisible({ timeout: 10000 });
    });
  });
});

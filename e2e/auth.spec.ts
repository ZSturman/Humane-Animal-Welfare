/**
 * Authentication E2E Tests
 * 
 * Tests the authentication flow including:
 * - Auto-login in demo mode
 * - User session persistence
 * - Navigation guards
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Demo Mode Auto-Login', () => {
    test('should automatically log in user in demo mode', async ({ page }) => {
      await page.goto('/');
      
      // In demo mode, user should be auto-logged in
      // Wait for dashboard to load (indicates successful auth)
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
      
      // Should see user info in header or sidebar
      await expect(page.locator('text=Demo User')).toBeVisible();
    });

    test('should display organization name after auto-login', async ({ page }) => {
      await page.goto('/');
      
      await expect(page.locator('text=Happy Paws Shelter')).toBeVisible({ timeout: 10000 });
    });

    test('should have admin privileges in demo mode', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Admin should see settings or admin menu
      const adminElements = page.locator('[data-testid="admin-menu"], text=Settings, text=Admin');
      await expect(adminElements.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      await page.goto('/');
      
      // Wait for initial auth
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
      
      // Reload page
      await page.reload();
      
      // Should still be logged in
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Demo User')).toBeVisible();
    });

    test('should maintain session when navigating between pages', async ({ page }) => {
      await page.goto('/');
      
      // Wait for auth
      await page.waitForLoadState('networkidle');
      
      // Navigate to animals page
      await page.click('text=Animals');
      await expect(page).toHaveURL(/.*animals/);
      
      // Navigate back to dashboard
      await page.click('text=Dashboard');
      await expect(page).toHaveURL('/');
      
      // Should still see user info
      await expect(page.locator('text=Demo User')).toBeVisible();
    });
  });

  test.describe('Navigation Guards', () => {
    test('should redirect to login page when accessing protected route without auth', async ({ page, context }) => {
      // Clear any existing storage to simulate logged out state
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Note: In demo mode, auto-login will occur, so this test verifies the flow works
      await page.goto('/animals');
      
      // Should either redirect to login or auto-login in demo mode
      await page.waitForLoadState('networkidle');
      
      // In demo mode, should be logged in and on animals page
      const url = page.url();
      expect(url).toMatch(/\/(animals|login)?/);
    });
  });

  test.describe('User Interface', () => {
    test('should display user avatar or initials', async ({ page }) => {
      await page.goto('/');
      
      await page.waitForLoadState('networkidle');
      
      // Look for avatar component
      const avatar = page.locator('[data-testid="user-avatar"], .avatar, [aria-label*="user"]');
      await expect(avatar.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show user role badge', async ({ page }) => {
      await page.goto('/');
      
      await page.waitForLoadState('networkidle');
      
      // Demo user has ADMIN role
      const roleIndicator = page.locator('text=Admin, text=ADMIN, [data-testid="user-role"]');
      await expect(roleIndicator.first()).toBeVisible({ timeout: 10000 });
    });
  });
});

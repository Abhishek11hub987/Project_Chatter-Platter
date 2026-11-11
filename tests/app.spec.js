import { test, expect } from '@playwright/test';

test.describe('Chatter & Platter AI Smart Cafe E2E', () => {
  test('Full QR order -> Reception Token -> Chef KDS -> Admin SQL flow', async ({ context }) => {
    const customerPage = await context.newPage();

    // 1. Customer scans Table 5 QR
    await customerPage.goto('/?table=5');
    await expect(customerPage).toHaveTitle(/Chatter & Platter/);

    // Wait for splash screen to finish and Welcome screen to show
    const nameInput = customerPage.getByPlaceholder('Enter your name to begin...');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await expect(customerPage.getByText('Table 05')).toBeVisible();

    await nameInput.fill('Alex');
    await customerPage.getByRole('button', { name: /Browse Smart Menu/i }).click();

    // 2. Open Chatter AI Barista and add a combo
    await customerPage.getByRole('button', { name: /Ask Chatter AI Barista/i }).click();
    await expect(customerPage.getByText('Chatter AI Barista')).toBeVisible();
    await customerPage.getByRole('button', { name: '+ Combo' }).first().click();
    await customerPage.getByRole('button', { name: 'Close AI Barista' }).click();

    // 3. Open Cart and place order
    await customerPage.getByRole('button', { name: /View Cart/i }).click();
    await expect(customerPage.getByText('YOUR TRAY')).toBeVisible();
    await customerPage.getByRole('button', { name: /Place Order/i }).click();

    // Verify Tracker shows Awaiting Counter Payment
    await expect(customerPage.getByText(/Awaiting Counter Payment/i)).toBeVisible();

    // 4. Reception opens in second tab (same browser context shares localStorage/BroadcastChannel)
    const receptionPage = await context.newPage();
    await receptionPage.goto('/?role=reception');
    await receptionPage.getByPlaceholder('••••').fill('1234');
    await receptionPage.getByRole('button', { name: /Unlock Desk/i }).click();

    await expect(receptionPage.getByText('Table 5')).toBeVisible();
    await receptionPage.getByRole('button', { name: /Confirm Payment & Token/i }).first().click();

    // Verify Customer Tracker automatically updates with a Token #
    await expect(customerPage.getByText('YOUR LIVE TOKEN')).toBeVisible({ timeout: 5000 });

    // 5. Chef KDS opens in third tab
    const chefPage = await context.newPage();
    await chefPage.goto('/?role=chef');
    await chefPage.getByPlaceholder('••••').fill('5678');
    await chefPage.getByRole('button', { name: /Enter Kitchen/i }).click();

    await expect(chefPage.getByText(/Batch Prep:/i)).toBeVisible();
    await chefPage.getByRole('button', { name: /Start Cooking/i }).first().click();
    await chefPage.getByRole('button', { name: /Order Ready/i }).first().click();

    // Customer Tracker shows full-screen Ready Banner
    await expect(customerPage.getByText('IS READY!')).toBeVisible({ timeout: 5000 });

    // 6. Staff Login -> Admin SQL & Owner AI
    const staffPage = await context.newPage();
    await staffPage.goto('/login');
    await staffPage.getByRole('button', { name: /Admin & SQL/i }).click();
    await expect(staffPage.getByText('Database Connection')).toBeVisible();
    await staffPage.getByRole('button', { name: /Supabase SQL Schema/i }).click();
    await expect(staffPage.getByText(/Complete Supabase SQL Schema/i)).toBeVisible();
  });
});

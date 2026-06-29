import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Gestor de Proyectos E2E Tests', () => {

  test('Completes the entire lifecycle and tabs check', async ({ page }) => {
    // 1. Visit the app with mock authentication bypass
    await page.goto('/?mock-auth=admin');
    
    // Check that we are inside the Dashboard view
    await expect(page.locator('h2:has-text("Dashboard Ejecutivo")')).toBeVisible({ timeout: 15000 });

    // 2. Navigate through each tab to verify they function without errors
    const tabs = [
      { name: 'Proyectos', title: 'Lista de Proyectos' },
      { name: 'Vista Gantt', title: 'Gantt Operativo' },
      { name: 'Revisión Semanal', title: 'Revisión Semanal' },
      { name: 'Decisiones', title: 'Decisiones Pendientes' },
      { name: 'Informes', title: 'Informes Ejecutivos' },
      { name: 'Importación', title: 'Importación de Datos' },
      { name: 'Usuarios', title: 'Usuarios' },
      { name: 'Papelera', title: 'Papelera' }
    ];

    for (const tab of tabs) {
      console.log(`Verifying tab: ${tab.name}`);
      await page.click(`button:has-text("${tab.name}")`);
      // Wait for headers
      await expect(page.locator(`h2:has-text("${tab.title}")`)).toBeVisible({ timeout: 5000 });
    }

    // 3. Create a project
    console.log('Creating a project...');
    await page.click('button:has-text("Proyectos")');
    await page.click('button:has-text("Nuevo Proyecto")');
    
    const uniqueProjectName = `Project E2E Test ${Date.now()}`;
    await page.fill('input[placeholder="Ej: Nuevo Proyecto"]', uniqueProjectName);
    await page.fill('textarea[placeholder="Detalles adicionales..."]', 'This is an automated test project.');
    
    // Choose group (mandatory)
    await page.locator('select').filter({ hasText: 'Seleccione un grupo...' }).selectOption({ label: 'Largo plazo' });

    // Choose high urgency
    await page.locator('select').filter({ hasText: 'Urgencia' }).selectOption('Alto');
    
    await page.click('button:has-text("Crear Proyecto")');
    console.log('Project created.');

    // 4. Verify project is visible and expand it to create a task (action)
    const projectRow = page.locator(`div:has-text("${uniqueProjectName}")`).first();
    await expect(projectRow).toBeVisible({ timeout: 10000 });
    
    // Expand project row (clicking it)
    await projectRow.click();
    console.log('Project row expanded.');

    // 5. Create action (task)
    const newActionButton = page.locator('button:has-text("Nueva Acción")').first();
    await expect(newActionButton).toBeVisible();
    await newActionButton.click();

    const uniqueActionName = `Action E2E Test ${Date.now()}`;
    await page.fill('input[placeholder="Ej: Nuevo Acción"]', uniqueActionName);
    await page.click('button:has-text("Crear Acción")');
    console.log('Action created.');

    // Verify action is visible
    const actionRow = page.locator(`div:has-text("${uniqueActionName}")`).first();
    await expect(actionRow).toBeVisible({ timeout: 5000 });

    // 6. Delete the project
    console.log('Deleting project...');
    // We target the project's trash/delete button
    // It's inside the project row, button with title="Eliminar" or containing svg of Trash2
    const deleteButton = page.locator(`div:has-text("${uniqueProjectName}") >> button[title="Eliminar"]`).first();
    await deleteButton.click();

    // Confirm deletion modal
    const confirmButton = page.locator('.fixed button:has-text("Eliminar")');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    console.log('Project deleted.');

    // Verify it is no longer visible in active list
    await expect(page.locator(`div:has-text("${uniqueProjectName}")`)).not.toBeVisible();

    // 7. Verify it's in the Trash Bin tab
    await page.click('button:has-text("Papelera")');
    await expect(page.locator(`li:has-text("${uniqueProjectName}")`)).toBeVisible({ timeout: 5000 });
    console.log('Project verified in Trash.');

    // 8. Excel Import / Export verification
    console.log('Testing Excel download and import...');
    await page.click('button:has-text("Importación")');

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Descargar Plantilla Excel")');
    const download = await downloadPromise;

    // Save download to temporary path
    const tempDir = path.resolve('./temp-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const downloadPath = path.join(tempDir, 'template.xlsx');
    await download.saveAs(downloadPath);
    console.log(`Excel template downloaded successfully to ${downloadPath}`);

    // Verify file exists and is not empty
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    expect(fs.statSync(downloadPath).size).toBeGreaterThan(0);

    // Upload the downloaded file to verify import works
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(downloadPath);

    // Verify preview shows the rows from template
    await expect(page.locator('text=filas detectadas')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Confirmar e Importar")')).toBeVisible();

    // Setup dialog alert handler since the app raises an alert on success
    page.once('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      expect(dialog.message()).toContain('Importación completada con éxito');
      await dialog.accept();
    });

    // Confirm and import
    await page.click('button:has-text("Confirmar e Importar")');
    
    // Verify it is processed
    await expect(page.locator('li:has-text("filas del archivo")')).toBeVisible({ timeout: 10000 });
    console.log('Excel import verified successfully.');
    
    // Clean up temp dir
    try {
      fs.unlinkSync(downloadPath);
      fs.rmdirSync(tempDir);
    } catch (err) {}
  });

});

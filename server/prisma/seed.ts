import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed IRS Tax Categories
  const taxCategories = [
    // Schedule C - Profit or Loss from Business
    { code: 'schedule_c_advertising', name: 'Advertising', schedule: 'Schedule C', line: 'Line 8' },
    { code: 'schedule_c_car_truck', name: 'Car and truck expenses', schedule: 'Schedule C', line: 'Line 9' },
    { code: 'schedule_c_commissions', name: 'Commissions and fees', schedule: 'Schedule C', line: 'Line 10' },
    { code: 'schedule_c_contract_labor', name: 'Contract labor', schedule: 'Schedule C', line: 'Line 11' },
    { code: 'schedule_c_depreciation', name: 'Depreciation', schedule: 'Schedule C', line: 'Line 13' },
    { code: 'schedule_c_employee_benefits', name: 'Employee benefit programs', schedule: 'Schedule C', line: 'Line 14' },
    { code: 'schedule_c_insurance', name: 'Insurance (other than health)', schedule: 'Schedule C', line: 'Line 15' },
    { code: 'schedule_c_interest_mortgage', name: 'Interest (mortgage)', schedule: 'Schedule C', line: 'Line 16a' },
    { code: 'schedule_c_interest_other', name: 'Interest (other)', schedule: 'Schedule C', line: 'Line 16b' },
    { code: 'schedule_c_legal', name: 'Legal and professional services', schedule: 'Schedule C', line: 'Line 17' },
    { code: 'schedule_c_office', name: 'Office expense', schedule: 'Schedule C', line: 'Line 18' },
    { code: 'schedule_c_pension', name: 'Pension and profit-sharing plans', schedule: 'Schedule C', line: 'Line 19' },
    { code: 'schedule_c_rent_equipment', name: 'Rent or lease (equipment)', schedule: 'Schedule C', line: 'Line 20a' },
    { code: 'schedule_c_rent_property', name: 'Rent or lease (other property)', schedule: 'Schedule C', line: 'Line 20b' },
    { code: 'schedule_c_repairs', name: 'Repairs and maintenance', schedule: 'Schedule C', line: 'Line 21' },
    { code: 'schedule_c_supplies', name: 'Supplies', schedule: 'Schedule C', line: 'Line 22' },
    { code: 'schedule_c_taxes', name: 'Taxes and licenses', schedule: 'Schedule C', line: 'Line 23' },
    { code: 'schedule_c_travel', name: 'Travel', schedule: 'Schedule C', line: 'Line 24a' },
    { code: 'schedule_c_meals', name: 'Meals (business)', schedule: 'Schedule C', line: 'Line 24b' },
    { code: 'schedule_c_utilities', name: 'Utilities', schedule: 'Schedule C', line: 'Line 25' },
    { code: 'schedule_c_wages', name: 'Wages', schedule: 'Schedule C', line: 'Line 26' },
    { code: 'schedule_c_other', name: 'Other expenses', schedule: 'Schedule C', line: 'Line 27a' },

    // Schedule E - Supplemental Income (Rental)
    { code: 'schedule_e_advertising', name: 'Advertising', schedule: 'Schedule E', line: 'Line 5' },
    { code: 'schedule_e_auto_travel', name: 'Auto and travel', schedule: 'Schedule E', line: 'Line 6' },
    { code: 'schedule_e_cleaning', name: 'Cleaning and maintenance', schedule: 'Schedule E', line: 'Line 7' },
    { code: 'schedule_e_commissions', name: 'Commissions', schedule: 'Schedule E', line: 'Line 8' },
    { code: 'schedule_e_insurance', name: 'Insurance', schedule: 'Schedule E', line: 'Line 9' },
    { code: 'schedule_e_legal', name: 'Legal and professional fees', schedule: 'Schedule E', line: 'Line 10' },
    { code: 'schedule_e_management', name: 'Management fees', schedule: 'Schedule E', line: 'Line 11' },
    { code: 'schedule_e_interest_mortgage', name: 'Mortgage interest paid', schedule: 'Schedule E', line: 'Line 12' },
    { code: 'schedule_e_interest_other', name: 'Other interest', schedule: 'Schedule E', line: 'Line 13' },
    { code: 'schedule_e_repairs', name: 'Repairs', schedule: 'Schedule E', line: 'Line 14' },
    { code: 'schedule_e_supplies', name: 'Supplies', schedule: 'Schedule E', line: 'Line 15' },
    { code: 'schedule_e_taxes', name: 'Taxes', schedule: 'Schedule E', line: 'Line 16' },
    { code: 'schedule_e_utilities', name: 'Utilities', schedule: 'Schedule E', line: 'Line 17' },
    { code: 'schedule_e_depreciation', name: 'Depreciation', schedule: 'Schedule E', line: 'Line 18' },
    { code: 'schedule_e_other', name: 'Other', schedule: 'Schedule E', line: 'Line 19' },
  ];

  for (const tc of taxCategories) {
    await prisma.taxCategory.upsert({
      where: { code: tc.code },
      update: tc,
      create: tc,
    });
  }

  console.log(`Seeded ${taxCategories.length} tax categories`);

  // Seed default expense categories for the dev user
  const defaultCategories = [
    { name: 'Renovations', color: '#ef4444' },
    { name: 'Furnishings', color: '#f97316' },
    { name: 'Maintenance', color: '#eab308' },
    { name: 'Operations', color: '#22c55e' },
    { name: 'Travel', color: '#3b82f6' },
    { name: 'Meals', color: '#8b5cf6' },
    { name: 'Office Supplies', color: '#ec4899' },
    { name: 'Utilities', color: '#06b6d4' },
    { name: 'Insurance', color: '#64748b' },
    { name: 'Professional Services', color: '#14b8a6' },
  ];

  // Use dev_user as default userId (dev mode without Clerk)
  const userId = 'dev_user';

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { userId_name: { userId, name: cat.name } },
      update: { color: cat.color },
      create: { name: cat.name, color: cat.color, userId },
    });
  }

  console.log(`Seeded ${defaultCategories.length} default categories`);
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

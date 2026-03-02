import dotenv from 'dotenv';
import { connectDB, getDB } from '../config/db';
import { EMPLOYEE_SECTION_MAP, EmployeeHall, EmployeeSectionId } from '../constants/employeeSections';
import { SEED_EMPLOYEES } from '../constants/seedEmployees';

type EmployeeDoc = {
  serial?: number;
  name: string;
  number?: string;
  hall: EmployeeHall;
  sectionId: EmployeeSectionId;
  sectionLabel: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

dotenv.config();

const run = async () => {
  await connectDB();
  const collection = getDB().collection<EmployeeDoc>('employees');

  await collection.createIndex({ serial: 1 }, { unique: true, sparse: true });
  await collection.createIndex({ hall: 1, sectionId: 1, serial: 1 });

  let inserted = 0;
  let updated = 0;

  for (const row of SEED_EMPLOYEES) {
    const section = EMPLOYEE_SECTION_MAP[row.sectionId];
    if (!section) {
      continue;
    }

    const now = new Date();
    const result = await collection.updateOne(
      { serial: row.serial },
      {
        $set: {
          name: row.name,
          hall: section.hall,
          sectionId: section.id,
          sectionLabel: section.label,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          createdBy: 'seed-script',
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inserted += 1;
    } else if (result.modifiedCount > 0) {
      updated += 1;
    }
  }

  console.log(`Seed complete. inserted=${inserted}, updated=${updated}, total=${SEED_EMPLOYEES.length}`);
  process.exit(0);
};

run().catch((error) => {
  console.error('Employee seed failed:', error);
  process.exit(1);
});


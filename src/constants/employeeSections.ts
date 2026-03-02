export type EmployeeHall = 'main_hall' | 'chinese_hall';

export const EMPLOYEE_SECTIONS = [
  { id: 'management', label: 'ম্যানেজমেন্ট', hall: 'main_hall' },
  { id: 'computer_operator', label: 'কম্পিউটার অপারেটর', hall: 'main_hall' },
  { id: 'audit', label: 'অডিট', hall: 'main_hall' },
  { id: 'cashier', label: 'ক্যাশিয়ার', hall: 'main_hall' },
  { id: 'marketing', label: 'মার্কেটিং', hall: 'main_hall' },
  { id: 'floor', label: 'ফ্লোর', hall: 'main_hall' },
  { id: 'bill_ferani', label: 'বিল ফেরানি', hall: 'main_hall' },
  { id: 'bangla_barbi_stand', label: 'বাংলা বারবি স্ট্যান্ড', hall: 'main_hall' },
  { id: 'parota_stand', label: 'পরোটা স্ট্যান্ড', hall: 'main_hall' },
  { id: 'jhal_stand', label: 'ঝাল স্ট্যান্ড', hall: 'main_hall' },
  { id: 'ruti_stand', label: 'রুটি স্ট্যান্ড', hall: 'main_hall' },
  { id: 'haddi_stand', label: 'হাড্ডি স্ট্যান্ড', hall: 'main_hall' },
  { id: 'grill_stand', label: 'গ্রিল স্ট্যান্ড', hall: 'main_hall' },
  { id: 'electrician', label: 'ইলেকট্রিশিয়ান', hall: 'main_hall' },
  { id: 'tea_stand', label: 'চা স্ট্যান্ড', hall: 'main_hall' },
  { id: 'plate_boy', label: 'প্লেট বয়', hall: 'main_hall' },
  { id: 'parcel_boy', label: 'পার্সেল বয়', hall: 'main_hall' },
  { id: 'bangla_table_boy', label: 'বাংলা টেবিল বয়', hall: 'main_hall' },
  { id: 'bangla_glass_boy', label: 'বাংলা গ্লাস বয়', hall: 'main_hall' },
  { id: 'cleaner', label: 'ক্লিনার', hall: 'main_hall' },
  { id: 'mosla', label: 'মসলা', hall: 'main_hall' },
  { id: 'security_guard', label: 'সিকিউরিটি গার্ড', hall: 'main_hall' },
  { id: 'supervisor', label: 'সুপার ভাইজার', hall: 'chinese_hall' },
  { id: 'chinese_cashier', label: 'চাইনিজ ক্যাশিয়ার', hall: 'chinese_hall' },
  { id: 'captain', label: 'ক্যাপ্টেন', hall: 'chinese_hall' },
  { id: 'senior_waiter', label: 'সিনিয়র ওয়েটার', hall: 'chinese_hall' },
  { id: 'junior_waiter', label: 'জুনিয়র ওয়েটার', hall: 'chinese_hall' },
  { id: 'italian', label: 'ইটালিয়ান', hall: 'chinese_hall' },
  { id: 'chinese', label: 'চাইনিজ', hall: 'chinese_hall' },
  { id: 'juice_bar', label: 'জুসবার', hall: 'chinese_hall' },
  { id: 'house_keeping', label: 'হাউজ কিপিং', hall: 'chinese_hall' },
  { id: 'dish_wash', label: 'ডিশ ওয়াশ', hall: 'chinese_hall' },
] as const;

export type EmployeeSection = (typeof EMPLOYEE_SECTIONS)[number];
export type EmployeeSectionId = EmployeeSection['id'];

export const EMPLOYEE_SECTION_MAP: Record<EmployeeSectionId, EmployeeSection> = EMPLOYEE_SECTIONS.reduce(
  (accumulator, section) => {
    accumulator[section.id] = section;
    return accumulator;
  },
  {} as Record<EmployeeSectionId, EmployeeSection>
);

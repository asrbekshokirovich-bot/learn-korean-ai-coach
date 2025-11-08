export type Language = 'uz' | 'en' | 'ko' | 'ru';

export const translations = {
  uz: {
    // Navigation
    home: "Bosh sahifa",
    features: "Xususiyatlar",
    pricing: "Narxlar",
    courses: "Kurslar",
    dashboard: "Boshqaruv paneli",
    signIn: "Kirish",
    signUp: "Ro'yxatdan o'tish",
    logout: "Chiqish",
    
    // Student Dashboard
    myPackage: "Mening paketim",
    bookLesson: "Dars band qilish",
    schedule: "Jadval",
    practice: "Mashq qilish",
    lessons: "Darslar",
    conversationPractice: "Suhbat mashqlari",
    topikPrep: "TOPIK tayyorgarlik",
    
    // Teacher Dashboard
    availability: "Mavjudlik",
    teacherStudents: "O'quvchilar",
    
    // Book Lesson
    bookALesson: "Dars band qilish",
    selectYourLevel: "Darajangizni tanlang",
    chooseYourLevel: "Darajangizni tanlang",
    selectDate: "Sanani tanlang",
    availableTimeSlots: "Mavjud vaqtlar",
    noAvailableSlots: "Bu kunda {level} darajasi uchun mavjud vaqtlar yo'q",
    beginner: "Boshlang'ich",
    intermediate: "O'rta",
    advanced: "Ilg'or",
    bookLessonButton: "Darsni band qilish",
    
    // Availability
    myAvailability: "Mening mavjudligim",
    manageAvailability: "Talabalar siz bilan darslarni qachon band qilishi mumkinligini boshqaring",
    addAvailabilitySlot: "Mavjudlik vaqtini qo'shish",
    selectDays: "Kunlarni tanlang",
    selectAll: "Hammasini tanlash",
    deselectAll: "Tanlovni bekor qilish",
    sunday: "Yakshanba",
    monday: "Dushanba",
    tuesday: "Seshanba",
    wednesday: "Chorshanba",
    thursday: "Payshanba",
    friday: "Juma",
    saturday: "Shanba",
    startTime: "Boshlanish vaqti",
    endTime: "Tugash vaqti",
    teachingLevel: "O'qitish darajasi",
    addToDays: "{count} kun(lar)ga qo'shish",
    currentAvailability: "Joriy mavjudlik",
    noAvailabilitySlots: "Mavjudlik vaqtlari yo'q",
    
    // Toast messages
    missingInformation: "Ma'lumot yetishmayapti",
    selectLevelDateAndTime: "Iltimos, daraja, sana va vaqtni tanlang",
    noActivePackage: "Faol paket yo'q",
    purchasePackageFirst: "Iltimos, avval dars paketini sotib oling",
    bookingFailed: "Band qilish amalga oshmadi",
    lessonBooked: "Dars band qilindi!",
    lessonScheduledSuccess: "Darsning jadvali muvaffaqiyatli tuzildi",
    noDaysSelected: "Kunlar tanlanmagan",
    selectAtLeastOneDay: "Kamida bitta kunni tanlang",
    noLevelSelected: "Daraja tanlanmagan",
    selectTeachingLevel: "O'qitish darajasini tanlang",
    availabilityAdded: "Mavjudlik qo'shildi",
    addedAvailabilityForDays: "{count} kun(lar) uchun mavjudlik qo'shildi",
    availabilityRemoved: "Mavjudlik o'chirildi",
    availabilitySlotRemoved: "Mavjudlik vaqti o'chirildi",
  },
  en: {
    // Navigation
    home: "Home",
    features: "Features",
    pricing: "Pricing",
    courses: "Courses",
    dashboard: "Dashboard",
    signIn: "Sign In",
    signUp: "Sign Up",
    logout: "Logout",
    
    // Student Dashboard
    myPackage: "My Package",
    bookLesson: "Book Lesson",
    schedule: "Schedule",
    practice: "Practice",
    lessons: "Lessons",
    conversationPractice: "Conversation Practice",
    topikPrep: "TOPIK Prep",
    
    // Teacher Dashboard
    availability: "My Availability",
    teacherStudents: "Students",
    
    // Book Lesson
    bookALesson: "Book a Lesson",
    selectYourLevel: "Select your level and preferred time slot",
    chooseYourLevel: "Choose your level",
    selectDate: "Select Date",
    availableTimeSlots: "Available Time Slots",
    noAvailableSlots: "No available slots for {level} level on this day",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    bookLessonButton: "Book Lesson",
    
    // Availability
    myAvailability: "My Availability",
    manageAvailability: "Manage when students can book lessons with you",
    addAvailabilitySlot: "Add Availability Slot",
    selectDays: "Select Days",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    startTime: "Start Time",
    endTime: "End Time",
    teachingLevel: "Teaching Level",
    addToDays: "Add to {count} Day(s)",
    currentAvailability: "Current Availability",
    noAvailabilitySlots: "No availability slots set",
    
    // Toast messages
    missingInformation: "Missing information",
    selectLevelDateAndTime: "Please select a level, date, and time",
    noActivePackage: "No active package",
    purchasePackageFirst: "Please purchase a lesson package first",
    bookingFailed: "Booking failed",
    lessonBooked: "Lesson booked!",
    lessonScheduledSuccess: "Your lesson has been scheduled successfully",
    noDaysSelected: "No days selected",
    selectAtLeastOneDay: "Please select at least one day",
    noLevelSelected: "No level selected",
    selectTeachingLevel: "Please select a teaching level",
    availabilityAdded: "Availability added",
    addedAvailabilityForDays: "Added availability for {count} day(s)",
    availabilityRemoved: "Availability removed",
    availabilitySlotRemoved: "Your availability slot has been removed",
  },
  ko: {
    // Navigation
    home: "홈",
    features: "기능",
    pricing: "가격",
    courses: "코스",
    dashboard: "대시보드",
    signIn: "로그인",
    signUp: "회원가입",
    logout: "로그아웃",
    
    // Student Dashboard
    myPackage: "내 패키지",
    bookLesson: "수업 예약",
    schedule: "일정",
    practice: "연습",
    lessons: "레슨",
    conversationPractice: "회화 연습",
    topikPrep: "TOPIK 준비",
    
    // Teacher Dashboard
    availability: "내 가능 시간",
    teacherStudents: "학생",
    
    // Book Lesson
    bookALesson: "수업 예약",
    selectYourLevel: "레벨과 선호하는 시간대를 선택하세요",
    chooseYourLevel: "레벨을 선택하세요",
    selectDate: "날짜 선택",
    availableTimeSlots: "가능한 시간",
    noAvailableSlots: "이 날짜에 {level} 레벨의 가능한 시간이 없습니다",
    beginner: "초급",
    intermediate: "중급",
    advanced: "고급",
    bookLessonButton: "수업 예약",
    
    // Availability
    myAvailability: "내 가능 시간",
    manageAvailability: "학생들이 수업을 예약할 수 있는 시간을 관리하세요",
    addAvailabilitySlot: "가능 시간 추가",
    selectDays: "요일 선택",
    selectAll: "모두 선택",
    deselectAll: "모두 해제",
    sunday: "일요일",
    monday: "월요일",
    tuesday: "화요일",
    wednesday: "수요일",
    thursday: "목요일",
    friday: "금요일",
    saturday: "토요일",
    startTime: "시작 시간",
    endTime: "종료 시간",
    teachingLevel: "교육 레벨",
    addToDays: "{count}일에 추가",
    currentAvailability: "현재 가능 시간",
    noAvailabilitySlots: "설정된 가능 시간 없음",
    
    // Toast messages
    missingInformation: "정보 누락",
    selectLevelDateAndTime: "레벨, 날짜, 시간을 선택해주세요",
    noActivePackage: "활성 패키지 없음",
    purchasePackageFirst: "먼저 레슨 패키지를 구매해주세요",
    bookingFailed: "예약 실패",
    lessonBooked: "수업 예약 완료!",
    lessonScheduledSuccess: "수업이 성공적으로 예약되었습니다",
    noDaysSelected: "요일 미선택",
    selectAtLeastOneDay: "최소 하나의 요일을 선택해주세요",
    noLevelSelected: "레벨 미선택",
    selectTeachingLevel: "교육 레벨을 선택해주세요",
    availabilityAdded: "가능 시간 추가됨",
    addedAvailabilityForDays: "{count}일의 가능 시간이 추가되었습니다",
    availabilityRemoved: "가능 시간 제거됨",
    availabilitySlotRemoved: "가능 시간이 제거되었습니다",
  },
  ru: {
    // Navigation
    home: "Главная",
    features: "Функции",
    pricing: "Цены",
    courses: "Курсы",
    dashboard: "Панель",
    signIn: "Войти",
    signUp: "Регистрация",
    logout: "Выйти",
    
    // Student Dashboard
    myPackage: "Мой пакет",
    bookLesson: "Забронировать урок",
    schedule: "Расписание",
    practice: "Практика",
    lessons: "Уроки",
    conversationPractice: "Разговорная практика",
    topikPrep: "Подготовка к TOPIK",
    
    // Teacher Dashboard
    availability: "Моя доступность",
    teacherStudents: "Студенты",
    
    // Book Lesson
    bookALesson: "Забронировать урок",
    selectYourLevel: "Выберите свой уровень и предпочтительное время",
    chooseYourLevel: "Выберите свой уровень",
    selectDate: "Выберите дату",
    availableTimeSlots: "Доступное время",
    noAvailableSlots: "Нет доступного времени для уровня {level} в этот день",
    beginner: "Начальный",
    intermediate: "Средний",
    advanced: "Продвинутый",
    bookLessonButton: "Забронировать урок",
    
    // Availability
    myAvailability: "Моя доступность",
    manageAvailability: "Управляйте временем, когда студенты могут бронировать уроки",
    addAvailabilitySlot: "Добавить время доступности",
    selectDays: "Выберите дни",
    selectAll: "Выбрать все",
    deselectAll: "Отменить выбор",
    sunday: "Воскресенье",
    monday: "Понедельник",
    tuesday: "Вторник",
    wednesday: "Среда",
    thursday: "Четверг",
    friday: "Пятница",
    saturday: "Суббота",
    startTime: "Время начала",
    endTime: "Время окончания",
    teachingLevel: "Уровень преподавания",
    addToDays: "Добавить к {count} дн(ям)",
    currentAvailability: "Текущая доступность",
    noAvailabilitySlots: "Время доступности не установлено",
    
    // Toast messages
    missingInformation: "Недостающая информация",
    selectLevelDateAndTime: "Пожалуйста, выберите уровень, дату и время",
    noActivePackage: "Нет активного пакета",
    purchasePackageFirst: "Сначала купите пакет уроков",
    bookingFailed: "Бронирование не удалось",
    lessonBooked: "Урок забронирован!",
    lessonScheduledSuccess: "Ваш урок успешно запланирован",
    noDaysSelected: "Дни не выбраны",
    selectAtLeastOneDay: "Выберите хотя бы один день",
    noLevelSelected: "Уровень не выбран",
    selectTeachingLevel: "Выберите уровень преподавания",
    availabilityAdded: "Доступность добавлена",
    addedAvailabilityForDays: "Добавлена доступность для {count} дн(я/ей)",
    availabilityRemoved: "Доступность удалена",
    availabilitySlotRemoved: "Время доступности удалено",
  },
};

export const getTranslation = (lang: Language, key: keyof typeof translations['en'], params?: Record<string, string | number>): string => {
  let text = translations[lang][key] || translations['en'][key] || key;
  
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(`{${paramKey}}`, String(paramValue));
    });
  }
  
  return text;
};

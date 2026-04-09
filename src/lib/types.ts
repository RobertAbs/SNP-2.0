// ─── ПИР-ПСД ────────────────────────────────────────────────────────
export type PirStage =
  | "ird"             // Исходно-разрешительные документы
  | "izyskaniya"      // Инженерные изыскания
  | "proektirovanie"  // Проектирование
  | "soglasovaniya"   // Согласования
  | "zemleustroistvo" // Землеустроительные работы
  | "ekspertiza";     // Экспертиза проекта

export const PIR_STAGE_LABELS: Record<PirStage, string> = {
  ird: "Исходно-разрешительные документы",
  izyskaniya: "Инженерные изыскания",
  proektirovanie: "Проектирование",
  soglasovaniya: "Согласования",
  zemleustroistvo: "Землеустроительные работы",
  ekspertiza: "Экспертиза проекта",
};

export interface PirWeight {
  stage: PirStage;
  weight: number;       // 0..1
  description: string;
}

export interface PirStageItem {
  name: string;          // "Акт выбора трасс"
  info: string;          // "Информация" — произвольный текст/№
  status: string;        // "да" / "нет" / "25%" / ""
  type: "bool" | "pct";
}

export interface PirStageDetail {
  items: PirStageItem[];
  pct: number;           // общий статус выполнения этапа, %
}

export interface PirRow {
  orderNo: string | null;
  pirYear: number | null;
  kato: string;
  region: string;
  district: string;
  ruralDistrict: string;
  snp: string;
  stages: Record<PirStage, number>; // 0..100 — % выполнения каждого этапа
  details: Record<PirStage, PirStageDetail>; // детальная разбивка по подпунктам
  volsLengthM: string;   // Проектная протяжённость трассы ВОЛС после экспертизы, м
  plannedCompletion: string | null; // ISO YYYY-MM-DD
  totalReadiness: number;            // 0..100 (из колонки "Суммарная готовность")
}

// ─── ГУ Пункты пропуска ─────────────────────────────────────────────
export type GuSectionStatus = "completed" | "in_progress";

export const GU_SECTION_LABELS: Record<GuSectionStatus, string> = {
  completed: "Завершены работы",
  in_progress: "В производстве",
};

export interface GUCheckpoint {
  id: number;
  department: string;        // ДГД по ... области
  region: string;            // выводится из department
  name: string;
  address: string;
  fromOriginalSOI: boolean;  // Да / Нет (новый)
  volsStatus: string;        // Завершен / В работе / ...
  connectionStatus: string;  // Подключен / Наряд / ...
  psdReady: string;          // готов / не готов / ...
  customerApproval: string | null; // Согласование Заказчика, ISO
  kvepDate: string | null;   // ISO YYYY-MM-DD
  sectionStatus: GuSectionStatus;
  sectionDeadline: string | null; // ISO если в секции был указан срок
}

// ─── Общий свод (по СНП + объектам) ─────────────────────────────────
export type SvodTech = "vols" | "vols_wifi_public" | "sputnik";
export type SvodStatus = "connected" | "in_progress";

export const SVOD_TECH_LABELS: Record<SvodTech, string> = {
  vols: "ВОЛС",
  vols_wifi_public: "ВОЛС (Wi-Fi public)",
  sputnik: "Спутник",
};

export const SVOD_STATUS_LABELS: Record<SvodStatus, string> = {
  connected: "Подключено",
  in_progress: "В работе",
};

/** Ключи объектов, которые могут быть подключены в СНП */
export const SVOD_OBJECT_KEYS = [
  "akimat", "school", "hospital", "police", "mchs", "military",
  "border", "vet", "library", "club", "publicPoint", "cson",
] as const;
export type SvodObjectKey = typeof SVOD_OBJECT_KEYS[number];

export const SVOD_OBJECT_LABELS: Record<SvodObjectKey, string> = {
  akimat: "Акимат",
  school: "Школа",
  hospital: "Больница / ФАП",
  police: "Полиция",
  mchs: "МЧС",
  military: "Военкомат",
  border: "Погран. служба",
  vet: "Ветеринария",
  library: "Библиотека",
  club: "Сельский клуб/ДК",
  publicPoint: "Общ. точка доступа",
  cson: "ЦОН",
};

export interface SvodRow {
  id: number;
  kato: string;
  newKtLength: number;       // Новая протяженность КТ
  tech: SvodTech;
  techRaw: string;
  region: string;
  district: string;
  ruralDistrict: string;
  snp: string;
  coords: string;
  population: number;
  year: number | null;
  households: number;
  objects: Record<SvodObjectKey, number>; // 1 = есть / 0 = нет
  objectsConnectedFact: number;
  status: SvodStatus;
  statusRaw: string;
  extraStatus: string;
  whatConnected: string;     // "Что подключено" — текст
  pointsCount: number;
  totalGuBo: number;
  smrStart: string;          // "DD.MM.YYYY"
  smrEnd: string;            // "DD.MM.YYYY"
  volsLengthKm: number;      // Ориентировочная протяжённость ВОЛС
  trenchKm: number;          // Откопка/закопка траншей
  microTubeKm: number;       // Прокладка микротрубки
}

// ─── ВОЛС ───────────────────────────────────────────────────────────
export interface VolsRow {
  id: number;
  idRaw: string;       // "1" / "1.1" / "1.1.5"
  level: number;       // 1 = область, 2 = район, 3 = СНП
  projectName: string;
  lengthKm: number;
  year: number | null; // 2026 / 2027
}

export interface VolsTotals {
  total: number;
  year2026: number;
  year2027: number;
}

export interface VolsData {
  rows: VolsRow[];
  totals: VolsTotals;
}

// ─── СМР (строительно-монтажные работы ВОЛС) ────────────────────────
export interface SmrRow {
  orderNo: string | null;
  kato: string;
  region: string;
  district: string;
  ruralDistrict: string;
  snp: string;

  // Подготовка
  gprAvailable: string;           // Предоставление ГПР (наличие)
  smrNotification: string;         // Уведомление о начале СМР
  mobilizationDate: string | null; // Мобилизация подрядчика

  // СМР
  startDate: string | null;
  endDate: string | null;
  smrPercent: number;              // % выполнения СМР
  technadzorFix: string;           // Устранение замечаний технадзора
  authorSupervision: string;       // Авторский надзор
  execDocsPercent: number;         // ИРД — Исполнительно-рабочая документация, %

  // Готовность
  plannedCompletion: string | null;
  factPercent: number;             // Фактическая готовность, %

  // Сдача в эксплуатацию (да/нет / наличие)
  gaskConfirmation: string;        // Подтверждение ГАСК и НПЦзем
  declaration: string;             // Декларация о соответствии
  commissioningAct: string;        // Акт ввода в эксплуатацию

  // Финансовые и закрывающие документы
  invoice: string;                 // Счёт-фактура на выполненные работы
  ks3: string;                     // Справки КС-3
  acts2V: string;                  // Акты 2В
  volumeReport: string;            // Объёмная справка
  materialsInvoice: string;        // СФ на материалы подрядчика
  ctKzCerts: string;               // Сертификаты CT-KZ
  changeProtocol: string;          // Протокол об изменениях
  zupCorrection: string;           // Корректировка ЗУП
  psdCorrection: string;           // Корректировка ПСД
  technicalAct: string;            // Технический акт приёмки
  commissionConclusion: string;    // Заключение комиссии
}

// ─── ИТД ────────────────────────────────────────────────────────────
export interface ItdChecklistItem {
  name: string;
  index: number;
}

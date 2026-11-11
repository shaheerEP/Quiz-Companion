"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/context/ThemeContext";
import * as THREE from "three";
import {
  Play,
  RotateCcw,
  Eye,
  Palette,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Globe,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// ----------------------------------------------------------------------------
// 0. BIOLOGICAL PALATE CONSTANTS
// ----------------------------------------------------------------------------
const BIO_HARD_PALATE_RATIO = 0.673;
const BIO_ALVEOLAR_SHELF_U = 0.165; // 11.1% of Total Palate length

// ----------------------------------------------------------------------------
// 1. GEAR CONTROLLER DEFINITIONS
// ----------------------------------------------------------------------------
interface GearDef {
  key: string;
  en: string;
  ar: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
}

const GEAR_DEFINITIONS: GearDef[] = [
  { key: 'jawOpen', en: 'Lower Jaw Opening (الفك السفلي)', ar: 'فتح الفك السفلي', min: 0, max: 100, step: 5, unit: '%', color: '#10b981' },
  { key: 'tipElevation', en: 'Tongue Tip Height (ارتفاع طرف اللسان)', ar: 'ارتفاع طرف اللسان', min: -45, max: 100, step: 5, unit: '%', color: '#3b82f6' },
  { key: 'tipForward', en: 'Tongue Tip Advance (تقدم طرف اللسان)', ar: 'تقدم طرف اللسان', min: -60, max: 80, step: 5, unit: '%', color: '#06b6d4' },
  { key: 'backIstila', en: 'Deep Tongue Root (أقصى اللسان)', ar: 'أقصى اللسان (استعلاء)', min: 0, max: 100, step: 5, unit: '%', color: '#f59e0b' },
  { key: 'middleArch', en: 'Middle Blade Arch (وسط اللسان)', ar: 'وسط اللسان (ج/ش/ي)', min: -35, max: 100, step: 5, unit: '%', color: '#8b5cf6' },
  { key: 'lateralSpread', en: 'Lateral Molar Contact (حافتا اللسان)', ar: 'تمدد حافتي اللسان', min: 0, max: 100, step: 5, unit: '%', color: '#ec4899' },
  { key: 'greenPointPos', en: 'Makhraj Marker Pos (علامة المخرج)', ar: 'موقع علامة المخرج', min: 0, max: 100, step: 2, unit: '%', color: '#22c55e' },
  { key: 'upperOpacity', en: 'Upper Teeth Opacity (شفافية الأسنان)', ar: 'شفافية الأسنان العليا', min: 0, max: 100, step: 5, unit: '%', color: '#f43f5e' }
];

// ----------------------------------------------------------------------------
// 2. 22 ORAL LETTERS PRESETS IN MAKHRAJ ORDER: FROM QAAF (ق) TO WAW (و)
// ----------------------------------------------------------------------------
interface LetterPreset {
  id: string;
  tag: string;
  letter: string;
  sukoonText: string;
  isHeavy: boolean;
  dorsalMode: string;
  showLips?: boolean;
  lipMode?: string;
  phoneticSound: string;
  en: {
    title: string;
    category: string;
    zoneLabel: string;
    desc: string;
    sifah: string;
  };
  ar: {
    title: string;
    category: string;
    zoneLabel: string;
    desc: string;
    sifah: string;
  };
  gears: Record<string, number>;
  greenCoords: { x: number; y: number; z: number; rx: number };
}

const LETTER_PRESETS: LetterPreset[] = [
  // 1. Qaaf (ق) - Deep Tongue Root
  {
    id: 'qaaf',
    tag: 'Qaaf (ق)',
    letter: 'ق',
    sukoonText: 'قْ',
    isHeavy: true,
    dorsalMode: 'qaaf_posterior',
    phoneticSound: 'أَقْ',
    en: {
      title: 'Makhraj of Qaaf (ق)',
      category: 'Deep Tongue Root (أقصى اللسان)',
      zoneLabel: 'Soft Palate (الحنك اللحمي)',
      desc: 'Deepest root of the tongue rises firmly against the soft fleshy palate, with the tip resting calmly behind lower teeth.',
      sifah: 'Heavy (تفخيم وقلقلة)'
    },
    ar: {
      title: 'مخرج حرف القاف (ق)',
      category: 'أقصى اللسان مع الحنك اللحمي',
      zoneLabel: 'الحنك اللحمي الرخو',
      desc: 'يرتفع أقصى اللسان ليصطدم بقوة بالحنك اللحمي، بينما يستقر طرف اللسان خلف الثنايا السفلى.',
      sifah: 'مفخم (استعلاء وقلقلة)'
    },
    gears: { jawOpen: 26, tipElevation: -26, tipForward: -15, backIstila: 98, middleArch: 12, lateralSpread: 30, greenPointPos: 88, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.302, z: -0.44, rx: 0.36 }
  },
  // 2. Kaaf (ك)
  {
    id: 'kaaf',
    tag: 'Kaaf (ك)',
    letter: 'ك',
    sukoonText: 'كْ',
    isHeavy: false,
    dorsalMode: 'kaaf_velar',
    phoneticSound: 'أَكْ',
    en: {
      title: 'Makhraj of Kaaf (ك)',
      category: 'Deep Tongue Root (أقصى اللسان)',
      zoneLabel: 'Hard & Soft Palate Junction (بين الحنكين)',
      desc: 'Tongue root rises against the junction of hard and soft palates, forward of Qaaf, followed by subtle breath flow (Hams).',
      sifah: 'Light (ترقيق وهمس)'
    },
    ar: {
      title: 'مخرج حرف الكاف (ك)',
      category: 'أقصى اللسان مع الحنك العظمي واللحمي',
      zoneLabel: 'منطقة التقاء الحنك العظمي واللحمي',
      desc: 'يرتفع أقصى اللسان تحت مخرج القاف قليلاً ليلتقي بين الحنكين العظمي واللحمي مع جريان النفس (همس).',
      sifah: 'مرقق (استفال وهمس)'
    },
    gears: { jawOpen: 25, tipElevation: -25, tipForward: -10, backIstila: 90, middleArch: 48, lateralSpread: 25, greenPointPos: 72, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.364, z: -0.22, rx: 0.13 }
  },
  // 3. Jeem (ج)
  {
    id: 'jeem',
    tag: 'Jeem (ج)',
    letter: 'ج',
    sukoonText: 'جْ',
    isHeavy: false,
    dorsalMode: 'jeem_touch',
    phoneticSound: 'أَجْ',
    en: {
      title: 'Makhraj of Jeem (ج)',
      category: 'Middle Tongue (وسط اللسان)',
      zoneLabel: 'Hard Palate Occlusion (قفل الحنك 0.0 mm)',
      desc: 'Middle of the tongue rises as a dome and seals completely against hard palate (0.0 mm gap) before bursting open (Qalqalah).',
      sifah: 'Light (ترقيق وشدة وقلقلة)'
    },
    ar: {
      title: 'مخرج حرف الجيم (ج)',
      category: 'وسط اللسان مع وسط الحنك الأعلى',
      zoneLabel: 'انغلاق تام للمخرج (جهر وشدة وقلقلة)',
      desc: 'يرتفع وسط اللسان ويلتصق تماماً بسقف الحنك العظمي مغلقاً المخرج (فجوة 0 مم) ثم ينفك باضطراب (قلقلة).',
      sifah: 'مرقق (شدة وقلقلة)'
    },
    gears: { jawOpen: 24, tipElevation: -24, tipForward: -5, backIstila: 18, middleArch: 98, lateralSpread: 45, greenPointPos: 54, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.463, z: 0.12, rx: 0.15 }
  },
  // 4. Sheen (ش)
  {
    id: 'sheen',
    tag: 'Sheen (ش)',
    letter: 'ش',
    sukoonText: 'شْ',
    isHeavy: false,
    dorsalMode: 'middle_dome',
    phoneticSound: 'أَشْ',
    en: {
      title: 'Makhraj of Sheen (ش)',
      category: 'Middle Tongue (وسط اللسان)',
      zoneLabel: 'Airflow Trough (فرجة التفشي ~3.2 mm)',
      desc: 'Sides of middle tongue brace against palate while wide central groove diffuses turbulent air forward (Tafasshi).',
      sifah: 'Light (ترقيق وتفشٍّ)'
    },
    ar: {
      title: 'مخرج حرف الشين (ش)',
      category: 'وسط اللسان مع التفشي والهمس',
      zoneLabel: 'فرجة وسطية واسعة لانتشار الهواء',
      desc: 'يرتفع وسط اللسان مع تلامس حافتيه بالحنك وتكون قناة وسطية متسعة يتدفق عبرها الهواء منتشراً نحو الأسنان (تفشٍّ).',
      sifah: 'مرقق (تفشٍّ ورخاوة)'
    },
    gears: { jawOpen: 24, tipElevation: -22, tipForward: -5, backIstila: 15, middleArch: 90, lateralSpread: 65, greenPointPos: 52, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.467, z: 0.15, rx: 0.11 }
  },
  // 5. Yaa (ي)
  {
    id: 'yaa_cons',
    tag: 'Yaa (ي)',
    letter: 'ي',
    sukoonText: 'يْ',
    isHeavy: false,
    dorsalMode: 'middle_dome',
    phoneticSound: 'أَيْ',
    en: {
      title: 'Makhraj of Non-Madd Yaa (ي)',
      category: 'Middle Tongue (وسط اللسان)',
      zoneLabel: 'Narrow Voiced Arch (تضيق المخرج ~1.6 mm)',
      desc: 'Middle of tongue forms a smooth convex arch narrowing the vocal passage without sealing, letting voiced sound flow smoothly.',
      sifah: 'Light (ترقيق ورخاوة ولين)'
    },
    ar: {
      title: 'مخرج حرف الياء غير المدية (ي)',
      category: 'وسط اللسان مع الجهر والرخاوة',
      zoneLabel: 'تضيق صوتي سلس بلا انغلاق',
      desc: 'يرتفع وسط اللسان مقترباً من الحنك العظمي دون إغلاقه، فيمر الصوت مجهوراً رخواً بسلاسة ولين.',
      sifah: 'مرقق (رخاوة ولين)'
    },
    gears: { jawOpen: 24, tipElevation: -24, tipForward: -5, backIstila: 14, middleArch: 92, lateralSpread: 60, greenPointPos: 52, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.466, z: 0.14, rx: 0.13 }
  },
  // 6. Zad / Dhaad (ض)
  {
    id: 'dhaad',
    tag: 'Zad / Dhaad (ض)',
    letter: 'ض',
    sukoonText: 'ضْ',
    isHeavy: true,
    dorsalMode: 'dhaad_lateral',
    phoneticSound: 'أَضْ',
    en: {
      title: 'Makhraj of Zad / Dhaad (ض)',
      category: 'Tongue & Upper Molars (حافة اللسان مع الأضراس)',
      zoneLabel: 'Lateral Molars & Front Teeth Touch',
      desc: 'One or both edges of the tongue press firmly against upper molars, while the rounded tip gently touches front teeth without pressing.',
      sifah: 'Heavy (تفخيم واستطالة)'
    },
    ar: {
      title: 'مخرج حرف الضاد (ض)',
      category: 'حافة اللسان مع الأضراس العليا',
      zoneLabel: 'ضغط حافة اللسان مع تلامس لطيف لطرفه بالأسنان',
      desc: 'تضغط إحدى حافتي اللسان أو كلاهما بقوة على الأضراس العليا، بينما يلامس طرف اللسان المستدير الثنايا العليا بلطف دون ضغط.',
      sifah: 'مفخم (استعلاء واستطالة)'
    },
    gears: { jawOpen: 22, tipElevation: 48, tipForward: 44, backIstila: 80, middleArch: 20, lateralSpread: 96, greenPointPos: 48, upperOpacity: 56 },
    greenCoords: { x: -0.56, y: 0.16, z: 0.10, rx: 0.0 }
  },
  // 7. Laam (ل)
  {
    id: 'laam',
    tag: 'Laam (ل)',
    letter: 'ل',
    sukoonText: 'لْ',
    isHeavy: false,
    dorsalMode: 'laam_curl',
    phoneticSound: 'أَلْ',
    en: {
      title: 'Makhraj of Laam (ل)',
      category: 'Tongue Tip & Sides (حافتا اللسان وطرفه)',
      zoneLabel: 'Flat Gum Shelf (اللثة ومقدم الحنك)',
      desc: 'Front sides and tip of tongue curl up to touch the flat alveolar gum shelf right up to the front teeth.',
      sifah: 'Light (ترقيق وانحراف)'
    },
    ar: {
      title: 'مخرج حرف اللام (ل)',
      category: 'أدنى حافتي اللسان إلى منتهى طرفه',
      zoneLabel: 'اللثة ومقدم الحنك المسطح',
      desc: 'ينحني أدنى حافتي اللسان مع طرفه ليلتصق بلثة الأسنان العليا ومقدم الحنك المسطح، مع انحراف الصوت جانبياً.',
      sifah: 'مرقق (انحراف وتوسط)'
    },
    gears: { jawOpen: 28, tipElevation: 76, tipForward: 38, backIstila: 0, middleArch: -20, lateralSpread: 32, greenPointPos: 24, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.252, z: 0.84, rx: -0.49 }
  },
  // 8. Noon (ن)
  {
    id: 'noon',
    tag: 'Noon (ن)',
    letter: 'ن',
    sukoonText: 'نْ',
    isHeavy: false,
    dorsalMode: 'laam_curl',
    phoneticSound: 'أَنْ',
    en: {
      title: 'Makhraj of Noon (ن)',
      category: 'Tongue Tip & Nose (طرف اللسان والخيشوم)',
      zoneLabel: 'Upper Gum Ridge (لثة الثنايا العليا)',
      desc: 'Tip seals against upper gum ridge while voice resonates nasally through the nasal cavity (Ghunnah).',
      sifah: 'Light (ترقيق وغنة)'
    },
    ar: {
      title: 'مخرج حرف النون (ن)',
      category: 'طرف اللسان مع لثة الثنايا والغنة',
      zoneLabel: 'لثة الثنايا العليا مع الخيشوم',
      desc: 'ينقفل طرف اللسان على لثة الثنايا العليا بينما يخرج الصوت من التجويف الأنفي بغنة رنانة.',
      sifah: 'مرقق (غنة وتوسط)'
    },
    gears: { jawOpen: 26, tipElevation: 78, tipForward: 36, backIstila: 0, middleArch: -18, lateralSpread: 22, greenPointPos: 24, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.254, z: 0.84, rx: -0.48 }
  },
  // 9. Raa (ر)
  {
    id: 'raa',
    tag: 'Raa (ر)',
    letter: 'ر',
    sukoonText: 'رْ',
    isHeavy: true,
    dorsalMode: 'istila_cup',
    phoneticSound: 'أَرْ',
    en: {
      title: 'Makhraj of Raa (ر)',
      category: 'Tongue Tip & Blade (طرف اللسان وظهره)',
      zoneLabel: 'Upper Gum with Central Gap (لثة الثنايا)',
      desc: 'Tip and upper blade meet upper gums with a narrow central slit preventing excessive trill.',
      sifah: 'Heavy (تفخيم وتكرير)'
    },
    ar: {
      title: 'مخرج حرف الراء (ر)',
      category: 'طرف اللسان وظهره مع لثة الثنايا',
      zoneLabel: 'لثة الثنايا العليا مع فرجة التكرير',
      desc: 'يقرع طرف اللسان وظهره لثة الثنايا مع بقاء فرجة دقيقة جداً بالوسط لمنع تكرار الراء الزائد.',
      sifah: 'مفخم (انحراف وتكرير)'
    },
    gears: { jawOpen: 26, tipElevation: 80, tipForward: 20, backIstila: 65, middleArch: -10, lateralSpread: 35, greenPointPos: 30, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.262, z: 0.78, rx: -0.46 }
  },
  // 10. Taa (ط)
  {
    id: 'taa_heavy',
    tag: 'Taa / Tha (ط)',
    letter: 'ط',
    sukoonText: 'طْ',
    isHeavy: true,
    dorsalMode: 'istila_cup',
    phoneticSound: 'أَطْ',
    en: {
      title: 'Makhraj of Taa (ط)',
      category: 'Tongue Tip & Incisor Roots (أصول الثنايا العليا)',
      zoneLabel: 'Upper Incisor Roots & Gums (أصول الثنايا)',
      desc: 'Rounded tongue tip presses firmly at the cervical roots of upper front teeth and gum shelf, with elevated back (Itbaaq).',
      sifah: 'Heavy (تفخيم وإطباق)'
    },
    ar: {
      title: 'مخرج حرف الطاء (ط)',
      category: 'الحروف النطعية - أصول الثنايا العليا',
      zoneLabel: 'أصول الثنايا العليا مع الإطباق',
      desc: 'ينضغط طرف اللسان العريض المستدير عند منابت الثنايا العليا ولثتها مع إطباق واستعلاء أقصى اللسان وقلقلة.',
      sifah: 'مفخم (إطباق وقلقلة)'
    },
    gears: { jawOpen: 26, tipElevation: 76, tipForward: 62, backIstila: 88, middleArch: -8, lateralSpread: 42, greenPointPos: 18, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.236, z: 0.90, rx: -0.50 }
  },
  // 11. Daal (د)
  {
    id: 'daal',
    tag: 'Daal (د)',
    letter: 'د',
    sukoonText: 'دْ',
    isHeavy: false,
    dorsalMode: 'laam_curl',
    phoneticSound: 'أَدْ',
    en: {
      title: 'Makhraj of Daal (د)',
      category: 'Tongue Tip & Incisor Roots (أصول الثنايا العليا)',
      zoneLabel: 'Upper Incisor Roots (أصول الثنايا)',
      desc: 'Rounded tongue tip touches the root base of upper central incisors, released with clear voice and Qalqalah.',
      sifah: 'Light (ترقيق وقلقلة)'
    },
    ar: {
      title: 'مخرج حرف الدال (د)',
      category: 'الحروف النطعية - أصول الثنايا العليا',
      zoneLabel: 'أصول الثنايا العليا',
      desc: 'يلامس طرف اللسان المستدير منابت الثنايا العليا مع انحباس الصوت والنفس ثم انطلاقه بقلقلة مجهورة.',
      sifah: 'مرقق (جهر وقلقلة)'
    },
    gears: { jawOpen: 25, tipElevation: 76, tipForward: 62, backIstila: 0, middleArch: -14, lateralSpread: 24, greenPointPos: 18, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.236, z: 0.90, rx: -0.50 }
  },
  // 12. Taa (ت)
  {
    id: 'taa_light',
    tag: 'Taa (ت)',
    letter: 'ت',
    sukoonText: 'تْ',
    isHeavy: false,
    dorsalMode: 'laam_curl',
    phoneticSound: 'أَتْ',
    en: {
      title: 'Makhraj of Taa (ت)',
      category: 'Tongue Tip & Incisor Roots (أصول الثنايا العليا)',
      zoneLabel: 'Upper Incisor Roots (أصول الثنايا)',
      desc: 'Tongue tip touches the root base of upper incisors, followed by gentle unvoiced breath release (Hams).',
      sifah: 'Light (ترقيق وهمس)'
    },
    ar: {
      title: 'مخرج حرف التاء (ت)',
      category: 'الحروف النطعية - أصول الثنايا العليا',
      zoneLabel: 'أصول الثنايا العليا مع الهمس',
      desc: 'يقرع طرف اللسان أصول الثنايا العليا مع انحباس الصوت أولاً ثم انفتاحه بجريان لطيف للنفس (همس).',
      sifah: 'مرقق (شدة وهمس)'
    },
    gears: { jawOpen: 25, tipElevation: 76, tipForward: 62, backIstila: 0, middleArch: -14, lateralSpread: 24, greenPointPos: 18, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.236, z: 0.90, rx: -0.50 }
  },
  // 13. Saad (ص)
  {
    id: 'saad',
    tag: 'Saad (ص)',
    letter: 'ص',
    sukoonText: 'صْ',
    isHeavy: true,
    dorsalMode: 'safir_hook',
    phoneticSound: 'أَصْ',
    en: {
      title: 'Makhraj of Saad (ص)',
      category: 'Tongue Apex (أسلة اللسان)',
      zoneLabel: 'Lower Incisors Contact (الثنايا السفلى)',
      desc: 'Tongue tip points downward behind lower incisors with central whistle groove (Safir) and elevated back root.',
      sifah: 'Heavy (تفخيم وصفير)'
    },
    ar: {
      title: 'مخرج حرف الصاد (ص)',
      category: 'الحروف الأسلية - أسلة اللسان مع الثنايا',
      zoneLabel: 'الصفير مع الإطباق والاستعلاء',
      desc: 'تستقر أسلة اللسان خلف الثنايا السفلى مع تجويف طولي يمر منه صوت الصفير الحاد المصحوب باستعلاء وإطباق.',
      sifah: 'مفخم (صفير وإطباق)'
    },
    gears: { jawOpen: 16, tipElevation: -10, tipForward: 24, backIstila: 88, middleArch: 55, lateralSpread: 88, greenPointPos: 2, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: -0.045, z: 0.84, rx: 0.15 }
  },
  // 14. Seen (س)
  {
    id: 'seen',
    tag: 'Seen (س)',
    letter: 'س',
    sukoonText: 'سْ',
    isHeavy: false,
    dorsalMode: 'safir_hook',
    phoneticSound: 'أَسْ',
    en: {
      title: 'Makhraj of Seen (س)',
      category: 'Tongue Apex (أسلة اللسان)',
      zoneLabel: 'Behind Lower Incisors (أسلة اللسان)',
      desc: 'Tip rests behind lower incisors with central groove directing sharp unvoiced whistle (Safir & Hams).',
      sifah: 'Light (ترقيق وصفير)'
    },
    ar: {
      title: 'مخرج حرف السين (س)',
      category: 'الحروف الأسلية - مجرى الصفير',
      zoneLabel: 'خلف الثنايا السفلى مع الهمس والصفير',
      desc: 'تتوضع أسلة اللسان خلف الثنايا السفلى مفسحة مجرى ضيقاً لصفير رخو مهموس غير مصحوب باستعلاء.',
      sifah: 'مرقق (همس وصفير)'
    },
    gears: { jawOpen: 16, tipElevation: -10, tipForward: 24, backIstila: 0, middleArch: 72, lateralSpread: 72, greenPointPos: 2, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: -0.045, z: 0.84, rx: 0.15 }
  },
  // 15. Zaay (ز)
  {
    id: 'zaay',
    tag: 'Zay / Zaa (ز)',
    letter: 'ز',
    sukoonText: 'زْ',
    isHeavy: false,
    dorsalMode: 'safir_hook',
    phoneticSound: 'أَزْ',
    en: {
      title: 'Makhraj of Zay (ز)',
      category: 'Tongue Apex (أسلة اللسان)',
      zoneLabel: 'Behind Lower Incisors (أسلة اللسان)',
      desc: 'Tip rests behind lower front incisors, allowing voiced air to buzz through the interdental slit.',
      sifah: 'Light (ترقيق وصفير)'
    },
    ar: {
      title: 'مخرج حرف الزاي (ز)',
      category: 'الحروف الأسلية - أسلة اللسان',
      zoneLabel: 'خلف الثنايا السفلى مع الجهر والصفير',
      desc: 'تقترب أسلة اللسان من الثنايا السفلى ليمر الهواء بصفير مجهور صافٍ مع ارتجاف الأوتار الصوتية.',
      sifah: 'مرقق (جهر وصفير)'
    },
    gears: { jawOpen: 16, tipElevation: -10, tipForward: 24, backIstila: 0, middleArch: 75, lateralSpread: 75, greenPointPos: 2, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: -0.045, z: 0.84, rx: 0.15 }
  },
  // 16. Zhaa (ظ)
  {
    id: 'thaa_heavy',
    tag: 'Zhaa (ظ)',
    letter: 'ظ',
    sukoonText: 'ظْ',
    isHeavy: true,
    dorsalMode: 'istila_cup',
    phoneticSound: 'أَظْ',
    en: {
      title: 'Makhraj of Zhaa (ظ)',
      category: 'Tongue Tip & Incisor Edges (أطراف الثنايا العليا)',
      zoneLabel: 'Biting Edge of Upper Incisors (أطراف الثنايا)',
      desc: 'Top of tongue tip extends gently to touch biting edges of upper central incisors with back elevation (Itbaaq).',
      sifah: 'Heavy (تفخيم وإطباق)'
    },
    ar: {
      title: 'مخرج حرف الظاء (ظ)',
      category: 'الحروف اللثوية - أطراف الثنايا العليا',
      zoneLabel: 'أطراف الثنايا العليا مع الإطباق',
      desc: 'يخرج ظهر طرف اللسان قليلاً ليلتقي برفق بأطراف الثنايا العليا قاطباً، مع استعلاء أقصى اللسان وإطباقه.',
      sifah: 'مفخم (إطباق ورخاوة)'
    },
    gears: { jawOpen: 22, tipElevation: 5, tipForward: 68, backIstila: 90, middleArch: 10, lateralSpread: 40, greenPointPos: 8, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.015, z: 0.91, rx: 0.18 }
  },
  // 17. Dhaal (ذ)
  {
    id: 'dhaal_zaa',
    tag: 'Dhaal (ذ)',
    letter: 'ذ',
    sukoonText: 'ذْ',
    isHeavy: false,
    dorsalMode: 'istila_cup',
    phoneticSound: 'أَذْ',
    en: {
      title: 'Makhraj of Dhaal (ذ)',
      category: 'Tongue Tip & Incisor Edges (أطراف الثنايا العليا)',
      zoneLabel: 'Biting Edge of Upper Incisors (أطراف الثنايا)',
      desc: 'Top of rounded tongue tip touches bottom biting edges of upper central incisors with flat relaxed back.',
      sifah: 'Light (ترقيق ورخاوة)'
    },
    ar: {
      title: 'مخرج حرف الذال (ذ)',
      category: 'الحروف اللثوية - أطراف الثنايا العليا',
      zoneLabel: 'أطراف الثنايا العليا مع الجهر',
      desc: 'يلامس ظهر طرف اللسان حواف الثنايا العليا مع استرخاء أقصى اللسان وجريان صوت مجهور رخو.',
      sifah: 'مرقق (جهر ورخاوة)'
    },
    gears: { jawOpen: 22, tipElevation: 5, tipForward: 68, backIstila: 0, middleArch: 10, lateralSpread: 25, greenPointPos: 8, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.015, z: 0.91, rx: 0.18 }
  },
  // 18. Thaa (ث)
  {
    id: 'thaa_light',
    tag: 'Thaa (ث)',
    letter: 'ث',
    sukoonText: 'ثْ',
    isHeavy: false,
    dorsalMode: 'istila_cup',
    phoneticSound: 'أَثْ',
    en: {
      title: 'Makhraj of Thaa (ث)',
      category: 'Tongue Tip & Incisor Edges (أطراف الثنايا العليا)',
      zoneLabel: 'Biting Edge of Upper Incisors (أطراف الثنايا)',
      desc: 'Tongue tip meets biting edges of upper incisors, allowing soft friction and unvoiced breath flow (Hams).',
      sifah: 'Light (ترقيق وهمس)'
    },
    ar: {
      title: 'مخرج حرف الثاء (ث)',
      category: 'الحروف اللثوية - أطراف الثنايا العليا',
      zoneLabel: 'أطراف الثنايا العليا مع الهمس',
      desc: 'يلامس طرف اللسان حافتي الثنيتين العلييين بلطف مع تدفق الهواء الرخو المهموس دون ممانعة.',
      sifah: 'مرقق (همس ورخاوة)'
    },
    gears: { jawOpen: 22, tipElevation: 5, tipForward: 68, backIstila: 0, middleArch: 10, lateralSpread: 20, greenPointPos: 8, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.015, z: 0.91, rx: 0.18 }
  },
  // 19. Faa (ف)
  {
    id: 'faa',
    tag: 'Faa (ف)',
    letter: 'ف',
    sukoonText: 'فْ',
    isHeavy: false,
    dorsalMode: 'neutral',
    showLips: true,
    lipMode: 'faa_labiodental',
    phoneticSound: 'أَفْ',
    en: {
      title: 'Makhraj of Faa (ف)',
      category: 'Lower Lip & Upper Teeth (بطن الشفة السفلى)',
      zoneLabel: 'Incisors on Inner Wet Lower Lip',
      desc: 'Bottom edges of the two upper central incisors press against inner wet belly of the lower lip.',
      sifah: 'Light (ترقيق وهمس)'
    },
    ar: {
      title: 'مخرج حرف الفاء (ف)',
      category: 'بطن الشفة السفلى مع أطراف الثنايا',
      zoneLabel: 'أطراف الثنايا العليا على باطن الشفة',
      desc: 'تنزل أطراف الثنيتين العلييين لتستقر على بطن الشفة السفلى الرطب مترافقة مع جريان النفس الرخو.',
      sifah: 'مرقق (همس ورخاوة)'
    },
    gears: { jawOpen: 18, tipElevation: -5, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 15, greenPointPos: 6, upperOpacity: 92 },
    greenCoords: { x: 0.0, y: 0.005, z: 0.94, rx: 0.0 }
  },
  // 20. Baa (ب)
  {
    id: 'baa',
    tag: 'Baa (ب)',
    letter: 'ب',
    sukoonText: 'بْ',
    isHeavy: false,
    dorsalMode: 'neutral',
    showLips: true,
    lipMode: 'bilabial_closed',
    phoneticSound: 'أَبْ',
    en: {
      title: 'Makhraj of Baa (ب)',
      category: 'Both Lips (انطباق الشفتين)',
      zoneLabel: 'Both Lips Closing Firmly (الشفتان)',
      desc: 'Both lips close firmly together, creating instantaneous occlusion released with echoing bounce (Qalqalah).',
      sifah: 'Light (ترقيق وشدة وقلقلة)'
    },
    ar: {
      title: 'مخرج حرف الباء (ب)',
      category: 'انطباق الشفتين مع القلقلة',
      zoneLabel: 'انطباق تام للشفتين',
      desc: 'تنطبق الشفتان بقوة وإحكام على الجزء الرطب منهما فينحبس الصوت والنفس ثم ينفجران بقلقلة مدوية.',
      sifah: 'مرقق (شدة وقلقلة)'
    },
    gears: { jawOpen: 10, tipElevation: -5, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 15, greenPointPos: 4, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.02, z: 1.05, rx: 0.0 }
  },
  // 21. Meem (م)
  {
    id: 'meem',
    tag: 'Meem (م)',
    letter: 'م',
    sukoonText: 'مْ',
    isHeavy: false,
    dorsalMode: 'neutral',
    showLips: true,
    lipMode: 'bilabial_closed',
    phoneticSound: 'أَمْ',
    en: {
      title: 'Makhraj of Meem (م)',
      category: 'Both Lips & Nose (الشفتان والغنة)',
      zoneLabel: 'Both Lips Gentle Closure + Ghunnah',
      desc: 'Lips meet gently while sound reverberates continuously up through the nasal cavity.',
      sifah: 'Light (ترقيق وغنة)'
    },
    ar: {
      title: 'مخرج حرف الميم (م)',
      category: 'انطباق الشفتين مع غنة الخيشوم',
      zoneLabel: 'تلامس لطيف للشفتين مع الغنة',
      desc: 'تنطبق الشفتان برفق وسكون بينما يمر الجزء الأكبر من الصوت رخيماً رناناً عبر التجويف الأنفي.',
      sifah: 'مرقق (غنة وتوسط)'
    },
    gears: { jawOpen: 12, tipElevation: -5, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 15, greenPointPos: 4, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.02, z: 1.05, rx: 0.0 }
  },
  // 22. Waw (و)
  {
    id: 'waw',
    tag: 'Waw (و)',
    letter: 'و',
    sukoonText: 'وْ',
    isHeavy: false,
    dorsalMode: 'neutral',
    showLips: true,
    lipMode: 'rounded_waw',
    phoneticSound: 'أَوْ',
    en: {
      title: 'Makhraj of Non-Madd Waw (و)',
      category: 'Both Lips (انضمام الشفتين)',
      zoneLabel: 'Circular Lip Rounding (انضمام الشفتين)',
      desc: 'Both lips purse and round forward leaving a circular opening, with the tongue relaxed and resting low.',
      sifah: 'Light (ترقيق ورخاوة ولين)'
    },
    ar: {
      title: 'مخرج حرف الواو غير المدية (و)',
      category: 'انضمام الشفتين للأمام',
      zoneLabel: 'استدارة الشفتين مع فرجة دائرية',
      desc: 'تنضم الشفتان وتستديران للأمام تاركتين فتحة دائرية في وسطهما مع استرخاء اللسان في قاع الفم.',
      sifah: 'مرقق (رخاوة ولين)'
    },
    gears: { jawOpen: 20, tipElevation: -5, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 15, greenPointPos: 4, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.02, z: 1.08, rx: 0.0 }
  }
];

// Resting pose for Alif simulation
const ALIF_MAKHRAJ_GEARS: Record<string, number> = {
  jawOpen: 36, tipElevation: -5, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 15
};

// ----------------------------------------------------------------------------
// 3. ANATOMY LABELS DATA
// ----------------------------------------------------------------------------
interface AnatomyLabelItem {
  id: string;
  group: 'tongue' | 'teeth' | 'palate';
  ar: string;
  en: string;
  hex: string;
  rgb: [number, number, number];
  getTarget: () => THREE.Vector3;
  offset: THREE.Vector3;
}

const ANATOMY_LABELS_DATA: AnatomyLabelItem[] = [
  // 5 Tongue Parts
  {
    id: 'aqsa_lisaan',
    group: 'tongue',
    ar: 'أقصى اللسان',
    en: 'Root / Back (أقصى اللسان)',
    hex: '#7c3aed',
    rgb: [0.49, 0.23, 0.93],
    getTarget: () => new THREE.Vector3(0.0, 0.25, -0.38),
    offset: new THREE.Vector3(-0.48, 0.34, -0.25)
  },
  {
    id: 'wasat_lisaan',
    group: 'tongue',
    ar: 'وسط اللسان',
    en: 'Middle Dorsum (وسط اللسان)',
    hex: '#2563eb',
    rgb: [0.15, 0.39, 0.92],
    getTarget: () => new THREE.Vector3(0.0, 0.28, 0.14),
    offset: new THREE.Vector3(-0.52, 0.36, 0.08)
  },
  {
    id: 'haafah_lisaan',
    group: 'tongue',
    ar: 'حافتا اللسان',
    en: 'Lateral Edges (حافتا اللسان)',
    hex: '#d97706',
    rgb: [0.85, 0.47, 0.02],
    getTarget: () => new THREE.Vector3(-0.38, 0.18, 0.22),
    offset: new THREE.Vector3(-0.62, 0.08, 0.26)
  },
  {
    id: 'taraf_lisaan',
    group: 'tongue',
    ar: 'طرف اللسان',
    en: 'Tip & Blade (طرف اللسان)',
    hex: '#059669',
    rgb: [0.02, 0.59, 0.41],
    getTarget: () => new THREE.Vector3(0.0, 0.17, 0.66),
    offset: new THREE.Vector3(-0.48, 0.22, 0.68)
  },
  {
    id: 'asalat_lisaan',
    group: 'tongue',
    ar: 'أسلة اللسان',
    en: 'Apex Tip (أسلة اللسان)',
    hex: '#e11d48',
    rgb: [0.88, 0.11, 0.28],
    getTarget: () => new THREE.Vector3(0.0, 0.12, 0.85),
    offset: new THREE.Vector3(0.0, -0.18, 1.18)
  },

  // 6 Teeth Types
  {
    id: 'thanaayaa',
    group: 'teeth',
    ar: 'الثنايا (٤)',
    en: 'Central Incisors (الثنايا)',
    hex: '#06b6d4',
    rgb: [0.02, 0.71, 0.83],
    getTarget: () => new THREE.Vector3(0.07, 0.09, 0.94),
    offset: new THREE.Vector3(0.32, 0.14, 1.24)
  },
  {
    id: 'rubaaiyyaat',
    group: 'teeth',
    ar: 'الرباعيات (٤)',
    en: 'Lateral Incisors (الرباعيات)',
    hex: '#10b981',
    rgb: [0.06, 0.73, 0.51],
    getTarget: () => new THREE.Vector3(0.21, 0.09, 0.89),
    offset: new THREE.Vector3(0.56, 0.10, 1.06)
  },
  {
    id: 'anyaab',
    group: 'teeth',
    ar: 'الأنياب (٤)',
    en: 'Canines (الأنياب)',
    hex: '#f59e0b',
    rgb: [0.96, 0.62, 0.04],
    getTarget: () => new THREE.Vector3(0.35, 0.09, 0.78),
    offset: new THREE.Vector3(0.72, 0.04, 0.84)
  },
  {
    id: 'dawaahik',
    group: 'teeth',
    ar: 'الضواحك (٤)',
    en: 'Premolars (الضواحك)',
    hex: '#a855f7',
    rgb: [0.66, 0.33, 0.97],
    getTarget: () => new THREE.Vector3(0.46, 0.11, 0.58),
    offset: new THREE.Vector3(0.82, -0.02, 0.58)
  },
  {
    id: 'tawaaheen',
    group: 'teeth',
    ar: 'الطواحين (١٢)',
    en: 'Molars (الطواحين)',
    hex: '#f97316',
    rgb: [0.98, 0.45, 0.09],
    getTarget: () => new THREE.Vector3(0.62, 0.13, 0.12),
    offset: new THREE.Vector3(0.96, -0.06, 0.10)
  },
  {
    id: 'nawaajidh',
    group: 'teeth',
    ar: 'النواجذ (٤)',
    en: 'Wisdom Teeth (النواجذ)',
    hex: '#ec4899',
    rgb: [0.93, 0.28, 0.60],
    getTarget: () => new THREE.Vector3(0.71, 0.16, -0.42),
    offset: new THREE.Vector3(1.04, -0.04, -0.48)
  },

  // 3 Palate Zones
  {
    id: 'lathah_palate',
    group: 'palate',
    ar: 'اللثة ومقدم الحنك المسطح',
    en: 'Gum Shelf (اللثة)',
    hex: '#eab368',
    rgb: [0.92, 0.72, 0.42],
    getTarget: () => new THREE.Vector3(0.0, 0.26, 0.82),
    offset: new THREE.Vector3(0.0, 0.54, 1.04)
  },
  {
    id: 'hanak_adhmi',
    group: 'palate',
    ar: 'الحنك العظمي المقوس',
    en: 'Hard Palate (الحنك العظمي)',
    hex: '#38bdf8',
    rgb: [0.22, 0.74, 0.97],
    getTarget: () => new THREE.Vector3(0.0, 0.45, 0.18),
    offset: new THREE.Vector3(0.42, 0.72, 0.12)
  },
  {
    id: 'hanak_lahmi',
    group: 'palate',
    ar: 'الحنك اللحمي',
    en: 'Soft Palate (الحنك اللحمي)',
    hex: '#c084fc',
    rgb: [0.75, 0.52, 0.99],
    getTarget: () => new THREE.Vector3(0.0, 0.31, -0.45),
    offset: new THREE.Vector3(0.38, 0.62, -0.52)
  }
];

export default function TajweedStudioPage() {
  const { resolvedTheme } = useTheme();
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  // Load language preference from localStorage if saved
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('tajweed_language');
      if (savedLang === 'ar' || savedLang === 'en') {
        setLang(savedLang);
      }
    } catch {}
  }, []);

  const handleToggleLang = () => {
    const nextLang = lang === 'en' ? 'ar' : 'en';
    setLang(nextLang);
    try {
      localStorage.setItem('tajweed_language', nextLang);
    } catch {}
  };

  // Default starting letter: Qaaf (ق)
  const [currentLetter, setCurrentLetter] = useState<LetterPreset>(LETTER_PRESETS[0]);
  const [dhaadMode, setDhaadMode] = useState<'right' | 'left' | 'both'>('right');
  const [showAnatomy, setShowAnatomy] = useState<boolean>(false);
  const [isGearsOpen, setIsGearsOpen] = useState<boolean>(false);

  // Toggles
  const [showMakhrajColors, setShowMakhrajColors] = useState<boolean>(true);
  const [showPalate, setShowPalate] = useState<boolean>(true);
  const [showUpperTeeth, setShowUpperTeeth] = useState<boolean>(true);
  const [upperTeethOpacity, setUpperTeethOpacity] = useState<number>(56);
  const [showLowerTeeth, setShowLowerTeeth] = useState<boolean>(true);
  const [gears, setGears] = useState<Record<string, number>>(() => ({ ...currentLetter.gears }));

  // Motion simulation state
  const isSimulatingRef = useRef(false);
  const simulationStartTimeRef = useRef(0);
  const morphProgressRef = useRef(1.0);
  const isRestingAtAlifRef = useRef(false);

  // Default camera viewpoint (3/4 dental perspective)
  const DEFAULT_CAM = useMemo(() => ({
    radius: 3.28,
    theta: -1.36,
    phi: 1.48,
    target: new THREE.Vector3(0.0, -0.04, 0.06)
  }), []);

  const camAnimRef = useRef<{
    startRadius: number;
    startTheta: number;
    targetTheta: number;
    startPhi: number;
    startTime: number;
    duration: number;
  } | null>(null);

  // Three.js and Gear targets
  const targetGearsRef = useRef<Record<string, number>>({ ...currentLetter.gears });
  const currentGearsRef = useRef<Record<string, number>>({ ...currentLetter.gears });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Simulate Motion (Alif -> Makhraj -> Alif)
  const triggerSimulation = () => {
    isSimulatingRef.current = true;
    isRestingAtAlifRef.current = false;
    morphProgressRef.current = 0.0;
    Object.keys(ALIF_MAKHRAJ_GEARS).forEach(k => {
      currentGearsRef.current[k] = ALIF_MAKHRAJ_GEARS[k];
    });
    simulationStartTimeRef.current = performance.now();
  };

  // Three.js scene refs
  const sceneElementsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    spherical: { radius: number; theta: number; phi: number; target: THREE.Vector3 };
    hardPalateMesh: THREE.Mesh;
    softPalateMesh: THREE.Mesh;
    alveolarArcMesh: THREE.Mesh;
    upperTeethGroup: THREE.Group;
    lowerTeethGroup: THREE.Group;
    lowerJawPivot: THREE.Group;
    tongueMesh: THREE.Mesh;
    lipsGroup: THREE.Group;
    upperLipMesh: THREE.Mesh;
    lowerLipMesh: THREE.Mesh;
    anatomyGroup: THREE.Group;
    calloutItems: Array<{
      data: AnatomyLabelItem;
      group3D: THREE.Group;
      anchorDot: THREE.Mesh;
      shaftMesh: THREE.Mesh;
      coneMesh: THREE.Mesh;
      airNode: THREE.Mesh;
      badgeEl: HTMLDivElement;
    }>;
    animFrameId: number;
  } | null>(null);

  // Reset camera viewpoint to default perspective
  const resetCameraToDefault = (smooth = true) => {
    if (!sceneElementsRef.current) return;
    const { spherical, camera } = sceneElementsRef.current;
    if (!smooth) {
      camAnimRef.current = null;
      spherical.radius = DEFAULT_CAM.radius;
      spherical.theta = DEFAULT_CAM.theta;
      spherical.phi = DEFAULT_CAM.phi;
      spherical.target.copy(DEFAULT_CAM.target);
      camera.position.x = spherical.target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(spherical.target);
      return;
    }

    // Shortest angular difference
    let diffTheta = (DEFAULT_CAM.theta - (spherical.theta % (Math.PI * 2)));
    while (diffTheta > Math.PI) diffTheta -= Math.PI * 2;
    while (diffTheta < -Math.PI) diffTheta += Math.PI * 2;

    camAnimRef.current = {
      startRadius: spherical.radius,
      startTheta: spherical.theta,
      targetTheta: spherical.theta + diffTheta,
      startPhi: spherical.phi,
      startTime: performance.now(),
      duration: 380
    };
  };

  // Change active letter
  const selectLetter = (preset: LetterPreset) => {
    setCurrentLetter(preset);
    isSimulatingRef.current = false;
    isRestingAtAlifRef.current = false;
    morphProgressRef.current = 1.0;
    targetGearsRef.current = { ...preset.gears };
    setGears({ ...preset.gears });
    setUpperTeethOpacity(preset.gears.upperOpacity ?? 56);
    resetCameraToDefault(true);
  };

  // Adjust gear slider
  const handleGearChange = (key: string, value: number) => {
    isSimulatingRef.current = false;
    isRestingAtAlifRef.current = false;
    morphProgressRef.current = 1.0;
    targetGearsRef.current[key] = value;
    setGears(prev => ({ ...prev, [key]: value }));
    if (key === 'upperOpacity') {
      setUpperTeethOpacity(value);
    }
  };

  const handleResetGears = () => {
    const neutral: Record<string, number> = {
      jawOpen: 20, tipElevation: 0, tipForward: 0, backIstila: 0, middleArch: 0, lateralSpread: 10, greenPointPos: 18, upperOpacity: 56
    };
    targetGearsRef.current = { ...neutral };
    setGears({ ...neutral });
    setUpperTeethOpacity(56);
  };

  // ----------------------------------------------------------------------------
  // 4. MAIN THREE.JS MOUNT & LIFECYCLE
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const overlay = overlayRef.current;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(resolvedTheme === 'dark' ? 0x070c18 : 0xebedf1);

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    const spherical = {
      radius: 3.28,
      theta: -1.36,
      phi: 1.48,
      target: new THREE.Vector3(0.0, -0.04, 0.06)
    };
    const updateCamPos = () => {
      camera.position.x = spherical.target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(spherical.target);
    };
    updateCamPos();

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
    scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x9ca3af, 0.36);
    hemiLight.position.set(0, 2.2, 0.5);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xfff5f0, 0.48);
    dirLight.position.set(-2.2, 0.9, 1.2);
    scene.add(dirLight);

    const mouthRoot = new THREE.Group();
    scene.add(mouthRoot);

    // Palate math
    const getPalateFrontArchZ = (signedTx: number) => 0.90 - 0.18 * signedTx * signedTx;
    const getPalateHalfWidth = (u: number) => 0.32 + 0.36 * Math.pow(Math.max(0.0, Math.min(1.0, u)), 0.60);

    const invertPalateXZ = (x: number, z: number) => {
      if (z < -0.19) {
        const v = Math.max(0.0, Math.min(1.0, (-0.19 - z) / 0.52));
        const halfW = 0.68 * (1.0 - 0.42 * Math.pow(v, 1.35));
        const signedTx = Math.max(-1.0, Math.min(1.0, x / Math.max(0.08, halfW)));
        return { isSoft: true, u: 1.0, v, tx: Math.abs(signedTx), signedTx };
      }
      let signedTx = Math.max(-1.0, Math.min(1.0, x / 0.32));
      let zFront = getPalateFrontArchZ(signedTx);
      let u = Math.max(0.0, Math.min(1.0, (zFront - z) / (zFront + 0.19)));
      for (let i = 0; i < 6; i++) {
        const halfW = getPalateHalfWidth(u);
        signedTx = Math.max(-1.0, Math.min(1.0, x / halfW));
        zFront = getPalateFrontArchZ(signedTx);
        u = Math.max(0.0, Math.min(1.0, (zFront - z) / (zFront + 0.19)));
      }
      return { isSoft: false, u, v: 0.0, tx: Math.abs(signedTx), signedTx };
    };

    const getPalateCeilingY = (x: number, z: number) => {
      const { isSoft, u, v, tx } = invertPalateXZ(x, z);
      let edgeY: number, domePeakY: number;
      if (!isSoft) {
        const gingivalCollarDip = -0.014 * Math.exp(-Math.pow(u / 0.032, 2));
        edgeY = 0.232 + 0.046 * Math.sin(u * Math.PI * 0.85) + gingivalCollarDip * 0.6;
        if (u <= BIO_ALVEOLAR_SHELF_U) {
          const tShelf = u / BIO_ALVEOLAR_SHELF_U;
          const boundaryCrease = -0.008 * Math.exp(-Math.pow((u - BIO_ALVEOLAR_SHELF_U) / 0.012, 2));
          domePeakY = 0.232 + 0.042 * tShelf + gingivalCollarDip + boundaryCrease;
        } else {
          const uVault = (u - BIO_ALVEOLAR_SHELF_U) / (1.0 - BIO_ALVEOLAR_SHELF_U);
          const boundaryCrease = -0.008 * Math.exp(-Math.pow((u - BIO_ALVEOLAR_SHELF_U) / 0.012, 2));
          const mainVault = 0.042 + 0.212 * Math.sin(Math.pow(uVault, 0.68) * Math.PI * 0.80) + boundaryCrease;
          domePeakY = 0.232 + mainVault;
        }
      } else {
        const startPeak = 0.232 + 0.042 + 0.212 * Math.sin(Math.PI * 0.80);
        edgeY = 0.268 - 0.055 * Math.pow(v, 1.25);
        domePeakY = startPeak - 0.105 * Math.pow(v, 1.25);
      }
      const crossExp = (!isSoft && u <= BIO_ALVEOLAR_SHELF_U) ? 0.72 : 1.15;
      const domeProfile = Math.pow(Math.cos(tx * Math.PI * 0.48), crossExp);
      return edgeY + domeProfile * (domePeakY - edgeY);
    };

    const createPalateSectionGeometry = (tzStart: number, tzEnd: number, segsZ = 44, segsX = 44) => {
      const geom = new THREE.BufferGeometry();
      const positions: number[] = [];
      const colors: number[] = [];
      const uArray: number[] = [];
      const isSoftArray: number[] = [];
      const indices: number[] = [];
      const ringSize = segsX + 1;
      const isSoftSection = (tzStart >= BIO_HARD_PALATE_RATIO - 0.005);

      for (let iz = 0; iz <= segsZ; iz++) {
        const tz = tzStart + (iz / segsZ) * (tzEnd - tzStart);
        for (let ix = 0; ix <= segsX; ix++) {
          const signedTx = (ix / segsX) * 2 - 1;
          let x = 0, z = 0, u = 1.0;
          if (!isSoftSection) {
            u = Math.max(0.0, Math.min(1.0, tz / BIO_HARD_PALATE_RATIO));
            const halfW = getPalateHalfWidth(u);
            x = signedTx * halfW;
            const zFront = getPalateFrontArchZ(signedTx);
            z = zFront * (1.0 - u) + (-0.19) * u;
          } else {
            const v = Math.max(0.0, Math.min(1.0, (tz - BIO_HARD_PALATE_RATIO) / (1.0 - BIO_HARD_PALATE_RATIO)));
            const halfW = 0.68 * (1.0 - 0.42 * Math.pow(v, 1.35));
            x = signedTx * halfW;
            z = -0.19 - v * 0.52 * (1.0 - 0.18 * signedTx * signedTx);
          }

          const y = getPalateCeilingY(x, z);
          positions.push(x, y, z);
          uArray.push(u);
          isSoftArray.push(isSoftSection ? 1 : 0);

          let rCol: number, gCol: number, bCol: number;
          if (!isSoftSection && u <= BIO_ALVEOLAR_SHELF_U) {
            const fineStriation = 0.035 * Math.cos((u / BIO_ALVEOLAR_SHELF_U) * Math.PI * 6.0);
            const boundaryGlow = Math.exp(-Math.pow((u - BIO_ALVEOLAR_SHELF_U) / 0.012, 2)) * 0.12;
            const archEdgeShade = Math.pow(Math.abs(signedTx), 2.2) * 0.10;
            rCol = Math.min(1.0, 0.92 + fineStriation + boundaryGlow - archEdgeShade * 0.4);
            gCol = Math.min(1.0, 0.72 + fineStriation * 0.8 + boundaryGlow - archEdgeShade * 0.35);
            bCol = Math.min(1.0, 0.42 + fineStriation * 0.5 + boundaryGlow * 1.2 - archEdgeShade * 0.25);
          } else {
            const domeCrestShade = Math.pow(Math.max(0.0, Math.min(1.0, (y - 0.24) / 0.22)), 1.5) * 0.18;
            const endEdgeShade = Math.pow(Math.max(0.0, (tz - 0.86) / 0.14), 1.5) * 0.18;
            const archRimShade = Math.pow(Math.abs(signedTx), 2.2) * 0.12;
            const rimShade = Math.min(0.36, domeCrestShade + endEdgeShade + archRimShade);
            rCol = 0.78 - 0.16 * rimShade;
            gCol = 0.40 - 0.08 * rimShade;
            bCol = 0.46 - 0.10 * rimShade;
          }
          colors.push(rCol, gCol, bCol);
        }
      }

      for (let iz = 0; iz < segsZ; iz++) {
        for (let ix = 0; ix < segsX; ix++) {
          const a = iz * ringSize + ix;
          const b = a + 1;
          const c = (iz + 1) * ringSize + ix;
          const d = c + 1;
          indices.push(a, b, c, b, d, c);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      geom.userData = {
        baseColors: new Float32Array(colors),
        uArray: new Float32Array(uArray),
        isSoftArray: new Uint8Array(isSoftArray)
      };
      return geom;
    };

    // Dental arch builders
    const buildArchLookupTable = (isUpper: boolean) => {
      const N = 360;
      const wMax = isUpper ? 0.74 : 0.69;
      const zFront = isUpper ? 0.96 : 0.90;
      const zBack = isUpper ? -0.56 : -0.54;
      const pts: Array<{ t: number; x: number; z: number; arcLen: number; uArc?: number }> = [];
      let cumLen = 0;

      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const angle = t * (Math.PI * 0.48);
        const x = wMax * Math.sin(angle);
        const z = zFront - (1 - Math.cos(angle)) * (zFront - zBack) * 0.72 - Math.pow(t, 1.35) * (zFront - zBack) * 0.30;
        if (i > 0) {
          cumLen += Math.hypot(x - pts[i - 1].x, z - pts[i - 1].z);
        }
        pts.push({ t, x, z, arcLen: cumLen });
      }
      pts.forEach(p => { p.uArc = p.arcLen / cumLen; });
      return pts as Array<{ t: number; x: number; z: number; arcLen: number; uArc: number }>;
    };

    const upperArchTable = buildArchLookupTable(true);
    const lowerArchTable = buildArchLookupTable(false);

    const sampleArchByArcFraction = (f: number, side: number, isUpper: boolean) => {
      const table = isUpper ? upperArchTable : lowerArchTable;
      const clampedF = Math.max(0, Math.min(1, f));
      let idx = Math.floor(clampedF * (table.length - 1));
      while (idx < table.length - 1 && table[idx + 1].uArc < clampedF) idx++;
      while (idx > 0 && table[idx].uArc > clampedF) idx--;

      const p0 = table[idx];
      const p1 = table[Math.min(table.length - 1, idx + 1)];
      const span = (p1.uArc - p0.uArc) || 0.0001;
      const alpha = Math.max(0, Math.min(1, (clampedF - p0.uArc) / span));

      const xAbs = p0.x + (p1.x - p0.x) * alpha;
      const z = p0.z + (p1.z - p0.z) * alpha;
      const x = side * xAbs;

      const iPrev = Math.max(0, idx - 1);
      const iNext = Math.min(table.length - 1, idx + 2);
      const tx = side * (table[iNext].x - table[iPrev].x);
      const tz = table[iNext].z - table[iPrev].z;
      const tLen = Math.hypot(tx, tz) || 1;

      const nx = (side > 0) ? -tz / tLen : tz / tLen;
      const nz = (side > 0) ? tx / tLen : -tx / tLen;
      const speeLift = isUpper ? (Math.pow(clampedF, 1.6) * 0.05) : (Math.pow(clampedF, 1.55) * 0.14);

      return { x, z, nx, nz, speeLift };
    };

    const createToothMesh = (spec: any, side: number, isUpper: boolean, mat: THREE.Material) => {
      const segsU = 26;
      const segsV = 16;
      const geom = new THREE.BufferGeometry();
      const positions: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];

      const fCenter = (spec.fStart + spec.fEnd) * 0.5;
      const fHalfSpan = (spec.fEnd - spec.fStart) * 0.508;
      const halfD = spec.depth * 0.5;
      const height = spec.height;
      const dirY = isUpper ? -1 : 1;
      const baseRootY = isUpper ? 0.24 : -0.22;

      for (let iv = 0; iv <= segsV; iv++) {
        const isRootCap = (iv === 0);
        const isOcclusalCap = (iv >= segsV - 1);
        const v = isRootCap ? 0.0 : Math.min(1.0, iv / (segsV - 2));

        let widthEnv: number;
        if (spec.type === 'incisor') {
          widthEnv = (v < 0.28) ? (0.72 + (v / 0.28) * 0.25) : (0.97 - 0.04 * Math.pow((v - 0.28) / 0.72, 1.6));
        } else if (spec.type === 'canine') {
          widthEnv = (v < 0.30) ? (0.74 + (v / 0.30) * 0.24) : (0.98 * (1.0 - 0.20 * Math.pow((v - 0.30) / 0.70, 1.4)));
        } else {
          widthEnv = (v < 0.26) ? (0.75 + (v / 0.26) * 0.23) : (0.98 + 0.04 * Math.sin(((v - 0.26) / 0.74) * Math.PI * 0.82));
        }

        const depthEnv = (spec.type === 'incisor')
          ? (0.86 * (1.0 - 0.68 * Math.pow(v, 1.25)))
          : (0.78 + 0.24 * Math.sin(v * Math.PI * 0.78));

        const cervicalGumBridge = (isUpper && fCenter < 0.35 && v < 0.36)
          ? (-0.048 * Math.pow((0.36 - v) / 0.36, 1.35) * Math.cos((fCenter / 0.35) * Math.PI * 0.5))
          : 0.0;

        for (let iu = 0; iu <= segsU; iu++) {
          const theta = (iu / segsU) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);

          let localS = Math.sign(cosT) * Math.pow(Math.abs(cosT), 0.74) * widthEnv;
          let localN = Math.sign(sinT) * Math.pow(Math.abs(sinT), 0.82) * halfD * depthEnv + cervicalGumBridge;
          let y = v * height;

          if (v > 0.55) {
            const topFactor = (v - 0.55) / 0.45;
            if (spec.type === 'incisor') {
              y -= Math.pow(Math.abs(cosT), 3.2) * 0.020 * topFactor;
            } else if (spec.type === 'canine') {
              y += (Math.pow(Math.max(0.0, 1.0 - cosT * cosT), 1.3) - 0.32) * 0.030 * topFactor;
            } else {
              const twoLobesMD = Math.sin(Math.abs(cosT) * Math.PI);
              const twoLobesBL = Math.pow(Math.abs(sinT), 1.1);
              y += (twoLobesMD * twoLobesBL * 0.026 - Math.exp(-Math.pow(sinT / 0.30, 2)) * 0.010) * topFactor;
            }
          }

          if (isRootCap) { localS = 0; localN = 0; }
          else if (isOcclusalCap) {
            const rScale = (iv === segsV) ? 0.0 : 0.48;
            localS *= rScale;
            localN *= rScale;
          }

          const fPos = fCenter + localS * fHalfSpan;
          const archSample = sampleArchByArcFraction(fPos, side, isUpper);
          const wx = archSample.x + archSample.nx * localN;
          const wz = archSample.z + archSample.nz * localN;
          const wy = baseRootY + archSample.speeLift + dirY * y;
          positions.push(wx, wy, wz);

          const capFactor = isOcclusalCap ? 0.30 : 1.0;
          const interdentalCrevice = Math.pow(Math.abs(cosT), 2.5) * 0.44 * capFactor;
          const cervicalShadow = (v < 0.28) ? Math.pow((0.28 - v) / 0.28, 1.35) * 0.28 : 0.0;
          const anteriorCurveShadow = Math.pow(Math.max(0.0, 1.0 - fPos / 0.32), 1.5) * 0.16 * capFactor;
          const lingualShadow = (sinT < 0) ? (-sinT * 0.16 * capFactor) : 0.0;
          const buccalHighlight = (sinT > 0.15) ? (Math.pow(sinT, 1.4) * (1.0 - cosT * cosT) * 0.06) : 0.0;
          const baseBrightness = isUpper ? 0.78 : 0.82;
          const shade = Math.max(0.36, Math.min(0.84, baseBrightness + buccalHighlight - interdentalCrevice - cervicalShadow - anteriorCurveShadow - lingualShadow));
          colors.push(shade * 0.98, shade * 0.99, shade * 1.01);
        }
      }

      for (let iv = 0; iv < segsV; iv++) {
        for (let iu = 0; iu < segsU; iu++) {
          const a = iv * (segsU + 1) + iu;
          const b = a + 1;
          const c = (iv + 1) * (segsU + 1) + iu;
          const d = c + 1;
          indices.push(a, b, c, b, d, c);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = `${isUpper ? 'Upper' : 'Lower'}_Tooth_${side}_${spec.type}_${spec.index}`;
      mesh.userData = { isUpper, side, toothIndex: spec.index, baseColors: new Float32Array(colors) };
      return mesh;
    };

    const buildDentalArch = (isUpper: boolean, mat: THREE.Material) => {
      const group = new THREE.Group();
      const intervals = [
        { index: 0, fStart: 0.000, fEnd: 0.102, height: 0.24, depth: 0.100, type: 'incisor' },
        { index: 1, fStart: 0.100, fEnd: 0.196, height: 0.23, depth: 0.102, type: 'incisor' },
        { index: 2, fStart: 0.194, fEnd: 0.298, height: 0.25, depth: 0.122, type: 'canine' },
        { index: 3, fStart: 0.296, fEnd: 0.412, height: 0.22, depth: 0.148, type: 'premolar' },
        { index: 4, fStart: 0.410, fEnd: 0.534, height: 0.21, depth: 0.162, type: 'premolar' },
        { index: 5, fStart: 0.532, fEnd: 0.686, height: 0.20, depth: 0.196, type: 'molar' },
        { index: 6, fStart: 0.684, fEnd: 0.840, height: 0.195, depth: 0.196, type: 'molar' },
        { index: 7, fStart: 0.838, fEnd: 0.988, height: 0.188, depth: 0.190, type: 'molar' }
      ];
      [-1, 1].forEach(side => {
        intervals.forEach(spec => group.add(createToothMesh(spec, side, isUpper, mat)));
      });
      return group;
    };

    const createLowerMandibleGumGeometry = () => {
      const segsArc = 64;
      const segsCross = 20;
      const geom = new THREE.BufferGeometry();
      const positions: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];

      for (let ia = 0; ia <= segsArc; ia++) {
        const s = (ia / segsArc) * 2 - 1;
        const f = Math.abs(s);
        const side = s >= 0 ? 1 : -1;
        const archPt = sampleArchByArcFraction(f, side, false);
        const toothWave = Math.cos(f * 7.0 * Math.PI * 2);
        const jawBottomY = -0.58 + Math.pow(f, 2.0) * 0.18;
        const jawCrestY = -0.15 + archPt.speeLift;

        for (let ic = 0; ic <= segsCross; ic++) {
          const tc = ic / segsCross;
          const angleC = tc * Math.PI * 2;
          const cosC = Math.cos(angleC);
          const sinC = Math.sin(angleC);

          const halfThick = 0.118 + 0.036 * Math.max(0, sinC) + (f > 0.5 ? 0.022 : 0);
          const normalOffset = -cosC * halfThick;
          const neckScallop = (sinC > 0) ? (Math.pow(sinC, 2.2) * 0.028 * toothWave) : 0.0;
          const y = (sinC >= 0) ? (jawBottomY + sinC * (jawCrestY - jawBottomY) + neckScallop) : (jawBottomY + sinC * 0.022);

          const isLabialWall = (sinC > 0 && cosC < -0.15);
          const rootBulge = isLabialWall ? ((toothWave * 0.5 + 0.5) * 0.022 * sinC * (1.1 - 0.35 * f)) : 0.0;

          const px = archPt.x + archPt.nx * (normalOffset + rootBulge);
          const pz = archPt.z + archPt.nz * (normalOffset + rootBulge);
          positions.push(px, y, pz);

          const buccalFacing = Math.max(0.0, -cosC);
          const verticalLight = (sinC >= 0) ? (0.48 + 0.52 * Math.sin(sinC * Math.PI * 0.78)) : Math.max(0.22, 0.45 + sinC * 0.35);
          const antCurveShadow = 1.0 - 0.50 * Math.pow(Math.max(0.0, (0.34 - f) / 0.34), 1.45);
          const backEndShadow = 1.0 - 0.44 * Math.pow(Math.max(0.0, (f - 0.80) / 0.20), 1.5);
          const lingualDarken = 0.36 + 0.64 * Math.pow(buccalFacing, 0.65);
          const waveHighlight = isLabialWall ? (0.04 * toothWave) : 0.0;
          const gShade = Math.max(0.22, Math.min(1.0, verticalLight * antCurveShadow * backEndShadow * lingualDarken + waveHighlight));
          colors.push(0.75 * gShade, 0.19 * gShade, 0.24 * gShade);
        }
      }

      const ringStride = segsCross + 1;
      for (let ia = 0; ia < segsArc; ia++) {
        for (let ic = 0; ic < segsCross; ic++) {
          const a = ia * ringStride + ic;
          const b = a + 1;
          const c = (ia + 1) * ringStride + ic;
          const d = c + 1;
          indices.push(a, b, c, b, d, c);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      return geom;
    };

    // Materials
    const hardPalateMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.54, side: THREE.DoubleSide, depthWrite: false
    });
    const softPalateMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.54, side: THREE.DoubleSide, depthWrite: false
    });
    const upperToothMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.56, side: THREE.DoubleSide, depthWrite: true
    });
    const lowerGumMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, depthWrite: true
    });
    const lowerToothMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, depthWrite: true
    });
    const tongueMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, depthWrite: true
    });

    // Upper jaw assembly
    const upperJawGroup = new THREE.Group();
    mouthRoot.add(upperJawGroup);

    const hardPalateMesh = new THREE.Mesh(createPalateSectionGeometry(0.00, BIO_HARD_PALATE_RATIO, 44, 44), hardPalateMaterial);
    hardPalateMesh.renderOrder = 1;
    upperJawGroup.add(hardPalateMesh);

    const softPalateMesh = new THREE.Mesh(createPalateSectionGeometry(BIO_HARD_PALATE_RATIO, 1.00, 28, 44), softPalateMaterial);
    softPalateMesh.renderOrder = 1;
    upperJawGroup.add(softPalateMesh);

    // Alveolar Boundary Arc
    const createAlveolarArcMesh = () => {
      const uBorder = BIO_ALVEOLAR_SHELF_U;
      const halfW = getPalateHalfWidth(uBorder);
      const curvePts: THREE.Vector3[] = [];
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const signedTx = (i / steps) * 2 - 1;
        const x = signedTx * halfW;
        const zFront = getPalateFrontArchZ(signedTx);
        const z = zFront * (1.0 - uBorder) + (-0.19) * uBorder;
        const y = getPalateCeilingY(x, z) - 0.002;
        curvePts.push(new THREE.Vector3(x, y, z));
      }
      const path = new THREE.CatmullRomCurve3(curvePts);
      const tubeGeom = new THREE.TubeGeometry(path, 48, 0.0065, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.92 });
      const mesh = new THREE.Mesh(tubeGeom, tubeMat);
      mesh.renderOrder = 2;
      return mesh;
    };
    const alveolarArcMesh = createAlveolarArcMesh();
    upperJawGroup.add(alveolarArcMesh);

    const upperTeethGroup = buildDentalArch(true, upperToothMaterial);
    upperTeethGroup.renderOrder = 2;
    upperJawGroup.add(upperTeethGroup);

    // Lower jaw assembly
    const lowerJawPivot = new THREE.Group();
    lowerJawPivot.position.set(0, 0.0, -0.68);
    mouthRoot.add(lowerJawPivot);

    const lowerJawContent = new THREE.Group();
    lowerJawContent.position.set(0, 0.0, 0.68);
    lowerJawPivot.add(lowerJawContent);

    const lowerGumMesh = new THREE.Mesh(createLowerMandibleGumGeometry(), lowerGumMaterial);
    lowerJawContent.add(lowerGumMesh);

    const lowerTeethGroup = buildDentalArch(false, lowerToothMaterial);
    lowerJawContent.add(lowerTeethGroup);

    // Tongue mesh
    const TONGUE_SEGS_Z = 56;
    const TONGUE_SEGS_U = 36;
    const tongueGeom = new THREE.BufferGeometry();
    const tonguePositions = new Float32Array((TONGUE_SEGS_Z + 1) * (TONGUE_SEGS_U + 1) * 3);
    const tongueColors = new Float32Array((TONGUE_SEGS_Z + 1) * (TONGUE_SEGS_U + 1) * 3);
    const tongueIndices: number[] = [];

    for (let iz = 0; iz < TONGUE_SEGS_Z; iz++) {
      for (let iu = 0; iu < TONGUE_SEGS_U; iu++) {
        const a = iz * (TONGUE_SEGS_U + 1) + iu;
        const b = a + 1;
        const c = (iz + 1) * (TONGUE_SEGS_U + 1) + iu;
        const d = c + 1;
        tongueIndices.push(a, b, c, b, d, c);
      }
    }
    tongueGeom.setAttribute('position', new THREE.BufferAttribute(tonguePositions, 3));
    tongueGeom.setAttribute('color', new THREE.BufferAttribute(tongueColors, 3));
    tongueGeom.setIndex(tongueIndices);

    const tongueMesh = new THREE.Mesh(tongueGeom, tongueMaterial);
    mouthRoot.add(tongueMesh);

    // Lips group
    const lipsGroup = new THREE.Group();
    lipsGroup.visible = false;
    mouthRoot.add(lipsGroup);

    const LIP_SEGS_U = 44;
    const LIP_SEGS_V = 20;
    const realLipMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, depthWrite: true });

    const createLipMesh = () => {
      const geom = new THREE.BufferGeometry();
      const vCount = (LIP_SEGS_U + 1) * (LIP_SEGS_V + 1);
      const pos = new Float32Array(vCount * 3);
      const col = new Float32Array(vCount * 3);
      const ind: number[] = [];
      for (let iu = 0; iu < LIP_SEGS_U; iu++) {
        for (let iv = 0; iv < LIP_SEGS_V; iv++) {
          const a = iu * (LIP_SEGS_V + 1) + iv;
          const b = (iu + 1) * (LIP_SEGS_V + 1) + iv;
          const c = (iu + 1) * (LIP_SEGS_V + 1) + (iv + 1);
          const d = iu * (LIP_SEGS_V + 1) + (iv + 1);
          ind.push(a, b, d);
          ind.push(b, c, d);
        }
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geom.setIndex(ind);
      return new THREE.Mesh(geom, realLipMaterial);
    };
    const upperLipMesh = createLipMesh();
    const lowerLipMesh = createLipMesh();
    lipsGroup.add(upperLipMesh);
    lipsGroup.add(lowerLipMesh);

    const updateRealLipsGeometry = (lipMode: string) => {
      const showMarker = showMakhrajColors && !showAnatomy;
      const makhrajMorphProgress = morphProgressRef.current;
      [
        { mesh: upperLipMesh, isUpper: true },
        { mesh: lowerLipMesh, isUpper: false }
      ].forEach(({ mesh, isUpper }) => {
        const posArr = mesh.geometry.attributes.position.array as Float32Array;
        const colArr = mesh.geometry.attributes.color.array as Float32Array;
        let pPtr = 0, cPtr = 0;

        for (let iu = 0; iu <= LIP_SEGS_U; iu++) {
          const u = (iu / LIP_SEGS_U) * 2 - 1;
          const isEnd = (iu === 0 || iu === LIP_SEGS_U);
          const cornerTaper = isEnd ? 0.0 : Math.pow(Math.max(0.0, 1.0 - u * u), 0.55);

          if (lipMode === 'rounded_waw') {
            const ringAngle = u * (Math.PI * 0.5);
            const ringRadius = 0.148;
            const cx = Math.sin(ringAngle) * ringRadius;
            const cyDir = isUpper ? Math.cos(ringAngle) : -Math.cos(ringAngle);
            const cy = 0.015 + cyDir * ringRadius;
            const cz = 1.04 + Math.cos(ringAngle) * 0.085;
            const tubeR = isEnd ? 0.0 : (0.024 + 0.042 * (0.35 + 0.65 * Math.cos(ringAngle)));
            const radX = Math.sin(ringAngle);
            const radY = cyDir;

            for (let iv = 0; iv <= LIP_SEGS_V; iv++) {
              const theta = (iv / LIP_SEGS_V) * Math.PI * 2;
              const cosT = Math.cos(theta), sinT = Math.sin(theta);
              const rOffset = sinT * tubeR;
              const zOffset = cosT * tubeR * 1.15;

              const alifX = Math.sin(u * (Math.PI * 0.36)) * 0.48;
              const alifZ = 0.60 + Math.cos(u * (Math.PI * 0.36)) * 0.40 + rOffset * 0.6;
              const alifY = (isUpper ? (0.01 + 0.14 * cornerTaper) : (0.01 - 0.14 * cornerTaper)) + rOffset;

              const targetX = cx + radX * rOffset;
              const targetY = cy + radY * rOffset;
              const targetZ = cz + zOffset;

              posArr[pPtr++] = alifX + (targetX - alifX) * makhrajMorphProgress;
              posArr[pPtr++] = alifY + (targetY - alifY) * makhrajMorphProgress;
              posArr[pPtr++] = alifZ + (targetZ - alifZ) * makhrajMorphProgress;

              let rL = 0.72, gL = 0.25, bL = 0.30;
              if (showMarker && currentLetter && currentLetter.id === 'waw') {
                const innerRim = Math.max(0.0, -sinT) * Math.max(0.0, 1.0 - Math.pow(u / 0.72, 2));
                const outerRing = Math.max(0.0, cosT) * Math.max(0.0, 1.0 - Math.pow(u / 0.78, 2));
                const pW = Math.min(0.85, innerRim * 0.88) * makhrajMorphProgress;
                const sW = Math.min(0.68, outerRing * 0.65 * (1.0 - pW)) * makhrajMorphProgress;
                rL = rL * (1.0 - pW - sW) + 0.04 * pW + 0.48 * sW;
                gL = gL * (1.0 - pW - sW) + 0.46 * pW + 0.92 * sW;
                bL = bL * (1.0 - pW - sW) + 0.16 * pW + 0.60 * sW;
              }
              colArr[cPtr++] = rL; colArr[cPtr++] = gL; colArr[cPtr++] = bL;
            }
            continue;
          }

          const archAngle = u * (Math.PI * 0.36);
          const baseArchX = Math.sin(archAngle) * 0.48;
          const baseArchZ = 0.60 + Math.cos(archAngle) * 0.40;
          const cornerY = 0.01;
          const halfThickZ = isEnd ? 0.0 : (0.008 + 0.050 * cornerTaper);
          const halfHeightY = isEnd ? 0.0 : (0.008 + 0.052 * cornerTaper);

          for (let iv = 0; iv <= LIP_SEGS_V; iv++) {
            const theta = (iv / LIP_SEGS_V) * Math.PI * 2;
            const cosT = Math.cos(theta), sinT = Math.sin(theta);
            let centerY = isUpper ? (0.018 + halfHeightY * 0.88) : (0.018 - halfHeightY * 0.88);
            let centerZ = baseArchZ + 0.034 * cornerTaper;
            let localY = sinT * halfHeightY;
            let localZ = cosT * halfThickZ;

            if (lipMode === 'faa_labiodental') {
              centerY = isUpper ? (cornerY + 0.22 * cornerTaper) : (cornerY - 0.036 * cornerTaper);
              centerZ = isUpper ? (baseArchZ + 0.028 * cornerTaper) : (baseArchZ - 0.024 * cornerTaper);
              if (!isUpper && sinT > 0 && cosT < 0.25) {
                localZ -= 0.020 * sinT * cornerTaper * makhrajMorphProgress;
                localY += 0.015 * sinT * cornerTaper * makhrajMorphProgress;
              }
            }

            const alifCenterY = isUpper ? (cornerY + 0.14 * cornerTaper) : (cornerY - 0.14 * cornerTaper);
            const alifCenterZ = baseArchZ + 0.015 * cornerTaper;
            const curCenterY = alifCenterY + (centerY - alifCenterY) * makhrajMorphProgress;
            const curCenterZ = alifCenterZ + (centerZ - alifCenterZ) * makhrajMorphProgress;

            posArr[pPtr++] = baseArchX;
            posArr[pPtr++] = curCenterY + localY;
            posArr[pPtr++] = curCenterZ + localZ;

            let rL = 0.72, gL = 0.25, bL = 0.30;
            if (showMarker && currentLetter) {
              const lid = currentLetter.id;
              let pW = 0.0, sW = 0.0;
              if (lid === 'faa' && !isUpper) {
                const centerZone = Math.exp(-Math.pow(u / 0.28, 2));
                const topBelly = Math.max(0.0, sinT);
                pW = Math.min(0.88, centerZone * topBelly * 1.05) * makhrajMorphProgress;
                sW = Math.min(0.65, Math.exp(-Math.pow(u / 0.45, 2)) * topBelly * 0.75 * (1.0 - pW)) * makhrajMorphProgress;
              } else if (lid === 'baa' || lid === 'meem') {
                const seamContact = isUpper ? Math.max(0.0, -sinT) : Math.max(0.0, sinT);
                const centerSpan = Math.exp(-Math.pow(u / 0.44, 2));
                pW = Math.min(0.86, seamContact * centerSpan * (lid === 'baa' ? 1.08 : 0.88)) * makhrajMorphProgress;
                sW = Math.min(0.64, Math.max(0.0, cosT) * centerSpan * 0.60 * (1.0 - pW)) * makhrajMorphProgress;
              }
              rL = rL * (1.0 - pW - sW) + 0.04 * pW + 0.48 * sW;
              gL = gL * (1.0 - pW - sW) + 0.46 * pW + 0.92 * sW;
              bL = bL * (1.0 - pW - sW) + 0.16 * pW + 0.60 * sW;
            }
            colArr[cPtr++] = rL; colArr[cPtr++] = gL; colArr[cPtr++] = bL;
          }
        }
        mesh.geometry.attributes.position.needsUpdate = true;
        mesh.geometry.attributes.color.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      });
    };

    // Anatomy 3D Arrows & DOM Callouts
    const anatomyGroup = new THREE.Group();
    anatomyGroup.visible = false;
    mouthRoot.add(anatomyGroup);

    if (overlay) overlay.innerHTML = '';
    const calloutItems: any[] = [];

    ANATOMY_LABELS_DATA.forEach(item => {
      const arrowColor = new THREE.Color(item.hex);
      const arrowMat = new THREE.MeshBasicMaterial({ color: arrowColor });
      const itemGroup = new THREE.Group();

      const anchorDot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), arrowMat);
      itemGroup.add(anchorDot);

      const shaftGeom = new THREE.CylinderGeometry(0.007, 0.007, 1, 10);
      const shaftMesh = new THREE.Mesh(shaftGeom, arrowMat);
      itemGroup.add(shaftMesh);

      const coneGeom = new THREE.ConeGeometry(0.024, 0.068, 12);
      const coneMesh = new THREE.Mesh(coneGeom, arrowMat);
      itemGroup.add(coneMesh);

      const airNode = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), arrowMat);
      itemGroup.add(airNode);

      anatomyGroup.add(itemGroup);

      const badgeEl = document.createElement('div');
      badgeEl.className = 'absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-slate-950/90 dark:bg-gray-900/90 border text-white shadow-xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none transition-opacity text-xs';
      badgeEl.style.borderColor = item.hex;
      badgeEl.innerHTML = `
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${item.hex}"></span>
        <div class="flex flex-col leading-tight">
          <span class="font-bold text-white">${lang === 'ar' ? item.ar : item.en}</span>
        </div>
      `;
      if (overlay) overlay.appendChild(badgeEl);

      calloutItems.push({
        data: item,
        group3D: itemGroup,
        anchorDot,
        shaftMesh,
        coneMesh,
        airNode,
        badgeEl
      });
    });

    // Helpers
    const getUpperMolarInnerWallAtZ = (z: number) => {
      let bestPt = { f: 0.5, inX: 0.48, inZ: z, speeLift: 0.02 };
      let minDiff = 999;
      for (let i = 0; i <= 120; i++) {
        const f = i / 120;
        const s = sampleArchByArcFraction(f, 1, true);
        const lingualPad = 0.056 + 0.026 * Math.pow(f, 0.75);
        const inZ = s.z - s.nz * lingualPad;
        const d = Math.abs(inZ - z);
        if (d < minDiff) {
          minDiff = d;
          bestPt = { f, inX: Math.max(0.0, s.x - s.nx * lingualPad), inZ, speeLift: s.speeLift };
        }
      }
      return bestPt;
    };

    const smoothMin = (a: number, b: number, k = 0.024) => {
      const h = Math.max(0.0, Math.min(1.0, 0.5 + 0.5 * (b - a) / k));
      return a * h + b * (1.0 - h) - k * h * (1.0 - h);
    };

    // Store refs
    sceneElementsRef.current = {
      scene,
      camera,
      renderer,
      spherical,
      hardPalateMesh,
      softPalateMesh,
      alveolarArcMesh,
      upperTeethGroup,
      lowerTeethGroup,
      lowerJawPivot,
      tongueMesh,
      lipsGroup,
      upperLipMesh,
      lowerLipMesh,
      anatomyGroup,
      calloutItems,
      animFrameId: 0
    };

    // Orbit pointer events
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      camAnimRef.current = null;
      isDragging = true;
      prevPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer = { x: e.clientX, y: e.clientY };
      spherical.theta -= dx * 0.0085;
      spherical.phi = Math.max(0.25, Math.min(Math.PI - 0.25, spherical.phi - dy * 0.0085));
      updateCamPos();
    };

    const onPointerUp = () => { isDragging = false; };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camAnimRef.current = null;
      spherical.radius = Math.max(1.8, Math.min(6.5, spherical.radius + e.deltaY * 0.0025));
      updateCamPos();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // Touch controls
    let prevTouchDist = 0;
    const onTouchMove = (e: TouchEvent) => {
      camAnimRef.current = null;
      if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (prevTouchDist > 0) {
          const diff = prevTouchDist - dist;
          spherical.radius = Math.max(1.8, Math.min(6.5, spherical.radius + diff * 0.005));
          updateCamPos();
        }
        prevTouchDist = dist;
      }
    };
    const onTouchEnd = () => { prevTouchDist = 0; };
    domEl.addEventListener('touchmove', onTouchMove);
    domEl.addEventListener('touchend', onTouchEnd);

    // Resize handler
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || 640;
      const h = containerRef.current.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Highlight hard-palate contact zones for middle-tongue and safir letters without touching the gum shelf
    let lastPalateProg = -1;
    const updatePalateMakhrajColors = (mProg: number) => {
      const lid = currentLetter.id;
      const isMiddleLetter = (lid === 'jeem' || lid === 'sheen' || lid === 'yaa_cons');
      const isSafirLetter = (lid === 'saad' || lid === 'zaay' || lid === 'seen');
      const targetProg = ((isMiddleLetter || isSafirLetter) && showMakhrajColors && !showAnatomy) ? mProg : 0;
      if (Math.abs(targetProg - lastPalateProg) < 0.002) return;
      lastPalateProg = targetProg;

      const geom = hardPalateMesh.geometry;
      const base = geom.userData.baseColors as Float32Array | undefined;
      const uArr = geom.userData.uArray as Float32Array | undefined;
      if (!base || !uArr) return;
      const posArr = geom.attributes.position.array as Float32Array;
      const colArr = geom.attributes.color.array as Float32Array;

      if (targetProg <= 0.001) {
        colArr.set(base);
        geom.attributes.color.needsUpdate = true;
        return;
      }

      for (let i = 0, vi = 0; i < base.length; i += 3, vi++) {
        const u = uArr[vi];
        let r = base[i];
        let g = base[i + 1];
        let b = base[i + 2];

        if (u > BIO_ALVEOLAR_SHELF_U + 0.02) {
          const wx = posArr[i];
          const wz = posArr[i + 2];
          const absX = Math.abs(wx);
          let pW = 0.0;
          let sW = 0.0;

          if (lid === 'jeem') {
            const d = Math.hypot(wx / 0.28, (wz - 0.12) / 0.18);
            if (d < 1.0) {
              const w = Math.cos(d * Math.PI * 0.5);
              const press = 0.40 + 0.60 * w;
              const blend = 0.80 * w;
              pW = blend * press;
              sW = blend * (1.0 - press);
            }
          } else if (lid === 'sheen' || lid === 'yaa_cons') {
            const zEnv = Math.exp(-Math.pow((wz - 0.20) / 0.20, 2));
            const latBrace = Math.exp(-Math.pow((absX - 0.20) / 0.08, 2)) * zEnv;
            const centerChan = Math.exp(-Math.pow(absX / 0.12, 2)) * zEnv;
            if (latBrace > 0.05 || centerChan > 0.05) {
              pW = Math.min(0.76, latBrace * 0.76);
              sW = Math.min(0.58, centerChan * 0.58) * Math.max(0.0, 1.0 - latBrace);
            }
          } else if (isSafirLetter) {
            const zLat = Math.exp(-Math.pow((wz - 0.22) / 0.16, 2));
            const xLatPeak = (lid === 'saad') ? 0.31 : 0.24;
            const latBrace = Math.exp(-Math.pow((absX - xLatPeak) / 0.085, 2)) * zLat;
            const antWhistle = (wz > 0.36)
              ? (Math.exp(-Math.pow(absX / 0.08, 2)) * Math.min(1.0, (wz - 0.36) / 0.25))
              : 0.0;
            if (latBrace > 0.05 || antWhistle > 0.05) {
              pW = Math.min(0.75, latBrace * 0.75);
              sW = Math.min(0.55, antWhistle * 0.55) * Math.max(0.0, 1.0 - latBrace);
            }
          }

          pW *= targetProg;
          sW *= targetProg;
          const wSum = pW + sW;
          if (wSum > 0.82) {
            const scale = 0.82 / wSum;
            pW *= scale;
            sW *= scale;
          }
          const rem = 1.0 - pW - sW;
          if (pW + sW > 0.0) {
            r = r * rem + 0.04 * pW + 0.48 * sW;
            g = g * rem + 0.46 * pW + 0.92 * sW;
            b = b * rem + 0.16 * pW + 0.60 * sW;
          }
        }

        colArr[i] = r;
        colArr[i + 1] = g;
        colArr[i + 2] = b;
      }
      geom.attributes.color.needsUpdate = true;
    };

    // ------------------------------------------------------------------------
    // RENDER / ANIMATION LOOP
    // ------------------------------------------------------------------------
    let lastTime = performance.now();

    const animate = (now: number) => {
      const animId = requestAnimationFrame(animate);
      if (sceneElementsRef.current) {
        sceneElementsRef.current.animFrameId = animId;
      }
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Simulation interpolation
      if (isSimulatingRef.current) {
        const elapsed = (now - simulationStartTimeRef.current) / 1000;
        const duration = 1.0;
        if (elapsed >= duration) {
          isSimulatingRef.current = false;
          isRestingAtAlifRef.current = true;
          morphProgressRef.current = 0.0;
          Object.keys(ALIF_MAKHRAJ_GEARS).forEach(k => {
            currentGearsRef.current[k] = ALIF_MAKHRAJ_GEARS[k];
          });
        } else {
          const tNorm = Math.max(0.0, Math.min(1.0, elapsed / duration));
          const env = 0.5 * (1.0 - Math.cos(2.0 * Math.PI * tNorm));
          morphProgressRef.current = env;
          Object.keys(currentLetter.gears).forEach(k => {
            if (k !== 'upperOpacity' && k !== 'greenPointPos') {
              const alifBase = ALIF_MAKHRAJ_GEARS[k] ?? 0;
              currentGearsRef.current[k] = alifBase + (currentLetter.gears[k] - alifBase) * env;
            }
          });
        }
      } else if (!isRestingAtAlifRef.current) {
        morphProgressRef.current += (1.0 - morphProgressRef.current) * Math.min(1, delta * 12);
        Object.keys(targetGearsRef.current).forEach(k => {
          currentGearsRef.current[k] += (targetGearsRef.current[k] - currentGearsRef.current[k]) * Math.min(1, delta * 10);
        });
      }

      // Deform geometries
      const jawOpenFactor = currentGearsRef.current.jawOpen / 100;
      const tipElevFactor = currentGearsRef.current.tipElevation / 100;
      const tipFwdFactor = currentGearsRef.current.tipForward / 100;
      const istilaFactor = currentGearsRef.current.backIstila / 100;
      const midArchFactor = currentGearsRef.current.middleArch / 100;
      const spreadFactor = currentGearsRef.current.lateralSpread / 100;
      const opacityVal = currentGearsRef.current.upperOpacity / 100;

      upperToothMaterial.opacity = Math.max(0.0, Math.min(1.0, opacityVal));
      upperToothMaterial.transparent = upperToothMaterial.opacity < 0.995;

      lowerJawPivot.rotation.x = jawOpenFactor * 0.30;
      lowerJawPivot.position.y = -jawOpenFactor * 0.04;

      lipsGroup.visible = Boolean(currentLetter.showLips && !showAnatomy);
      if (lipsGroup.visible) {
        updateRealLipsGeometry(currentLetter.lipMode || 'bilabial_closed');
      }

      // Tongue vertices deformation
      const dorsalMode = currentLetter.dorsalMode || 'istila_cup';
      const isWideLateral = (currentLetter.id === 'saad' || (istilaFactor > 0.55 && dorsalMode === 'safir_hook'));
      const isNatiyyah = currentLetter.id === 'taa_heavy' || currentLetter.id === 'daal' || currentLetter.id === 'taa_light';
      const isAlveolar = currentLetter.id === 'laam' || currentLetter.id === 'noon' || currentLetter.id === 'raa';
      const isAlveolarOrNatiyyah = isNatiyyah || isAlveolar;

      const zBack = -0.60;
      const zTipTarget = (dorsalMode === 'dhaad_lateral')
        ? Math.min(0.905, 0.80 + tipFwdFactor * 0.24)
        : (0.78 + tipFwdFactor * 0.25);
      const yTipTopTarget = 0.00 + tipElevFactor * 0.42;

      const posArr = tongueGeom.attributes.position.array as Float32Array;
      const colArr = tongueGeom.attributes.color.array as Float32Array;
      let ptr = 0, cPtr = 0;

      for (let iz = 0; iz <= TONGUE_SEGS_Z; iz++) {
        const s = iz / TONGUE_SEGS_Z;
        const sZ = (s < 0.68) ? s : (0.68 + 0.32 * Math.sin(((s - 0.68) / 0.32) * Math.PI * 0.5));
        const zCenter = zBack + sZ * (zTipTarget - zBack);
        const molarWall = getUpperMolarInnerWallAtZ(zCenter);
        let yTopTarget = 0, yBotTarget = 0;

        if (dorsalMode === 'dhaad_lateral') {
          const backDome = Math.exp(-Math.pow((s - 0.28) / 0.28, 2));
          const midMolarArch = Math.sin(Math.pow(s, 0.58) * Math.PI);
          const frontCurveDrop = 0.052 * Math.pow(Math.max(0.0, (s - 0.56) / 0.44), 1.55);
          yTopTarget = 0.242 + molarWall.speeLift + 0.032 * midMolarArch + 0.056 * istilaFactor * backDome - frontCurveDrop;

          const backRootDrop = -0.37 * Math.pow(Math.max(0.0, (0.36 - s) / 0.36), 1.45);
          const midFloorAttach = -0.26 * Math.exp(-Math.pow((s - 0.34) / 0.22, 2));
          const sublingualArchRecess = 0.115 * Math.exp(-Math.pow((s - 0.72) / 0.14, 2));
          const tipPlumpBottom = (yTopTarget - 0.108) * Math.pow(Math.max(0.0, (s - 0.54) / 0.46), 1.25);
          const baseUnderCurve = -0.095 + backRootDrop + midFloorAttach + sublingualArchRecess - jawOpenFactor * 0.04 * (1.0 - s * 0.6);
          const tipBlend = Math.pow(Math.max(0.0, (s - 0.58) / 0.42), 1.35);
          yBotTarget = baseUnderCurve * (1.0 - tipBlend) + tipPlumpBottom * tipBlend;
        } else if (dorsalMode === 'safir_hook') {
          const wHook = Math.pow(Math.max(0.0, (s - 0.70) / 0.30), 1.65);
          const bladeArch = (0.27 + Math.max(0.0, midArchFactor) * 0.07) * Math.exp(-Math.pow((s - 0.60) / 0.27, 2));
          const backIstilaArch = istilaFactor * 0.31 * Math.exp(-Math.pow((s - 0.24) / 0.26, 2));
          yTopTarget = (0.06 + bladeArch + backIstilaArch * 0.78) * (1.0 - wHook) + yTipTopTarget * wHook;
          const backRootDrop = -0.22 * Math.pow(Math.max(0.0, (0.38 - s) / 0.38), 1.4);
          yBotTarget = (-0.16 + backRootDrop + 0.10 * yTopTarget) * (1.0 - wHook) + (yTipTopTarget - 0.115) * wHook;
        } else {
          const uTipRaw = Math.max(0.0, (s - 0.36) / 0.64);
          const wTip = uTipRaw * uTipRaw * (3.0 - 2.0 * uTipRaw);
          const tipApexRoundDrop = isAlveolarOrNatiyyah ? (0.026 * Math.pow(Math.max(0.0, (s - 0.86) / 0.14), 1.85)) : 0.0;
          const natiyyahCushionLift = isNatiyyah ? (0.022 * Math.exp(-Math.pow((s - 0.83) / 0.10, 2))) : 0.0;
          const yBaseLine = 0.04 * (1.0 - wTip) + (yTipTopTarget + natiyyahCushionLift - tipApexRoundDrop) * wTip;

          let dorsalArch = 0;
          if (dorsalMode === 'qaaf_posterior') {
            dorsalArch = istilaFactor * 0.46 * Math.exp(-Math.pow((s - 0.18) / 0.25, 2));
          } else if (dorsalMode === 'kaaf_velar') {
            dorsalArch = (istilaFactor * 0.39 + Math.max(0, midArchFactor) * 0.20) * Math.exp(-Math.pow((s - 0.28) / 0.25, 2));
          } else if (dorsalMode === 'jeem_touch') {
            dorsalArch = Math.max(0, midArchFactor) * 0.54 * Math.exp(-Math.pow((s - 0.54) / 0.26, 2)) + istilaFactor * 0.10 * Math.sin(s * Math.PI);
          } else if (dorsalMode === 'middle_dome') {
            dorsalArch = Math.max(0, midArchFactor) * 0.52 * Math.exp(-Math.pow((s - 0.56) / 0.26, 2)) + istilaFactor * 0.10 * Math.sin(s * Math.PI);
          } else if (dorsalMode === 'neutral') {
            dorsalArch = -0.045 * (1.0 - wTip) + istilaFactor * 0.32 * Math.exp(-Math.pow((s - 0.26) / 0.28, 2));
          } else {
            dorsalArch = istilaFactor * 0.38 * Math.exp(-Math.pow((s - 0.26) / 0.28, 2)) + midArchFactor * 0.15 * Math.sin(s * Math.PI);
          }
          yTopTarget = yBaseLine + dorsalArch;
          const backRootDrop = -0.24 * Math.pow(Math.max(0.0, (0.40 - s) / 0.40), 1.4);
          const sublingualRecess = 0.075 * Math.exp(-Math.pow((s - 0.70) / 0.15, 2));
          yBotTarget = (-0.17 + backRootDrop + sublingualRecess + 0.10 * yTopTarget) * (1.0 - wTip) + (yTipTopTarget - 0.118) * wTip - jawOpenFactor * 0.03;
        }

        const capBack = (iz === 0) ? 0.0 : ((s < 0.07) ? Math.sqrt(Math.max(0.0, 1.0 - Math.pow((0.07 - s) / 0.07, 2))) : 1.0);
        const capTip = (iz === TONGUE_SEGS_Z) ? 0.0 : ((s > 0.85) ? Math.sqrt(Math.max(0.0, 1.0 - Math.pow((s - 0.85) / 0.15, 2.0))) : 1.0);
        const rawHalfThick = Math.max(0.052, 0.5 * (yTopTarget - yBotTarget));
        const halfThick = rawHalfThick * capBack * capTip;
        const yCenter = 0.5 * (yTopTarget + yBotTarget);

        let baseW = (s <= 0.65)
          ? ((0.20 + 0.24 * Math.sin(Math.pow(s / 0.65, 0.65) * Math.PI * 0.65)) * Math.pow(capBack, 0.55))
          : (0.42 * Math.sqrt(Math.max(0.0, 1.0 - Math.pow((s - 0.65) / 0.35, 2.0))));

        if (isAlveolarOrNatiyyah && s > 0.62 && iz < TONGUE_SEGS_Z) {
          const uFront = (s - 0.62) / 0.38;
          const archFitW = isNatiyyah ? 0.31 : 0.34;
          const roundedFrontU = archFitW * Math.sqrt(Math.max(0.0, 1.0 - Math.pow(uFront, 1.95)));
          const blendU = Math.sin(uFront * Math.PI * 0.5);
          baseW = baseW * (1.0 - blendU * 0.55) + Math.max(baseW, roundedFrontU) * (blendU * 0.55);
        }

        let dhaadFrontRoundW = molarWall.inX;
        if (dorsalMode === 'dhaad_lateral') {
          const uAnt = Math.max(0.0, (s - 0.58) / 0.42);
          const horseshoeUWidth = 0.52 * Math.pow(Math.max(0.0, 1.0 - Math.pow(uAnt, 2.15)), 0.44);
          dhaadFrontRoundW = (s <= 0.58)
            ? molarWall.inX
            : Math.max(molarWall.inX, horseshoeUWidth) * (iz === TONGUE_SEGS_Z ? 0.0 : 1.0);
        }

        const halfWidth = (dorsalMode === 'dhaad_lateral')
          ? ((iz === 0 || iz === TONGUE_SEGS_Z) ? 0.0 : (baseW * (1.0 - spreadFactor) + dhaadFrontRoundW * capBack * spreadFactor))
          : ((iz === 0 || iz === TONGUE_SEGS_Z) ? 0.0 : (baseW + spreadFactor * 0.10 * Math.exp(-Math.pow((s - 0.48) / 0.26, 2)) * capTip));

        let dhaadMolarEnv = 0.0;
        if (dorsalMode === 'dhaad_lateral' && s > 0.06 && s < 0.76) {
          const rampIn = Math.min(1.0, (s - 0.06) / 0.08);
          const rampOut = Math.min(1.0, (0.76 - s) / 0.16);
          dhaadMolarEnv = Math.sin(rampIn * Math.PI * 0.5) * Math.sin(rampOut * Math.PI * 0.5) * spreadFactor;
        }

        for (let iu = 0; iu <= TONGUE_SEGS_U; iu++) {
          const theta = (iu / TONGUE_SEGS_U) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);

          let x = cosT * halfWidth;
          let yOffset = sinT * halfThick;
          let zHorseshoeOffset = 0.0;
          let pressMeatFactor = 0.0;

          if (dorsalMode === 'dhaad_lateral') {
            const isRightSide = (cosT < 0);
            const isLeftSide = (cosT > 0);
            const isPressedSide = (dhaadMode === 'both') || (dhaadMode === 'right' && isRightSide) || (dhaadMode === 'left' && isLeftSide);

            const tipSmoothBlend = Math.pow(Math.max(0.0, (s - 0.62) / 0.38), 1.35);
            const molarExtraReach = isPressedSide ? (0.042 * dhaadMolarEnv * (1.0 - tipSmoothBlend)) : (0.006 * dhaadMolarEnv);
            const sideReach = halfWidth + molarExtraReach;

            const molarEdgePower = isPressedSide ? 0.58 : 0.84;
            const frontUArchPower = 0.82;
            const edgePower = (1.0 - tipSmoothBlend) * molarEdgePower + tipSmoothBlend * frontUArchPower;
            const shapedCos = Math.sign(cosT) * Math.pow(Math.abs(cosT), edgePower);
            x = shapedCos * sideReach;

            const latBody = Math.pow(Math.abs(cosT), 0.72) * dhaadMolarEnv * (1.0 - tipSmoothBlend);
            if (isPressedSide) {
              yOffset *= (1.0 + 0.58 * latBody);
              const dorsalSwell = (sinT > -0.30)
                ? (0.028 * Math.sin(Math.max(0.0, (sinT + 0.30) / 1.30) * Math.PI) * latBody)
                : (-0.010 * latBody);
              yOffset += dorsalSwell;
              pressMeatFactor = latBody;
            }

            const frontCurveEnv = Math.pow(Math.max(0.0, (s - 0.52) / 0.48), 1.15);
            yOffset -= 0.018 * frontCurveEnv * (cosT * cosT);
            zHorseshoeOffset = -0.105 * frontCurveEnv * Math.pow(Math.abs(cosT), 1.65) * (0.35 + 0.65 * capTip);

            if (sinT < 0.0) {
              const freeTipSubArch = Math.pow(Math.max(0.0, (s - 0.55) / 0.45), 1.2);
              const midSubRecess = Math.exp(-Math.pow((s - 0.52) / 0.24, 2));
              const underNarrow = 1.0 - (0.22 + 0.18 * midSubRecess + 0.14 * freeTipSubArch) * Math.pow(-sinT, 0.75);
              x *= underNarrow;
              const vaultIndent = 0.038 * Math.sin(Math.max(0.0, (s - 0.42) / 0.58) * Math.PI) * (1.0 - 0.45 * cosT * cosT) * (-sinT);
              yOffset += vaultIndent;
            }
          } else {
            const allowMidConcavity = (dorsalMode === 'safir_hook' || dorsalMode === 'middle_dome');
            const grooveEndS = (dorsalMode === 'safir_hook') ? 0.86 : 0.68;
            const archPresence = (dorsalMode === 'middle_dome')
              ? Math.min(1.0, Math.max(0.0, midArchFactor / 0.85))
              : Math.min(1.0, Math.max(0.0, (midArchFactor + spreadFactor) / 0.90));
            const grooveEnv = (allowMidConcavity && s > 0.10 && s < grooveEndS)
              ? Math.sin(((s - 0.10) / (grooveEndS - 0.10)) * Math.PI) * archPresence
              : 0.0;
            if (sinT > 0.0 && grooveEnv > 0.0) {
              const vWidth = (dorsalMode === 'safir_hook' && isWideLateral) ? 0.42 : 0.32;
              const vSharp = Math.exp(-Math.pow(Math.abs(cosT) / vWidth, 1.45));
              const dipBase = (dorsalMode === 'safir_hook')
                ? (isWideLateral ? 0.16 : 0.105)
                : 0.075;
              const centerDip = Math.min(halfThick * 0.72, dipBase * grooveEnv) * vSharp;
              const shoulderPeak = (dorsalMode === 'safir_hook' && isWideLateral) ? 0.64 : 0.50;
              const liftBase = (dorsalMode === 'safir_hook')
                ? (isWideLateral ? 0.15 : 0.155)
                : 0.13;
              const shoulderLift = liftBase * grooveEnv * Math.exp(-Math.pow((Math.abs(cosT) - shoulderPeak) / 0.30, 2));
              yOffset += (-centerDip + shoulderLift) * sinT;
            }

            if (isAlveolarOrNatiyyah && s > 0.62) {
              const tipZone = Math.sin(((s - 0.62) / 0.38) * Math.PI * 0.5);
              yOffset -= 0.016 * tipZone * (cosT * cosT) * capTip;
              zHorseshoeOffset = -0.052 * tipZone * Math.pow(Math.abs(cosT), 1.80) * capTip;

              if (isNatiyyah && sinT > 0.0) {
                const pressZone = Math.exp(-Math.pow((s - 0.84) / 0.09, 2)) * (1.0 - 0.55 * cosT * cosT);
                x *= (1.0 + 0.065 * pressZone * Math.sin(sinT * Math.PI));
                yOffset += 0.012 * pressZone * Math.sin(sinT * Math.PI * 0.85) * capTip;
                pressMeatFactor = pressZone * 0.75;
              }
            }

            if (sinT < 0.0) {
              const midSubRecess = Math.exp(-Math.pow((s - 0.50) / 0.26, 2));
              const tipRoundRelease = Math.pow(Math.max(0.0, (s - 0.76) / 0.24), 1.4);
              const narrowAmt = (0.20 + 0.16 * midSubRecess) * (1.0 - 0.72 * tipRoundRelease);
              x *= (1.0 - narrowAmt * Math.pow(-sinT, 0.75));
            }
          }

          let targetWy = yCenter + yOffset;

          if (sinT < -0.15 && s < 0.64 && iz > 0 && iz < TONGUE_SEGS_Z) {
            const rootAttachEnv = Math.pow(Math.max(0.0, (0.64 - s) / 0.64), 1.35);
            const downWeight = Math.pow((-sinT - 0.15) / 0.85, 0.85) * rootAttachEnv;
            const deepFloorY = (-0.38 - jawOpenFactor * 0.05 + 0.08 * s) * capBack;
            if (deepFloorY < targetWy) {
              targetWy = targetWy * (1.0 - downWeight * 0.65) + deepFloorY * (downWeight * 0.65);
            }
            const maxRootHalfW = Math.min(halfWidth * 0.82, molarWall.inX * 0.84);
            if (Math.abs(x) > maxRootHalfW) {
              const rootClamp = Math.pow(-sinT, 0.6);
              x = x * (1.0 - rootClamp) + Math.sign(x) * maxRootHalfW * rootClamp;
            }
          }

          let wz = zCenter + zHorseshoeOffset;

          if (dorsalMode === 'dhaad_lateral' && iz > 0 && iz < TONGUE_SEGS_Z) {
            const wallAtVertexZ = getUpperMolarInnerWallAtZ(wz);
            const isRightSide = (cosT < 0);
            const isLeftSide = (cosT > 0);
            const isPressedSide = (dhaadMode === 'both') || (dhaadMode === 'right' && isRightSide) || (dhaadMode === 'left' && isLeftSide);
            const tipSmoothBlend = Math.pow(Math.max(0.0, (s - 0.62) / 0.38), 1.35);
            const allowedArchX = wallAtVertexZ.inX + (isPressedSide ? 0.036 * (1.0 - tipSmoothBlend) : 0.004);
            if (Math.abs(x) > allowedArchX) {
              x = Math.sign(x) * allowedArchX;
            }
          }

          if (dorsalMode !== 'dhaad_lateral' && targetWy > 0.06 && s > 0.52 && iz < TONGUE_SEGS_Z) {
            const elevLock = Math.min(1.0, (targetWy - 0.06) / 0.14);
            const wallAtZ = getUpperMolarInnerWallAtZ(wz);
            const maxAlveolarX = Math.max(0.015, (wallAtZ.inX - 0.006) * (0.25 + 0.75 * capTip));
            const softX = Math.sign(x) * smoothMin(Math.abs(x), maxAlveolarX, 0.028);
            x = x * (1.0 - elevLock) + softX * elevLock;

            const signedTxShelf = Math.max(-1.0, Math.min(1.0, x / 0.32));
            const frontTargetZ = isNatiyyah ? 0.912 : 0.885;
            const maxAlveolarZ = frontTargetZ - 0.175 * (signedTxShelf * signedTxShelf) - (1.0 - capTip) * 0.008;
            const softZ = smoothMin(wz, maxAlveolarZ, 0.022);
            wz = wz * (1.0 - elevLock) + softZ * elevLock;
          }

          // Alif Resting Pose morph
          const zTipAlif = 0.78 + (ALIF_MAKHRAJ_GEARS.tipForward / 100) * 0.25;
          const yTipAlif = (ALIF_MAKHRAJ_GEARS.tipElevation / 100) * 0.42;
          const zAlif = zBack + sZ * (zTipAlif - zBack);
          const uTipAlif = Math.max(0.0, (s - 0.36) / 0.64);
          const wTipAlif = uTipAlif * uTipAlif * (3.0 - 2.0 * uTipAlif);
          const yTopAlif = 0.04 * (1.0 - wTipAlif) + yTipAlif * wTipAlif - 0.045 * (1.0 - wTipAlif);
          const backRootDropAlif = -0.24 * Math.pow(Math.max(0.0, (0.40 - s) / 0.40), 1.4);
          const sublingualRecessAlif = 0.075 * Math.exp(-Math.pow((s - 0.70) / 0.15, 2));
          const yBotAlif = (-0.17 + backRootDropAlif + sublingualRecessAlif + 0.10 * yTopAlif) * (1.0 - wTipAlif) + (yTipAlif - 0.118) * wTipAlif - (ALIF_MAKHRAJ_GEARS.jawOpen / 100) * 0.03;
          const halfThickAlif = Math.max(0.052, 0.5 * (yTopAlif - yBotAlif)) * capBack * capTip;
          const yCenterAlif = 0.5 * (yTopAlif + yBotAlif);
          const halfWidthAlif = (iz === 0 || iz === TONGUE_SEGS_Z) ? 0.0 : (baseW + 0.15 * 0.10 * Math.exp(-Math.pow((s - 0.48) / 0.26, 2)) * capTip);
          let xAlif = cosT * halfWidthAlif;
          if (sinT < 0.0) {
            const midSubRecessAlif = Math.exp(-Math.pow((s - 0.50) / 0.26, 2));
            const tipRoundReleaseAlif = Math.pow(Math.max(0.0, (s - 0.76) / 0.24), 1.4);
            xAlif *= (1.0 - (0.20 + 0.16 * midSubRecessAlif) * (1.0 - 0.72 * tipRoundReleaseAlif) * Math.pow(-sinT, 0.75));
          }
          let wyAlif = yCenterAlif + sinT * halfThickAlif;

          const mProg = morphProgressRef.current;
          x = xAlif + (x - xAlif) * mProg;
          wz = zAlif + (wz - zAlif) * mProg;
          targetWy = wyAlif + (targetWy - wyAlif) * mProg;

          const tipEdgeRoundOff = (s > 0.88 && sinT > 0.0) ? (0.010 * Math.pow((s - 0.88) / 0.12, 1.6) * sinT) : 0.0;
          const palateClearance = (dorsalMode === 'jeem_touch')
            ? 0.001
            : ((dorsalMode === 'middle_dome' || dorsalMode === 'safir_hook') ? 0.002 : 0.005);
          const ceilingY = getPalateCeilingY(x, wz) - palateClearance - tipEdgeRoundOff;
          const clampRadius = (dorsalMode === 'jeem_touch' && s > 0.32 && s < 0.72) ? 0.012 : 0.024;
          const wy = smoothMin(targetWy, ceilingY, clampRadius);

          posArr[ptr++] = x;
          posArr[ptr++] = wy;
          posArr[ptr++] = wz;

          // Tongue Coloring
          const dorsalLight = (sinT >= 0.0) ? (0.78 + 0.22 * Math.pow(sinT, 0.75)) : Math.max(0.28, 0.78 + sinT * 0.52);
          const sublingualArchShadow = (sinT < -0.05) ? (Math.pow(Math.min(1.0, (-0.05 - sinT) / 0.95), 1.1) * (0.34 + 0.16 * Math.sin(s * Math.PI))) : 0.0;
          const molarCushionWave = (s > 0.18 && s < 0.74 && Math.abs(cosT) > 0.45 && sinT > -0.25)
            ? (0.045 * Math.cos(s * 6.5 * Math.PI * 2) * Math.pow((Math.abs(cosT) - 0.45) / 0.55, 0.8)) : 0.0;
          const backSlopeShadow = Math.pow(Math.max(0.0, (0.28 - s) / 0.28), 1.4) * 0.18;
          const shadeT = Math.max(0.24, Math.min(1.02, dorsalLight - sublingualArchShadow - backSlopeShadow + molarCushionWave + pressMeatFactor * 0.05));

          let rT = 0.76 * shadeT;
          let gT = 0.24 * shadeT;
          let bT = 0.28 * shadeT;

          if (showAnatomy) {
            const absC = Math.abs(cosT);
            let zoneRGB = [0.49, 0.23, 0.93];
            if (s > 0.88 && absC < 0.58 && sinT > -0.35) zoneRGB = [0.88, 0.11, 0.28];
            else if (s > 0.68 && absC < 0.66) zoneRGB = [0.02, 0.59, 0.41];
            else if (absC >= 0.58 && s >= 0.16 && s <= 0.84 && sinT > -0.45) zoneRGB = [0.85, 0.47, 0.02];
            else if (s >= 0.36 && s <= 0.68) zoneRGB = [0.15, 0.39, 0.92];

            const anatShade = Math.max(0.34, Math.min(1.06, shadeT * 1.08));
            rT = zoneRGB[0] * anatShade;
            gT = zoneRGB[1] * anatShade;
            bT = zoneRGB[2] * anatShade;
          } else if (showMakhrajColors) {
            const lid = currentLetter.id;
            const absCos = Math.abs(cosT);
            const topMask = Math.max(0.0, Math.min(1.0, (sinT + 0.18) / 0.55));
            const edgeMask = Math.max(0.0, Math.min(1.0, (sinT + 0.38) / 0.55));
            let pW = 0.0, sW = 0.0;

            if (lid === 'dhaad') {
              const isRight = (cosT < 0);
              const isLeft = (cosT > 0);
              const isPressed = (dhaadMode === 'both') || (dhaadMode === 'right' && isRight) || (dhaadMode === 'left' && isLeft);
              const latRim = Math.pow(Math.max(0.0, (absCos - 0.46) / 0.54), 1.15) * dhaadMolarEnv * edgeMask;
              const frontSmoothTip = Math.pow(Math.max(0.0, (s - 0.78) / 0.22), 1.2) * Math.pow(Math.max(0.0, absCos * 0.5 + 0.5), 0.6) * edgeMask;
              const backIstila = Math.exp(-Math.pow((s - 0.32) / 0.16, 2)) * Math.exp(-Math.pow(absCos / 0.45, 2)) * topMask;

              if (isPressed) {
                pW = Math.min(0.92, latRim * 1.15);
                sW = Math.min(0.72, (frontSmoothTip * 0.78 + backIstila * 0.45) * (1.0 - pW));
              } else {
                pW = 0.0;
                sW = Math.min(0.80, latRim * 0.85 + frontSmoothTip * 0.78 + backIstila * 0.45);
              }
            } else if (lid === 'laam') {
              pW = Math.pow(Math.max(0.0, (s - 0.64) / 0.36), 0.85) * edgeMask * 0.90;
            } else if (lid === 'qaaf' || lid === 'kaaf') {
              pW = Math.exp(-Math.pow((s - 0.22) / 0.12, 2)) * topMask * 0.90;
            } else if (lid === 'jeem') {
              const zEnv = Math.exp(-Math.pow((s - 0.54) / 0.11, 2));
              const xCenter = Math.exp(-Math.pow(absCos / 0.62, 2));
              pW = zEnv * xCenter * topMask * 0.92;
              sW = zEnv * (1.0 - xCenter * 0.7) * topMask * 0.58;
            } else if (lid === 'sheen') {
              const zEnv = Math.exp(-Math.pow((s - 0.56) / 0.14, 2));
              const latShoulders = Math.exp(-Math.pow((absCos - 0.62) / 0.22, 2));
              const centerChannel = Math.exp(-Math.pow((s - 0.62) / 0.18, 2)) * Math.exp(-Math.pow(absCos / 0.36, 2));
              pW = zEnv * latShoulders * topMask * 0.88;
              sW = centerChannel * topMask * 0.78 * (1.0 - pW);
            } else if (lid === 'yaa_cons') {
              const zEnv = Math.exp(-Math.pow((s - 0.55) / 0.12, 2));
              const latShoulders = Math.exp(-Math.pow((absCos - 0.58) / 0.22, 2));
              const centerChannel = zEnv * Math.exp(-Math.pow(absCos / 0.30, 2));
              pW = zEnv * latShoulders * topMask * 0.86;
              sW = centerChannel * topMask * 0.74 * (1.0 - pW);
            } else if (isNatiyyah) {
              const pressCore = Math.exp(-Math.pow((s - 0.86) / 0.11, 2)) * Math.exp(-Math.pow(absCos / 0.72, 2));
              pW = pressCore * topMask * 0.92;
              const cushionHalo = Math.pow(Math.max(0.0, (s - 0.72) / 0.28), 0.9) * edgeMask * 0.65;
              sW = cushionHalo * (1.0 - pW);
            } else if (lid === 'saad' || lid === 'zaay' || lid === 'seen') {
              const tipApex = Math.pow(Math.max(0.0, (s - 0.89) / 0.11), 1.1) * Math.exp(-Math.pow(absCos / 0.56, 2));
              const shoulderCenter = (lid === 'saad') ? 0.62 : 0.52;
              const bladeShoulders = Math.exp(-Math.pow((s - 0.60) / 0.14, 2)) * Math.exp(-Math.pow((absCos - shoulderCenter) / 0.20, 2));
              const whistleGroove = Math.exp(-Math.pow((s - 0.68) / 0.20, 2)) * Math.exp(-Math.pow(absCos / 0.32, 2));
              const backIstila = (lid === 'saad') ? (Math.exp(-Math.pow((s - 0.25) / 0.14, 2)) * topMask * 0.65) : 0.0;
              pW = Math.min(0.90, (tipApex + bladeShoulders) * topMask * 0.90);
              sW = Math.min(0.82, (whistleGroove * topMask * 0.82 + backIstila) * (1.0 - pW));
            } else if (lid === 'thaa_heavy' || lid === 'dhaal_zaa' || lid === 'thaa_light') {
              const pressCore = Math.exp(-Math.pow((s - 0.88) / 0.09, 2)) * Math.exp(-Math.pow(absCos / 0.68, 2));
              pW = pressCore * topMask * 0.90;
              const cushionHalo = Math.pow(Math.max(0.0, (s - 0.76) / 0.24), 0.95) * edgeMask * 0.62;
              sW = cushionHalo * (1.0 - pW);
            }

            pW *= mProg;
            sW *= mProg;
            rT = rT * (1.0 - pW - sW) + 0.04 * pW + 0.48 * sW;
            gT = gT * (1.0 - pW - sW) + 0.46 * pW + 0.92 * sW;
            bT = bT * (1.0 - pW - sW) + 0.16 * pW + 0.60 * sW;
          }

          colArr[cPtr++] = rT;
          colArr[cPtr++] = gT;
          colArr[cPtr++] = bT;
        }
      }

      tongueGeom.attributes.position.needsUpdate = true;
      tongueGeom.attributes.color.needsUpdate = true;
      updatePalateMakhrajColors(morphProgressRef.current);
      tongueGeom.computeVertexNormals();

      // Smooth camera transition back to default position if animating
      if (camAnimRef.current) {
        const elapsed = performance.now() - camAnimRef.current.startTime;
        const tNorm = Math.min(1.0, elapsed / camAnimRef.current.duration);
        const ease = tNorm < 0.5 ? 2 * tNorm * tNorm : -1 + (4 - 2 * tNorm) * tNorm;
        spherical.radius = camAnimRef.current.startRadius + (DEFAULT_CAM.radius - camAnimRef.current.startRadius) * ease;
        spherical.theta = camAnimRef.current.startTheta + (camAnimRef.current.targetTheta - camAnimRef.current.startTheta) * ease;
        spherical.phi = camAnimRef.current.startPhi + (DEFAULT_CAM.phi - camAnimRef.current.startPhi) * ease;
        spherical.target.copy(DEFAULT_CAM.target);
        updateCamPos();

        if (tNorm >= 1.0) {
          camAnimRef.current = null;
          spherical.theta = DEFAULT_CAM.theta;
          spherical.radius = DEFAULT_CAM.radius;
          spherical.phi = DEFAULT_CAM.phi;
          spherical.target.copy(DEFAULT_CAM.target);
          updateCamPos();
        }
      }

      // Update 3D anatomy callouts
      if (showAnatomy) {
        anatomyGroup.visible = true;
        const curW = container.clientWidth || 640;
        const curH = container.clientHeight || 420;
        const upVec = new THREE.Vector3(0, 1, 0);

        calloutItems.forEach(entry => {
          const { data, group3D, anchorDot, shaftMesh, coneMesh, airNode, badgeEl } = entry;
          group3D.visible = true;

          const targetPos = data.getTarget();
          const airPos = targetPos.clone().add(data.offset);
          const dirVec = targetPos.clone().sub(airPos);
          const totalLen = dirVec.length();
          const dirNorm = dirVec.clone().normalize();

          anchorDot.position.copy(targetPos);
          airNode.position.copy(airPos);

          const conePos = targetPos.clone().sub(dirNorm.clone().multiplyScalar(0.038));
          coneMesh.position.copy(conePos);
          coneMesh.quaternion.setFromUnitVectors(upVec, dirNorm);

          const shaftLen = Math.max(0.02, totalLen - 0.065);
          const shaftMid = airPos.clone().add(dirNorm.clone().multiplyScalar(shaftLen * 0.5));
          shaftMesh.position.copy(shaftMid);
          shaftMesh.scale.set(1, shaftLen, 1);
          shaftMesh.quaternion.setFromUnitVectors(upVec, dirNorm);

          const projected = airPos.clone().project(camera);
          if (projected.z > 1.0) {
            badgeEl.style.display = 'none';
          } else {
            const sx = Math.max(60, Math.min(curW - 60, (projected.x * 0.5 + 0.5) * curW));
            const sy = Math.max(20, Math.min(curH - 20, (-projected.y * 0.5 + 0.5) * curH));
            badgeEl.style.display = 'flex';
            badgeEl.style.left = `${sx}px`;
            badgeEl.style.top = `${sy}px`;
          }
        });
      } else {
        anatomyGroup.visible = false;
        calloutItems.forEach(e => { e.badgeEl.style.display = 'none'; });
      }

      renderer.render(scene, camera);
    };

    const animId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('touchmove', onTouchMove);
      domEl.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      if (domEl.parentNode) {
        domEl.parentNode.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, [resolvedTheme, currentLetter, dhaadMode, showAnatomy, showMakhrajColors, lang]);

  // Sync mesh visibilities
  useEffect(() => {
    if (!sceneElementsRef.current) return;
    const { hardPalateMesh, softPalateMesh, alveolarArcMesh, upperTeethGroup, lowerTeethGroup } = sceneElementsRef.current;
    hardPalateMesh.visible = showPalate;
    softPalateMesh.visible = showPalate;
    alveolarArcMesh.visible = showPalate;
    upperTeethGroup.visible = showUpperTeeth;
    lowerTeethGroup.visible = showLowerTeeth;
  }, [showPalate, showUpperTeeth, showLowerTeeth]);

  // Opacity slider sync
  useEffect(() => {
    targetGearsRef.current.upperOpacity = upperTeethOpacity;
    setGears(prev => (prev.upperOpacity === upperTeethOpacity ? prev : { ...prev, upperOpacity: upperTeethOpacity }));
  }, [upperTeethOpacity]);

  // Translations object
  const t = useMemo(() => {
    if (lang === 'ar') {
      return {
        studioTitle: 'استوديو التجويد ثلاثي الأبعاد',
        anatomy: 'أقسام الفم',
        selectLetter: 'اختر الحرف:',
        simulate: 'محاكاة الحركة (ألف ← المخرج)',
        resetView: 'إعادة العرض',
        makhrajColors: 'ألوان المخرج',
        palate: 'الحنك',
        upperTeeth: 'الأسنان العليا',
        lowerTeeth: 'الأسنان السفلى',
        dhaadVariants: 'أوجه نطق الضاد الثلاثة:',
        dhaadRight: '١. ضغط الأضراس اليمنى',
        dhaadLeft: '٢. ضغط الأضراس اليسرى',
        dhaadBoth: '٣. ضغط الأضراس معاً',
        shajariyyahNotice: 'الحروف الشجرية (وسط اللسان):',
        jeemLabel: '١. الجيم (قفل تام)',
        sheenLabel: '٢. الشين (فرجة التفشي)',
        yaaLabel: '٣. الياء (تضيق المخرج)',
        controls: 'التحكم الحركي في أعضاء النطق',
        reset: 'وضع السكون',
        firmPress: 'ضغط قوي',
        gentleTouch: 'تلامس لطيف',
        gumShelfBadge: 'اللثة ومقدم الحنك',
        tongueBadge: 'اللسان',
        toggleLanguage: 'English'
      };
    }
    return {
      studioTitle: '3D Tajweed Studio',
      anatomy: 'Anatomy Parts (أقسام الفم)',
      selectLetter: 'Letter (الحرف):',
      simulate: 'Simulate Motion (ألف ← المخرج)',
      resetView: 'Reset View',
      makhrajColors: 'Makhraj Marks',
      palate: 'Palate',
      upperTeeth: 'Upper Teeth',
      lowerTeeth: 'Lower Teeth',
      dhaadVariants: 'Letter Zad / Dhaad (ض) — 3 Articulation Variants:',
      dhaadRight: '1. Press Right Molars (يمين)',
      dhaadLeft: '2. Press Left Molars (يسار)',
      dhaadBoth: '3. Press Both Molars (كلاهما)',
      shajariyyahNotice: 'Middle Tongue Letters (الحروف الشجرية):',
      jeemLabel: '1. Jeem (ج) — 0.0 mm Seal (قفل تام)',
      sheenLabel: '2. Sheen (ش) — ~3.2 mm Gap (تفشٍّ)',
      yaaLabel: '3. Yaa (ي) — ~1.6 mm Arch (رخاوة)',
      controls: 'Mechanical Articulation Controls (التحكم بالمخرج)',
      reset: 'Neutral Pose',
      firmPress: 'Firm Press (ضغط)',
      gentleTouch: 'Gentle Touch (تلامس لطيف)',
      gumShelfBadge: 'Gum Shelf (اللثة)',
      tongueBadge: 'Tongue (اللسان)',
      toggleLanguage: 'عربي'
    };
  }, [lang]);

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 flex flex-col relative selection:bg-emerald-500 selection:text-white ${lang === 'ar' ? 'font-serif' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-950/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-sky-200/30 dark:bg-sky-950/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-950/20 rounded-full blur-[140px]" />
      </div>

      <main className="flex-1 max-w-[1500px] w-full mx-auto px-3 sm:px-5 py-4 flex flex-col gap-3 relative z-10">

        {/* Clean Studio Header */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-3">
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {t.studioTitle}
          </h1>

          {/* Language Toggle Button */}
          <button
            onClick={handleToggleLang}
            title={lang === 'en' ? 'Switch to Arabic (العربية)' : 'التبديل إلى الإنجليزية'}
            aria-label="Language Toggle"
            className="px-3.5 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <Globe className="w-4 h-4" />
            <span>{t.toggleLanguage}</span>
          </button>
        </div>

        {/* Desktop 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

          {/* Left Column (Desktop): Letter Selection + 3D Viewport + 2 Divs under 3D */}
          <div className="lg:col-span-7 flex flex-col gap-3">

            {/* 22 Arabic Letters Bar (in mouth order: from Qaaf ق to Waw و) */}
            <section className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-2.5 sm:p-3 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider text-[11px]">
                  {t.selectLetter}
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {LETTER_PRESETS.map(preset => {
                  const isSelected = preset.id === currentLetter.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => selectLetter(preset)}
                      className={`px-3 py-1.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shrink-0 border active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20 scale-105'
                          : 'bg-slate-100/80 dark:bg-gray-800/80 text-slate-700 dark:text-gray-300 border-slate-200/60 dark:border-gray-700 hover:bg-slate-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="arabic-font text-lg leading-none font-bold">{preset.letter}</span>
                      <span className="text-xs">{preset.tag.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3D Viewport Section (Immediately after Letter Selection Tab) */}
            <section className="flex flex-col gap-2">

              {/* 3D Canvas Container */}
              <div className="bg-slate-100 dark:bg-gray-950 rounded-3xl overflow-hidden shadow-inner border border-slate-200/80 dark:border-gray-800 relative w-full h-[360px] sm:h-[420px] lg:h-[460px]">
                <div
                  ref={containerRef}
                  className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
                >
                  <div ref={overlayRef} className="pointer-events-none absolute inset-0 overflow-hidden z-10" />
                </div>
              </div>

              {/* Div 1 under 3D Section: Viewport Toggles Toolbar */}
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Anatomy Parts Toggle Button */}
                  <button
                    onClick={() => setShowAnatomy(!showAnatomy)}
                    className={`px-3 py-1.5 rounded-2xl font-bold border transition-all flex items-center gap-1.5 ${
                      showAnatomy
                        ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:bg-slate-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{t.anatomy}</span>
                  </button>

                  <button
                    onClick={() => setShowMakhrajColors(!showMakhrajColors)}
                    className={`px-3 py-1.5 rounded-2xl font-bold border transition-all flex items-center gap-1.5 ${
                      showMakhrajColors
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-gray-700'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>{t.makhrajColors}</span>
                  </button>

                  <button
                    onClick={() => setShowPalate(!showPalate)}
                    className={`px-3 py-1.5 rounded-2xl font-bold border transition-all flex items-center gap-1.5 ${
                      showPalate
                        ? 'bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-white border-slate-300 dark:border-gray-700'
                        : 'opacity-50 border-transparent text-slate-400'
                    }`}
                  >
                    <span>{t.palate}</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800 px-2.5 py-1 rounded-2xl border border-slate-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowUpperTeeth(!showUpperTeeth)}
                      className="font-bold flex items-center gap-1 text-slate-700 dark:text-gray-300"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.upperTeeth}</span>
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={upperTeethOpacity}
                      onChange={(e) => setUpperTeethOpacity(parseInt(e.target.value, 10))}
                      className="w-14 accent-emerald-500 cursor-pointer"
                      title="Upper Teeth Opacity"
                    />
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{upperTeethOpacity}%</span>
                  </div>

                  <button
                    onClick={() => setShowLowerTeeth(!showLowerTeeth)}
                    className={`px-3 py-1.5 rounded-2xl font-bold border transition-all flex items-center gap-1.5 ${
                      showLowerTeeth
                        ? 'bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-white border-slate-300 dark:border-gray-700'
                        : 'opacity-50 border-transparent text-slate-400'
                    }`}
                  >
                    <span>{t.lowerTeeth}</span>
                  </button>
                </div>

                {/* Quick reset camera view */}
                <button
                  onClick={() => resetCameraToDefault(true)}
                  className="px-2.5 py-1.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-gray-700 transition-all flex items-center gap-1 font-bold text-xs"
                  title={t.resetView}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.resetView}</span>
                </button>
              </div>

              {/* Div 2 under 3D Section: Minimal Color Guide */}
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-gray-300 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-[#0d6828] border border-emerald-400"></span>
                    <span>{t.firmPress}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-[#7be89a] border border-emerald-200"></span>
                    <span>{t.gentleTouch}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-[#eab368] border border-yellow-200"></span>
                    <span>{t.gumShelfBadge}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-[#8c3246]"></span>
                    <span>{t.palate}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-[#b83b44]"></span>
                    <span>{t.tongueBadge}</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {lang === 'ar' ? 'سحب للتدوير • عجلة للتقريب' : 'Drag to rotate • Wheel to zoom'}
                </span>
              </div>

            </section>

          </div>

          {/* Right Column (Desktop): Selected Letter Info & Controls */}
          <div className="lg:col-span-5 flex flex-col gap-3">

            {/* Selected Letter Information (Small, Compact Space) */}
            <section className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-3.5 sm:p-4 shadow-sm flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center arabic-font text-2xl font-bold text-indigo-600 dark:text-indigo-400 shrink-0 select-none shadow-sm">
                    {currentLetter.letter}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {lang === 'ar' ? currentLetter.ar.title : currentLetter.en.title}
                      </h2>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                        currentLetter.isHeavy
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                      }`}>
                        {lang === 'ar' ? currentLetter.ar.sifah : currentLetter.en.sifah}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      {lang === 'ar' ? currentLetter.ar.zoneLabel : currentLetter.en.zoneLabel}
                    </span>
                  </div>
                </div>

                {/* Simulate Motion Action Button */}
                <button
                  onClick={triggerSimulation}
                  className="py-2 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 active:scale-95 shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{t.simulate}</span>
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-gray-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-gray-700/60">
                {lang === 'ar' ? currentLetter.ar.desc : currentLetter.en.desc}
              </p>

              {/* Zad (ض) 3 Variants Pill Switcher */}
              {currentLetter.id === 'dhaad' && (
                <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-2 flex flex-col gap-1.5 shadow-sm">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 px-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.dhaadVariants}</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setDhaadMode('right')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        dhaadMode === 'right'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white/80 dark:bg-gray-900/80 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-800'
                      }`}
                    >
                      {t.dhaadRight}
                    </button>
                    <button
                      onClick={() => setDhaadMode('left')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        dhaadMode === 'left'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white/80 dark:bg-gray-900/80 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-800'
                      }`}
                    >
                      {t.dhaadLeft}
                    </button>
                    <button
                      onClick={() => setDhaadMode('both')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        dhaadMode === 'both'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white/80 dark:bg-gray-900/80 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-800'
                      }`}
                    >
                      {t.dhaadBoth}
                    </button>
                  </div>
                </div>
              )}

              {/* Shajariyyah (ج ، ش ، ي) 3 Letters Compare */}
              {(currentLetter.id === 'jeem' || currentLetter.id === 'sheen' || currentLetter.id === 'yaa_cons') && (
                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800/80 rounded-2xl p-2 flex flex-col gap-1.5 shadow-sm">
                  <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5 px-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.shajariyyahNotice}</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        const p = LETTER_PRESETS.find(l => l.id === 'jeem');
                        if (p) selectLetter(p);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        currentLetter.id === 'jeem'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white/80 dark:bg-gray-900/80 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-800'
                      }`}
                    >
                      {t.jeemLabel}
                    </button>
                    <button
                      onClick={() => {
                        const p = LETTER_PRESETS.find(l => l.id === 'sheen');
                        if (p) selectLetter(p);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        currentLetter.id === 'sheen'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-white/80 dark:bg-gray-900/80 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-800'
                      }`}
                    >
                      {t.sheenLabel}
                    </button>
                    <button
                      onClick={() => {
                        const p = LETTER_PRESETS.find(l => l.id === 'yaa_cons');
                        if (p) selectLetter(p);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        currentLetter.id === 'yaa_cons'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white/80 dark:bg-gray-900/80 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-800'
                      }`}
                    >
                      {t.yaaLabel}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Collapsible Mechanical Controls Accordion */}
            <section className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden transition-all">
              <div
                onClick={() => setIsGearsOpen(!isGearsOpen)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.controls}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetGears();
                    }}
                    className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.reset}</span>
                  </button>
                  <div className="text-slate-400">
                    {isGearsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {isGearsOpen && (
                <div className="p-4 pt-1 border-t border-slate-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {GEAR_DEFINITIONS.map(def => {
                    const val = Math.round(gears[def.key] ?? 0);
                    return (
                      <div key={def.key} className="bg-slate-50 dark:bg-gray-800/60 border border-slate-200/60 dark:border-gray-700 p-2.5 rounded-2xl flex flex-col justify-between gap-1.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">
                            {lang === 'ar' ? def.ar : def.en}
                          </span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-800 dark:text-white">
                            {val}{def.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGearChange(def.key, Math.max(def.min, val - def.step))}
                            className="w-7 h-7 rounded-xl bg-white dark:bg-gray-900 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-gray-300 font-black text-xs border border-slate-200 dark:border-gray-700 flex items-center justify-center transition-all"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min={def.min}
                            max={def.max}
                            step={def.step}
                            value={val}
                            onChange={(e) => handleGearChange(def.key, parseInt(e.target.value, 10))}
                            className="flex-1 accent-emerald-500 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => handleGearChange(def.key, Math.min(def.max, val + def.step))}
                            className="w-7 h-7 rounded-xl bg-white dark:bg-gray-900 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-gray-300 font-black text-xs border border-slate-200 dark:border-gray-700 flex items-center justify-center transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>

        </div>

      </main>
    </div>
  );
}

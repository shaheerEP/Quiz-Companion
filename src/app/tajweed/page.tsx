"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/context/ThemeContext";
import { playLetterAudio, stopLetterAudio, preloadLetterAudio, isLetterAudioPlaying } from "@/components/tajweed/CleanLetterAudio";
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
  ChevronUp,
  X,
  Compass,
  ExternalLink
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
  ml?: {
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
      sifah: 'Heavy (Echoing)'
    },
    ar: {
      title: 'مخرج حرف القاف (ق)',
      category: 'أقصى اللسان مع الحنك اللحمي',
      zoneLabel: 'الحنك اللحمي الرخو',
      desc: 'يرتفع أقصى اللسان ليصطدم بقوة بالحنك اللحمي، بينما يستقر طرف اللسان خلف الثنايا السفلى.',
      sifah: 'مفخم (استعلاء وقلقلة)'
    },
    ml: {
      title: 'ഖാഫ് (ق) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ മുരട് (അണ്ണാക്ക്)',
      zoneLabel: 'മൃദു അണ്ണാക്ക്',
      desc: 'നാവിന്റെ ഏറ്റവും പിന്നിലെ മുരട് മേലണ്ണാക്കിലെ മൃദുവായ മാംസഭാഗത്ത് ശക്തിയായി തട്ടുമ്പോൾ പുറപ്പെടുന്നു. നാവിന്റെ തുമ്പ് കീഴ്പല്ലുകൾക്ക് പിന്നിൽ സ്ഥിതിചെയ്യുന്നു.',
      sifah: 'കനം (മുഴക്കം)'
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
      sifah: 'Light (Whisper)'
    },
    ar: {
      title: 'مخرج حرف الكاف (ك)',
      category: 'أقصى اللسان مع الحنك العظمي واللحمي',
      zoneLabel: 'منطقة التقاء الحنك العظمي واللحمي',
      desc: 'يرتفع أقصى اللسان تحت مخرج القاف قليلاً ليلتقي بين الحنكين العظمي واللحمي مع جريان النفس (همس).',
      sifah: 'مرقق (استفال وهمس)'
    },
    ml: {
      title: 'കാഫ് (ك) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ മുരട്',
      zoneLabel: 'മൃദു-കഠിന അണ്ണാക്കുകളുടെ സന്ധി',
      desc: 'നാവിന്റെ മുരട് ഖാഫിനേക്കാൾ അല്പം താഴെയായി ഉറച്ചതും മൃദുവായതുമായ അണ്ണാക്കിന്റെ സന്ധിയിൽ തട്ടി ശ്വാസം ഒഴുക്കി (ഹംസ്) പുറപ്പെടുന്നു.',
      sifah: 'നേർത്തത് (ശ്വാസം)'
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
      sifah: 'Light (Echoing)'
    },
    ar: {
      title: 'مخرج حرف الجيم (ج)',
      category: 'وسط اللسان مع وسط الحنك الأعلى',
      zoneLabel: 'انغلاق تام للمخرج (جهر وشدة وقلقلة)',
      desc: 'يرتفع وسط اللسان ويلتصق تماماً بسقف الحنك العظمي مغلقاً المخرج (فجوة 0 مم) ثم ينفك باضطراب (قلقلة).',
      sifah: 'مرقق (شدة وقلقلة)'
    },
    ml: {
      title: 'ജീം (ج) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ മധ്യഭാഗം',
      zoneLabel: 'മേലണ്ണാക്കിൽ പൂർണ്ണ അടയൽ',
      desc: 'നാവിന്റെ മധ്യഭാഗം മേലണ്ണാക്കിൽ പൂർണ്ണമായി അമർന്ന് വായു തടഞ്ഞുനിർത്തി പെട്ടെന്ന് തുറന്ന് (ഖൽഖലത്തോടെ) ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (മുഴക്കം)'
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
      sifah: 'Light (Diffusion)'
    },
    ar: {
      title: 'مخرج حرف الشين (ش)',
      category: 'وسط اللسان مع التفشي والهمس',
      zoneLabel: 'فرجة وسطية واسعة لانتشار الهواء',
      desc: 'يرتفع وسط اللسان مع تلامس حافتيه بالحنك وتكون قناة وسطية متسعة يتدفق عبرها الهواء منتشراً نحو الأسنان (تفشٍّ).',
      sifah: 'مرقق (تفشٍّ ورخاوة)'
    },
    ml: {
      title: 'ശീൻ (ش) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ മധ്യഭാഗം',
      zoneLabel: 'വായു പരക്കുന്ന ഭാഗം',
      desc: 'നാവിന്റെ മധ്യഭാഗം ഉയർന്ന് അണ്ണാക്കിലേക്ക് വായു പരന്ന് മുൻപല്ലുകൾ വരെ ഒഴുകി ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (കാറ്റ് പരക്കൽ)'
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
      sifah: 'Light (Soft)'
    },
    ar: {
      title: 'مخرج حرف الياء غير المدية (ي)',
      category: 'وسط اللسان مع الجهر والرخاوة',
      zoneLabel: 'تضيق صوتي سلس بلا انغلاق',
      desc: 'يرتفع وسط اللسان مقترباً من الحنك العظمي دون إغلاقه، فيمر الصوت مجهوراً رخواً بسلاسة ولين.',
      sifah: 'مرقق (رخاوة ولين)'
    },
    ml: {
      title: 'യാഅ് (ي) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ മധ്യഭാഗം',
      zoneLabel: 'അണ്ണാക്കിലേക്ക് ഉയരൽ',
      desc: 'നാവിന്റെ മധ്യഭാഗം മേലണ്ണാക്കിലേക്ക് പൂർണ്ണമായി അടയാതെ ഉയർന്ന് ശബ്ദം മൃദുവായി ഒഴുക്കി ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (മൃദുവായത്)'
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
      sifah: 'Heavy (Elongation)'
    },
    ar: {
      title: 'مخرج حرف الضاد (ض)',
      category: 'حافة اللسان مع الأضراس العليا',
      zoneLabel: 'ضغط حافة اللسان مع تلامس لطيف لطرفه بالأسنان',
      desc: 'تضغط إحدى حافتي اللسان أو كلاهما بقوة على الأضراس العليا، بينما يلامس طرف اللسان المستدير الثنايا العليا بلطف دون ضغط.',
      sifah: 'مفخم (استعلاء واستطالة)'
    },
    ml: {
      title: 'ളാദ് (ض) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ അരികും അണപ്പല്ലുകളും',
      zoneLabel: 'അണപ്പല്ലുകളിൽ അമർത്തൽ',
      desc: 'നാവിന്റെ ഒന്നോ രണ്ടോ അരികുകൾ മേൽ അണപ്പല്ലുകളിൽ ശക്തിയായി അമരുമ്പോൾ നാവിന്റെ തുമ്പ് മുൻപല്ലുകളിൽ അമർത്താതെ മൃദുവായി തൊടുന്നു.',
      sifah: 'കനം (നീളൽ)'
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
      sifah: 'Light (Drift)'
    },
    ar: {
      title: 'مخرج حرف اللام (ل)',
      category: 'أدنى حافتي اللسان إلى منتهى طرفه',
      zoneLabel: 'اللثة ومقدم الحنك المسطح',
      desc: 'ينحني أدنى حافتي اللسان مع طرفه ليلتصق بلثة الأسنان العليا ومقدم الحنك المسطح، مع انحراف الصوت جانبياً.',
      sifah: 'مرقق (انحراف وتوسط)'
    },
    ml: {
      title: 'ലാം (ل) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ അരികും തുമ്പും',
      zoneLabel: 'മേൽപല്ലുകളുടെ മോണ',
      desc: 'നാവിന്റെ അരികിന്റെ അറ്റം മുതൽ മുൻതുമ്പ് വരെ മുൻപല്ലുകളുടെ മോണയിൽ തട്ടുമ്പോൾ ശബ്ദം ഇരുവശങ്ങളിലൂടെയും ഒഴുകുന്നു.',
      sifah: 'നേർത്തത് (ചായൽ)'
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
      sifah: 'Light (Nasal)'
    },
    ar: {
      title: 'مخرج حرف النون (ن)',
      category: 'طرف اللسان مع لثة الثنايا والغنة',
      zoneLabel: 'لثة الثنايا العليا مع الخيشوم',
      desc: 'ينقفل طرف اللسان على لثة الثنايا العليا بينما يخرج الصوت من التجويف الأنفي بغنة رنانة.',
      sifah: 'مرقق (غنة وتوسط)'
    },
    ml: {
      title: 'നൂൻ (ن) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ തുമ്പും മൂക്കും',
      zoneLabel: 'മേൽ മുൻപല്ലുകളുടെ മോണ',
      desc: 'നാവിന്റെ തുമ്പ് മേൽ മുൻപല്ലുകളുടെ മോണയിൽ മുട്ടി നിൽക്കുമ്പോൾ ശബ്ദം മൂക്കിലൂടെ മുഴങ്ങുന്നു.',
      sifah: 'നേർത്തത് (മൂക്കിലൂടെയുള്ള ശബ്ദം)'
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
      sifah: 'Heavy / Light'
    },
    ar: {
      title: 'مخرج حرف الراء (ر)',
      category: 'طرف اللسان وظهره مع لثة الثنايا',
      zoneLabel: 'لثة الثنايا العليا مع فرجة التكرير',
      desc: 'يقرع طرف اللسان وظهره لثة الثنايا مع بقاء فرجة دقيقة جداً بالوسط لمنع تكرار الراء الزائد.',
      sifah: 'مفخم (انحراف وتكرير)'
    },
    ml: {
      title: 'റാഅ് (ر) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ തുമ്പിന്റെ പുറംഭാഗം',
      zoneLabel: 'മേൽ മുൻപല്ലുകളുടെ മോണ',
      desc: 'നാവിന്റെ തുമ്പിന്റെ പുറംഭാഗം മേൽ മോണയിൽ തട്ടുന്നു. നടുവിലെ നേർത്ത വിടവ് വഴി അമിതമായ വിറയൽ ഒഴിവാക്കുന്നു.',
      sifah: 'കനം / നേർത്തത് (വിറയൽ ഒഴിവാക്കൽ)'
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
      sifah: 'Heavy'
    },
    ar: {
      title: 'مخرج حرف الطاء (ط)',
      category: 'الحروف النطعية - أصول الثنايا العليا',
      zoneLabel: 'أصول الثنايا العليا مع الإطباق',
      desc: 'ينضغط طرف اللسان العريض المستدير عند منابت الثنايا العليا ولثتها مع إطباق واستعلاء أقصى اللسان وقلقلة.',
      sifah: 'مفخم (إطباق وقلقلة)'
    },
    ml: {
      title: 'ത്വാഅ് (ط) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ തുമ്പും പല്ലിന്റെ വേരും',
      zoneLabel: 'മേൽ മുൻപല്ലുകളുടെ വേരുകൾ',
      desc: 'നാവിന്റെ വീതിയുള്ള തുമ്പ് മേൽ മുൻപല്ലുകളുടെ വേരുകളിൽ ശക്തിയായി അമരുമ്പോൾ നാവ് മുഴുവനായി അണ്ണാക്കിലേക്ക് ചേരുന്നു.',
      sifah: 'കനം (മുഴക്കം)'
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
      sifah: 'Light (Echoing)'
    },
    ar: {
      title: 'مخرج حرف الدال (د)',
      category: 'الحروف النطعية - أصول الثنايا العليا',
      zoneLabel: 'أصول الثنايا العليا',
      desc: 'يلامس طرف اللسان المستدير منابت الثنايا العليا مع انحباس الصوت والنفس ثم انطلاقه بقلقلة مجهورة.',
      sifah: 'مرقق (جهر وقلقلة)'
    },
    ml: {
      title: 'ദാൽ (د) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ തുമ്പും പല്ലിന്റെ വേരും',
      zoneLabel: 'മേൽ മുൻപല്ലുകളുടെ വേരുകൾ',
      desc: 'നാവിന്റെ തുമ്പ് മേൽ മുൻപല്ലുകളുടെ വേരുകളിൽ തട്ടി ശബ്ദം തടഞ്ഞ് പെട്ടെന്ന് വിടുമ്പോൾ ഖൽഖലത്തുണ്ടാകുന്നു.',
      sifah: 'നേർത്തത് (ഖൽഖലത്ത്)'
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
      sifah: 'Light (Whisper)'
    },
    ar: {
      title: 'مخرج حرف التاء (ت)',
      category: 'الحروف النطعية - أصول الثنايا العليا',
      zoneLabel: 'أصول الثنايا العليا مع الهمس',
      desc: 'يقرع طرف اللسان أصول الثنايا العليا مع انحباس الصوت أولاً ثم انفتاحه بجريان لطيف للنفس (همس).',
      sifah: 'مرقق (شدة وهمس)'
    },
    ml: {
      title: 'താഅ് (ت) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ തുമ്പും പല്ലിന്റെ വേരും',
      zoneLabel: 'മേൽ മുൻപല്ലുകളുടെ വേരുകൾ',
      desc: 'നാവിന്റെ തുമ്പ് മേൽ മുൻപല്ലുകളുടെ വേരുകളിൽ തട്ടി മൃദുവായി ശ്വാസം വിട്ടു ഉച്ചരിക്കുന്നു (ഹംസ്).',
      sifah: 'നേർത്തത് (ഹംസ്)'
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
      sifah: 'Heavy (Whistle)'
    },
    ar: {
      title: 'مخرج حرف الصاد (ص)',
      category: 'الحروف الأسلية - أسلة اللسان مع الثنايا',
      zoneLabel: 'الصفير مع الإطباق والاستعلاء',
      desc: 'تستقر أسلة اللسان خلف الثنايا السفلى مع تجويف طولي يمر منه صوت الصفير الحاد المصحوب باستعلاء وإطباق.',
      sifah: 'مفخم (صفير وإطباق)'
    },
    ml: {
      title: 'സ്വാദ് (ص) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ അറ്റം (മുൻപല്ലുകൾ)',
      zoneLabel: 'കീഴ് മുൻപല്ലുകളുടെ ഉൾഭാഗം',
      desc: 'നാവിന്റെ അറ്റം കീഴ് മുൻപല്ലുകൾക്ക് പിന്നിൽ വെച്ച് നാവ് അണ്ണാക്കിലേക്ക് ഉയർത്തി മൂർച്ചയുള്ള വിസിൽ സ്വരത്തോടെ ഉച്ചരിക്കുന്നു.',
      sifah: 'കനം (വിസിൽ)'
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
      sifah: 'Light (Whistle)'
    },
    ar: {
      title: 'مخرج حرف السين (س)',
      category: 'الحروف الأسلية - مجرى الصفير',
      zoneLabel: 'خلف الثنايا السفلى مع الهمس والصفير',
      desc: 'تتوضع أسلة اللسان خلف الثنايا السفلى مفسحة مجرى ضيقاً لصفير رخو مهموس غير مصحوب باستعلاء.',
      sifah: 'مرقق (همس وصفير)'
    },
    ml: {
      title: 'സീൻ (സ) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ അറ്റം',
      zoneLabel: 'കീഴ് മുൻപല്ലുകളുടെ ഉൾഭാഗം',
      desc: 'നാവിന്റെ അറ്റം കീഴ് മുൻപല്ലുകൾക്ക് പിന്നിൽ വെച്ച് ശ്വാസം ഒഴുക്കി നേർത്ത വിസിൽ ശബ്ദത്തോടെ ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (വിസിൽ & ശ്വാസം)'
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
      sifah: 'Light (Whistle)'
    },
    ar: {
      title: 'مخرج حرف الزاي (ز)',
      category: 'الحروف الأسلية - أسلة اللسان',
      zoneLabel: 'خلف الثنايا السفلى مع الجهر والصفير',
      desc: 'تقترب أسلة اللسان من الثنايا السفلى ليمر الهواء بصفير مجهور صافٍ مع ارتجاف الأوتار الصوتية.',
      sifah: 'مرقق (جهر وصفير)'
    },
    ml: {
      title: 'സായ് (ز) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ അറ്റം',
      zoneLabel: 'കീഴ് മുൻപല്ലുകളുടെ ഉൾഭാഗം',
      desc: 'നാവിന്റെ അറ്റം കീഴ് മുൻപല്ലുകൾക്ക് പിന്നിൽ വെച്ച് ശബ്ദം മുഴക്കി വിസിൽ സ്വരത്തോടെ ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (വിസിൽ)'
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
      sifah: 'Heavy'
    },
    ar: {
      title: 'مخرج حرف الظاء (ظ)',
      category: 'الحروف اللثوية - أطراف الثنايا العليا',
      zoneLabel: 'أطراف الثنايا العليا مع الإطباق',
      desc: 'يخرج ظهر طرف اللسان قليلاً ليلتقي برفق بأطراف الثنايا العليا قاطباً، مع استعلاء أقصى اللسان وإطباقه.',
      sifah: 'مفخم (إطباق ورخاوة)'
    },
    ml: {
      title: 'ളാഅ് (ظ) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ തുമ്പും പല്ലിന്റെ അരികും',
      zoneLabel: 'മേൽ മുൻപല്ലുകളുടെ അരികുകൾ',
      desc: 'നാവിന്റെ തുമ്പിന്റെ പുറംഭാഗം മേൽ മുൻപല്ലുകളുടെ അരികുകളിൽ തൊടുമ്പോൾ നാവിന്റെ മുരട് ഉയർന്ന് കനത്തോടെ ഉച്ചരിക്കുന്നു.',
      sifah: 'കനം'
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
      sifah: 'Light (Soft)'
    },
    ar: {
      title: 'مخرج حرف الذال (ذ)',
      category: 'الحروف اللثوية - أطراف الثنايا العليا',
      zoneLabel: 'أطراف الثنايا العليا مع الجهر',
      desc: 'يلامس ظهر طرف اللسان حواف الثنايا العليا مع استرخاء أقصى اللسان وجريان صوت مجهور رخو.',
      sifah: 'مرقق (جهر ورخاوة)'
    },
    ml: {
      title: 'ദാൽ (ذ) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ തുമ്പും പല്ലിന്റെ അരികും',
      zoneLabel: 'മേൽ മുൻപല്ലുകളുടെ അരികുകൾ',
      desc: 'നാവിന്റെ തുമ്പ് മേൽ മുൻപല്ലുകളുടെ അരികുകളിൽ നേർത്തതായി തൊട്ട് ശബ്ദം ഒഴുകി ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (മൃദുവായത്)'
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
      sifah: 'Light (Whisper)'
    },
    ar: {
      title: 'مخرج حرف الثاء (ث)',
      category: 'الحروف اللثوية - أطراف الثنايا العليا',
      zoneLabel: 'أطراف الثنايا العليا مع الهمس',
      desc: 'يلامس طرف اللسان حافتي الثنيتين العلييين بلطف مع تدفق الهواء الرخو المهموس دون ممانعة.',
      sifah: 'مرقق (همس ورخاوة)'
    },
    ml: {
      title: 'ഥാഅ് (ث) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നാവിന്റെ തുമ്പും പല്ലിന്റെ അരികും',
      zoneLabel: 'മേൽ മുൻപല്ലുകളുടെ അരികുകൾ',
      desc: 'നാവിന്റെ തുമ്പ് മേൽ മുൻപല്ലുകളുടെ അരികുകളിൽ തൊട്ട് കാറ്റ് പുറത്തേക്ക് ഒഴുക്കി ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (ഹംസ്)'
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
      sifah: 'Light (Whisper)'
    },
    ar: {
      title: 'مخرج حرف الفاء (ف)',
      category: 'بطن الشفة السفلى مع أطراف الثنايا',
      zoneLabel: 'أطراف الثنايا العليا على باطن الشفة',
      desc: 'تنزل أطراف الثنيتين العلييين لتستقر على بطن الشفة السفلى الرطب مترافقة مع جريان النفس الرخو.',
      sifah: 'مرقق (همس ورخاوة)'
    },
    ml: {
      title: 'ഫാഅ് (ف) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'കീഴ്ച്ചുണ്ടും മേൽപല്ലുകളും',
      zoneLabel: 'കീഴ്ച്ചുണ്ടിന്റെ ഉൾഭാഗം',
      desc: 'മേൽ മുൻപല്ലുകളുടെ അഗ്രങ്ങൾ കീഴ്ച്ചുണ്ടിന്റെ ഉൾഭാഗത്ത് തട്ടുമ്പോൾ കാറ്റ് ഒഴുകി ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (ഹംസ്)'
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
      sifah: 'Light (Echoing)'
    },
    ar: {
      title: 'مخرج حرف الباء (ب)',
      category: 'انطباق الشفتين مع القلقلة',
      zoneLabel: 'انطباق تام للشفتين',
      desc: 'تنطبق الشفتان بقوة وإحكام على الجزء الرطب منهما فينحبس الصوت والنفس ثم ينفجران بقلقلة مدوية.',
      sifah: 'مرقق (شدة وقلقلة)'
    },
    ml: {
      title: 'ബാഅ് (ب) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'ഇരുചുണ്ടുകൾ',
      zoneLabel: 'ഇരുചുണ്ടുകളും പൂർണ്ണമായി അടയൽ',
      desc: 'ഇരുചുണ്ടുകളും പരസ്പരം ശക്തിയായി അമർന്ന് അടഞ്ഞ് പെട്ടെന്ന് വിടുമ്പോൾ ഖൽഖലത്തോടെ ശബ്ദം മുഴങ്ങുന്നു.',
      sifah: 'നേർത്തത് (മുഴക്കം)'
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
      sifah: 'Light (Nasal)'
    },
    ar: {
      title: 'مخرج حرف الميم (م)',
      category: 'انطباق الشفتين مع غنة الخيشوم',
      zoneLabel: 'تلامس لطيف للشفتين مع الغنة',
      desc: 'تنطبق الشفتان برفق وسكون بينما يمر الجزء الأكبر من الصوت رخيماً رناناً عبر التجويف الأنفي.',
      sifah: 'مرقق (غنة وتوسط)'
    },
    ml: {
      title: 'മീം (م) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'ഇരുചുണ്ടുകളും മൂക്കും',
      zoneLabel: 'ഇരുചുണ്ടുകളും മൃദുവായി ചേരൽ',
      desc: 'ഇരുചുണ്ടുകളും മൃദുവായി ചേർത്തുപിടിക്കുകയും ശബ്ദത്തിന്റെ പ്രധാന ഭാഗം മൂക്കിലൂടെ ഗുണ്ണയോടെ ഒഴുകുകയും ചെയ്യുന്നു.',
      sifah: 'നേർത്തത് (മൂക്കിലൂടെയുള്ള ശബ്ദം)'
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
      sifah: 'Light (Soft)'
    },
    ar: {
      title: 'مخرج حرف الواو غير المدية (و)',
      category: 'انضمام الشفتين للأمام',
      zoneLabel: 'استدارة الشفتين مع فرجة دائرية',
      desc: 'تنضم الشفتان وتستديران للأمام تاركتين فتحة دائرية في وسطهما مع استرخاء اللسان في قاع الفم.',
      sifah: 'مرقق (رخاوة ولين)'
    },
    ml: {
      title: 'വാവ് (و) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'ഇരുചുണ്ടുകൾ',
      zoneLabel: 'ചുണ്ടുകൾ ഉരുട്ടി വൃത്തമാക്കൽ',
      desc: 'ഇരുചുണ്ടുകളും മുന്നോട്ട് നീട്ടി വൃത്ത രൂപത്തിലാക്കി നാവ് താഴ്ത്തിവെച്ച് ശബ്ദം ഒഴുക്കുന്നു.',
      sifah: 'നേർത്തത് (മൃദുവായത്)'
    },
    gears: { jawOpen: 20, tipElevation: -5, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 15, greenPointPos: 4, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.02, z: 1.08, rx: 0.0 }
  }
];

// Resting pose for Alif simulation
// Throat Letter Presets (Halq - Throat letters for complete coverage across Sifaat al-Huroof)
export const THROAT_LETTER_PRESETS: LetterPreset[] = [
  // 1. Hamzah / Alif (ء / أ / ئ / ا)
  {
    id: 'hamzah',
    tag: 'Hamzah (ء)',
    letter: 'ء',
    sukoonText: 'أْ',
    isHeavy: false,
    dorsalMode: 'normal',
    phoneticSound: 'أَءْ',
    en: {
      title: 'Makhraj of Hamzah (ء / أ)',
      category: 'Deep Throat (أقصى الحلق - الأوتار الصوتية)',
      zoneLabel: 'Vocal Cords / Glottis (الحنجرة والأوتار الصوتية)',
      desc: 'Originates from the deepest part of the throat at the vocal cords by firm instantaneous closure and abrupt release.',
      sifah: 'Light (Shiddah & Jahr)'
    },
    ar: {
      title: 'مخرج حرف الهمزة (ء / أ)',
      category: 'أقصى الحلق عند الأوتار الصوتية',
      zoneLabel: 'الحنجرة والأوتار الصوتية',
      desc: 'يخرج من أقصى الحلق عند الأوتار الصوتية بانطباقهما انطباقاً تاماً في الساكنة وانفتاحهما في المتحركة.',
      sifah: 'مرقق (شدة وجهر)'
    },
    ml: {
      title: 'ഹംസ (ء / أ) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'അടിത്തൊണ്ട (ശബ്ദതന്തുക്കൾ)',
      zoneLabel: 'ശബ്ദതന്തുക്കൾ (വോക്കൽ കോഡുകൾ)',
      desc: 'തൊണ്ടയുടെ ഏറ്റവും താഴ്ഭാഗത്ത് വോക്കൽ കോഡുകൾ തമ്മിൽ അമർന്ന് അടഞ്ഞു പെട്ടെന്ന് തുറക്കുമ്പോൾ പുറപ്പെടുന്നു.',
      sifah: 'നേർത്തത് (ശബ്ദം തടയൽ)'
    },
    gears: { jawOpen: 32, tipElevation: -20, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 0, greenPointPos: 0, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.20, z: -0.65, rx: 0.2 }
  },
  // 2. Haa (هـ / ة)
  {
    id: 'haa_light',
    tag: 'Haa (هـ)',
    letter: 'ه',
    sukoonText: 'هْ',
    isHeavy: false,
    dorsalMode: 'normal',
    phoneticSound: 'أَهْ',
    en: {
      title: 'Makhraj of Haa (هـ)',
      category: 'Deep Throat (أقصى الحلق)',
      zoneLabel: 'Deepest Throat (أقصى الحلق)',
      desc: 'Originates from the deepest throat with an open glottis, allowing a gentle continuous whisper of breath (Hams).',
      sifah: 'Light (Hams & Rakhawah)'
    },
    ar: {
      title: 'مخرج حرف الهاء (هـ)',
      category: 'أقصى الحلق بانفتاح الأوتار الصوتية',
      zoneLabel: 'أقصى الحلق',
      desc: 'يخرج من أقصى الحلق مع انفتاح الأوتار الصوتية وجريان النفس اللطيف دون انحباس.',
      sifah: 'مرقق (همس ورخاوة وخفاء)'
    },
    ml: {
      title: 'ഹാ (هـ) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'അടിത്തൊണ്ട',
      zoneLabel: 'തൊണ്ടയുടെ താഴ്ഭാഗം',
      desc: 'തൊണ്ടയുടെ ഏറ്റവും അടിഭാഗത്ത് നിന്ന് ശ്വാസം തടസ്സമില്ലാതെ ഒഴുക്കിവിട്ട് മൃദുവായി ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (ശ്വാസം ഒഴുകൽ)'
    },
    gears: { jawOpen: 34, tipElevation: -22, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 0, greenPointPos: 0, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.20, z: -0.65, rx: 0.2 }
  },
  // 3. Ayn (ع)
  {
    id: 'ayn',
    tag: 'Ayn (ع)',
    letter: 'ع',
    sukoonText: 'عْ',
    isHeavy: false,
    dorsalMode: 'normal',
    phoneticSound: 'أَعْ',
    en: {
      title: 'Makhraj of Ayn (ع)',
      category: 'Mid Throat (وسط الحلق)',
      zoneLabel: 'Epiglottis (لسان المزمار)',
      desc: 'Originates from the middle of the throat by retraction of the epiglottis towards the back pharyngeal wall with moderate sound flow.',
      sifah: 'Light (Tawassut & Jahr)'
    },
    ar: {
      title: 'مخرج حرف العين (ع)',
      category: 'وسط الحلق عند لسان المزمار',
      zoneLabel: 'لسان المزمار',
      desc: 'يخرج من وسط الحلق برجوع لسان المزمار إلى الجدار الخلفي للحلق مع جريان بيني معتدل للصوت.',
      sifah: 'مرقق (توسط وجهر)'
    },
    ml: {
      title: 'ഐൻ (ع) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നടു തൊണ്ട',
      zoneLabel: 'എപ്പിഗ്ലോട്ടിസ്',
      desc: 'തൊണ്ടയുടെ മധ്യഭാഗത്തുനിന്ന് എപ്പിഗ്ലോട്ടിസ് തൊണ്ടയുടെ പിൻഭിത്തിയിലേക്ക് ചേർന്ന് ശബ്ദം പാതി തടഞ്ഞ് പുറപ്പെടുന്നു.',
      sifah: 'നേർത്തത് (ഇടത്തരം ശബ്ദം)'
    },
    gears: { jawOpen: 28, tipElevation: -20, tipForward: -10, backIstila: 15, middleArch: 0, lateralSpread: 0, greenPointPos: 0, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.22, z: -0.58, rx: 0.25 }
  },
  // 4. Haa Pharyngeal (ح)
  {
    id: 'haa_pharyngeal',
    tag: 'Haa (ح)',
    letter: 'ح',
    sukoonText: 'حْ',
    isHeavy: false,
    dorsalMode: 'normal',
    phoneticSound: 'أَحْ',
    en: {
      title: 'Makhraj of Haa (ح)',
      category: 'Mid Throat (وسط الحلق)',
      zoneLabel: 'Epiglottis (لسان المزمار)',
      desc: 'Originates from the middle of the throat with continuous whisper of breath and clear pharyngeal friction at the epiglottis.',
      sifah: 'Light (Hams & Rakhawah)'
    },
    ar: {
      title: 'مخرج حرف الحاء (ح)',
      category: 'وسط الحلق مع جريان النفس',
      zoneLabel: 'لسان المزمار',
      desc: 'يخرج من وسط الحلق بانقباض خفيف في عضلات الحلق وجريان واضح ومستمر للنفس والصوت.',
      sifah: 'مرقق (همس ورخاوة)'
    },
    ml: {
      title: 'ഹാഅ് (ح) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'നടു തൊണ്ട',
      zoneLabel: 'എപ്പിഗ്ലോട്ടിസ്',
      desc: 'നടു തൊണ്ടയിൽ നിന്ന് എപ്പിഗ്ലോട്ടിസ് ചുരുങ്ങി ശ്വാസം വ്യക്തമായി ഒഴുക്കിവിട്ട് ഉച്ചരിക്കുന്നു.',
      sifah: 'നേർത്തത് (ശ്വാസം ഒഴുകൽ)'
    },
    gears: { jawOpen: 28, tipElevation: -20, tipForward: -10, backIstila: 12, middleArch: 0, lateralSpread: 0, greenPointPos: 0, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.22, z: -0.58, rx: 0.25 }
  },
  // 5. Ghayn (غ)
  {
    id: 'ghayn',
    tag: 'Ghayn (غ)',
    letter: 'غ',
    sukoonText: 'غْ',
    isHeavy: true,
    dorsalMode: 'qaaf_posterior',
    phoneticSound: 'أَغْ',
    en: {
      title: 'Makhraj of Ghayn (غ)',
      category: 'Upper Throat (أدنى الحلق)',
      zoneLabel: 'Upper Pharynx / Uvula (أدنى الحلق مما يلي الفم)',
      desc: 'Originates from the upper throat closest to the mouth near the uvula, with deep velar-pharyngeal resonance and elevated back tongue.',
      sifah: 'Heavy (Isti\'la & Rakhawah)'
    },
    ar: {
      title: 'مخرج حرف الغين (غ)',
      category: 'أدنى الحلق بالقرب من اللهاة',
      zoneLabel: 'أدنى الحلق مما يلي الفم',
      desc: 'يخرج من أدنى الحلق بالقرب من أصل اللسان واللهاة مع استعلاء أقصى اللسان وجريان رخو للصوت.',
      sifah: 'مفخم (استعلاء ورخاوة وجهر)'
    },
    ml: {
      title: 'ഗൈൻ (غ) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'തൊണ്ടയുടെ മേൽഭാഗം',
      zoneLabel: 'തൊണ്ടയുടെ മുകൾഭാഗം (വായിലേക്ക് അടുത്തത്)',
      desc: 'വായിലേക്ക് അടുത്ത തൊണ്ടയുടെ ഏറ്റവും മുകൾഭാഗത്ത് നാവിന്റെ മുരട് അണ്ണാക്കിലേക്ക് ഉയർത്തി ഘർഷണത്തോടെ ഉച്ചരിക്കുന്നു.',
      sifah: 'കനം (ഉയർച്ചയും ശബ്ദമൊഴുക്കും)'
    },
    gears: { jawOpen: 25, tipElevation: -24, tipForward: -12, backIstila: 88, middleArch: 10, lateralSpread: 20, greenPointPos: 90, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.28, z: -0.48, rx: 0.32 }
  },
  // 6. Khaa (خ)
  {
    id: 'khaa',
    tag: 'Khaa (خ)',
    letter: 'خ',
    sukoonText: 'خْ',
    isHeavy: true,
    dorsalMode: 'qaaf_posterior',
    phoneticSound: 'أَخْ',
    en: {
      title: 'Makhraj of Khaa (خ)',
      category: 'Upper Throat (أدنى الحلق)',
      zoneLabel: 'Upper Pharynx / Uvula (أدنى الحلق مما يلي الفم)',
      desc: 'Originates from the upper throat near the uvula with heavy raspy friction and continuous flow of breath (Hams & Rakhawah).',
      sifah: 'Heavy (Isti\'la, Hams & Rakhawah)'
    },
    ar: {
      title: 'مخرج حرف الخاء (خ)',
      category: 'أدنى الحلق مع جريان النفس',
      zoneLabel: 'أدنى الحلق مما يلي الفم',
      desc: 'يخرج من أدنى الحلق بالقرب من أصل اللسان مع احتكاك خشن وجريان واضح ومستمر للنفس والصوت.',
      sifah: 'مفخم (استعلاء وهمس ورخاوة)'
    },
    ml: {
      title: 'ഖാഅ് (خ) അക്ഷരത്തിന്റെ മഖ്റജ്',
      category: 'തൊണ്ടയുടെ മേൽഭാഗം',
      zoneLabel: 'തൊണ്ടയുടെ മുകൾഭാഗം',
      desc: 'തൊണ്ടയുടെ മുകൾഭാഗത്ത് നാവിന്റെ അടിഭാഗം മൃദുവായ അണ്ണാക്കിലേക്ക് ഉയർന്ന് ഘർഷണത്തോടെ ശ്വാസത്തോടൊപ്പം പുറപ്പെടുന്നു.',
      sifah: 'കനം (ശ്വാസമൊഴുക്ക്)'
    },
    gears: { jawOpen: 25, tipElevation: -24, tipForward: -12, backIstila: 92, middleArch: 10, lateralSpread: 20, greenPointPos: 90, upperOpacity: 56 },
    greenCoords: { x: 0.0, y: 0.28, z: -0.48, rx: 0.32 }
  }
];

// Helper to find preset for any Arabic letter across oral and throat categories
export const findPresetByLetter = (ltr: string): LetterPreset | undefined => {
  let target = ltr;
  if (['أ', 'ء', 'ئ', 'ا', 'ؤ'].includes(ltr)) target = 'ء';
  if (['ه', 'ة'].includes(ltr)) target = 'ه';

  return (
    LETTER_PRESETS.find(p => p.letter === target) ||
    THROAT_LETTER_PRESETS.find(p => p.letter === target) ||
    LETTER_PRESETS.find(p => p.letter === ltr) ||
    THROAT_LETTER_PRESETS.find(p => p.letter === ltr)
  );
};

const ALIF_MAKHRAJ_GEARS: Record<string, number> = {
  jawOpen: 36, tipElevation: -5, tipForward: -10, backIstila: 0, middleArch: 0, lateralSpread: 15
};

// ----------------------------------------------------------------------------
// 3. ANATOMY LABELS DATA
// ----------------------------------------------------------------------------
interface AnatomyLabelItem {
  id: string;
  group: 'tongue';
  ar: string;
  en: string;
  ml: string;
  hex: string;
  lightTextHex?: string;
  rgb: [number, number, number];
  letters: string[];
}

const ANATOMY_LABELS_DATA: AnatomyLabelItem[] = [
  // 4 Tongue Anatomy Parts based on Tajweed rules
  {
    id: 'aqsa_lisaan',
    group: 'tongue',
    ar: 'أقصى اللسان (الجذر)',
    en: 'Tongue Root',
    ml: 'നാവിന്റെ മുരട്',
    hex: '#7c3aed',
    rgb: [0.49, 0.23, 0.93],
    letters: ['ق', 'ك']
  },
  {
    id: 'wasat_lisaan',
    group: 'tongue',
    ar: 'وسط اللسان',
    en: 'Middle Tongue',
    ml: 'നാവിന്റെ മധ്യമം',
    hex: '#2563eb',
    rgb: [0.15, 0.39, 0.92],
    letters: ['ج', 'ش', 'ي']
  },
  {
    id: 'haafah_lisaan',
    group: 'tongue',
    ar: 'حافتا اللسان',
    en: 'Tongue Sides / Edges',
    ml: 'നാവിന്റെ അരിക്',
    hex: '#d97706',
    rgb: [0.85, 0.47, 0.02],
    letters: ['ض', 'ل']
  },
  {
    id: 'taraf_lisaan',
    group: 'tongue',
    ar: 'طرف اللسان',
    en: 'Tongue Tip',
    ml: 'നാവിന്റെ തുമ്പ്',
    hex: '#059669',
    rgb: [0.02, 0.59, 0.41],
    letters: ['ن', 'ر', 'ط', 'د', 'ت', 'ص', 'ز', 'س', 'ظ', 'ذ', 'ث']
  }
];

// ----------------------------------------------------------------------------
// 3.1 SIFAAT AL-HUROOF DATA (Characteristics of Arabic Letters)
// ----------------------------------------------------------------------------
export interface SifahItem {
  id: string;
  order: number;
  category: 'opposite' | 'non_opposite';
  oppositeId?: string;
  oppositeNameEn?: string;
  oppositeNameAr?: string;
  oppositeNameMl?: string;
  pairGroupEn?: string;
  pairGroupAr?: string;
  pairGroupMl?: string;
  tonguePartEn?: string;
  tonguePartAr?: string;
  tonguePartMl?: string;
  ar: string;
  en: string;
  ml: string;
  literalAr: string;
  literalEn: string;
  literalMl: string;
  technicalAr: string;
  technicalEn: string;
  technicalMl: string;
  mnemonic?: string;
  letters: string[];
  chipClass: string;
  badgeHex: string;
}

export const SIFAAT_DATA: SifahItem[] = [
  // 1. Characteristics with Opposites (ٱلصِّفَاتُ الْمُتَضَادَّةُ)
  {
    id: 'jahr',
    order: 1,
    category: 'opposite',
    oppositeId: 'hams',
    oppositeNameEn: 'Hams (هَمْس)',
    oppositeNameAr: 'الهمس',
    oppositeNameMl: 'ഹംസ്',
    pairGroupEn: 'Breath (النفس)',
    pairGroupAr: 'جريان النفس وانحباسه',
    pairGroupMl: 'ശ്വാസത്തിന്റെ ഒഴുക്ക്',
    ar: 'جَهْر',
    en: 'Jahr',
    ml: 'ജഹ്റ്',
    literalAr: 'الوضوح والظهور',
    literalEn: 'Clarity / Loudness',
    literalMl: 'വെളിവാക്കൽ',
    technicalAr: 'انحباس جريان النفس عند النطق بالحرف لقوة الاعتماد على المخرج.',
    technicalEn: 'Stopping the flow of breath due to strong reliance on the articulation point (Makhraj).',
    technicalMl: 'മഖ്റജിൽ ശക്തിയായി ഉച്ചരിക്കുന്നതിനാൽ കാറ്റ് നടക്കാതിരിക്കൽ',
    letters: ['ع', 'ظ', 'م', 'و', 'ز', 'ن', 'ق', 'ا', 'ر', 'ئ', 'ذ', 'ي', 'غ', 'ض', 'ج', 'د', 'ط', 'ل', 'ب', 'أ', 'ء'],
    chipClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    badgeHex: '#0284c7'
  },
  {
    id: 'hams',
    order: 2,
    category: 'opposite',
    oppositeId: 'jahr',
    oppositeNameEn: 'Jahr (جَهْر)',
    oppositeNameAr: 'الجهر',
    oppositeNameMl: 'ജഹ്റ്',
    pairGroupEn: 'Breath (النفس)',
    pairGroupAr: 'جريان النفس وانحباسه',
    pairGroupMl: 'ശ്വാസത്തിന്റെ ഒഴുക്ക്',
    ar: 'هَمْس',
    en: 'Hams',
    ml: 'ഹംസ്',
    literalAr: 'الخفاء والصوت الخفي',
    literalEn: 'Whispering / Concealment',
    literalMl: 'മറക്കൽ',
    technicalAr: 'جريان النفس عند النطق بالحرف لضعف الاعتماد على المخرج.',
    technicalEn: 'Continuation of the breath due to weak reliance on the articulation point.',
    technicalMl: 'മഖ്റജിൽ ബലഹീനമായി ഉച്ചരിക്കുന്നതിനാൽ കാറ്റ് നടക്കൽ',
    mnemonic: 'فَحَثَّهُ شَخْصٌ سَكَتَ',
    letters: ['ف', 'ح', 'ث', 'ه', 'ش', 'خ', 'ص', 'س', 'ك', 'ت'],
    chipClass: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
    badgeHex: '#0891b2'
  },
  {
    id: 'shiddah',
    order: 3,
    category: 'opposite',
    oppositeId: 'rikhwah',
    oppositeNameEn: 'Rikhwah & Tawassut (الرخاوة والتوسط)',
    oppositeNameAr: 'الرخاوة والتوسط',
    oppositeNameMl: 'രിഖ്‌വും തവസ്സുത്വും',
    pairGroupEn: 'Sound (الصوت)',
    pairGroupAr: 'جريان الصوت وانحباسه',
    pairGroupMl: 'ശബ്ദത്തിന്റെ ഒഴുക്ക്',
    ar: 'شِدَّة',
    en: 'Shiddah',
    ml: 'ശിദ്ദത്ത്',
    literalAr: 'القوة والصلابة',
    literalEn: 'Strength',
    literalMl: 'ശക്തി',
    technicalAr: 'انحباس جريان الصوت لقوة الاعتماد على المخرج.',
    technicalEn: 'Stopping the flow of sound due to strong, firm reliance on the articulation point.',
    technicalMl: 'മഖ്റജിൽ ശക്തിയായി അമർത്തി ഉച്ചരിക്കുന്നതിനാൽ ശബ്ദം നടക്കാതിരിക്കൽ',
    mnemonic: 'أَجِدُ قَطٍ بَكَتْ',
    letters: ['أ', 'ء', 'ج', 'د', 'ق', 'ط', 'ب', 'ك', 'ت'],
    chipClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    badgeHex: '#e11d48'
  },
  {
    id: 'rikhwah',
    order: 4,
    category: 'opposite',
    oppositeId: 'shiddah',
    oppositeNameEn: 'Shiddah & Tawassut (الشدة والتوسط)',
    oppositeNameAr: 'الشدة والتوسط',
    oppositeNameMl: 'ശിദ്ദത്തും തവസ്സുത്വും',
    pairGroupEn: 'Sound (الصوت)',
    pairGroupAr: 'جريان الصوت وانحباسه',
    pairGroupMl: 'ശബ്ദത്തിന്റെ ഒഴുക്ക്',
    ar: 'رِخْو',
    en: 'Rikhwah',
    ml: 'രിഖ്‌വ്',
    literalAr: 'اللين والرخاوة',
    literalEn: 'Softness / Looseness',
    literalMl: 'പതം',
    technicalAr: 'جريان تام للصوت مع الحرف لضعف الاعتماد على المخرج.',
    technicalEn: 'Easy flow of sound due to weak reliance on the articulation point.',
    technicalMl: 'മഖ്റജിൽ ബലഹീനമായി സ്ഥിതി ചെയ്യുന്നതിനാൽ ശബ്ദം നടക്കൽ മൃദുവാകൽ',
    letters: ['خ', 'ذ', 'غ', 'ث', 'ح', 'ض', 'ف', 'ظ', 'ش', 'و', 'ص', 'ز', 'ي', 'س', 'ا', 'ه'],
    chipClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    badgeHex: '#059669'
  },
  {
    id: 'tawassut',
    order: 5,
    category: 'opposite',
    oppositeId: 'shiddah',
    oppositeNameEn: 'Between Shiddah & Rikhwah',
    oppositeNameAr: 'بين الشدة والرخاوة',
    oppositeNameMl: 'ശിദ്ദത്തിനും രിഖ്‌വിനുമിടയിൽ',
    pairGroupEn: 'Sound (الصوت)',
    pairGroupAr: 'جريان الصوت وانحباسه',
    pairGroupMl: 'ശബ്ദത്തിന്റെ ഒഴുക്ക്',
    ar: 'تَوَسُّط',
    en: 'Tawassut',
    ml: 'തവസ്സുത്വ്',
    literalAr: 'الاعتدال والتوسط',
    literalEn: 'Moderation',
    literalMl: 'മധ്യമം',
    technicalAr: 'اعتدال الصوت بين كمال الانحباس وكمال الجريان.',
    technicalEn: 'Moderate flow of sound between softness and strength.',
    technicalMl: 'മൃദു കഠോരത്തിനിടയിൽ ശബ്ദം നടക്കൽ',
    mnemonic: 'لِنْ عُمَرْ',
    letters: ['ل', 'ن', 'ع', 'م', 'ر'],
    chipClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    badgeHex: '#d97706'
  },
  {
    id: 'istila',
    order: 6,
    category: 'opposite',
    oppositeId: 'istifal',
    oppositeNameEn: 'Istifal (اِسْتِفَال)',
    oppositeNameAr: 'الاستفال',
    oppositeNameMl: 'ഇസ്തിഫാൽ',
    pairGroupEn: 'Elevation — Root of Tongue (أقصى اللسان)',
    pairGroupAr: 'الاستعلاء — أقصى اللسان',
    pairGroupMl: 'ഉയരൽ — നാവിന്റെ മുരട്',
    tonguePartEn: 'Root of Tongue (أقصى اللسان)',
    tonguePartAr: 'أقصى اللسان (الجذر)',
    tonguePartMl: 'നാവിന്റെ മുരട്',
    ar: 'اِسْتِعْلَاء',
    en: 'Isti\'la\'',
    ml: 'ഇസ്തിഅ്‌ലാഅ്',
    literalAr: 'الارتفاع والعلو',
    literalEn: 'Elevation',
    literalMl: 'ഉയരൽ',
    technicalAr: 'ارتفاع أقصى اللسان (جذره) إلى الحنك الأعلى فيرتفع معه الصوت بالتفخيم.',
    technicalEn: 'Raising the root / back of the tongue (أقصى اللسان) towards the upper palate, directing sound upwards (Tafkheem).',
    technicalMl: 'നാവിന്റെ മുരട് മേൽപ്പാക്കിലേക്ക് ഉയർന്നിരിക്കൽ',
    mnemonic: 'خُصَّ ضَغْطٍ قِظْ',
    letters: ['خ', 'ص', 'ض', 'غ', 'ط', 'ق', 'ظ'],
    chipClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    badgeHex: '#7c3aed'
  },
  {
    id: 'istifal',
    order: 7,
    category: 'opposite',
    oppositeId: 'istila',
    oppositeNameEn: 'Isti\'la\' (اِسْتِعْلَاء)',
    oppositeNameAr: 'الاستعلاء',
    oppositeNameMl: 'ഇസ്തിഅ്‌ലാഅ്',
    pairGroupEn: 'Elevation — Root of Tongue (أقصى اللسان)',
    pairGroupAr: 'الاستعلاء — أقصى اللسان',
    pairGroupMl: 'താഴുക — നാവിന്റെ മുരട്',
    tonguePartEn: 'Root of Tongue (أقصى اللسان)',
    tonguePartAr: 'أقصى اللسان (الجذر)',
    tonguePartMl: 'നാവിന്റെ മുരട്',
    ar: 'اِسْتِفَال',
    en: 'Istifal',
    ml: 'ഇസ്തിഫാൽ',
    literalAr: 'الانخفاض والهبوط',
    literalEn: 'Lowering',
    literalMl: 'താഴുക',
    technicalAr: 'انخفاض أقصى اللسان (جذره) عن الحنك الأعلى إلى قاع الفم فينحدر الصوت بالترقيق.',
    technicalEn: 'Lowering the root of the tongue (أقصى اللسان) to the mouth floor away from the palate, keeping sound flat (Tarqeeq).',
    technicalMl: 'നാവ് വായയുടെ അടിഭാഗത്തേക്ക് താഴ്ന്നിരിക്കൽ',
    letters: ['ث', 'ب', 'ت', 'ع', 'ز', 'م', 'ن', 'ي', 'ج', 'و', 'د', 'ح', 'ر', 'ف', 'ه', 'ا', 'ذ', 'س', 'ل', 'ش', 'ك', 'أ', 'ء'],
    chipClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    badgeHex: '#2563eb'
  },
  {
    id: 'itbaq',
    order: 8,
    category: 'opposite',
    oppositeId: 'infitah',
    oppositeNameEn: 'Infitah (اِنْفِتَاح)',
    oppositeNameAr: 'الانفتاح',
    oppositeNameMl: 'ഇൻഫിതാഹ്',
    pairGroupEn: 'Adhesion — Middle of Tongue (وسط اللسان)',
    pairGroupAr: 'الإطباق — وسط اللسان',
    pairGroupMl: 'ചേരൽ — നാവിന്റെ മധ്യമം',
    tonguePartEn: 'Middle of Tongue (وسط اللسان)',
    tonguePartAr: 'وسط اللسان',
    tonguePartMl: 'നാവിന്റെ മധ്യമം',
    ar: 'إِطْبَاق',
    en: 'Itbaq',
    ml: 'ഇത്വ്ബാഖ്',
    literalAr: 'الإلصاق والتطابق',
    literalEn: 'Adhesion / Closing',
    literalMl: 'ചേരൽ',
    technicalAr: 'إلصاق وسط اللسان وطائفة منه بالحنك الأعلى وانحصار الصوت بينهما بأعلى درجات التفخيم.',
    technicalEn: 'Adhering the middle of the tongue (وسط اللسان) to the upper palate, trapping and confining sound (strongest heaviness).',
    technicalMl: 'നാവിന്റെ മധ്യമം മേൽപ്പാക്കിലേക്ക് ചേരൽ',
    letters: ['ط', 'ص', 'ض', 'ظ'],
    chipClass: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800',
    badgeHex: '#6d28d9'
  },
  {
    id: 'infitah',
    order: 9,
    category: 'opposite',
    oppositeId: 'itbaq',
    oppositeNameEn: 'Itbaq (إِطْبَاق)',
    oppositeNameAr: 'الإطباق',
    oppositeNameMl: 'ഇത്വ്ബാഖ്',
    pairGroupEn: 'Adhesion — Middle of Tongue (وسط اللسان)',
    pairGroupAr: 'الإطباق — وسط اللسان',
    pairGroupMl: 'അകന്നിരിക്കൽ — നാവിന്റെ മധ്യമം',
    tonguePartEn: 'Middle of Tongue (وسط اللسان)',
    tonguePartAr: 'وسط اللسان',
    tonguePartMl: 'നാവിന്റെ മധ്യമം',
    ar: 'اِنْفِتَاح',
    en: 'Infitah',
    ml: 'ഇൻഫിതാഹ്',
    literalAr: 'الافتراق والانفراج',
    literalEn: 'Opening / Separation',
    literalMl: 'അകന്നിരിക്കൽ',
    technicalAr: 'تجافي وسط اللسان وتباعده عن الحنك الأعلى فلا ينحصر الصوت بينهما.',
    technicalEn: 'Keeping the middle of the tongue (وسط اللسان) separated from the upper palate, allowing sound to escape unconfined.',
    technicalMl: 'അണ്ണാക്കുമായി നാവ് അകന്നിരിക്കൽ',
    letters: ['م', 'ن', 'أ', 'ء', 'خ', 'ذ', 'و', 'ج', 'د', 'س', 'ع', 'ة', 'ف', 'ز', 'ك', 'ا', 'ح', 'ق', 'ل', 'ه', 'ش', 'ر', 'ب', 'غ', 'ي', 'ث'],
    chipClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    badgeHex: '#4f46e5'
  },

  // 2. Characteristics without Opposites (ٱلصِّفَاتُ الَّتِى لَيْسَ لَهَا الْأَضْدَادُ)
  {
    id: 'safeer',
    order: 10,
    category: 'non_opposite',
    tonguePartEn: 'Tip of Tongue (طرف اللسان)',
    tonguePartAr: 'طرف اللسان',
    tonguePartMl: 'നാവിന്റെ തുമ്പ്',
    ar: 'صَفِير',
    en: 'Safeer',
    ml: 'സ്വഫീറ്',
    literalAr: 'صوت يشبه صفير الطائر',
    literalEn: 'Bird\'s chirp / Whistle',
    literalMl: 'പക്ഷി സ്വരം',
    technicalAr: 'صوت زائد يخرج من بين الثنايا وطرف اللسان بصفير حاد ناصع.',
    technicalEn: 'A sharp sound resembling the chirping of a bird.',
    technicalMl: 'പക്ഷി സ്വരത്തോട് തുല്യമായ ശബ്ദം',
    letters: ['ص', 'ز', 'س'],
    chipClass: 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800',
    badgeHex: '#db2777'
  },
  {
    id: 'qalqalah',
    order: 11,
    category: 'non_opposite',
    ar: 'قَلْقَلَة',
    en: 'Qalqalah',
    ml: 'ഖൽഖലത്ത്',
    literalAr: 'التحريك والاضطراب',
    literalEn: 'Shaking / Echoing',
    literalMl: 'ചലിക്കുക',
    technicalAr: 'اضطراب المخرج عند النطق بالحرف ساكناً حتى يُسمع له نبرة قوية.',
    technicalEn: 'An echoing or vibrating sound produced by pressing firmly on the articulation point.',
    technicalMl: 'മഖ്റജിൽ അമർത്തി ഉച്ചരിക്കുന്നത് കൊണ്ട് ശബ്ദത്തിന് മുഴക്കമുണ്ടാവൽ',
    mnemonic: 'قُطْبُ جَدٍّ',
    letters: ['ق', 'ط', 'ب', 'ج', 'د'],
    chipClass: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    badgeHex: '#ea580c'
  },
  {
    id: 'leen',
    order: 12,
    category: 'non_opposite',
    ar: 'لِين',
    en: 'Leen',
    ml: 'ലീൻ',
    literalAr: 'السهولة واليسر',
    literalEn: 'Gentleness / Ease',
    literalMl: 'മയം',
    technicalAr: 'إخراج الحرف بسهولة ويسر من غير كلفة على اللسان (إذا سكنا وانفتح ما قبلهما).',
    technicalEn: 'Pronouncing the letter effortlessly without any strain on the tongue (when saakin preceded by fathah).',
    technicalMl: 'നാവിന് വിഷമം കൂടാതെ പുറപ്പെടൽ',
    mnemonic: 'الواو والياء الساكنتان المفتوح ما قبلهما',
    letters: ['و', 'ي'],
    chipClass: 'bg-lime-50 dark:bg-lime-950/60 text-lime-700 dark:text-lime-300 border-lime-300 dark:border-lime-800',
    badgeHex: '#65a30d'
  },
  {
    id: 'inhiraf',
    order: 13,
    category: 'non_opposite',
    tonguePartEn: 'Tongue Tip & Sides (طرف وحافتي اللسان)',
    tonguePartAr: 'طرف وحافتي اللسان',
    tonguePartMl: 'നാവിന്റെ തുമ്പും അരികും',
    ar: 'اِنْحِرَاف',
    en: 'Inhiraf',
    ml: 'ഇൻഹിറാഫ്',
    literalAr: 'الميل والعدول',
    literalEn: 'Inclination / Drifting',
    literalMl: 'തെറ്റൽ',
    technicalAr: 'ميل الحرف عن مخرجه (الراء تميل للسان واللام تميل للحافة والضاد).',
    technicalEn: 'Drifting from its own articulation point to another (ر inclines towards ل, and ل inclines towards ض).',
    technicalMl: 'സ്വന്തം മഖ്റജിൽ നിന്ന് മറ്റു മഖ്റജിലേക്ക് ചായൽ (റാഅ് ലാമിലേക്കും ലാം ളാദിലേക്കും)',
    letters: ['ر', 'ل'],
    chipClass: 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-800',
    badgeHex: '#c026d3'
  },
  {
    id: 'takreer',
    order: 14,
    category: 'non_opposite',
    tonguePartEn: 'Tip of Tongue (طرف اللسان)',
    tonguePartAr: 'طرف/رأس اللسان',
    tonguePartMl: 'നാവിന്റെ തുമ്പ്',
    ar: 'تَكْرِير',
    en: 'Takreer',
    ml: 'തക്രീറ്',
    literalAr: 'إعادة الشيء مرة بعد أخرى',
    literalEn: 'Repetition / Trilling',
    literalMl: 'വിറക്കൽ',
    technicalAr: 'ارتعاد رأس اللسان عند النطق بالحرف، وتُعرف هذه الصفة لتُجتنب ولا يُبالغ فيها.',
    technicalEn: 'Shivering or trilling of the tip of the tongue (this trait is taught so that excessive trilling is avoided).',
    technicalMl: 'നാവിന്റെ തല വിറക്കൽ (അത് ഒഴിവാക്കേണ്ടതാണ്)',
    letters: ['ر'],
    chipClass: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800',
    badgeHex: '#dc2626'
  },
  {
    id: 'tafashshi',
    order: 15,
    category: 'non_opposite',
    tonguePartEn: 'Middle of Tongue (وسط اللسان)',
    tonguePartAr: 'وسط اللسان',
    tonguePartMl: 'നാവിന്റെ മധ്യമം',
    ar: 'تَفَشِّي',
    en: 'Tafashshi',
    ml: 'തഫശ്ശീ',
    literalAr: 'الاتساع والانتشار',
    literalEn: 'Spreading',
    literalMl: 'പരക്കൽ',
    technicalAr: 'انتشار خروج الريح بين اللسان والحنك الأعلى حتى يتصل بمخرج الظاء.',
    technicalEn: 'Spreading of breath inside the mouth until it reaches the articulation point of ظ.',
    technicalMl: 'ളാഇന്റെ മഖ്റജ് വരെ കാറ്റ് പരക്കൽ',
    letters: ['ش'],
    chipClass: 'bg-amber-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    badgeHex: '#ca8a04'
  },
  {
    id: 'istitalah',
    order: 16,
    category: 'non_opposite',
    tonguePartEn: 'Side of Tongue (حافة اللسان)',
    tonguePartAr: 'إحدى حافتي اللسان',
    tonguePartMl: 'നാവിന്റെ അരിക്',
    ar: 'اِسْتِطَالَة',
    en: 'Istitalah',
    ml: 'ഇസ്തിത്വാലത്ത്',
    literalAr: 'الامتداد والطول',
    literalEn: 'Elongation',
    literalMl: 'നീളൽ',
    technicalAr: 'امتداد الصوت من أول إحدى حافتي اللسان إلى آخرها حتى يتصل بمخرج اللام.',
    technicalEn: 'Stretching of the sound along the entire length of the side of the tongue.',
    technicalMl: 'നാവിന്റെ അരിക് നീളത്തിൽ ശബ്ദം നീളൽ',
    letters: ['ض'],
    chipClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700',
    badgeHex: '#047857'
  }
];

export interface SifahPairDef {
  id: string;
  pairNo: number;
  titleEn: string;
  titleAr: string;
  titleMl: string;
  descEn: string;
  descAr: string;
  descMl: string;
  itemIds: string[];
}

export const OPPOSITE_PAIRS: SifahPairDef[] = [
  {
    id: 'breath',
    pairNo: 1,
    titleEn: '1. Flow of Breath',
    titleAr: '١. جريان النفس وانحباسه (الهمس والجهر)',
    titleMl: '1. കാറ്റിന്റെ ഒഴുക്ക് (ശ്വാസം നടക്കലും നടക്കാതിരിക്കലും)',
    descEn: 'Whether breath continues or is stopped during pronunciation.',
    descAr: 'جريان النفس لضعف الاعتماد على المخرج (همس) أو انحباسه لقوته (جهر).',
    descMl: 'ശ്വാസം നടക്കൽ vs ശ്വാസം നടക്കാതിരിക്കൽ.',
    itemIds: ['hams', 'jahr']
  },
  {
    id: 'sound',
    pairNo: 2,
    titleEn: '2. Flow of Sound',
    titleAr: '٢. جريان الصوت وانحباسه (الشدة والتوسط والرخاوة)',
    titleMl: '2. ശബ്ദത്തിന്റെ ഒഴുക്ക് (ശബ്ദം നടക്കലും നടക്കാതിരിക്കലും)',
    descEn: 'Degree of sound flow: stopping, moderate, or continuing.',
    descAr: 'انحباس الصوت تماماً (شدة)، أو اعتداله (توسط)، أو كمال جريانه (رخاوة).',
    descMl: 'ശബ്ദം നിൽക്കൽ, മധ്യമം, ശബ്ദം ഒഴുകൽ.',
    itemIds: ['shiddah', 'tawassut', 'rikhwah']
  },
  {
    id: 'elevation',
    pairNo: 3,
    titleEn: '3. Elevation & Lowering — Root of Tongue',
    titleAr: '٣. استعلاء اللسان وانخفاضه — أقصى اللسان (جذره)',
    titleMl: '3. നാവിന്റെ മുരട് ഉയരലും താഴലും',
    descEn: 'Focus: Root of Tongue — Raising the root towards the upper palate vs Lowering it to mouth floor.',
    descAr: 'الموضع: أقصى اللسان (الجذر) — ارتفاع جذر اللسان إلى الحنك الأعلى بالتفخيم أو انخفاضه بالترقيق.',
    descMl: 'നാവിന്റെ മുരട് മേൽപ്പാക്കിലേക്ക് ഉയരൽ vs അടിഭാഗത്തേക്ക് താഴൽ.',
    itemIds: ['istila', 'istifal']
  },
  {
    id: 'adhesion',
    pairNo: 4,
    titleEn: '4. Adhesion & Opening — Middle of Tongue',
    titleAr: '٤. انحصار الصوت وانفتاحه — وسط اللسان (الإطباق والانفتاح)',
    titleMl: '4. നാവിന്റെ മധ്യമം ചേരലും അകലലും',
    descEn: 'Focus: Middle of Tongue — Adhering the middle of the tongue to the upper palate vs Separating it.',
    descAr: 'الموضع: وسط اللسان — إلصاق وسط اللسان بالحنك وانحصار الصوت (إطباق) أو تجافيه عنه (انفتاح).',
    descMl: 'നാവിന്റെ മധ്യമം മേൽപ്പാക്കിലേക്ക് ചേരൽ vs അകന്നിരിക്കൽ.',
    itemIds: ['itbaq', 'infitah']
  }
];

export const getSifaatForLetter = (letterChar: string): SifahItem[] => {
  return SIFAAT_DATA.filter(s => s.letters.includes(letterChar));
};

export default function TajweedStudioPage() {
  const { resolvedTheme } = useTheme();
  const [lang, setLang] = useState<'en' | 'ar' | 'ml'>('en');

  // Load language preference from localStorage if saved
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('tajweed_language');
      if (savedLang === 'ar' || savedLang === 'en' || savedLang === 'ml') {
        setLang(savedLang);
      }
    } catch {}
  }, []);

  const changeLanguage = (nextLang: 'en' | 'ar' | 'ml') => {
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

  // Main navigation tab: 'makharij' (3D mouth) or 'sifaat' (phonetic rules)
  const [activeMainTab, setActiveMainTab] = useState<'makharij' | 'sifaat'>('makharij');
  const [selectedSifah, setSelectedSifah] = useState<SifahItem | null>(null);
  const [sifaat3DOpen, setSifaat3DOpen] = useState<boolean>(false);
  const sifaat3DOpenRef = useRef<boolean>(false);

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
  const [isPlayingSimulation, setIsPlayingSimulation] = useState(false);

  // Preload letter audio blob into memory on mount and whenever letter changes (strictly 1 network call)
  useEffect(() => {
    preloadLetterAudio(currentLetter.letter).catch(() => {});
  }, [currentLetter.letter]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopLetterAudio();
    };
  }, []);

  // Default camera viewpoint (3/4 dental perspective)
  const DEFAULT_CAM = useMemo(() => ({
    radius: 3.28,
    theta: -1.36,
    phi: 1.48,
    target: new THREE.Vector3(0.0, -0.04, 0.06)
  }), []);

  const camPoseRef = useRef({
    radius: 3.28,
    theta: -1.36,
    phi: 1.48,
    target: new THREE.Vector3(0.0, -0.04, 0.06)
  });

  const currentLetterRef = useRef(currentLetter);
  const dhaadModeRef = useRef(dhaadMode);
  const showAnatomyRef = useRef(showAnatomy);
  const showMakhrajColorsRef = useRef(showMakhrajColors);
  const activeMainTabRef = useRef(activeMainTab);
  const forceDeformRef = useRef(true);

  useEffect(() => {
    currentLetterRef.current = currentLetter;
    dhaadModeRef.current = dhaadMode;
    showAnatomyRef.current = showAnatomy;
    showMakhrajColorsRef.current = showMakhrajColors;
    activeMainTabRef.current = activeMainTab;
    sifaat3DOpenRef.current = sifaat3DOpen;
    forceDeformRef.current = true;
  }, [currentLetter, dhaadMode, showAnatomy, showMakhrajColors, activeMainTab, sifaat3DOpen]);

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

  // Virtual Joystick State for Mobile 3D Camera Control
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickCenterRef = useRef({ x: 0, y: 0 });
  const joystickActiveRef = useRef(false);
  const joystickDeltaRef = useRef<{ x: number; y: number } | null>(null);

  const JOYSTICK_MAX_R = 22;

  const updateJoystickDelta = (clientX: number, clientY: number) => {
    const dx = clientX - joystickCenterRef.current.x;
    const dy = clientY - joystickCenterRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(JOYSTICK_MAX_R, dist);
    const angle = Math.atan2(dy, dx);
    const kx = dist === 0 ? 0 : Math.cos(angle) * clampedDist;
    const ky = dist === 0 ? 0 : Math.sin(angle) * clampedDist;

    setJoystickKnob({ x: kx, y: ky });
    joystickDeltaRef.current = {
      x: kx / JOYSTICK_MAX_R,
      y: ky / JOYSTICK_MAX_R
    };
  };

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    joystickActiveRef.current = true;
    setIsJoystickActive(true);

    const rect = e.currentTarget.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    updateJoystickDelta(e.clientX, e.clientY);

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickActiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    updateJoystickDelta(e.clientX, e.clientY);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickActiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    joystickActiveRef.current = false;
    setIsJoystickActive(false);
    setJoystickKnob({ x: 0, y: 0 });
    joystickDeltaRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    joystickActiveRef.current = true;
    setIsJoystickActive(true);

    const rect = e.currentTarget.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    if (e.touches.length > 0) {
      updateJoystickDelta(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickActiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length > 0) {
      updateJoystickDelta(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    joystickActiveRef.current = false;
    setIsJoystickActive(false);
    setJoystickKnob({ x: 0, y: 0 });
    joystickDeltaRef.current = null;
  };

  useEffect(() => {
    const handleGlobalRelease = () => {
      if (joystickActiveRef.current) {
        joystickActiveRef.current = false;
        setIsJoystickActive(false);
        setJoystickKnob({ x: 0, y: 0 });
        joystickDeltaRef.current = null;
      }
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
    };
  }, []);

  // Simulate Motion (Alif -> Makhraj -> Alif) and play letter audio
  const triggerSimulation = () => {
    // Guard against rapid duplicate clicks: if already simulating or playing, ignore extra clicks
    if (isSimulatingRef.current || isLetterAudioPlaying(currentLetter.letter)) {
      return;
    }
    isSimulatingRef.current = true;
    setIsPlayingSimulation(true);
    isRestingAtAlifRef.current = false;
    morphProgressRef.current = 0.0;
    Object.keys(ALIF_MAKHRAJ_GEARS).forEach(k => {
      currentGearsRef.current[k] = ALIF_MAKHRAJ_GEARS[k];
    });
    forceDeformRef.current = true;
    simulationStartTimeRef.current = performance.now();

    playLetterAudio(currentLetter.letter, () => {
      setIsPlayingSimulation(false);
    });
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
      camPoseRef.current.radius = spherical.radius;
      camPoseRef.current.theta = spherical.theta;
      camPoseRef.current.phi = spherical.phi;
      camPoseRef.current.target.copy(spherical.target);
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

  // Change active letter (preserve current 3D camera viewpoint and upper teeth opacity)
  const selectLetter = (preset: LetterPreset) => {
    stopLetterAudio();
    setIsPlayingSimulation(false);
    setCurrentLetter(preset);
    isSimulatingRef.current = false;
    isRestingAtAlifRef.current = false;
    morphProgressRef.current = 1.0;
    const nextGears = { ...preset.gears, upperOpacity: upperTeethOpacity };
    forceDeformRef.current = true;
    targetGearsRef.current = { ...nextGears };
    setGears(nextGears);
  };

  // Adjust gear slider
  const handleGearChange = (key: string, value: number) => {
    isSimulatingRef.current = false;
    isRestingAtAlifRef.current = false;
    morphProgressRef.current = 1.0;
    forceDeformRef.current = true;
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
    forceDeformRef.current = true;
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

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(resolvedTheme === 'dark' ? 0x070c18 : 0xebedf1);

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    const spherical = {
      radius: camPoseRef.current.radius,
      theta: camPoseRef.current.theta,
      phi: camPoseRef.current.phi,
      target: camPoseRef.current.target.clone()
    };
    const updateCamPos = () => {
      camera.position.x = spherical.target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(spherical.target);
      camPoseRef.current.radius = spherical.radius;
      camPoseRef.current.theta = spherical.theta;
      camPoseRef.current.phi = spherical.phi;
      camPoseRef.current.target.copy(spherical.target);
    };
    updateCamPos();

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lights (Brightened for clear anatomical visualization)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.92);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x9ca3af, 0.52);
    hemiLight.position.set(0, 2.4, 0.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff8f5, 0.68);
    dirLight.position.set(-2.2, 1.2, 1.4);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.38);
    fillLight.position.set(2.2, 1.0, 1.6);
    scene.add(fillLight);

    const bounceLight = new THREE.DirectionalLight(0xfff1e6, 0.24);
    bounceLight.position.set(0.0, -1.8, 0.8);
    scene.add(bounceLight);

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
          const baseBrightness = isUpper ? 0.84 : 0.88;
          const shade = Math.max(0.40, Math.min(0.92, baseBrightness + buccalHighlight - interdentalCrevice - cervicalShadow - anteriorCurveShadow - lingualShadow));
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
      const activeLetter = currentLetterRef.current;
      const showMarker = showMakhrajColorsRef.current && !showAnatomyRef.current;
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

          const archAngle = u * (Math.PI * 0.36);
          const baseArchX = Math.sin(archAngle) * 0.48;
          const baseArchZ = 0.60 + Math.cos(archAngle) * 0.40;
          const cornerY = 0.01;
          const halfThickZ = isEnd ? 0.0 : (0.008 + 0.050 * cornerTaper);
          const halfHeightY = isEnd ? 0.0 : (0.008 + 0.052 * cornerTaper);

          if (lipMode === 'rounded_waw') {
            // Previous circular rounded lip makhraj position (انضمام الشفتين)
            const ringAngle = u * (Math.PI * 0.5);
            const ringRadius = 0.148;
            const cx = Math.sin(ringAngle) * ringRadius;
            const cyDir = isUpper ? Math.cos(ringAngle) : -Math.cos(ringAngle);
            const cy = 0.015 + cyDir * ringRadius;
            const cz = 1.04 + Math.cos(ringAngle) * 0.085;
            const tubeR = isEnd ? 0.0 : (0.024 + 0.042 * (0.35 + 0.65 * Math.cos(ringAngle)));
            const radX = Math.sin(ringAngle);
            const radY = cyDir;

            const alifCenterY = isUpper ? (cornerY + 0.14 * cornerTaper) : (cornerY - 0.14 * cornerTaper);
            const alifCenterZ = baseArchZ + 0.015 * cornerTaper;

            for (let iv = 0; iv <= LIP_SEGS_V; iv++) {
              const theta = (iv / LIP_SEGS_V) * Math.PI * 2;
              const cosT = Math.cos(theta), sinT = Math.sin(theta);
              const rOffset = sinT * tubeR;
              const zOffset = cosT * tubeR * 1.15;

              // In normal position (Alif/resting pose), use the same plump 3D lip shape as meem & baa
              const alifX = baseArchX;
              const alifY = alifCenterY + sinT * halfHeightY;
              const alifZ = alifCenterZ + cosT * halfThickZ;

              // In Waw makhraj position, use the original circular rounded lip position
              const targetX = cx + radX * rOffset;
              const targetY = cy + radY * rOffset;
              const targetZ = cz + zOffset;

              posArr[pPtr++] = alifX + (targetX - alifX) * makhrajMorphProgress;
              posArr[pPtr++] = alifY + (targetY - alifY) * makhrajMorphProgress;
              posArr[pPtr++] = alifZ + (targetZ - alifZ) * makhrajMorphProgress;

              let rL = 0.72, gL = 0.25, bL = 0.30;
              if (showMarker && activeLetter && activeLetter.id === 'waw') {
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

            let rL = 0.72;
            let gL = 0.25;
            let bL = 0.30;
            if (showMarker && activeLetter) {
              const lid = activeLetter.id;
              let pW = 0.0, sW = 0.0;
              if (lid === 'waw') {
                const innerRim = Math.max(0.0, -sinT) * Math.max(0.0, 1.0 - Math.pow(u / 0.55, 2));
                const outerRing = Math.max(0.0, cosT) * Math.max(0.0, 1.0 - Math.pow(u / 0.65, 2));
                pW = Math.min(0.85, innerRim * 0.90) * makhrajMorphProgress;
                sW = Math.min(0.65, outerRing * 0.65 * (1.0 - pW)) * makhrajMorphProgress;
              } else if (lid === 'faa' && !isUpper) {
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
      animFrameId: 0
    };

    // Orbit pointer events
    let isDragging = false;
    let cameraDirty = true;
    let prevPointer = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      // Touch events on mobile shouldn't change viewpoint outside the joystick button
      if (e.pointerType === 'touch') return;
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
      cameraDirty = true;
      updateCamPos();
    };

    const onPointerUp = () => { isDragging = false; };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camAnimRef.current = null;
      spherical.radius = Math.max(1.8, Math.min(6.5, spherical.radius + e.deltaY * 0.0025));
      cameraDirty = true;
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
          cameraDirty = true;
          updateCamPos();
        }
        prevTouchDist = dist;
      }
    };
    const onTouchEnd = () => { prevTouchDist = 0; };
    domEl.addEventListener('touchmove', onTouchMove);
    domEl.addEventListener('touchend', onTouchEnd);

    // Resize handler with ResizeObserver for fluid docking and mobile adjustments
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || 640;
      const h = containerRef.current.clientHeight || 420;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        forceDeformRef.current = true;
      }
    };
    window.addEventListener('resize', onResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            onResize();
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    const TEETH_ANATOMY_RGB: Record<number, [number, number, number]> = {
      0: [0.02, 0.71, 0.83],
      1: [0.06, 0.73, 0.51],
      2: [0.96, 0.62, 0.04],
      3: [0.66, 0.33, 0.97],
      4: [0.98, 0.45, 0.09],
      5: [0.98, 0.45, 0.09],
      6: [0.98, 0.45, 0.09],
      7: [0.93, 0.28, 0.60]
    };

    let lastTeethAnat: boolean | null = null;
    const updateTeethAnatomyColors = (isAnat: boolean) => {
      if (isAnat === lastTeethAnat) return;
      lastTeethAnat = isAnat;

      [upperTeethGroup, lowerTeethGroup].forEach(group => {
        group.children.forEach(child => {
          const mesh = child as THREE.Mesh;
          const colAttr = mesh.geometry?.attributes?.color;
          const base = mesh.userData?.baseColors as Float32Array | undefined;
          if (!colAttr || !base) return;
          const arr = colAttr.array as Float32Array;
          if (!isAnat) {
            arr.set(base);
          } else {
            const tRGB = TEETH_ANATOMY_RGB[mesh.userData.toothIndex] || [0.9, 0.9, 0.9];
            for (let i = 0; i < base.length; i += 3) {
              const lum = (base[i] + base[i + 1] + base[i + 2]) / 3.0;
              const shade = 0.36 + 0.84 * lum;
              arr[i] = tRGB[0] * shade;
              arr[i + 1] = tRGB[1] * shade;
              arr[i + 2] = tRGB[2] * shade;
            }
          }
          colAttr.needsUpdate = true;
        });
      });
    };

    // Highlight palate zones: either vibrant Anatomy divisions or Makhraj contact spots
    let lastPalateProg = -1;
    let lastPalateKey = '';
    const updatePalateMakhrajColors = (mProg: number) => {
      const lid = currentLetterRef.current.id;
      const isAnat = false;
      const showMarker = showMakhrajColorsRef.current && !isAnat;
      const stateKey = `${lid}|${showMarker}|${isAnat}`;
      const isMiddleLetter = (lid === 'jeem' || lid === 'sheen' || lid === 'yaa_cons');
      const isSafirLetter = (lid === 'saad' || lid === 'zaay' || lid === 'seen');
      const targetProg = (!isAnat && (isMiddleLetter || isSafirLetter) && showMarker) ? mProg : 0;
      if (stateKey === lastPalateKey && (isAnat || Math.abs(targetProg - lastPalateProg) < 0.002)) return;

      const wasAnat = lastPalateKey.endsWith('|true');
      lastPalateKey = stateKey;
      lastPalateProg = targetProg;

      const palateOp = isAnat ? 0.68 : 0.54;
      hardPalateMaterial.opacity = palateOp;
      softPalateMaterial.opacity = palateOp;

      if (isAnat) {
        [hardPalateMesh, softPalateMesh].forEach(pMesh => {
          const geom = pMesh.geometry;
          const base = geom.userData.baseColors as Float32Array | undefined;
          const uArr = geom.userData.uArray as Float32Array | undefined;
          const isSoftArr = geom.userData.isSoftArray as Uint8Array | undefined;
          if (!base || !uArr) return;
          const colArr = geom.attributes.color.array as Float32Array;
          for (let i = 0, vi = 0; i < base.length; i += 3, vi++) {
            const isSoft = isSoftArr ? isSoftArr[vi] === 1 : false;
            const u = uArr[vi];
            const pRGB = !isSoft
              ? (u <= BIO_ALVEOLAR_SHELF_U ? [0.92, 0.72, 0.42] : [0.22, 0.74, 0.97])
              : [0.75, 0.52, 0.99];
            const lum = (base[i] + base[i + 1] + base[i + 2]) / 3.0;
            const shade = 0.56 + 0.68 * lum;
            colArr[i] = pRGB[0] * shade;
            colArr[i + 1] = pRGB[1] * shade;
            colArr[i + 2] = pRGB[2] * shade;
          }
          geom.attributes.color.needsUpdate = true;
        });
        return;
      }

      if (wasAnat) {
        const sBase = softPalateMesh.geometry.userData.baseColors as Float32Array | undefined;
        if (sBase) {
          (softPalateMesh.geometry.attributes.color.array as Float32Array).set(sBase);
          softPalateMesh.geometry.attributes.color.needsUpdate = true;
        }
      }

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
    // RENDER / ANIMATION LOOP (Optimized for minimal CPU & low FOT)
    // ------------------------------------------------------------------------
    let lastTime = performance.now();
    let settleFrames = 4;

    const animate = (now: number) => {
      const animId = requestAnimationFrame(animate);
      if (sceneElementsRef.current) {
        sceneElementsRef.current.animFrameId = animId;
      }

      // When on Sifaat tab and 3D preview is closed, skip render calculations completely (0% CPU)
      if (activeMainTabRef.current !== 'makharij' && !sifaat3DOpenRef.current) {
        return;
      }

      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      let gearDelta = 0;

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
          settleFrames = 3;
        } else {
          const tNorm = Math.max(0.0, Math.min(1.0, elapsed / duration));
          const env = 0.5 * (1.0 - Math.cos(2.0 * Math.PI * tNorm));
          morphProgressRef.current = env;
          const simGears = currentLetterRef.current.gears;
          Object.keys(simGears).forEach(k => {
            if (k !== 'upperOpacity' && k !== 'greenPointPos') {
              const alifBase = ALIF_MAKHRAJ_GEARS[k] ?? 0;
              currentGearsRef.current[k] = alifBase + (simGears[k] - alifBase) * env;
            }
          });
          settleFrames = 3;
        }
      } else if (!isRestingAtAlifRef.current) {
        const morphDiff = Math.abs(1.0 - morphProgressRef.current);
        if (morphDiff > 0.002) {
          gearDelta += morphDiff;
          morphProgressRef.current += (1.0 - morphProgressRef.current) * Math.min(1, delta * 12);
        } else {
          morphProgressRef.current = 1.0;
        }
        Object.keys(targetGearsRef.current).forEach(k => {
          const diff = targetGearsRef.current[k] - currentGearsRef.current[k];
          if (Math.abs(diff) > 0.005) {
            gearDelta += Math.abs(diff);
            currentGearsRef.current[k] += diff * Math.min(1, delta * 10);
          } else {
            currentGearsRef.current[k] = targetGearsRef.current[k];
          }
        });
      }

      if (forceDeformRef.current || gearDelta > 0.001) {
        settleFrames = 3;
        forceDeformRef.current = false;
      }

      // Only recompute vertex deformation and normals when actively morphing or settling
      if (settleFrames > 0) {
        settleFrames--;
        cameraDirty = true;

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

      const activeLetter = currentLetterRef.current;
      lipsGroup.visible = Boolean(activeLetter.showLips);
      realLipMaterial.transparent = false;
      realLipMaterial.opacity = 1.0;
      realLipMaterial.depthWrite = true;
      if (lipsGroup.visible) {
        updateRealLipsGeometry(activeLetter.lipMode || 'bilabial_closed');
      }

      // Tongue vertices deformation
      const dorsalMode = activeLetter.dorsalMode || 'istila_cup';
      const isWideLateral = (activeLetter.id === 'saad' || (istilaFactor > 0.55 && dorsalMode === 'safir_hook'));
      const isNatiyyah = activeLetter.id === 'taa_heavy' || activeLetter.id === 'daal' || activeLetter.id === 'taa_light';
      const isAlveolar = activeLetter.id === 'laam' || activeLetter.id === 'noon' || activeLetter.id === 'raa';
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
            const activeDhaadMode = dhaadModeRef.current;
            const isPressedSide = (activeDhaadMode === 'both') || (activeDhaadMode === 'right' && isRightSide) || (activeDhaadMode === 'left' && isLeftSide);

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
            const activeDhaadMode = dhaadModeRef.current;
            const isPressedSide = (activeDhaadMode === 'both') || (activeDhaadMode === 'right' && isRightSide) || (activeDhaadMode === 'left' && isLeftSide);
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
          const dorsalLight = (sinT >= 0.0) ? (0.84 + 0.18 * Math.pow(sinT, 0.75)) : Math.max(0.34, 0.84 + sinT * 0.48);
          const sublingualArchShadow = (sinT < -0.05) ? (Math.pow(Math.min(1.0, (-0.05 - sinT) / 0.95), 1.1) * (0.30 + 0.14 * Math.sin(s * Math.PI))) : 0.0;
          const molarCushionWave = (s > 0.18 && s < 0.74 && Math.abs(cosT) > 0.45 && sinT > -0.25)
            ? (0.045 * Math.cos(s * 6.5 * Math.PI * 2) * Math.pow((Math.abs(cosT) - 0.45) / 0.55, 0.8)) : 0.0;
          const backSlopeShadow = Math.pow(Math.max(0.0, (0.28 - s) / 0.28), 1.4) * 0.15;
          const shadeT = Math.max(0.30, Math.min(1.06, dorsalLight - sublingualArchShadow - backSlopeShadow + molarCushionWave + pressMeatFactor * 0.05));

          let rT = 0.80 * shadeT;
          let gT = 0.26 * shadeT;
          let bT = 0.30 * shadeT;

          if (showAnatomyRef.current) {
            const absC = Math.abs(cosT);
            let zoneRGB = [0.49, 0.23, 0.93]; // Root: നാവിന്റെ മുരട് (#7c3aed)
            if (s > 0.68 && absC < 0.66) zoneRGB = [0.02, 0.59, 0.41]; // Tip: നാവിന്റെ തുമ്പ് (#059669)
            else if (absC >= 0.58 && s >= 0.16 && s <= 0.84 && sinT > -0.45) zoneRGB = [0.85, 0.47, 0.02]; // Sides: നാവിന്റെ അരിക് (#d97706)
            else if (s >= 0.36 && s <= 0.68) zoneRGB = [0.15, 0.39, 0.92]; // Middle: നാവിന്റെ മധ്യമം (#2563eb)

            const anatShade = Math.max(0.34, Math.min(1.06, shadeT * 1.08));
            rT = zoneRGB[0] * anatShade;
            gT = zoneRGB[1] * anatShade;
            bT = zoneRGB[2] * anatShade;
          } else if (showMakhrajColorsRef.current) {
            const lid = currentLetterRef.current.id;
            const absCos = Math.abs(cosT);
            const topMask = Math.max(0.0, Math.min(1.0, (sinT + 0.18) / 0.55));
            const edgeMask = Math.max(0.0, Math.min(1.0, (sinT + 0.38) / 0.55));
            let pW = 0.0, sW = 0.0;

            if (lid === 'dhaad') {
              const isRight = (cosT < 0);
              const isLeft = (cosT > 0);
              const activeDhaadMode = dhaadModeRef.current;
              const isPressed = (activeDhaadMode === 'both') || (activeDhaadMode === 'right' && isRight) || (activeDhaadMode === 'left' && isLeft);
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
        updateTeethAnatomyColors(false);
        tongueGeom.computeVertexNormals();
      }

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
        cameraDirty = true;
      }

      // Virtual joystick camera rotation (mobile analog control - inverted to exact opposite side with refined sensitivity)
      if (joystickDeltaRef.current && (joystickDeltaRef.current.x !== 0 || joystickDeltaRef.current.y !== 0)) {
        const speed = 1.15 * delta;
        spherical.theta += joystickDeltaRef.current.x * speed;
        spherical.phi = Math.max(0.25, Math.min(Math.PI - 0.25, spherical.phi - joystickDeltaRef.current.y * speed));
        cameraDirty = true;
        updateCamPos();
      }

      if (isDragging) {
        cameraDirty = true;
      }

      // Only render when scene is dirty (during morphing, dragging, settling, or camera animation)
      if (cameraDirty) {
        renderer.render(scene, camera);
        cameraDirty = false;
      }
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
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', onResize);
      if (domEl.parentNode) {
        domEl.parentNode.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, [resolvedTheme]);

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
        anatomyPartCol: 'العضو',
        anatomyLettersCol: 'حروف المخرج',
        selectLetter: 'اختر الحرف:',
        simulate: 'تشغيل',
        simulateTitle: 'تشغيل الحركة والصوت (ألف ← المخرج)',
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
        toggleLanguage: 'English',
        makharijTab: 'مخارج',
        sifaatTab: 'صفات',
        sifaatSectionTitle: 'صفات الحروف (أحكام التجويد الصوتية)',
        sifaatSectionDesc: 'الصفات الصوتية اللازمة التي تميز الحروف المشتركة في المخرج الواحد وتحدد كيفيات خروجها.',
        withOppositesTitle: '١. الصفات المتضادة (ٱلصِّفَاتُ الْمُتَضَادَّةُ — ٤ أزواج)',
        withoutOppositesTitle: '٢. الصفات التي لا ضد لها (ٱلصِّفَاتُ الَّتِى لَيْسَ لَهَا الْأَضْدَادُ — ٧ صفات)',
        characteristicCol: 'الصفة',
        literalCol: 'المعنى اللغوي (مَعْنًى)',
        technicalCol: 'المعنى الاصطلاحي (سَانْكِيتِكَ أَرْتَهَمْ)',
        lettersCol: 'الحروف (حَرْفُكَلْ)',
        mnemonicCol: 'العبارة المجمِّعة',
        modalLettersTitle: 'الحروف المشتركة في هذه الصفة:',
        openIn3D: 'عرض في المخرج ثلاثي الأبعاد',
        close: 'إغلاق',
        letterSifaatTitle: 'صفات الحرف:',
        clickToExplain: 'انقر للشرح',
        filterAll: 'الكل (١٦)',
        filterOpposite: 'المتضادة (٤ أزواج)',
        filterNonOpposite: 'غير المتضادة (٧)'
      };
    }
    if (lang === 'ml') {
      return {
        studioTitle: '3D തജ്‌വീദ് സ്റ്റുഡിയോ',
        anatomy: 'നാവിന്റെ ഭാഗങ്ങൾ',
        anatomyPartCol: 'ഭാഗം',
        anatomyLettersCol: 'ഹർഫുകൾ',
        selectLetter: 'ഹർഫ് (الحرف):',
        simulate: 'പ്ലേ',
        simulateTitle: 'ഉച്ചാരണ ചലനവും ശബ്ദവും പ്ലേ ചെയ്യുക',
        resetView: 'റീസെറ്റ്',
        makhrajColors: 'മഖ്റജ് അടയാളങ്ങൾ',
        palate: 'അണ്ണാക്ക്',
        upperTeeth: 'മേൽപല്ലുകൾ',
        lowerTeeth: 'കീഴ്‌പല്ലുകൾ',
        dhaadVariants: 'ളാദ് (ض) ഉച്ചാരണത്തിന്റെ 3 രീതികൾ:',
        dhaadRight: '1. വലതുഭാഗത്തെ അണപ്പല്ലുകൾ',
        dhaadLeft: '2. ഇടതുഭാഗത്തെ അണപ്പല്ലുകൾ',
        dhaadBoth: '3. ഇരുഭാഗത്തെയും അണപ്പല്ലുകൾ',
        shajariyyahNotice: 'നടുനാവിന്റെ അക്ഷരങ്ങൾ:',
        jeemLabel: '1. ജീം (ജ)',
        sheenLabel: '2. ശീൻ (ശ)',
        yaaLabel: '3. യാഅ് (യ)',
        controls: 'ഉച്ചാരണ നിയന്ത്രണം',
        reset: 'യഥാർത്ഥ അവസ്ഥ',
        firmPress: 'ശക്തിയായി അമർത്തൽ',
        gentleTouch: 'നേർത്ത സ്പർശനം',
        gumShelfBadge: 'മോണ',
        tongueBadge: 'നാവ്',
        toggleLanguage: 'English',
        makharijTab: 'മഖാരിജ്',
        sifaatTab: 'സ്വിഫാത്ത്',
        sifaatSectionTitle: 'സ്വിഫത്തുകൾ (അക്ഷരങ്ങളുടെ വിശേഷണങ്ങൾ)',
        sifaatSectionDesc: 'ഒരു മഖ്റജിൽ നിന്ന് പുറപ്പെടുന്ന അക്ഷരങ്ങളെ വേർതിരിക്കുന്ന സ്വഭാവഗുണങ്ങൾ.',
        withOppositesTitle: '1. വിപരീതമുള്ള ഗുണങ്ങൾ (4 ജോടികൾ)',
        withoutOppositesTitle: '2. വിപരീതമില്ലാത്ത ഗുണങ്ങൾ (7 എണ്ണം)',
        characteristicCol: 'സ്വിഫത്ത്',
        literalCol: 'അർത്ഥം',
        technicalCol: 'സാങ്കേതിക അർത്ഥം',
        lettersCol: 'ഹർഫുകൾ',
        mnemonicCol: 'സൂചന വാക്യം',
        modalLettersTitle: 'ഈ സ്വിഫത്തുള്ള ഹർഫുകൾ:',
        openIn3D: 'മഖ്റജിൽ കാണുക',
        close: 'അടയ്ക്കുക',
        letterSifaatTitle: 'സ്വിഫാത്തുകൾ (صفات الحرف):',
        clickToExplain: 'വിശദീകരണത്തിന് ക്ലിക്ക് ചെയ്യുക',
        filterAll: 'എല്ലാം (16)',
        filterOpposite: 'വിപരീതമുള്ളവ (4 ജോടികൾ)',
        filterNonOpposite: 'വിപരീതമില്ലാത്തവ (7)'
      };
    }
    return {
      studioTitle: '3D Tajweed Studio',
      anatomy: 'Anatomy Parts (أقسام الفم)',
      anatomyPartCol: 'Part',
      anatomyLettersCol: 'Letters',
      selectLetter: 'Letter (الحرف):',
      simulate: 'Play',
      simulateTitle: 'Play Motion & Sound (ألف ← المخرج)',
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
      toggleLanguage: 'عربي',
      makharijTab: 'Makharij',
      sifaatTab: 'Sifaat',
      sifaatSectionTitle: 'Sifaat al-Huroof (Characteristics of Arabic Letters)',
      sifaatSectionDesc: 'The essential phonetic attributes that distinguish letters sharing the same Makhraj.',
      withOppositesTitle: '1. Characteristics with Opposites (ٱلصِّفَاتُ الْمُتَضَادَّةُ — 4 Pairs)',
      withoutOppositesTitle: '2. Characteristics without Opposites (ٱلصِّفَاتُ الَّتِى لَيْسَ لَهَا الْأَضْدَادُ — 7 Sifaat)',
      characteristicCol: 'Characteristic (الصفة)',
      literalCol: 'Literal Meaning (المعنى اللغوي)',
      technicalCol: 'Technical Meaning (المعنى الاصطلاحي)',
      lettersCol: 'Letters (الحروف)',
      mnemonicCol: 'Mnemonic (العبارة)',
      modalLettersTitle: 'Letters with this characteristic:',
      openIn3D: 'View in 3D Makhraj',
      close: 'Close',
      letterSifaatTitle: 'Letter Sifaat (صفات الحرف):',
      clickToExplain: 'Click for details',
      filterAll: 'All (16)',
      filterOpposite: 'With Opposites (4 Pairs)',
      filterNonOpposite: 'Without Opposites (7)'
    };
  }, [lang]);

  const selectLetterByArabic = (ltr: string) => {
    const preset = findPresetByLetter(ltr);
    if (preset) selectLetter(preset);
  };

  // Click handler for letters in Sifaat tab: shows 3D makhraj at top-right without redirecting to Makharij tab
  const handleSifaatLetterClick = (ltr: string) => {
    const preset = findPresetByLetter(ltr);
    if (preset) {
      selectLetter(preset);
      setSifaat3DOpen(true);
      triggerSimulation();
    }
  };

  const renderAnatomyRows = (items: AnatomyLabelItem[]) =>
    items.map(item => {
      const partColor = resolvedTheme === 'dark' ? item.hex : (item.lightTextHex || item.hex);
      return (
        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors">
          <td className="py-1.5 px-2.5 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 font-bold text-xs" style={{ color: partColor }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20" style={{ backgroundColor: item.hex }} />
              <span>{lang === 'ar' ? item.ar : lang === 'ml' ? item.ml : item.en}</span>
            </span>
          </td>
          <td className="py-1 px-2">
            <div className="flex flex-wrap items-center gap-1">
              {item.letters.map(ltr => {
                const isActive = currentLetter.letter === ltr;
                return (
                  <button
                    key={ltr}
                    type="button"
                    onClick={() => selectLetterByArabic(ltr)}
                    className={`arabic-font text-sm font-bold min-w-[24px] h-6 px-1.5 rounded-lg border transition-all leading-none flex items-center justify-center active:scale-95 ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-gray-800/80 hover:scale-105'
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: item.hex, borderColor: item.hex }
                        : { color: partColor, borderColor: `${item.hex}45` }
                    }
                  >
                    {ltr}
                  </button>
                );
              })}
            </div>
          </td>
        </tr>
      );
    });

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 flex flex-col relative selection:bg-emerald-500 selection:text-white ${lang === 'ar' ? 'font-serif lang-ar' : lang === 'ml' ? 'lang-ml' : 'lang-en'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-950/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-sky-200/30 dark:bg-sky-950/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-950/20 rounded-full blur-[140px]" />
      </div>

      <main className="flex-1 max-w-[1500px] w-full mx-auto px-3 sm:px-5 py-4 flex flex-col gap-3 relative z-10">

        {/* Clean Studio Header */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t.studioTitle}</span>
            </h1>

            {/* Navigation Tabs near Headline: Makharijul Huroof & Sifaat al-Huroof */}
            <div className="flex items-center p-1 bg-slate-100/90 dark:bg-gray-800/90 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveMainTab('makharij');
                  setSifaat3DOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeMainTab === 'makharij'
                    ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-gray-700 font-black'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{t.makharijTab}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMainTab('sifaat')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeMainTab === 'sifaat'
                    ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-gray-700 font-black'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.sifaatTab}</span>
              </button>
            </div>
          </div>

          {/* Language Selector: English | العربية | മലയാളം */}
          <div className="flex items-center p-1 bg-slate-100/90 dark:bg-gray-800/90 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                lang === 'en'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-gray-700 font-black'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('ar')}
              className={`px-2.5 py-1 rounded-xl transition-all arabic-font ${
                lang === 'ar'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-gray-700 font-black'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('ml')}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                lang === 'ml'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-gray-700 font-black'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              മലയാളം
            </button>
          </div>
        </div>

        {/* Desktop 2-Column Layout (Makharijul Huroof: 3D Simulator & Letter Controls) */}
        <div className={activeMainTab === 'makharij' ? "grid grid-cols-1 lg:grid-cols-12 gap-3 items-start" : sifaat3DOpen ? "contents" : "hidden"}>

          {/* Left Column (Desktop): Letter Selection + 3D Viewport + 2 Divs under 3D */}
          <div className={activeMainTab === 'makharij' ? "lg:col-span-7 flex flex-col gap-3" : sifaat3DOpen ? "contents" : "hidden"}>

            {/* 22 Arabic Letters Bar (in mouth order: from Qaaf ق to Waw و) */}
            <section className={activeMainTab === 'makharij' ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-2.5 sm:p-3 shadow-sm flex flex-col gap-2" : "hidden"}>
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
                      className={`min-w-[3.25rem] h-12 sm:h-14 px-3.5 py-1 rounded-2xl font-bold transition-all flex items-center justify-center shrink-0 border active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20 scale-105'
                          : 'bg-slate-100/80 dark:bg-gray-800/80 text-slate-700 dark:text-gray-300 border-slate-200/60 dark:border-gray-700 hover:bg-slate-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="arabic-font text-3xl sm:text-4xl leading-none font-bold">{preset.letter}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3D Viewport Section: Either embedded in Makharij tab, or floating at the top-right corner in Sifaat tab */}
            <section
              className={
                activeMainTab === 'makharij'
                  ? "flex flex-col gap-2"
                  : sifaat3DOpen
                  ? "fixed top-18 sm:top-20 right-3 sm:right-6 z-40 w-[330px] sm:w-[380px] lg:w-[420px] max-w-[calc(100vw-1.5rem)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 select-none"
                  : "hidden"
              }
            >
              {/* Sifaat Top-Right Floating Header (Only visible when floating in Sifaat tab) */}
              {activeMainTab === 'sifaat' && (
                <div className="flex items-center justify-between p-3 border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center arabic-font text-2xl font-bold text-indigo-600 dark:text-indigo-400 select-none shrink-0 shadow-xs leading-none">
                      {currentLetter.letter}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {lang === 'ar' ? currentLetter.ar.title : lang === 'ml' ? (currentLetter.ml?.title || currentLetter.ar.title) : currentLetter.en.title}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                        {lang === 'ar' ? currentLetter.ar.category : lang === 'ml' ? (currentLetter.ml?.category || currentLetter.ar.category) : currentLetter.en.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={triggerSimulation}
                      disabled={isPlayingSimulation}
                      title={t.simulateTitle}
                      className={`px-2.5 py-1.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 transition-all select-none ${
                        isPlayingSimulation
                          ? 'bg-emerald-700/80 text-white/80 cursor-not-allowed opacity-90'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                      }`}
                    >
                      <Play className={`w-3 h-3 fill-current ${isPlayingSimulation ? 'animate-pulse' : ''}`} />
                      <span>{t.simulate}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMainTab('makharij');
                        setSifaat3DOpen(false);
                      }}
                      title={lang === 'ar' ? 'عرض في استوديو المخارج الكامل' : lang === 'ml' ? 'പൂർണ്ണ മഖ്റജ് പേജിലേക്ക് പോകുക' : 'Open in Full Makharij Studio'}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-gray-800 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSifaat3DOpen(false)}
                      title={lang === 'ar' ? 'إغلاق' : lang === 'ml' ? 'അടയ്ക്കുക' : 'Close'}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 3D Canvas Container */}
              <div
                className={`bg-slate-100 dark:bg-gray-950 overflow-hidden shadow-inner border-slate-200/80 dark:border-gray-800 relative w-full ${
                  activeMainTab === 'makharij'
                    ? "rounded-3xl border h-[360px] sm:h-[420px] lg:h-[460px]"
                    : "h-[220px] sm:h-[260px]"
                }`}
              >
                <div
                  ref={containerRef}
                  className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
                />

                {/* Mobile Virtual Joystick Controller (stepped down into the exact corner without '3D' text) */}
                <div
                  className="flex md:hidden absolute bottom-1.5 right-1.5 z-20 select-none pointer-events-auto"
                  title={lang === 'ar' ? 'عصا التحكم في المنظور ثلاثي الأبعاد' : lang === 'ml' ? 'കാഴ്ച നിയന്ത്രിക്കാനുള്ള ജോയ്സ്റ്റിക്' : 'Camera Joystick'}
                >
                  <div
                    onPointerDown={handleJoystickPointerDown}
                    onPointerMove={handleJoystickPointerMove}
                    onPointerUp={handleJoystickPointerUp}
                    onPointerCancel={handleJoystickPointerUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className={`relative w-15 h-15 rounded-full backdrop-blur-md border shadow-xl flex items-center justify-center touch-none transition-all cursor-pointer ${
                      isJoystickActive
                        ? 'bg-slate-900/85 dark:bg-black/90 border-emerald-400 scale-105 shadow-emerald-500/30 ring-2 ring-emerald-400/30'
                        : 'bg-slate-900/55 dark:bg-black/65 border-white/35 dark:border-white/20 hover:border-white/60'
                    }`}
                    style={{ touchAction: 'none' }}
                  >
                    {/* Direction Indicators */}
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1 rounded-full bg-white/40" />
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1 rounded-full bg-white/40" />
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1.5 rounded-full bg-white/40" />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1.5 rounded-full bg-white/40" />

                    {/* Joystick Inner Knob */}
                    <div
                      className={`w-7 h-7 rounded-full shadow-md flex items-center justify-center border transition-transform ${
                        isJoystickActive
                          ? 'bg-emerald-400 text-slate-950 border-white shadow-emerald-400/50 scale-110'
                          : 'bg-white/95 dark:bg-gray-200 text-slate-700 border-white/70'
                      }`}
                      style={{
                        transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
                        willChange: 'transform'
                      }}
                    >
                      <Compass className="w-3.5 h-3.5 opacity-90" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sifaat Top-Right Floating Footer (Only visible when floating in Sifaat tab) */}
              {activeMainTab === 'sifaat' && (
                <div className="p-2.5 bg-slate-50/80 dark:bg-gray-950/60 border-t border-slate-200/70 dark:border-gray-800 flex flex-col gap-1.5 text-xs">
                  <p className="text-[11px] text-slate-600 dark:text-gray-300 leading-snug">
                    {lang === 'ar' ? currentLetter.ar.desc : lang === 'ml' ? (currentLetter.ml?.desc || currentLetter.ar.desc) : currentLetter.en.desc}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-gray-800/80 text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#0d6828]" />
                        <span>{t.firmPress}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#7be89a]" />
                        <span>{t.gentleTouch}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#eab368]" />
                        <span>{t.palate}</span>
                      </span>
                    </div>
                    <span>{lang === 'ar' ? 'سحب للتدوير' : lang === 'ml' ? 'തിരിക്കാൻ ഡ്രാഗ്' : 'Drag to rotate'}</span>
                  </div>
                </div>
              )}

              {/* Div 1 & Div 2 under 3D Section (Only visible when on Makharij tab) */}
              {activeMainTab === 'makharij' && (
                <>
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

                    {/* Viewport Actions: Play (Simulate Motion & Sound) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={triggerSimulation}
                        disabled={isPlayingSimulation}
                        title={t.simulateTitle}
                        aria-label={t.simulateTitle}
                        className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 select-none ${
                          isPlayingSimulation
                            ? 'bg-emerald-700/80 text-white/80 shadow-emerald-700/20 cursor-not-allowed opacity-90'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                        }`}
                      >
                        <Play className={`w-3.5 h-3.5 fill-current ${isPlayingSimulation ? 'animate-pulse' : ''}`} />
                        <span>{t.simulate}</span>
                      </button>
                    </div>
                  </div>

                  {/* Div 2 under 3D Section: Color-Matched Anatomy Table OR Minimal Color Guide */}
                  {showAnatomy ? (
                    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 dark:bg-gray-800/70 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200/80 dark:border-gray-800">
                            <th className="py-2 px-3 text-start">{t.anatomyPartCol}</th>
                            <th className="py-2 px-3 text-start">{t.anatomyLettersCol}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                          {renderAnatomyRows(ANATOMY_LABELS_DATA)}
                        </tbody>
                      </table>
                    </div>
                  ) : (
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
                        {lang === 'ar' ? 'سحب للتدوير • عجلة للتقريب' : lang === 'ml' ? 'തിരിക്കാൻ ഡ്രാഗ് ചെയ്യുക • സൂം ചെയ്യാൻ വീൽ തിരിക്കുക' : 'Drag to rotate • Wheel to zoom'}
                      </span>
                    </div>
                  )}
                </>
              )}

            </section>

          </div>

          {/* Right Column (Desktop): Selected Letter Info & Controls */}
          <div className={activeMainTab === 'makharij' ? "lg:col-span-5 flex flex-col gap-3" : "hidden"}>

            {/* Selected Letter Information (Small, Compact Space) */}
            <section className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-3.5 sm:p-4 shadow-sm flex flex-col gap-2.5">
              <div className="flex flex-col items-center justify-center text-center gap-2 py-1">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center arabic-font text-5xl sm:text-6xl font-bold text-indigo-600 dark:text-indigo-400 select-none shadow-sm leading-none"
                >
                  {currentLetter.letter}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? currentLetter.ar.title : lang === 'ml' ? (currentLetter.ml?.title || currentLetter.ar.title) : currentLetter.en.title}
                </h2>
              </div>

              {/* Makhraj Articulation Description */}
              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-gray-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-gray-700/60 text-center">
                {lang === 'ar' ? currentLetter.ar.desc : lang === 'ml' ? (currentLetter.ml?.desc || currentLetter.en.desc) : currentLetter.en.desc}
              </p>

              {/* Sifaat al-Huroof of Active Letter (Clickable Chips) */}
              <div className="bg-slate-50/80 dark:bg-gray-800/40 rounded-2xl p-2.5 border border-slate-100 dark:border-gray-700/60 flex flex-col gap-1.5">
                <span className="font-bold text-[11px] text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.letterSifaatTitle}</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {getSifaatForLetter(currentLetter.letter).map(sifah => (
                    <button
                      key={sifah.id}
                      type="button"
                      onClick={() => setSelectedSifah(sifah)}
                      title={`${lang === 'ar' ? sifah.ar : lang === 'ml' ? sifah.literalMl : sifah.literalEn} (${sifah.ar})`}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all flex items-center justify-center active:scale-95 hover:scale-105 shadow-sm ${sifah.chipClass}`}
                    >
                      <span className="arabic-font text-xl sm:text-2xl font-bold leading-none">{sifah.ar}</span>
                    </button>
                  ))}
                </div>
              </div>



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

        {/* Tab 2: Sifaat View (Phonetic Rules) */}
        {activeMainTab === 'sifaat' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-150">
            {/* 1. Characteristics with Opposites (ٱلصِّفَاتُ الْمُتَضَادَّةُ — 4 Pairs) */}
            <section className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span>{t.withOppositesTitle}</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {lang === 'ar' ? '٤ أزواج متقابلة (٩ صفات)' : lang === 'ml' ? '4 ജോടികൾ (9 സ്വിഫത്തുകൾ)' : '4 Opposite Pairs (9 Sifaat)'}
                  </span>
                </div>

                {/* 4 Pairs Cards Stack */}
                <div className="flex flex-col gap-4">
                  {OPPOSITE_PAIRS.map(pair => {
                    const items = pair.itemIds
                      .map(id => SIFAAT_DATA.find(s => s.id === id))
                      .filter((s): s is SifahItem => Boolean(s));

                    return (
                      <div
                        key={pair.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-gray-800/40 border border-slate-200/70 dark:border-gray-800 flex flex-col gap-3"
                      >
                        {/* Pair Header Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-200/60 dark:border-gray-700/60">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              {pair.pairNo}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {lang === 'ar' ? pair.titleAr : lang === 'ml' ? pair.titleMl : pair.titleEn}
                            </h4>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-gray-400">
                            {lang === 'ar' ? pair.descAr : lang === 'ml' ? pair.descMl : pair.descEn}
                          </span>
                        </div>

                        {/* Side-by-side Opposing Cards Grid */}
                        <div className={`grid grid-cols-1 ${items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3 items-stretch`}>
                          {items.map(item => (
                            <div
                              key={item.id}
                              className="group p-3 sm:p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-700/80 shadow-sm flex flex-col justify-between gap-2.5 text-start"
                            >
                              <div className="flex flex-col gap-2">
                                {/* Card Header: Chip + Meaning */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border font-bold text-xs shadow-sm ${item.chipClass}`}>
                                    <span className="arabic-font text-2xl sm:text-3xl font-bold leading-none">{item.ar}</span>
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-gray-700">
                                    {lang === 'ar' ? item.literalAr : lang === 'ml' ? item.literalMl : item.literalEn}
                                  </span>
                                </div>

                                {item.tonguePartEn && (
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                      <span>👅</span>
                                      <span>{lang === 'ar' ? item.tonguePartAr : lang === 'ml' ? (item.tonguePartMl || item.tonguePartEn) : item.tonguePartEn}</span>
                                    </span>
                                  </div>
                                )}

                                {/* Rule / Technical Definition */}
                                <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                                  {lang === 'ar' ? item.technicalAr : lang === 'ml' ? item.technicalMl : item.technicalEn}
                                </p>
                              </div>

                              {/* Letters & Mnemonic */}
                              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-gray-800">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  {item.letters.map((ltr, lIdx) => (
                                    <button
                                      key={lIdx}
                                      type="button"
                                      onClick={() => handleSifaatLetterClick(ltr)}
                                      className="arabic-font text-2xl sm:text-3xl font-bold min-w-[2.75rem] h-11 sm:min-w-[3.25rem] sm:h-12 px-2 rounded-xl bg-slate-100 hover:bg-emerald-600 dark:bg-gray-800 dark:hover:bg-emerald-600 text-slate-800 dark:text-gray-200 hover:text-white dark:hover:text-white border border-slate-200 dark:border-gray-700 flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer leading-none"
                                      title={lang === 'ar' ? `عرض مخرج حرف ${ltr}` : lang === 'ml' ? `${ltr} ന്റെ മഖ്റജ് കാണുക` : `View Makhraj of ${ltr}`}
                                    >
                                      {ltr}
                                    </button>
                                  ))}
                                </div>
                                {item.mnemonic && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <span className="text-xs font-semibold text-slate-400">{lang === 'ar' ? 'الضابط:' : lang === 'ml' ? 'സൂചന വാക്യം:' : 'Mnemonic:'}</span>
                                    <span className="arabic-font text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-800/60 leading-none">
                                      ({item.mnemonic})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

            {/* 2. Characteristics without Opposites (ٱلصِّفَاتُ الَّتِى لَيْسَ لَهَا الْأَضْدَادُ) */}
            <section className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200/80 dark:border-gray-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>{t.withoutOppositesTitle}</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {lang === 'ar' ? '٧ صفات فردية لازمة' : lang === 'ml' ? '7 ഒറ്റപ്പെട്ട സ്വിഫത്തുകൾ' : '7 Individual Sifaat'}
                  </span>
                </div>

                {/* 7 Non-Opposite Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SIFAAT_DATA.filter(s => s.category === 'non_opposite').map(item => (
                    <div
                      key={item.id}
                      className="group p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between gap-2.5 text-start"
                    >
                      <div className="flex flex-col gap-2">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border font-bold text-xs shadow-sm ${item.chipClass}`}>
                            <span className="arabic-font text-2xl sm:text-3xl font-bold leading-none">{item.ar}</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-gray-700">
                            {lang === 'ar' ? item.literalAr : lang === 'ml' ? item.literalMl : item.literalEn}
                          </span>
                        </div>

                        {item.tonguePartEn && (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              <span>👅</span>
                              <span>{lang === 'ar' ? item.tonguePartAr : lang === 'ml' ? (item.tonguePartMl || item.tonguePartEn) : item.tonguePartEn}</span>
                            </span>
                          </div>
                        )}

                        {/* Meaning */}
                        <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                          {lang === 'ar' ? item.technicalAr : lang === 'ml' ? item.technicalMl : item.technicalEn}
                        </p>
                      </div>

                      {/* Letters & Mnemonic */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-gray-800">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {item.letters.map((ltr, lIdx) => (
                            <button
                              key={lIdx}
                              type="button"
                              onClick={() => handleSifaatLetterClick(ltr)}
                              className="arabic-font text-2xl sm:text-3xl font-bold min-w-[2.75rem] h-11 sm:min-w-[3.25rem] sm:h-12 px-2 rounded-xl bg-slate-100 hover:bg-emerald-600 dark:bg-gray-800 dark:hover:bg-emerald-600 text-slate-800 dark:text-gray-200 hover:text-white dark:hover:text-white border border-slate-200 dark:border-gray-700 flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer leading-none"
                              title={lang === 'ar' ? `عرض مخرج حرف ${ltr}` : lang === 'ml' ? `${ltr} ന്റെ മഖ്റജ് കാണുക` : `View Makhraj of ${ltr}`}
                            >
                              {ltr}
                            </button>
                          ))}
                        </div>
                        {item.mnemonic && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-slate-400">{lang === 'ar' ? 'الضابط:' : lang === 'ml' ? 'സൂചന വാക്യം:' : 'Mnemonic:'}</span>
                            <span className="arabic-font text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-800/60 leading-none">
                              ({item.mnemonic})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
          </div>
        )}

        {/* Sifah Explanation Modal (Ultra-Clean, Zero Repetition) */}
        {selectedSifah && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setSelectedSifah(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md w-full flex flex-col gap-4 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar"
              onClick={e => e.stopPropagation()}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Header: Sifah Name + Literal Meaning + Meta & Close */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="arabic-font text-4xl sm:text-5xl font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedSifah.ar}
                    </span>
                    <span className="text-sm font-semibold text-slate-600 dark:text-gray-300">
                      ({lang === 'ar' ? selectedSifah.literalAr : lang === 'ml' ? selectedSifah.literalMl : selectedSifah.literalEn})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                    {selectedSifah.category === 'opposite' ? (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {lang === 'ar'
                          ? `ضدها: ${selectedSifah.oppositeNameAr || ''}`
                          : lang === 'ml'
                          ? `എതിർ ഗുണം: ${selectedSifah.oppositeNameMl || selectedSifah.oppositeNameEn || ''}`
                          : `Opposite: ${selectedSifah.oppositeNameEn || ''}`}
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {lang === 'ar' ? 'لا ضد لها' : lang === 'ml' ? 'വിപരീതമില്ലാത്തത്' : 'No opposite'}
                      </span>
                    )}
                    {selectedSifah.tonguePartEn && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          {lang === 'ar' ? selectedSifah.tonguePartAr : lang === 'ml' ? (selectedSifah.tonguePartMl || selectedSifah.tonguePartEn) : selectedSifah.tonguePartEn}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSifah(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-slate-500 dark:text-gray-400 transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Single Technical Rule Card (with integrated Mnemonic if available) */}
              <div className="bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-gray-800 flex flex-col gap-2.5">
                <p className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed font-normal">
                  {lang === 'ar' ? selectedSifah.technicalAr : lang === 'ml' ? selectedSifah.technicalMl : selectedSifah.technicalEn}
                </p>

                {selectedSifah.mnemonic && (
                  <div className="pt-2.5 border-t border-slate-200/80 dark:border-gray-700/80 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                      {lang === 'ar' ? 'العبارة:' : lang === 'ml' ? 'സൂചന:' : 'Mnemonic:'}
                    </span>
                    <span className="arabic-font text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                      {selectedSifah.mnemonic}
                    </span>
                  </div>
                )}
              </div>

              {/* Letters */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-gray-400">
                  {lang === 'ar' ? 'الحروف' : lang === 'ml' ? 'ഹർഫുകൾ' : 'Letters'} ({selectedSifah.letters.length})
                </span>

                <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/70 dark:border-gray-800">
                  {selectedSifah.letters.map((ltr, idx) => {
                    const isCurrent = currentLetter.letter === ltr;
                    const preset = LETTER_PRESETS.find(p => p.letter === ltr);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleSifaatLetterClick(ltr);
                          setSelectedSifah(null);
                        }}
                        className={`arabic-font text-3xl font-bold w-14 h-14 rounded-2xl border flex items-center justify-center transition-all active:scale-95 leading-none ${
                          isCurrent
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-400/30'
                            : preset
                            ? 'bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-200 border-slate-200 dark:border-gray-700 hover:border-emerald-400 hover:scale-105'
                            : 'bg-slate-100 dark:bg-gray-800 text-slate-400 border-transparent cursor-default'
                        }`}
                        title={ltr}
                      >
                        {ltr}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

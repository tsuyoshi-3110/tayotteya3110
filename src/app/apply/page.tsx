// app/job/apply/page.tsx
"use client";

import JobApplyForm from "@/components/job/JobApplyForm";
import { useThemeGradient } from "@/lib/useThemeGradient";
import { THEMES, ThemeKey } from "@/lib/themes";
import clsx from "clsx";
import { useUILang, type UILang } from "@/lib/atoms/uiLangAtom";

const DARK_KEYS: ThemeKey[] = ["brandH", "brandG", "brandI"];

/** 事前定義の文言（全言語） */
const STRINGS: Record<UILang, { title: string; subtitle: string }> = {
  ja: {
    title: "求人応募フォーム",
    subtitle:
      "必要事項をご入力のうえ送信してください。後日、担当者よりご連絡差し上げます。",
  },
  en: {
    title: "Job Application Form",
    subtitle: "Please fill in the required fields and submit. We will contact you soon.",
  },
  zh: {
    title: "求职申请表",
    subtitle: "请填写必要信息并提交。我们将尽快与您联系。",
  },
  "zh-TW": {
    title: "求職申請表",
    subtitle: "請填寫必要資訊並送出。我們將儘速與您聯繫。",
  },
  ko: {
    title: "채용 지원 폼",
    subtitle: "필수 항목을 작성 후 제출해 주세요. 담당자가 곧 연락드립니다.",
  },
  fr: {
    title: "Formulaire de candidature",
    subtitle:
      "Veuillez remplir les champs requis puis envoyer. Nous vous recontacterons prochainement.",
  },
  es: {
    title: "Formulario de solicitud de empleo",
    subtitle:
      "Complete los campos requeridos y envíe. Nos pondremos en contacto con usted.",
  },
  de: {
    title: "Bewerbungsformular",
    subtitle:
      "Bitte füllen Sie die erforderlichen Felder aus und senden Sie das Formular ab. Wir melden uns bei Ihnen.",
  },
  pt: {
    title: "Formulário de candidatura",
    subtitle:
      "Preencha os campos obrigatórios e envie. Entraremos em contato em breve.",
  },
  it: {
    title: "Modulo di candidatura",
    subtitle:
      "Compila i campi richiesti e invia. Ti contatteremo a breve.",
  },
  ru: {
    title: "Форма заявки на работу",
    subtitle:
      "Пожалуйста, заполните обязательные поля и отправьте. Мы свяжемся с вами.",
  },
  th: {
    title: "แบบฟอร์มสมัครงาน",
    subtitle: "กรุณากรอกข้อมูลที่จำเป็นและส่ง เราจะติดต่อกลับโดยเร็ว",
  },
  vi: {
    title: "Biểu mẫu ứng tuyển",
    subtitle: "Vui lòng điền các trường bắt buộc và gửi. Chúng tôi sẽ liên hệ sớm.",
  },
  id: {
    title: "Formulir lamaran kerja",
    subtitle: "Silakan isi kolom wajib lalu kirim. Kami akan segera menghubungi Anda.",
  },
  hi: {
    title: "नौकरी आवेदन फ़ॉर्म",
    subtitle:
      "कृपया आवश्यक फ़ील्ड भरकर भेजें। हम आपसे जल्द संपर्क करेंगे।",
  },
  ar: {
    title: "نموذج التقديم على الوظيفة",
    subtitle:
      "يرجى تعبئة الحقول المطلوبة ثم الإرسال. سنتواصل معك قريبًا.",
  },
};

export default function JobApplyPage() {
  const { uiLang } = useUILang();
  const t = STRINGS[uiLang] ?? STRINGS.ja;
  const dir = uiLang === "ar" ? "rtl" : "ltr";

  const gradient = useThemeGradient();
  const isDark =
    !!gradient &&
    DARK_KEYS.includes(
      (Object.keys(THEMES).find((k) => THEMES[k as ThemeKey] === gradient) as ThemeKey) ??
        "brandA"
    );
  const textClass = isDark ? "text-white" : "text-black";

  return (
    <div className={clsx("max-w-3xl mx-auto p-4 space-y-6", textClass)} dir={dir}>
      <h1 className="text-xl font-bold">{t.title}</h1>
      <p className="text-sm opacity-80">{t.subtitle}</p>
      <JobApplyForm />
    </div>
  );
}

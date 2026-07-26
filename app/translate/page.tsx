'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Square, Stethoscope, User, Volume2 } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { MicButton } from '@/components/MicButton'
import { cn } from '@/lib/utils'

// All on-screen text for this mode, per language, so the patient can use the
// whole screen — including the doctor tab — in the language they chose.
type Strings = {
  /** "This is a translation aid, not a replacement for a qualified interpreter." */
  interpreterNote: string
  patient: string
  doctor: string
  patientHint: string
  doctorHint: string
  translating: string
  failed: string
  readAloud: string
  stop: string
}

const STRINGS: Record<string, Strings> = {
  en: {
    interpreterNote: 'This is a translation aid, not a replacement for a qualified interpreter.',
    patient: 'Patient',
    doctor: 'Doctor',
    patientHint:
      'Tap the microphone and speak in your language. Show your doctor the English translation.',
    doctorHint:
      'The doctor taps the microphone and speaks in English. The translation appears in your language.',
    translating: 'Translating…',
    failed: 'Translation failed. Please try recording again.',
    readAloud: 'Read aloud',
    stop: 'Stop',
  },
  ar: {
    interpreterNote: 'هذه أداة مساعدة للترجمة، وليست بديلاً عن مترجم مؤهل.',
    patient: 'المريض',
    doctor: 'الطبيب',
    patientHint: 'اضغط على الميكروفون وتحدث بلغتك. أرِ طبيبك الترجمة الإنجليزية.',
    doctorHint: 'يضغط الطبيب على الميكروفون ويتحدث بالإنجليزية، وتظهر الترجمة بلغتك.',
    translating: 'جارٍ الترجمة…',
    failed: 'فشلت الترجمة. حاول التسجيل مرة أخرى.',
    readAloud: 'قراءة بصوت عالٍ',
    stop: 'إيقاف',
  },
  bn: {
    interpreterNote: 'এটি একটি অনুবাদ সহায়ক, যোগ্য দোভাষীর বিকল্প নয়।',
    patient: 'রোগী',
    doctor: 'ডাক্তার',
    patientHint:
      'মাইক্রোফোনে চাপ দিয়ে নিজের ভাষায় কথা বলুন। ইংরেজি অনুবাদ ডাক্তারকে দেখান।',
    doctorHint:
      'ডাক্তার মাইক্রোফোনে চাপ দিয়ে ইংরেজিতে কথা বলবেন। অনুবাদ আপনার ভাষায় দেখা যাবে।',
    translating: 'অনুবাদ চলছে…',
    failed: 'অনুবাদ ব্যর্থ হয়েছে। আবার রেকর্ড করুন।',
    readAloud: 'জোরে পড়ে শোনান',
    stop: 'থামুন',
  },
  zh: {
    interpreterNote: '这是一个翻译辅助工具，不能代替合格的口译员。',
    patient: '患者',
    doctor: '医生',
    patientHint: '点击麦克风，用您的语言说话。把英文翻译给医生看。',
    doctorHint: '医生点击麦克风并用英语说话，翻译会以您的语言显示。',
    translating: '翻译中…',
    failed: '翻译失败，请重新录音。',
    readAloud: '朗读',
    stop: '停止',
  },
  fr: {
    interpreterNote:
      "Ceci est une aide à la traduction, pas un remplacement d'un interprète qualifié.",
    patient: 'Patient',
    doctor: 'Médecin',
    patientHint:
      'Appuyez sur le micro et parlez dans votre langue. Montrez la traduction anglaise à votre médecin.',
    doctorHint:
      'Le médecin appuie sur le micro et parle en anglais. La traduction apparaît dans votre langue.',
    translating: 'Traduction en cours…',
    failed: 'La traduction a échoué. Veuillez réessayer.',
    readAloud: 'Lire à voix haute',
    stop: 'Arrêter',
  },
  gu: {
    interpreterNote: 'આ એક અનુવાદ સહાય છે, લાયક દુભાષિયાનો વિકલ્પ નથી.',
    patient: 'દર્દી',
    doctor: 'ડૉક્ટર',
    patientHint:
      'માઇક્રોફોન દબાવો અને તમારી ભાષામાં બોલો. અંગ્રેજી અનુવાદ ડૉક્ટરને બતાવો.',
    doctorHint:
      'ડૉક્ટર માઇક્રોફોન દબાવીને અંગ્રેજીમાં બોલશે. અનુવાદ તમારી ભાષામાં દેખાશે.',
    translating: 'અનુવાદ થઈ રહ્યો છે…',
    failed: 'અનુવાદ નિષ્ફળ થયો. ફરી રેકોર્ડ કરો.',
    readAloud: 'મોટેથી વાંચો',
    stop: 'બંધ કરો',
  },
  hi: {
    interpreterNote: 'यह एक अनुवाद सहायता है, योग्य दुभाषिये का विकल्प नहीं।',
    patient: 'मरीज़',
    doctor: 'डॉक्टर',
    patientHint:
      'माइक्रोफ़ोन दबाएँ और अपनी भाषा में बोलें। अंग्रेज़ी अनुवाद डॉक्टर को दिखाएँ।',
    doctorHint:
      'डॉक्टर माइक्रोफ़ोन दबाकर अंग्रेज़ी में बोलेंगे। अनुवाद आपकी भाषा में दिखेगा।',
    translating: 'अनुवाद हो रहा है…',
    failed: 'अनुवाद विफल रहा। कृपया फिर से रिकॉर्ड करें।',
    readAloud: 'ज़ोर से पढ़ें',
    stop: 'रोकें',
  },
  fa: {
    interpreterNote: 'این یک ابزار کمکی ترجمه است، نه جایگزین مترجم شفاهی متخصص.',
    patient: 'بیمار',
    doctor: 'پزشک',
    patientHint:
      'روی میکروفون بزنید و به زبان خود صحبت کنید. ترجمهٔ انگلیسی را به پزشک نشان دهید.',
    doctorHint:
      'پزشک روی میکروفون می‌زند و به انگلیسی صحبت می‌کند. ترجمه به زبان شما نمایش داده می‌شود.',
    translating: 'در حال ترجمه…',
    failed: 'ترجمه ناموفق بود. دوباره ضبط کنید.',
    readAloud: 'خواندن با صدای بلند',
    stop: 'توقف',
  },
  pl: {
    interpreterNote: 'To pomoc w tłumaczeniu, a nie zastępstwo wykwalifikowanego tłumacza.',
    patient: 'Pacjent',
    doctor: 'Lekarz',
    patientHint:
      'Dotknij mikrofonu i mów w swoim języku. Pokaż lekarzowi angielskie tłumaczenie.',
    doctorHint:
      'Lekarz dotyka mikrofonu i mówi po angielsku. Tłumaczenie pojawi się w Twoim języku.',
    translating: 'Tłumaczenie…',
    failed: 'Tłumaczenie nie powiodło się. Nagraj ponownie.',
    readAloud: 'Przeczytaj na głos',
    stop: 'Zatrzymaj',
  },
  pt: {
    interpreterNote:
      'Isto é um auxílio de tradução, não um substituto para um intérprete qualificado.',
    patient: 'Paciente',
    doctor: 'Médico',
    patientHint:
      'Toque no microfone e fale na sua língua. Mostre a tradução em inglês ao seu médico.',
    doctorHint:
      'O médico toca no microfone e fala em inglês. A tradução aparece na sua língua.',
    translating: 'A traduzir…',
    failed: 'A tradução falhou. Tente gravar novamente.',
    readAloud: 'Ler em voz alta',
    stop: 'Parar',
  },
  pa: {
    interpreterNote: 'ਇਹ ਅਨੁਵਾਦ ਸਹਾਇਤਾ ਹੈ, ਯੋਗ ਦੁਭਾਸ਼ੀਏ ਦਾ ਬਦਲ ਨਹੀਂ।',
    patient: 'ਮਰੀਜ਼',
    doctor: 'ਡਾਕਟਰ',
    patientHint:
      'ਮਾਈਕ੍ਰੋਫ਼ੋਨ ਦਬਾਓ ਅਤੇ ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲੋ। ਅੰਗਰੇਜ਼ੀ ਅਨੁਵਾਦ ਡਾਕਟਰ ਨੂੰ ਦਿਖਾਓ।',
    doctorHint:
      'ਡਾਕਟਰ ਮਾਈਕ੍ਰੋਫ਼ੋਨ ਦਬਾ ਕੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਬੋਲੇਗਾ। ਅਨੁਵਾਦ ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਦਿਖੇਗਾ।',
    translating: 'ਅਨੁਵਾਦ ਹੋ ਰਿਹਾ ਹੈ…',
    failed: 'ਅਨੁਵਾਦ ਅਸਫਲ ਰਿਹਾ। ਦੁਬਾਰਾ ਰਿਕਾਰਡ ਕਰੋ।',
    readAloud: 'ਉੱਚੀ ਆਵਾਜ਼ ਵਿੱਚ ਪੜ੍ਹੋ',
    stop: 'ਰੋਕੋ',
  },
  pnb: {
    interpreterNote: 'ایہ ترجمے دی مدد اے، ماہر ترجمان دا بدل نہیں۔',
    patient: 'مریض',
    doctor: 'ڈاکٹر',
    patientHint: 'مائیکروفون دباؤ تے اپنی زبان وچ گل کرو۔ انگریزی ترجمہ ڈاکٹر نوں وکھاؤ۔',
    doctorHint:
      'ڈاکٹر مائیکروفون دبا کے انگریزی وچ گل کرے گا۔ ترجمہ تہاڈی زبان وچ نظر آوے گا۔',
    translating: 'ترجمہ ہو رہیا اے…',
    failed: 'ترجمہ نہ ہو سکیا۔ فیر ریکارڈ کرو۔',
    readAloud: 'اُچی آواز وچ پڑھو',
    stop: 'روکو',
  },
  ro: {
    interpreterNote:
      'Acesta este un ajutor de traducere, nu un înlocuitor pentru un interpret calificat.',
    patient: 'Pacient',
    doctor: 'Doctor',
    patientHint:
      'Atingeți microfonul și vorbiți în limba dumneavoastră. Arătați medicului traducerea în engleză.',
    doctorHint:
      'Medicul atinge microfonul și vorbește în engleză. Traducerea apare în limba dumneavoastră.',
    translating: 'Se traduce…',
    failed: 'Traducerea a eșuat. Înregistrați din nou.',
    readAloud: 'Citește cu voce tare',
    stop: 'Oprește',
  },
  so: {
    interpreterNote: 'Kani waa qalab tarjumaad kaa caawiya, mana aha beddelka turjubaan xirfad leh.',
    patient: 'Bukaan',
    doctor: 'Dhakhtar',
    patientHint:
      'Taabo makarafoonka oo ku hadal luqaddaada. Tus dhakhtarka tarjumaadda Ingiriisiga.',
    doctorHint:
      'Dhakhtarku wuxuu taabtaa makarafoonka oo ku hadlaa Ingiriisi. Tarjumaaddu waxay ku soo baxdaa luqaddaada.',
    translating: 'Waa la tarjumayaa…',
    failed: 'Tarjumaaddu way fashilantay. Mar kale duub.',
    readAloud: 'Kor u akhri',
    stop: 'Jooji',
  },
  es: {
    interpreterNote:
      'Esto es una ayuda de traducción, no un sustituto de un intérprete cualificado.',
    patient: 'Paciente',
    doctor: 'Médico',
    patientHint:
      'Toca el micrófono y habla en tu idioma. Muestra la traducción en inglés a tu médico.',
    doctorHint:
      'El médico toca el micrófono y habla en inglés. La traducción aparece en tu idioma.',
    translating: 'Traduciendo…',
    failed: 'La traducción falló. Graba de nuevo.',
    readAloud: 'Leer en voz alta',
    stop: 'Detener',
  },
  tr: {
    interpreterNote: 'Bu bir çeviri yardımcısıdır, nitelikli bir tercümanın yerini tutmaz.',
    patient: 'Hasta',
    doctor: 'Doktor',
    patientHint:
      'Mikrofona dokunun ve kendi dilinizde konuşun. İngilizce çeviriyi doktorunuza gösterin.',
    doctorHint:
      'Doktor mikrofona dokunur ve İngilizce konuşur. Çeviri sizin dilinizde görünür.',
    translating: 'Çevriliyor…',
    failed: 'Çeviri başarısız oldu. Lütfen tekrar kaydedin.',
    readAloud: 'Sesli oku',
    stop: 'Durdur',
  },
  uk: {
    interpreterNote:
      'Це допоміжний засіб перекладу, а не заміна кваліфікованого перекладача.',
    patient: 'Пацієнт',
    doctor: 'Лікар',
    patientHint:
      'Натисніть на мікрофон і говоріть своєю мовою. Покажіть лікарю переклад англійською.',
    doctorHint:
      "Лікар натискає на мікрофон і говорить англійською. Переклад з'явиться вашою мовою.",
    translating: 'Перекладаємо…',
    failed: 'Не вдалося перекласти. Запишіть ще раз.',
    readAloud: 'Прочитати вголос',
    stop: 'Зупинити',
  },
  ur: {
    interpreterNote: 'یہ ترجمے میں مدد کا ذریعہ ہے، ماہر مترجم کا متبادل نہیں۔',
    patient: 'مریض',
    doctor: 'ڈاکٹر',
    patientHint: 'مائیکروفون دبائیں اور اپنی زبان میں بولیں۔ انگریزی ترجمہ ڈاکٹر کو دکھائیں۔',
    doctorHint:
      'ڈاکٹر مائیکروفون دبا کر انگریزی میں بولیں گے۔ ترجمہ آپ کی زبان میں نظر آئے گا۔',
    translating: 'ترجمہ ہو رہا ہے…',
    failed: 'ترجمہ ناکام ہوگیا۔ دوبارہ ریکارڈ کریں۔',
    readAloud: 'بلند آواز میں پڑھیں',
    stop: 'روکیں',
  },
}

type Speaker = 'patient' | 'doctor'

type Exchange = {
  id: string
  original: string
  translated?: string
  status: 'translating' | 'done' | 'error'
}

let nextId = 0
function makeId() {
  nextId += 1
  return `exchange-${nextId}`
}

// Live "at your appointment" translator with a conversation tab per party:
// the patient speaks their language and gets English for the doctor; the
// doctor speaks English and gets the patient's language back.
// Deliberately a direct transcribe→translate pipeline — no agent loop.
export default function TranslatePage() {
  const router = useRouter()
  const { language, ready } = useLanguage()
  const [tab, setTab] = useState<Speaker>('patient')
  const [exchanges, setExchanges] = useState<Record<Speaker, Exchange[]>>({
    patient: [],
    doctor: [],
  })
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ready && !language) router.replace('/')
  }, [ready, language, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [exchanges, tab])

  async function handleTranscript(speaker: Speaker, text: string) {
    if (!language) return
    setError(null)
    const id = makeId()
    setExchanges((current) => ({
      ...current,
      [speaker]: [...current[speaker], { id, original: text, status: 'translating' }],
    }))

    const direction =
      speaker === 'patient'
        ? { sourceLanguage: language.name, targetLanguage: 'English' }
        : { sourceLanguage: 'English', targetLanguage: language.name }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ...direction }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.translatedText) {
        throw new Error(data?.error ?? 'Translation failed')
      }
      setExchanges((current) => ({
        ...current,
        [speaker]: current[speaker].map((exchange) =>
          exchange.id === id
            ? { ...exchange, translated: data.translatedText, status: 'done' }
            : exchange,
        ),
      }))
    } catch {
      setExchanges((current) => ({
        ...current,
        [speaker]: current[speaker].map((exchange) =>
          exchange.id === id ? { ...exchange, status: 'error' } : exchange,
        ),
      }))
    }
  }

  if (!language) return null

  const t = STRINGS[language.code] ?? STRINGS.en
  const activeExchanges = exchanges[tab]
  const translating = activeExchanges.some((exchange) => exchange.status === 'translating')

  return (
    <div className="flex h-dvh justify-center bg-background">
      <div className="flex w-full max-w-md flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3">
          <Link
            href="/chat"
            aria-label="Back to chat"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-primary active:scale-95"
          >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" aria-hidden="true" />
            <h1 className="text-[15px] font-semibold text-foreground">Talk to your doctor</h1>
          </div>
        </div>

        {/* One conversation tab per party */}
        <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border bg-background px-4 py-2.5">
          <TabButton
            active={tab === 'patient'}
            onClick={() => setTab('patient')}
            icon={<User className="size-4" aria-hidden="true" />}
            title={t.patient}
            subtitle={language.nativeName}
          />
          <TabButton
            active={tab === 'doctor'}
            onClick={() => setTab('doctor')}
            icon={<Stethoscope className="size-4" aria-hidden="true" />}
            title={t.doctor}
            subtitle="English"
          />
        </div>

        {/* Running list of exchanges for the active tab */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {activeExchanges.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p dir="auto" className="text-lg font-medium text-foreground">
                {tab === 'patient' ? language.nativeName : t.doctor}
              </p>
              <p dir="auto" className="max-w-[30ch] text-sm text-muted-foreground">
                {tab === 'patient' ? t.patientHint : t.doctorHint}
              </p>
              {tab === 'doctor' && language.code !== 'en' && (
                <p className="max-w-[34ch] text-xs text-muted-foreground/70">
                  Doctor: tap the microphone and speak in English.
                </p>
              )}
            </div>
          )}

          {activeExchanges.map((exchange) => (
            <motion.div
              key={exchange.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <p dir="auto" className="text-sm leading-relaxed text-muted-foreground">
                {exchange.original}
              </p>
              <div className="border-t border-border" />

              {exchange.status === 'translating' && (
                <p
                  dir="auto"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t.translating}
                </p>
              )}
              {exchange.status === 'error' && (
                <p dir="auto" className="text-sm text-red-600">
                  ⚠️ {t.failed}
                </p>
              )}
              {exchange.status === 'done' && exchange.translated && (
                <div className="space-y-3">
                  {/* Large enough to angle the phone toward the other person */}
                  <p dir="auto" className="text-2xl font-semibold leading-snug text-slate-900">
                    {exchange.translated}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReadAloudButton
                      text={exchange.translated}
                      label={t.readAloud}
                      stopLabel={t.stop}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Record dock — STT hint follows whoever is speaking */}
        <div className="shrink-0 space-y-2 border-t border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 backdrop-blur">
          <div className="flex justify-center">
            <MicButton
              key={tab}
              languageCode={tab === 'patient' ? (language.sttCode ?? language.code) : 'en'}
              onTranscript={(text) => handleTranscript(tab, text)}
              onError={(message) => setError(message)}
              disabled={translating}
            />
          </div>
          {error && (
            <p className="text-center text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 transition-colors active:scale-[0.98]',
        active
          ? 'border-primary/40 bg-sky-50 text-sky-800'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span className="flex flex-col items-start leading-tight">
        <span dir="auto" className="text-[13px] font-semibold">
          {title}
        </span>
        <span dir="auto" className="text-[11px]">
          {subtitle}
        </span>
      </span>
    </button>
  )
}

// Plays the translation through the existing /api/speak (ElevenLabs TTS)
// route so the other person can hear it as well as read it.
function ReadAloudButton({
  text,
  label,
  stopLabel,
}: {
  text: string
  label: string
  stopLabel: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => stopAudio()
  }, [])

  function stopAudio() {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      URL.revokeObjectURL(audio.src)
      audioRef.current = null
    }
  }

  async function handleClick() {
    if (state !== 'idle') {
      stopAudio()
      setState('idle')
      return
    }
    setState('loading')
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error('Speech request failed')
      const blob = await response.blob()
      const audio = new Audio(URL.createObjectURL(blob))
      audioRef.current = audio
      audio.onended = () => {
        stopAudio()
        setState('idle')
      }
      audio.onerror = () => {
        stopAudio()
        setState('idle')
      }
      await audio.play()
      setState('playing')
    } catch {
      stopAudio()
      setState('idle')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      dir="auto"
      className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 active:scale-95"
    >
      {state === 'idle' && <Volume2 className="size-3.5" aria-hidden="true" />}
      {state === 'loading' && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {state === 'playing' && <Square className="size-3 fill-current" aria-hidden="true" />}
      {state === 'playing' ? stopLabel : label}
    </button>
  )
}

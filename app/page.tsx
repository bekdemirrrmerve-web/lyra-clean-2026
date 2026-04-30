'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type VoiceMode = 'off' | 'phone' | 'realistic';

type Panel =
  | 'chat'
  | 'pdf'
  | 'image'
  | 'social'
  | 'plan'
  | 'study'
  | 'engagement'
  | 'video';

type Message = {
  role: 'user' | 'lyra';
  text: string;
};

type StudyNote = {
  id: number;
  topic: string;
  mode: string;
  content: string;
  createdAt: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function Page() {
  const [activePanel, setActivePanel] = useState<Panel>('chat');

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'lyra',
      text:
        'Buradayım kankam. Bugün içerik, ders, plan, görsel, PDF ve video tarafını birlikte toparlayabiliriz.',
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [voiceMode, setVoiceMode] = useState<VoiceMode>('phone');
  const [liveOn, setLiveOn] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Canlı konuşma hazır');

  const [isDictating, setIsDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState('Yazışma hazır');

  const [socialTopic, setSocialTopic] = useState('');
  const [socialPlatform, setSocialPlatform] = useState('TikTok');
  const [socialAudience, setSocialAudience] = useState('cilt bakımı merak eden kadınlar');
  const [socialTone, setSocialTone] = useState('samimi');
  const [socialDuration, setSocialDuration] = useState('30 sn');
  const [socialGoal, setSocialGoal] = useState('kaydetme');
  const [socialResult, setSocialResult] = useState('');

  const [dailyEnergy, setDailyEnergy] = useState('orta');
  const [dailyTasks, setDailyTasks] = useState('');
  const [dailyHours, setDailyHours] = useState('3');
  const [dailyPriority, setDailyPriority] = useState('');
  const [dailyMood, setDailyMood] = useState('biraz dağınık');
  const [dailyResult, setDailyResult] = useState('');

  const [studyTopic, setStudyTopic] = useState('');
  const [studyMode, setStudyMode] = useState('Konu anlat');
  const [studyResult, setStudyResult] = useState('');
  const [savedStudyNotes, setSavedStudyNotes] = useState<StudyNote[]>([]);

  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfMode, setPdfMode] = useState('Kısa özet');
  const [pdfResult, setPdfResult] = useState('');

  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('Realistic');
  const [imageRatio, setImageRatio] = useState('9:16');
  const [imageResult, setImageResult] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');

  const [followers, setFollowers] = useState('11900');
  const [views, setViews] = useState('2100');
  const [likes, setLikes] = useState('185');
  const [comments, setComments] = useState('22');
  const [saves, setSaves] = useState('32');
  const [shares, setShares] = useState('18');
  const [videoLink, setVideoLink] = useState('');
  const [accountLink, setAccountLink] = useState('');
  const [engagementPlatform, setEngagementPlatform] = useState('Instagram');
  const [contentType, setContentType] = useState('Reels');
  const [videoFileName, setVideoFileName] = useState('');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('');
  const [recordedMimeType, setRecordedMimeType] = useState('');
  const [cameraMode, setCameraMode] = useState<'wide' | 'normal' | 'close'>('normal');
  const [videoRatio, setVideoRatio] = useState<'9:16' | '1:1' | '4:5' | '16:9' | 'full'>('9:16');
  const [beautyOn, setBeautyOn] = useState(true);
  const [teleprompterOn, setTeleprompterOn] = useState(true);
  const [teleText, setTeleText] = useState(
    'Bugün size kısa ama işe yarayan bir bilgiden bahsedeceğim...'
  );

  const liveRecognitionRef = useRef<any>(null);
  const dictationRecognitionRef = useRef<any>(null);
  const liveOnRef = useRef(false);
  const assistantSpeakingRef = useRef(false);
  const liveListeningLockRef = useRef(false);
  const dictationOnRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const lastRepliesRef = useRef<string[]>([]);
  const lastSpokenTextRef = useRef('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const totalEngagement =
    Number(likes || 0) +
    Number(comments || 0) +
    Number(saves || 0) +
    Number(shares || 0);

  const engagementRate = Number(views || 0)
    ? ((totalEngagement / Number(views || 1)) * 100).toFixed(2)
    : '0.00';

  const followerViewRate = Number(followers || 0)
    ? ((Number(views || 0) / Number(followers || 1)) * 100).toFixed(2)
    : '0.00';

  const saveRate = Number(views || 0)
    ? ((Number(saves || 0) / Number(views || 1)) * 100).toFixed(2)
    : '0.00';

  const shareRate = Number(views || 0)
    ? ((Number(shares || 0) / Number(views || 1)) * 100).toFixed(2)
    : '0.00';

  const commentRate = Number(views || 0)
    ? ((Number(comments || 0) / Number(views || 1)) * 100).toFixed(2)
    : '0.00';

  const cameraScale = cameraMode === 'wide' ? 0.82 : cameraMode === 'normal' ? 0.94 : 1.08;

  const cameraFilter = beautyOn
    ? 'brightness(1.08) contrast(1.03) saturate(1.08)'
    : 'none';

  const videoAspectClass = useMemo(() => {
    if (videoRatio === '1:1') return 'ratio-square';
    if (videoRatio === '4:5') return 'ratio-four-five';
    if (videoRatio === '16:9') return 'ratio-wide';
    if (videoRatio === 'full') return 'ratio-full';
    return 'ratio-story';
  }, [videoRatio]);

  const tools: { key: Panel; title: string; desc: string }[] = [
    { key: 'pdf', title: 'PDF Özetle', desc: 'PDF yükle, özet modunu seç' },
    { key: 'image', title: 'Görsel Oluştur', desc: 'Prompttan görsel önizleme üret' },
    { key: 'social', title: 'İçerik Asistanı', desc: 'Hook, metin, caption, CTA' },
    { key: 'plan', title: 'Günlük Plan', desc: 'Enerjine göre plan çıkar' },
    { key: 'study', title: 'Ders Çalışma', desc: 'Not, test, konu anlatımı, PDF' },
    { key: 'video', title: 'Video Çekim', desc: 'Kamera, oran, kayıt, paylaş' },
  ];

  useEffect(() => {
    liveOnRef.current = liveOn;
  }, [liveOn]);

  useEffect(() => {
    assistantSpeakingRef.current = assistantSpeaking;
  }, [assistantSpeaking]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const saved = localStorage.getItem('sirius-study-notes');

    if (saved) {
      try {
        setSavedStudyNotes(JSON.parse(saved));
      } catch {}
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      stopLiveListening();
      stopDictation();
      stopCamera();
      window.speechSynthesis?.cancel();

      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      if (generatedImageUrl) URL.revokeObjectURL(generatedImageUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function normalize(text: string) {
    return text
      .toLocaleLowerCase('tr-TR')
      .replaceAll('ı', 'i')
      .replaceAll('ğ', 'g')
      .replaceAll('ü', 'u')
      .replaceAll('ş', 's')
      .replaceAll('ö', 'o')
      .replaceAll('ç', 'c');
  }

  function pick<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function includesAny(text: string, words: string[]) {
    return words.some((word) => text.includes(word));
  }

  function avoidRepeat(reply: string) {
    const recent = lastRepliesRef.current;

    if (!recent.includes(reply)) {
      lastRepliesRef.current = [reply, ...recent].slice(0, 8);
      return reply;
    }

    const variation = `${reply}

Ek açı:
Bunu farklılaştırmak için bu sefer konuyu daha kişisel bir girişle aç: “Ben bunu ilk duyduğumda şöyle düşünmüştüm...” Böylece aynı fikir bile daha özgün duyulur.`;

    lastRepliesRef.current = [variation, ...recent].slice(0, 8);
    return variation;
  }

  function cleanSpeechText(text: string) {
    return text
      .replaceAll('✨', '')
      .replaceAll('🔥', '')
      .replaceAll('😂', '')
      .replaceAll('😭', '')
      .replace(/[*_`#>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getBestVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];

    return (
      voices.find((voice) => voice.lang?.toLowerCase() === 'tr-tr') ||
      voices.find((voice) => voice.lang?.toLowerCase().includes('tr')) ||
      voices.find((voice) => voice.name?.toLowerCase().includes('turkish')) ||
      voices.find((voice) => voice.name?.toLowerCase().includes('google')) ||
      voices.find((voice) => voice.name?.toLowerCase().includes('siri')) ||
      voices[0]
    );
  }

  function unlockSpeech() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.resume();

      const u = new SpeechSynthesisUtterance(' ');
      u.lang = 'tr-TR';
      u.volume = 0.01;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function interruptSpeech(reason = 'Sözünü aldım kankam') {
    try {
      window.speechSynthesis?.cancel();
    } catch {}

    setAssistantSpeaking(false);
    assistantSpeakingRef.current = false;
    setLiveStatus(reason);
  }

  function speakWithPhoneVoice(text: string, afterEnd?: () => void) {
    if (voiceMode === 'off') {
      afterEnd?.();
      return;
    }

    if (voiceMode === 'realistic') {
      setLiveStatus('Gerçekçi ses yakında');
      afterEnd?.();
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      afterEnd?.();
      return;
    }

    try {
      const synth = window.speechSynthesis;
      const cleanText = cleanSpeechText(text);

      if (!cleanText) {
        afterEnd?.();
        return;
      }

      lastSpokenTextRef.current = normalize(cleanText);

      synth.cancel();
      synth.resume();

      setAssistantSpeaking(true);
      assistantSpeakingRef.current = true;

      const chunks =
        cleanText.length < 520
          ? [cleanText]
          : cleanText
              .split(/(?<=[.!?])\s+/)
              .map((chunk) => chunk.trim())
              .filter(Boolean)
              .reduce<string[]>((acc, sentence) => {
                const last = acc[acc.length - 1] || '';

                if ((last + ' ' + sentence).length < 420) {
                  acc[acc.length - 1] = last ? `${last} ${sentence}` : sentence;
                } else {
                  acc.push(sentence);
                }

                return acc;
              }, []);

      let index = 0;

      const speakNext = () => {
        if (index >= chunks.length) {
          setAssistantSpeaking(false);
          assistantSpeakingRef.current = false;
          setLiveStatus(liveOnRef.current ? 'Tekrar dinliyorum' : 'Canlı konuşma hazır');
          afterEnd?.();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.22;
        utterance.pitch = 1.03;
        utterance.volume = 1;

        const voice = getBestVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
          index += 1;
          setTimeout(speakNext, 30);
        };

        utterance.onerror = () => {
          index += 1;
          setTimeout(speakNext, 30);
        };

        synth.speak(utterance);
      };

      setTimeout(speakNext, 80);
    } catch {
      setAssistantSpeaking(false);
      assistantSpeakingRef.current = false;
      afterEnd?.();
    }
  }

  function typeLyraReply(reply: string) {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    setIsTyping(true);
    setMessages((prev) => [...prev, { role: 'lyra', text: '' }]);

    let index = 0;

    typingTimerRef.current = setInterval(() => {
      index += 2;

      setMessages((prev) => {
        const next = [...prev];
        const last = next.length - 1;

        if (last >= 0 && next[last].role === 'lyra') {
          next[last] = { ...next[last], text: reply.slice(0, index) };
        }

        return next;
      });

      if (index >= reply.length) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }

        setIsTyping(false);
      }
    }, 8);
  }

  function createSmartContentIdea(topicRaw?: string) {
    const topic = (topicRaw || socialTopic || 'güncel bir konu').trim();

    const hooks = [
      `Bu ${topic} konusunda iyi sonuç almak istiyorsan önce şu küçük detayı bilmen lazım.`,
      `${topic} hakkında çoğu kişinin atladığı şey aslında ürün/konu değil, kullanım sırası.`,
      `Bunu herkes anlatıyor ama ${topic} tarafında asıl farkı yaratan nokta başka.`,
      `${topic} sandığın kadar basit değil; ama doğru kurarsan çok daha anlaşılır hale geliyor.`,
      `Ben olsam ${topic} konusuna direkt buradan başlardım.`,
      `${topic} için kaydedilecek mini rehber: önce neye dikkat edeceğini bil.`,
      `Bunu yanlış yapınca sonuç alamıyorsun; doğru yapınca fark daha net oluyor.`,
      `${topic} hakkında fikir değiştirecek bir ayrıntı söyleyeceğim.`,
    ];

    const flowGroups = [
      ['Yanlış bilinen şeyi söyle', 'Neden yanlış olduğunu açıkla', 'Doğru yaklaşımı göster', 'Mini örnek ver', 'Kaydet CTA'],
      ['Problemle gir', 'İzleyicinin kendini görmesini sağla', '3 maddelik çözüm ver', 'Kısa örnekle güçlendir', 'Yorum sor'],
      ['Trend cümleyle başla', 'Kişisel yorum ekle', 'Bilimsel/stratejik mantığı sadeleştir', 'Uygulama öner', 'Seriye bağla'],
      ['Sık yapılan hatayı göster', 'Sonuç neden gelmiyor anlat', 'Doğru sırayı ver', 'Kimlere uygun değil söyle', 'Paylaş CTA'],
      ['Önce iddialı ama güvenli cümle', 'Hemen kanıt/mantık ver', 'Kısa formül gibi anlat', 'Örnek senaryo kur', 'Devamı gelsin CTA'],
    ];

    const ctas = [
      'Bunu kaydet, sonra içerik çekerken/ürün seçerken işine yarar.',
      'Sen bunu daha önce böyle düşünmüş müydün?',
      'Devamında bunu örneklerle anlatayım mı?',
      'Yorumlara “devam” yaz, bunu seri yapayım.',
      'Bunu arkadaşına gönder; o da aynı hatayı yapıyor olabilir.',
      'Bir sonraki videoda hangi konuyu parçalayayım?',
    ];

    const coverTexts = [
      'Bunu çoğu kişi atlıyor',
      'Asıl fark burada',
      'Kaydetmelik mini rehber',
      'Yanlış bilinen detay',
      'Bu sıralama önemli',
    ];

    const flow = pick(flowGroups);

    return avoidRepeat(`Başlık:
${topic} için özgün ${socialPlatform} içerik fikri

Hook:
${pick(hooks)}

Video Akışı:
1. ${flow[0]}
2. ${flow[1]}
3. ${flow[2]}
4. ${flow[3]}
5. ${flow[4]}

Ekran Yazıları:
- “${pick(coverTexts)}”
- “Asıl mesele burada”
- “Bunu kaydet”

Konuşma Metni:
“${topic} konusunda bence en büyük hata, herkesin aynı şeyi yapıp aynı sonucu beklemesi. Oysa burada farkı yaratan şey, konuyu doğru sırayla anlamak. Önce ihtiyacı belirle, sonra neden işe yarayıp yaramadığını düşün, en son uygulamaya geç. Bu şekilde hem daha bilinçli karar verirsin hem de boşuna vakit kaybetmezsin.”

Caption:
${topic} konusunda küçük detaylar büyük fark yaratabilir. Kaydet, sonra lazım olur.

CTA:
${pick(ctas)}

Çekim Önerisi:
Yüz yakın plan + ekranda 3 madde + sade arka plan. İlk 2 saniyede net vaat ver, videonun sonunda tek bir aksiyon iste.

Ekstra Viral Açı:
Konuyu “şunu yapma” diye değil, “bunu böyle yaparsan daha mantıklı olur” diye anlat. Daha güvenilir ve paylaşılabilir durur.`);
  }

  function createSocialAssistantReply() {
    const topic = socialTopic.trim() || 'içerik üretimi';

    return avoidRepeat(`Sosyal Medya İçerik Asistanı

Konu:
${topic}

Platform:
${socialPlatform}

Hedef Kitle:
${socialAudience}

Ton:
${socialTone}

Süre:
${socialDuration}

Amaç:
${socialGoal}

3 Farklı Hook:
1. ${pick([
      `${topic} konusunda içerik çekeceksen önce bu açıyı dene.`,
      `${topic} hakkında herkes aynı şeyi söylüyor; sen şu yerden ayrış.`,
      `Bu ${topic} fikri, izleyicinin “ben de bunu yaşıyorum” demesini sağlar.`,
    ])}
2. ${pick([
      `Bu video ${socialAudience} için direkt kaydetmelik olabilir.`,
      `${socialPlatform} için kısa ama güçlü bir ${topic} fikri: önce problemi görünür yap.`,
      `Eğer amacın ${socialGoal} ise videoyu bilgi değil, ihtiyaç üzerinden kur.`,
    ])}
3. ${pick([
      `Bunu daha önce böyle anlatmadılar: ${topic}.`,
      `${topic} için en basit ama etkili içerik yapısı bu.`,
      `İlk 3 saniyede bunu söylersen izleyici kalma ihtimali artar.`,
    ])}

Tam Video Metni:
“Bugün ${topic} konusunu sade ama etkili bir şekilde anlatacağım. Çünkü bu konuda en büyük sorun bilgi eksikliği değil; bilginin nasıl sunulduğu. İzleyici önce kendini görmeli. Sonra problemi net duymalı. En son da ona uygulanabilir küçük bir çözüm vermelisin. Eğer hedefin ${socialGoal} ise videonun sonunda tek ve net bir çağrı yap: kaydet, yorum yaz veya devamını iste.”

Sahne Sahne Akış:
1. İlk 3 saniye: Problem cümlesi + yüz yakın plan
2. 3-10 saniye: İzleyicinin yaşadığı durumu tarif et
3. 10-22 saniye: Çözümü 3 maddeyle anlat
4. 22-28 saniye: Örnek ver
5. Son: Tek CTA

Caption:
${topic} konusunda fark yaratan şey bazen daha çok bilgi değil, daha net anlatımdır.

CTA:
${pick([
      'Devamı gelsin mi?',
      'Bunu hangi konuya uyarlayayım?',
      'Yorumlara “liste” yaz, ikinci bölümü hazırlayayım.',
      'Kaydet, çekimden önce kontrol listesi gibi kullan.',
    ])}

Hashtag:
#içeriküretimi #sosyalmedya #reelsfikirleri #tiktokfikirleri #üreticirehberi

Kapak Yazısı:
“${topic}: farklı anlatım açısı”

Çekim Önerisi:
Açık renk arka plan, doğal ışık, hızlı ama sakin konuşma, ekranda 3 ana madde.`);
  }

  function createDailyPlan() {
    const hours = Number(dailyHours || 3);
    const tasks = dailyTasks.trim() || 'ders çalışma, içerik üretme, evi toparlama, dinlenme';
    const priority = dailyPriority.trim() || 'kontrol hissini geri kazanmak';

    return `Günlük Plan

Bugünkü enerji:
${dailyEnergy}

Mod:
${dailyMood}

Öncelik:
${priority}

Yapılacaklar:
${tasks}

Saat Saat Plan:
1. İlk 15 dakika:
Masayı/telefonu düzenle, su koy, tek hedef seç.

2. ${hours >= 2 ? '45 dakika' : '25 dakika'}:
En önemli işe başla. Mükemmel değil, başlatma odaklı ilerle.

3. 10 dakika mola:
Ekransız mola. Kahve, su, kısa yürüyüş.

4. 30 dakika:
İkinci küçük görev. İçerik fikri, not çıkarma ya da kısa düzenleme.

5. 15 dakika:
Günün mini toparlaması. Ne yaptım, ne kaldı, yarına ne devrediyorum?

Mini Görevler:
- En kolay işi seç ve bitir
- Bir tane görünür çıktı üret
- Dağınıklığı 10 dakika azalt
- Kendine gün sonunda kısa not bırak

Odak Cümlesi:
“Bugün her şeyi bitirmek zorunda değilim; ritmi geri alıyorum.”

Gün Sonu Kontrol:
[ ] Bir ana iş yaptım
[ ] Bir küçük düzenleme yaptım
[ ] Kendimi suçlamadan günü kapattım`;
  }

  function createStudyAssistantReply(topicFromChat?: string) {
    const topic = (topicFromChat || studyTopic || 'çalışmak istediğin konu').trim();
    const mode = studyMode;

    if (mode === 'Test hazırla') {
      return `${topic} - Mini Test

1. ${topic} konusunun temel mantığı nedir?
A) Ezber yapmak
B) Kavram ilişkisini anlamak
C) Sadece formül yazmak
D) Konuyu atlamak

2. Bu konudan soru çözerken ilk yapılması gereken nedir?
A) Verilenleri ayırmak
B) Şıkları okumadan işaretlemek
C) Tahmin etmek
D) Süreye bakmamak

3. Yanlış yaptığında en iyi analiz hangisidir?
A) Soruyu unutmak
B) Sadece cevaba bakmak
C) Hata türünü belirlemek
D) Konuyu bırakmak

Cevap Anahtarı:
1-B, 2-A, 3-C

İstersen bunu 10 soruluk gerçek test formatına çevirebilirim.`;
    }

    if (mode === 'Ezber kartı yap') {
      return `${topic} - Ezber Kartları

Kart 1
Soru: Bu konunun ana fikri ne?
Cevap: Konunun temel kavramlarını ilişkilendirerek anlamak.

Kart 2
Soru: En sık yapılan hata ne?
Cevap: Tanımı bilmeden soru çözmeye geçmek.

Kart 3
Soru: Çalışma sırası nasıl olmalı?
Cevap: Kısa konu anlatımı → örnek soru → mini test → yanlış analizi.

Kart 4
Soru: Kalıcı öğrenme için ne yapılır?
Cevap: Aynı gün kısa tekrar, ertesi gün 10 soru.`;
    }

    if (mode === 'Program yap') {
      return `${topic} için Çalışma Programı

1. Gün:
Konu anlatımı + 10 kolay soru

2. Gün:
Orta seviye sorular + yanlış defteri

3. Gün:
Karma test + süre tutma

4. Gün:
Yanlışların tekrar çözümü

Günlük mini sistem:
25 dakika konu
20 dakika soru
10 dakika yanlış analizi`;
    }

    if (mode === 'Not çıkar') {
      return `${topic} - Başlık Başlık Not

1. Ana Tanım
Bu konunun önce temel tanımını öğren.

2. Alt Kavramlar
Konuyu küçük parçalara böl.

3. Örnek Mantığı
Sadece tanımı değil, soruda nasıl geldiğini gör.

4. Sık Hata
Acele edip verilenleri yanlış okumak.

5. Çalışma Tüyosu
Önce 5 kolay soru, sonra orta seviye.`;
    }

    if (mode === 'Yanlış analizi yap') {
      return `${topic} - Yanlış Analizi Şablonu

Yanlış türü:
[ ] Konu eksiği
[ ] Dikkat hatası
[ ] İşlem hatası
[ ] Süre baskısı
[ ] Soruyu yanlış anlama

Analiz:
Bu soruyu neden yanlış yaptım?
Doğru çözümde ilk adım neydi?
Ben hangi adımı atladım?

Tekrar:
Aynı tipten 3 soru daha çöz.`;
    }

    return `${topic} - Konu Anlatımı

1. Konunun Mantığı
Bu konuyu ezber gibi değil, bir sistem gibi düşün. Önce temel tanımı, sonra soru içinde nasıl kullanıldığını öğren.

2. Nasıl Çalışılır?
- Önce kısa konu oku.
- Sonra 3 örnek çöz.
- Sonra 10 soru çöz.
- Yanlışları ayrı yaz.

3. Soru Çözerken
Verilenleri işaretle, isteneni ayır, sonra işlem yap.

4. Mini Özet
Konu öğrenmek = tanım + örnek + soru + yanlış analizi.

İstersen bunu tablo şeklinde, sınav notu gibi veya PDF çalışma kağıdı gibi hazırlayabilirim.`;
  }

  function saveStudyNote() {
    const topic = studyTopic.trim();

    if (!topic || !studyResult.trim()) {
      alert('Önce konu yazıp çıktı hazırla kankam.');
      return;
    }

    const newNote: StudyNote = {
      id: Date.now(),
      topic,
      mode: studyMode,
      content: studyResult,
      createdAt: new Date().toLocaleString('tr-TR'),
    };

    const next = [newNote, ...savedStudyNotes].slice(0, 30);
    setSavedStudyNotes(next);
    localStorage.setItem('sirius-study-notes', JSON.stringify(next));
  }

  function deleteStudyNote(id: number) {
    const next = savedStudyNotes.filter((note) => note.id !== id);
    setSavedStudyNotes(next);
    localStorage.setItem('sirius-study-notes', JSON.stringify(next));
  }

  function makeStudyPdf() {
    const content = studyResult.trim();

    if (!content) {
      alert('Önce ders çıktısı hazırla kankam.');
      return;
    }

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${studyTopic || 'Ders Notu'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #222; line-height: 1.55; }
          h1 { color: #4d2a68; }
          pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        <h1>${studyTopic || 'Ders Notu'}</h1>
        <p><strong>Mod:</strong> ${studyMode}</p>
        <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        <script>window.print();</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');

    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      alert('PDF penceresi açılamadı. Tarayıcı popup iznini kontrol et.');
    }
  }

  function generateImageFromPrompt() {
    const base = imagePrompt.trim() || 'mistik, parlak, premium sosyal medya görseli';
    const ratio = imageRatio;

    let width = 1080;
    let height = 1920;

    if (ratio === '1:1') {
      width = 1080;
      height = 1080;
    }

    if (ratio === '16:9') {
      width = 1600;
      height = 900;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, width, height);

    if (imageStyle === 'Mystic') {
      gradient.addColorStop(0, '#fff3fb');
      gradient.addColorStop(0.35, '#dbc8ff');
      gradient.addColorStop(0.7, '#bceeff');
      gradient.addColorStop(1, '#fff0b8');
    } else if (imageStyle === 'Product') {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#f6eefc');
      gradient.addColorStop(1, '#e7f7ff');
    } else if (imageStyle === 'Beauty') {
      gradient.addColorStop(0, '#ffe2ee');
      gradient.addColorStop(0.5, '#fff8fb');
      gradient.addColorStop(1, '#f4ddff');
    } else {
      gradient.addColorStop(0, '#fffafd');
      gradient.addColorStop(0.4, '#e9e4ff');
      gradient.addColorStop(0.75, '#dff7ff');
      gradient.addColorStop(1, '#fff0c9');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 44; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 20 + Math.random() * 110;

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${0.45 + Math.random() * 0.25})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 28; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 10 + Math.random() * 22;

      ctx.fillStyle = 'rgba(120, 76, 255, 0.32)';
      ctx.font = `${size}px serif`;
      ctx.fillText('✦', x, y);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    roundRect(ctx, width * 0.08, height * 0.34, width * 0.84, height * 0.32, 42);
    ctx.fill();

    ctx.fillStyle = '#2a1830';
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.max(42, width * 0.055)}px Arial`;
    wrapCanvasText(ctx, base, width / 2, height * 0.47, width * 0.72, Math.max(54, width * 0.065));

    ctx.font = `${Math.max(24, width * 0.026)}px Arial`;
    ctx.fillStyle = '#6c5676';
    ctx.fillText(`${imageStyle} · ${imageRatio}`, width / 2, height * 0.64);

    canvas.toBlob((blob) => {
      if (!blob) return;

      if (generatedImageUrl) URL.revokeObjectURL(generatedImageUrl);

      const url = URL.createObjectURL(blob);
      setGeneratedImageUrl(url);

      setImageResult(`Görsel oluşturuldu.

Not:
Bu sürüm tarayıcı içinde görsel üretir. Gerçek AI image API bağlandığında aynı buton fotogerçekçi görsel üretecek.

Final Prompt:
${base}, ${imageStyle} style, ${imageRatio} aspect ratio, premium lighting, soft cloud-like background, starry glow, elegant composition, high detail, clean modern aesthetic, social-media ready.`);
    }, 'image/png');
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];

    words.forEach((word) => {
      const test = `${line}${word} `;
      const width = ctx.measureText(test).width;

      if (width > maxWidth && line) {
        lines.push(line);
        line = `${word} `;
      } else {
        line = test;
      }
    });

    lines.push(line);

    lines.slice(0, 4).forEach((item, index) => {
      ctx.fillText(item.trim(), x, y + index * lineHeight);
    });
  }

  async function downloadGeneratedImage() {
    if (!generatedImageUrl) return;

    const a = document.createElement('a');
    a.href = generatedImageUrl;
    a.download = 'sirius-gorsel.png';
    a.click();
  }

  function handlePdfUpload(file?: File | null) {
    if (!file) return;

    setPdfFileName(file.name);
    setPdfResult(`PDF seçildi: ${file.name}

Mod: ${pdfMode}

PDF okuma motoru için backend gerekir. Şu an dosya seçimi hazır.
Backend eklendiğinde burada:
- kısa özet
- detaylı özet
- madde madde özet
- önemli kavramlar
- çalışma notu
oluşturulacak.`);
  }

  function getEngagementComment() {
    const er = Number(engagementRate);

    if (er >= 12) return 'Güçlü performans. İçerik izleyiciyi aksiyona sokmuş.';
    if (er >= 7) return 'İyi performans. Kaydetme ve paylaşımı biraz daha artırırsan daha iyi yayılır.';
    if (er >= 3) return 'Orta performans. Hook veya CTA daha net olabilir.';
    return 'Düşük performans. İlk 3 saniye, başlık ve izleyici vaadini güçlendirmek lazım.';
  }

  function localLyraReply(userText: string) {
    const t = normalize(userText);

    if (!t) return 'Buradayım kankam, bir şey söyle ya da yaz.';

    if (includesAny(t, ['icerik', 'içerik', 'reels', 'tiktok', 'instagram', 'hook', 'caption'])) {
      return createSmartContentIdea(userText);
    }

    if (includesAny(t, ['plan', 'bugun', 'bugün', 'gunluk', 'günlük'])) {
      return createDailyPlan();
    }

    if (includesAny(t, ['ders', 'dgs', 'matematik', 'not', 'özet', 'ozet', 'test', 'çalış'])) {
      setStudyTopic(userText);
      return createStudyAssistantReply(userText);
    }

    if (includesAny(t, ['moral', 'yorgun', 'bunaldım', 'stres', 'kötü'])) {
      return avoidRepeat(
        'Kankam önce bir nefes. Şu an her şeyi tek seferde çözmek zorunda değilsin. Bir küçük adım seçelim: ya plan, ya ders, ya içerik. Kontrol hissini oradan geri alırız.'
      );
    }

    if (includesAny(t, ['kamera', 'video', 'çekim', 'kayıt'])) {
      setActivePanel('video');
      return avoidRepeat(
        'Video alanını açıyorum kankam. iPhone’da aşırı yakın görünmemesi için kamera modunu Normal veya Geniş seçebilirsin. Oranı da 9:16, 1:1, 4:5 veya 16:9 yapabilirsin.'
      );
    }

    return avoidRepeat(`Duydum kankam: “${userText}”

Bunu daha güçlü cevaplamak için şöyle ele alırım:
- Önce asıl niyeti ayırırım.
- Sonra bunu üretim, plan, ders veya içerik formatına çeviririm.
- En sonunda uygulanabilir bir çıktı veririm.

Bence bu konuyu “tek cevap” gibi değil, küçük bir çıktıya çevirelim. İstersen sana bunu plan, içerik metni, ders notu veya kısa strateji olarak hazırlayayım.`);
  }

  function sendTextMessage(customText?: string) {
    const raw = customText ?? chatInput;
    const text = raw.trim();
    if (!text) return;

    interruptSpeech('Yeni mesajını aldım');
    unlockSpeech();

    const reply = localLyraReply(text);

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');
    finalTranscriptRef.current = '';

    typeLyraReply(reply);
    speakWithPhoneVoice(reply);
  }

  function handleLiveUserText(text: string) {
    if (!text.trim()) return;

    interruptSpeech('Sözünü aldım');

    const reply = localLyraReply(text);

    setMessages((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'lyra', text: reply },
    ]);

    speakWithPhoneVoice(reply, () => {
      if (liveOnRef.current) setTimeout(() => startLiveListening(), 350);
    });
  }

  function startDictation() {
    interruptSpeech('Seni dinliyorum');

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('Bu tarayıcı sesle yazmayı desteklemiyor kankam.');
      return;
    }

    try {
      stopLiveListening();
      dictationOnRef.current = true;
      finalTranscriptRef.current = chatInput.trim();

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'tr-TR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsDictating(true);
        setDictationStatus('Sesle yazıyor...');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalPart = '';

        if (assistantSpeakingRef.current) {
          interruptSpeech('Böldün, seni dinliyorum');
        }

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i]?.[0]?.transcript || '';

          if (event.results[i].isFinal) finalPart += transcript + ' ';
          else interim += transcript;
        }

        if (finalPart.trim()) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalPart}`.trim();
        }

        const combined = `${finalTranscriptRef.current} ${interim}`.trim();
        setChatInput(combined);
        setDictationStatus(interim ? `Algılıyor: ${interim}` : 'Sesle yazıyor...');
      };

      recognition.onerror = () => {
        setIsDictating(false);

        if (dictationOnRef.current) {
          setDictationStatus('Yeniden dinliyor...');
          setTimeout(() => {
            if (dictationOnRef.current) startDictation();
          }, 350);
        }
      };

      recognition.onend = () => {
        setIsDictating(false);

        if (dictationOnRef.current) {
          setTimeout(() => {
            if (dictationOnRef.current) startDictation();
          }, 250);
        } else {
          setDictationStatus('Yazışma hazır');
        }
      };

      dictationRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      dictationOnRef.current = false;
      setIsDictating(false);
      setDictationStatus('Sesle yazma başlatılamadı');
    }
  }

  function stopDictation() {
    try {
      dictationOnRef.current = false;
      dictationRecognitionRef.current?.stop?.();
      dictationRecognitionRef.current = null;
      setIsDictating(false);
      setDictationStatus('Yazışma hazır');
    } catch {
      dictationOnRef.current = false;
      setIsDictating(false);
      setDictationStatus('Yazışma hazır');
    }
  }

  function toggleDictation() {
    if (dictationOnRef.current) stopDictation();
    else startDictation();
  }

  function startLiveListening() {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('Bu tarayıcı canlı konuşmayı desteklemiyor kankam.');
      return;
    }

    if (liveListeningLockRef.current) return;

    try {
      stopDictation();

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'tr-TR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalText = '';
      let interimText = '';
      let quickTimer: ReturnType<typeof setTimeout> | null = null;

      recognition.onstart = () => {
        liveListeningLockRef.current = true;
        setLiveListening(true);
        setLiveStatus('Seni dinliyorum');
      };

      recognition.onresult = (event: any) => {
        interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i]?.[0]?.transcript || '';

          if (event.results[i].isFinal) finalText += transcript;
          else interimText += transcript;
        }

        const heard = (finalText || interimText).trim();
        const normalizedHeard = normalize(heard);

        if (!heard) return;

        if (assistantSpeakingRef.current) {
          const spoken = lastSpokenTextRef.current;
          const looksLikeOwnVoice =
            normalizedHeard.length > 8 && spoken.includes(normalizedHeard.slice(0, 20));

          if (!looksLikeOwnVoice) {
            interruptSpeech('Böldün, seni dinliyorum');
          }
        }

        setLiveStatus(`Duydum: ${heard}`);

        if (quickTimer) clearTimeout(quickTimer);

        quickTimer = setTimeout(() => {
          const textToSend = (finalText || interimText).trim();

          if (textToSend.length > 1) {
            try {
              recognition.stop();
            } catch {}

            liveListeningLockRef.current = false;
            setLiveListening(false);
            handleLiveUserText(textToSend);
          }
        }, 600);
      };

      recognition.onerror = () => {
        if (quickTimer) clearTimeout(quickTimer);

        liveListeningLockRef.current = false;
        setLiveListening(false);

        if (liveOnRef.current) {
          setLiveStatus('Tekrar dinlemeyi deniyorum');
          setTimeout(() => startLiveListening(), 500);
        } else {
          setLiveStatus('Canlı konuşma hazır');
        }
      };

      recognition.onend = () => {
        if (quickTimer) clearTimeout(quickTimer);

        liveListeningLockRef.current = false;
        setLiveListening(false);

        if (liveOnRef.current) {
          setTimeout(() => startLiveListening(), 450);
        } else {
          setLiveStatus('Canlı konuşma hazır');
        }
      };

      liveRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      liveListeningLockRef.current = false;
      setLiveListening(false);
      setLiveStatus('Canlı konuşma başlatılamadı');
    }
  }

  function stopLiveListening() {
    try {
      liveListeningLockRef.current = false;
      liveRecognitionRef.current?.stop?.();
      liveRecognitionRef.current = null;
      setLiveListening(false);
    } catch {
      liveListeningLockRef.current = false;
      setLiveListening(false);
    }
  }

  function toggleLiveConversation() {
    const next = !liveOnRef.current;

    liveOnRef.current = next;
    setLiveOn(next);

    if (next) {
      unlockSpeech();
      setLiveStatus('Canlı konuşma açılıyor');
      startLiveListening();

      speakWithPhoneVoice('Tamam kankam, buradayım. Konuş, seni dinliyorum.');
    } else {
      stopLiveListening();
      interruptSpeech('Canlı konuşma kapalı');
      setLiveStatus('Canlı konuşma kapalı');
    }
  }

  async function startCamera() {
    setCameraError('');

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: videoRatio === '16:9' ? 1280 : 720 },
          height: { ideal: videoRatio === '16:9' ? 720 : 1280 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch {
      setCameraError(
        'Kamera açılamadı kankam. iPhone’da Safari izinlerini kontrol et ve HTTPS linkten aç.'
      );
    }
  }

  function stopCamera() {
    try {
      if (recording) mediaRecorderRef.current?.stop();

      const video = videoRef.current;

      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }

      setCameraActive(false);
      setRecording(false);
    } catch {}
  }

  function getSupportedVideoMimeType() {
    const candidates = [
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    if (typeof MediaRecorder === 'undefined') return '';

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function toggleRecording() {
    const video = videoRef.current;

    if (!cameraActive || !video?.srcObject) {
      setCameraError('Önce kamerayı aç kankam.');
      return;
    }

    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl('');
      }

      recordedChunksRef.current = [];
      const stream = video.srcObject as MediaStream;
      const mimeType = getSupportedVideoMimeType();

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      setRecordedMimeType(mimeType || 'video/webm');

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setCameraError('');
    } catch {
      setCameraError('Bu tarayıcı video kaydını tam desteklemiyor olabilir.');
    }
  }

  async function shareRecordedVideo() {
    if (!recordedVideoUrl) return;

    const response = await fetch(recordedVideoUrl);
    const blob = await response.blob();
    const extension = recordedMimeType.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([blob], `sirius-video.${extension}`, {
      type: recordedMimeType || blob.type,
    });

    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
    };

    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({
        files: [file],
        title: 'Sirius Video',
        text: 'Sirius AI ile kaydedildi.',
      });
      return;
    }

    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `sirius-video.${extension}`;
    a.click();
  }

  function openPanel(panel: Panel) {
    setActivePanel(panel);
    if (panel !== 'video') stopCamera();
  }

  function renderPanel() {
    if (activePanel === 'pdf') {
      return (
        <section className="panel-card glass">
          <h2>PDF Özetle</h2>
          <p className="muted">PDF yükle, özet modunu seç. Gerçek PDF okuma için sonra backend bağlanacak.</p>

          <div className="form-grid">
            <label>
              Özet Modu
              <select value={pdfMode} onChange={(e) => setPdfMode(e.target.value)}>
                <option>Kısa özet</option>
                <option>Detaylı özet</option>
                <option>Madde madde özet</option>
              </select>
            </label>

            <label>
              PDF Seç
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handlePdfUpload(e.target.files?.[0])}
              />
            </label>
          </div>

          {pdfFileName && <div className="mini-result">Seçilen dosya: {pdfFileName}</div>}
          <pre className="result">{pdfResult || 'Henüz PDF seçilmedi.'}</pre>
        </section>
      );
    }

    if (activePanel === 'image') {
      return (
        <section className="panel-card glass">
          <h2>Görsel Oluştur</h2>
          <p className="muted">
            Bu sürüm tarayıcı içinde görsel üretir. Fotogerçekçi AI görsel için sonra image API bağlanacak.
          </p>

          <div className="image-preview">
            {generatedImageUrl ? (
              <img src={generatedImageUrl} alt="Oluşturulan görsel" />
            ) : (
              <div>
                <div className="sparkle">SIRIUS</div>
                <span>Görsel önizleme alanı</span>
              </div>
            )}
          </div>

          <textarea
            className="textarea"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Nasıl bir görsel istiyorsun? Örn: pembe yıldızlı premium kozmetik kapak görseli..."
          />

          <div className="form-grid">
            <label>
              Stil
              <select value={imageStyle} onChange={(e) => setImageStyle(e.target.value)}>
                <option>Realistic</option>
                <option>Editorial</option>
                <option>Beauty</option>
                <option>Product</option>
                <option>Mystic</option>
                <option>Minimal</option>
                <option>Instagram Cover</option>
              </select>
            </label>

            <label>
              Oran
              <select value={imageRatio} onChange={(e) => setImageRatio(e.target.value)}>
                <option>1:1</option>
                <option>9:16</option>
                <option>16:9</option>
              </select>
            </label>
          </div>

          <div className="toolbar">
            <button className="primary" onClick={generateImageFromPrompt}>
              Görsel Oluştur
            </button>

            <button onClick={downloadGeneratedImage} disabled={!generatedImageUrl}>
              Görseli İndir
            </button>
          </div>

          <pre className="result">{imageResult || 'Henüz görsel oluşturulmadı.'}</pre>
        </section>
      );
    }

    if (activePanel === 'social') {
      return (
        <section className="panel-card glass">
          <h2>İçerik Asistanı</h2>
          <p className="muted">Konuya göre özgün hook, video metni, caption ve CTA üretir.</p>

          <div className="form-grid">
            <label>
              Konu
              <input
                value={socialTopic}
                onChange={(e) => setSocialTopic(e.target.value)}
                placeholder="Örn: retinol, güneş kremi, DGS motivasyonu..."
              />
            </label>

            <label>
              Platform
              <select value={socialPlatform} onChange={(e) => setSocialPlatform(e.target.value)}>
                <option>TikTok</option>
                <option>Instagram Reels</option>
                <option>YouTube Shorts</option>
                <option>Story</option>
              </select>
            </label>

            <label>
              Hedef Kitle
              <input value={socialAudience} onChange={(e) => setSocialAudience(e.target.value)} />
            </label>

            <label>
              Ton
              <select value={socialTone} onChange={(e) => setSocialTone(e.target.value)}>
                <option>samimi</option>
                <option>bilimsel</option>
                <option>iddialı</option>
                <option>soft</option>
                <option>premium</option>
                <option>komik</option>
              </select>
            </label>

            <label>
              Süre
              <select value={socialDuration} onChange={(e) => setSocialDuration(e.target.value)}>
                <option>15 sn</option>
                <option>30 sn</option>
                <option>45 sn</option>
                <option>60 sn</option>
              </select>
            </label>

            <label>
              Amaç
              <select value={socialGoal} onChange={(e) => setSocialGoal(e.target.value)}>
                <option>takipçi</option>
                <option>satış</option>
                <option>yorum</option>
                <option>kaydetme</option>
                <option>paylaşım</option>
              </select>
            </label>
          </div>

          <button className="primary" onClick={() => setSocialResult(createSocialAssistantReply())}>
            İçerik Üret
          </button>

          <pre className="result">{socialResult || 'Henüz içerik üretilmedi.'}</pre>
        </section>
      );
    }

    if (activePanel === 'plan') {
      return (
        <section className="panel-card glass">
          <h2>Günlük Plan</h2>
          <p className="muted">Enerjine ve vaktine göre gerçekçi bir gün planı çıkarır.</p>

          <div className="form-grid">
            <label>
              Bugünkü Enerjim
              <input value={dailyEnergy} onChange={(e) => setDailyEnergy(e.target.value)} />
            </label>

            <label>
              Kaç Saatim Var?
              <input value={dailyHours} onChange={(e) => setDailyHours(e.target.value)} />
            </label>

            <label>
              Önceliğim
              <input
                value={dailyPriority}
                onChange={(e) => setDailyPriority(e.target.value)}
                placeholder="Örn: ders, içerik, ev, dinlenme..."
              />
            </label>

            <label>
              Modum
              <input value={dailyMood} onChange={(e) => setDailyMood(e.target.value)} />
            </label>
          </div>

          <textarea
            className="textarea"
            value={dailyTasks}
            onChange={(e) => setDailyTasks(e.target.value)}
            placeholder="Bugün yapman gerekenleri yaz..."
          />

          <button className="primary" onClick={() => setDailyResult(createDailyPlan())}>
            Plan Hazırla
          </button>

          <pre className="result">{dailyResult || 'Henüz plan hazırlanmadı.'}</pre>
        </section>
      );
    }

    if (activePanel === 'study') {
      return (
        <section className="panel-card glass">
          <h2>Ders Çalışma</h2>
          <p className="muted">Konu anlatımı, not, test, ezber kartı, yanlış analizi ve PDF çıktısı.</p>

          <div className="form-grid">
            <label>
              Konu
              <input
                value={studyTopic}
                onChange={(e) => setStudyTopic(e.target.value)}
                placeholder="Örn: temel kavramlar, paragraf, kimya, türev..."
              />
            </label>

            <label>
              İstek
              <select value={studyMode} onChange={(e) => setStudyMode(e.target.value)}>
                <option>Konu anlat</option>
                <option>Not çıkar</option>
                <option>Test hazırla</option>
                <option>Ezber kartı yap</option>
                <option>Program yap</option>
                <option>Yanlış analizi yap</option>
              </select>
            </label>
          </div>

          <div className="toolbar">
            <button className="primary" onClick={() => setStudyResult(createStudyAssistantReply())}>
              Hazırla
            </button>
            <button onClick={saveStudyNote}>Konuyu Kaydet</button>
            <button onClick={makeStudyPdf}>PDF Yap</button>
          </div>

          <pre className="result">{studyResult || 'Henüz ders çıktısı hazırlanmadı.'}</pre>

          <h3>Kayıtlı Konular</h3>
          <div className="saved-list">
            {savedStudyNotes.length === 0 && <p className="muted">Henüz kayıtlı konu yok.</p>}

            {savedStudyNotes.map((note) => (
              <div className="saved-item" key={note.id}>
                <strong>{note.topic}</strong>
                <span>{note.mode} · {note.createdAt}</span>
                <div className="toolbar">
                  <button
                    onClick={() => {
                      setStudyTopic(note.topic);
                      setStudyMode(note.mode);
                      setStudyResult(note.content);
                    }}
                  >
                    Aç
                  </button>
                  <button onClick={() => deleteStudyNote(note.id)}>Sil</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activePanel === 'video') {
      return (
        <section className="panel-card glass">
          <h2>Video Çekim</h2>
          <p className="muted">iPhone için oran, kadraj, kayıt ve paylaşma seçenekleri.</p>

          <div className={`camera-frame ${videoAspectClass}`}>
            <video
              ref={videoRef}
              playsInline
              muted
              className="camera-video"
              style={{
                filter: cameraFilter,
                transform: `scaleX(-1) scale(${cameraScale})`,
                objectFit: 'contain',
              }}
            />

            {!cameraActive && (
              <div className="camera-placeholder">
                <strong>Kamera kapalı</strong>
                <p>Kamerayı açınca önizleme burada görünecek.</p>
              </div>
            )}

            {cameraActive && teleprompterOn && (
              <div className="tele-overlay">
                <p>{teleText}</p>
              </div>
            )}

            {recording && <span className="rec">REC</span>}
          </div>

          {cameraError && <div className="notice danger">{cameraError}</div>}

          <div className="toolbar">
            <button onClick={startCamera}>Kamerayı Aç</button>
            <button onClick={stopCamera}>Kapat</button>
            <button onClick={toggleRecording}>{recording ? 'Kaydı Durdur' : 'Kayıt Başlat'}</button>
            <button onClick={shareRecordedVideo} disabled={!recordedVideoUrl}>
              Paylaş / Kaydet
            </button>
          </div>

          <div className="form-grid">
            <label>
              Video Oranı
              <select value={videoRatio} onChange={(e) => setVideoRatio(e.target.value as any)}>
                <option value="9:16">9:16 Story/Reels/TikTok</option>
                <option value="4:5">4:5 Instagram Feed</option>
                <option value="1:1">1:1 Kare</option>
                <option value="16:9">16:9 YouTube</option>
                <option value="full">Tam Alan</option>
              </select>
            </label>

            <label>
              Kamera Modu
              <select value={cameraMode} onChange={(e) => setCameraMode(e.target.value as any)}>
                <option value="wide">Geniş</option>
                <option value="normal">Normal</option>
                <option value="close">Yakın</option>
              </select>
            </label>

            <label>
              Beauty Filter
              <select value={beautyOn ? 'Açık' : 'Kapalı'} onChange={(e) => setBeautyOn(e.target.value === 'Açık')}>
                <option>Açık</option>
                <option>Kapalı</option>
              </select>
            </label>

            <label>
              Teleprompter
              <select
                value={teleprompterOn ? 'Açık' : 'Kapalı'}
                onChange={(e) => setTeleprompterOn(e.target.value === 'Açık')}
              >
                <option>Açık</option>
                <option>Kapalı</option>
              </select>
            </label>
          </div>

          <textarea
            className="textarea"
            value={teleText}
            onChange={(e) => setTeleText(e.target.value)}
            placeholder="Teleprompter metnini yaz..."
          />

          {recordedVideoUrl && (
            <div className="notice">
              <strong>Kaydedilen Video</strong>
              <p>Format: {recordedMimeType || 'tarayıcı varsayılanı'}</p>
              <video src={recordedVideoUrl} controls playsInline className="recorded" />
              <a
                href={recordedVideoUrl}
                download={`sirius-video.${recordedMimeType.includes('mp4') ? 'mp4' : 'webm'}`}
                className="download"
              >
                Videoyu İndir
              </a>
            </div>
          )}
        </section>
      );
    }

    if (activePanel === 'engagement') {
      return (
        <section className="panel-card glass">
          <h2>Etkileşim Analizi</h2>
          <p className="muted">Manuel verilerle oran hesaplar; link ve video alanı API için hazırdır.</p>

          <div className="form-grid">
            <label>
              Platform
              <select value={engagementPlatform} onChange={(e) => setEngagementPlatform(e.target.value)}>
                <option>Instagram</option>
                <option>TikTok</option>
                <option>YouTube</option>
              </select>
            </label>

            <label>
              İçerik Türü
              <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                <option>Reels</option>
                <option>TikTok</option>
                <option>Shorts</option>
                <option>Story</option>
              </select>
            </label>

            <label>
              Video Linki
              <input value={videoLink} onChange={(e) => setVideoLink(e.target.value)} />
            </label>

            <label>
              Hesap Linki
              <input value={accountLink} onChange={(e) => setAccountLink(e.target.value)} />
            </label>

            <label>
              Video Yükle
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFileName(e.target.files?.[0]?.name || '')}
              />
            </label>

            <label>
              Takipçi
              <input value={followers} onChange={(e) => setFollowers(e.target.value)} />
            </label>

            <label>
              Görüntülenme
              <input value={views} onChange={(e) => setViews(e.target.value)} />
            </label>

            <label>
              Beğeni
              <input value={likes} onChange={(e) => setLikes(e.target.value)} />
            </label>

            <label>
              Yorum
              <input value={comments} onChange={(e) => setComments(e.target.value)} />
            </label>

            <label>
              Kaydetme
              <input value={saves} onChange={(e) => setSaves(e.target.value)} />
            </label>

            <label>
              Paylaşım
              <input value={shares} onChange={(e) => setShares(e.target.value)} />
            </label>
          </div>

          {videoFileName && <div className="mini-result">Yüklenen video: {videoFileName}</div>}

          <div className="metric-grid">
            <div><strong>{totalEngagement}</strong><span>Toplam Etkileşim</span></div>
            <div><strong>%{engagementRate}</strong><span>Görüntülenmeye Göre ER</span></div>
            <div><strong>%{followerViewRate}</strong><span>Takipçiye Göre İzlenme</span></div>
            <div><strong>%{saveRate}</strong><span>Kaydetme Oranı</span></div>
            <div><strong>%{shareRate}</strong><span>Paylaşım Oranı</span></div>
            <div><strong>%{commentRate}</strong><span>Yorum Oranı</span></div>
          </div>

          <pre className="result">{getEngagementComment()}</pre>
        </section>
      );
    }

    return (
      <section className="panel-card glass chat-panel">
        <h2>Lyra Mesajlaşma</h2>
        <p className="muted">Yaz, sesle yazdır ya da canlı konuşmayı başlat. Lyra cevapları artık daha hızlı okur.</p>

        <div className="chat-list">
          {messages.map((message, index) => (
            <div key={index} className={`bubble ${message.role}`}>
              <strong>{message.role === 'user' ? 'Sen' : 'Lyra'}</strong>
              <p
                className={
                  message.role === 'lyra' && isTyping && index === messages.length - 1
                    ? 'typing-cursor'
                    : ''
                }
              >
                {message.text}
              </p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input">
          <input
            value={chatInput}
            onChange={(e) => {
              if (assistantSpeakingRef.current) interruptSpeech('Yazmaya başladın, sustum');
              setChatInput(e.target.value);
              finalTranscriptRef.current = e.target.value;
            }}
            placeholder={isDictating ? 'Konuş, buraya yazıyorum...' : 'Lyra’ya yaz veya sesle yazdır...'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendTextMessage();
            }}
          />
          <button onClick={() => sendTextMessage()}>Gönder</button>
          <button onClick={toggleDictation}>{isDictating ? 'Durdur' : 'Sesle Yaz'}</button>
          <button onClick={() => interruptSpeech('Sustum kankam')}>Sustur</button>
        </div>
      </section>
    );
  }

  return (
    <main className="page">
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />

      <div className="shell">
        <header className="topbar glass">
          <div className="brand">
            <div className="brand-star">S</div>
            <div>
              <h1>Sirius AI</h1>
              <p>Lyra ile üret, planla, çalış, analiz et.</p>
            </div>
          </div>

          <div className="top-actions">
            <button className={liveOn ? 'pill active' : 'pill'} onClick={toggleLiveConversation}>
              {liveOn ? 'Canlı Açık' : 'Canlı Konuş'}
            </button>

            <button className={isDictating ? 'pill active' : 'pill'} onClick={toggleDictation}>
              {isDictating ? 'Yazıyor...' : 'Sesle Yaz'}
            </button>

            <button className="pill" onClick={() => interruptSpeech('Sustum kankam')}>
              Sustur
            </button>

            <div className="voice-mode">
              <button
                className={voiceMode === 'off' ? 'voice active' : 'voice'}
                onClick={() => {
                  interruptSpeech('Sessiz mod açık');
                  setVoiceMode('off');
                }}
              >
                Sessiz
              </button>

              <button
                className={voiceMode === 'phone' ? 'voice active' : 'voice'}
                onClick={() => {
                  setVoiceMode('phone');
                  setLiveStatus('Telefon sesi aktif');
                  unlockSpeech();
                }}
              >
                Telefon Sesi
              </button>

              <button
                className={voiceMode === 'realistic' ? 'voice active' : 'voice'}
                onClick={() => {
                  interruptSpeech('Gerçekçi ses yakında');
                  setVoiceMode('realistic');
                }}
              >
                Gerçekçi Ses
              </button>
            </div>
          </div>
        </header>

        <section className="hero glass">
          <div className="hero-copy">
            <span className="eyebrow">SIRIUS CANLI ALAN</span>
            <h2>Bugün ne üretiyoruz kankam?</h2>
            <p>
              PDF özet, görsel üretim, sosyal medya içerik fikri, günlük plan, ders notu,
              video kayıt ve etkileşim analizi tek yerde.
            </p>

            <div className="hero-buttons">
              <button onClick={toggleLiveConversation}>{liveOn ? 'Canlıyı Kapat' : 'Canlı Konuşmayı Başlat'}</button>
              <button onClick={() => openPanel('social')}>İçerik Üret</button>
              <button onClick={() => openPanel('engagement')}>Etkileşim Analizi</button>
            </div>

            <div className="status-line">
              Canlı: {liveStatus} · Yazışma: {dictationStatus}
            </div>
          </div>

          <div className="orb-wrap">
            <div
              className={`assistant-orb ${
                assistantSpeaking ? 'speaking' : liveListening ? 'listening' : 'idle'
              }`}
            >
              <div className="orb-ring ring-one" />
              <div className="orb-ring ring-two" />
              <div className="orb-ring ring-three" />
              <div className="orb-core">S</div>
            </div>
            <p>{assistantSpeaking ? 'Lyra konuşuyor...' : liveListening ? 'Seni dinliyorum...' : 'Hazır'}</p>
          </div>
        </section>

        <section className="tools-grid">
          {tools.map((tool) => (
            <button
              key={tool.key}
              className={activePanel === tool.key ? 'tool-card glass selected' : 'tool-card glass'}
              onClick={() => openPanel(tool.key)}
            >
              <strong>{tool.title}</strong>
              <small>{tool.desc}</small>
            </button>
          ))}
        </section>

        <section className="content-grid">
          <div>{renderPanel()}</div>

          <aside className="side-column">
            <section className="mini-card glass">
              <h3>Etkileşim Kısayolu</h3>
              <p className="muted">Video linki, hesap linki ve manuel metriklerle analiz yap.</p>
              <button className="primary" onClick={() => openPanel('engagement')}>
                Etkileşim Panelini Aç
              </button>
            </section>

            <section className="mini-card glass">
              <h3>Kahve Modu</h3>
              <p className="muted">Yumuşak plan, sakin akış, küçük adım.</p>
              <button
                className="primary"
                onClick={() => {
                  const reply = avoidRepeat(
                    'Kahve modu açıldı kankam. Bugün her şeyi aynı anda çözmüyoruz; bir küçük adım seçiyoruz. İstersen önce planı toparlayalım.'
                  );
                  typeLyraReply(reply);
                  speakWithPhoneVoice(reply);
                }}
              >
                Aç
              </button>
            </section>
          </aside>
        </section>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          color: #241929;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 188, 213, 0.45), transparent 28%),
            radial-gradient(circle at 82% 18%, rgba(171, 214, 255, 0.42), transparent 30%),
            radial-gradient(circle at 50% 90%, rgba(255, 222, 165, 0.42), transparent 34%),
            linear-gradient(135deg, #fffafd 0%, #f7fbff 45%, #fff7eb 100%);
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .page {
          min-height: 100vh;
          padding: 24px;
          position: relative;
          overflow-x: hidden;
        }

        .cloud {
          position: fixed;
          pointer-events: none;
          filter: blur(18px);
          opacity: 0.7;
          z-index: 0;
        }

        .cloud-one {
          width: 320px;
          height: 160px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          top: 80px;
          left: -80px;
        }

        .cloud-two {
          width: 380px;
          height: 190px;
          border-radius: 999px;
          background: rgba(255, 233, 245, 0.75);
          bottom: 90px;
          right: -120px;
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .glass {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(22px);
          box-shadow: 0 24px 70px rgba(95, 72, 118, 0.13);
        }

        .topbar {
          border-radius: 30px;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-star {
          width: 54px;
          height: 54px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 22px;
          font-weight: 900;
          color: #8c4dff;
          background: linear-gradient(135deg, #fff, #ffe8f2, #e7f4ff);
          box-shadow: 0 12px 28px rgba(143, 94, 255, 0.16);
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 2px;
          font-size: 30px;
          letter-spacing: -0.04em;
          color: #241929;
        }

        h2,
        h3 {
          color: #241929;
        }

        .brand p,
        .muted {
          margin: 0;
          color: #5f5266;
          line-height: 1.55;
        }

        .top-actions,
        .hero-buttons,
        .toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .pill,
        .voice,
        .hero-buttons button,
        .toolbar button,
        .primary,
        .chat-input button {
          border: 0;
          border-radius: 999px;
          padding: 11px 16px;
          background: linear-gradient(135deg, #fff, #ffe7f1);
          color: #2c1833;
          box-shadow: 0 10px 25px rgba(131, 92, 145, 0.12);
          font-weight: 800;
        }

        .pill.active,
        .voice.active,
        .primary {
          background: linear-gradient(135deg, #ffb8d2, #bba7ff, #a9e7ff);
          color: #22152c;
          font-weight: 900;
        }

        .voice-mode {
          padding: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .voice {
          font-size: 13px;
          padding: 9px 11px;
        }

        .hero {
          min-height: 420px;
          border-radius: 34px;
          padding: clamp(22px, 4vw, 44px);
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 28px;
          align-items: center;
          overflow: hidden;
          position: relative;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.75), transparent 18%),
            radial-gradient(circle at 88% 18%, rgba(255, 230, 164, 0.28), transparent 25%);
          pointer-events: none;
        }

        .hero-copy,
        .orb-wrap {
          position: relative;
          z-index: 1;
        }

        .eyebrow {
          display: inline-flex;
          margin-bottom: 14px;
          border-radius: 999px;
          padding: 8px 12px;
          color: #7042db;
          background: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .hero h2 {
          font-size: clamp(36px, 6vw, 72px);
          line-height: 0.96;
          margin-bottom: 18px;
          letter-spacing: -0.07em;
          color: #251529;
        }

        .hero p {
          max-width: 680px;
          color: #5d4e64;
          line-height: 1.7;
          font-size: 17px;
        }

        .status-line {
          margin-top: 18px;
          color: #6d5c74;
          font-size: 14px;
        }

        .orb-wrap {
          display: grid;
          place-items: center;
          text-align: center;
          gap: 18px;
        }

        .assistant-orb {
          width: min(360px, 78vw);
          height: min(360px, 78vw);
          position: relative;
          display: grid;
          place-items: center;
          border-radius: 50%;
        }

        .orb-core {
          width: 42%;
          height: 42%;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: white;
          font-size: 46px;
          font-weight: 900;
          background:
            radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.95), transparent 22%),
            conic-gradient(from 90deg, #ff8ecb, #b69cff, #8fdcff, #8cf1c9, #ffe08a, #ff8ecb);
          box-shadow:
            0 0 45px rgba(255, 142, 203, 0.38),
            0 0 75px rgba(143, 220, 255, 0.32);
          animation: orbIdle 4s ease-in-out infinite;
        }

        .orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.76);
          background: conic-gradient(
            from 120deg,
            rgba(255, 142, 203, 0.3),
            rgba(182, 156, 255, 0.25),
            rgba(143, 220, 255, 0.25),
            rgba(140, 241, 201, 0.25),
            rgba(255, 224, 138, 0.28),
            rgba(255, 142, 203, 0.3)
          );
        }

        .ring-one {
          width: 60%;
          height: 60%;
          animation: ringPulse 3.4s ease-in-out infinite;
        }

        .ring-two {
          width: 78%;
          height: 78%;
          animation: ringPulse 4.2s ease-in-out infinite;
        }

        .ring-three {
          width: 96%;
          height: 96%;
          animation: ringPulse 5s ease-in-out infinite;
        }

        .assistant-orb.speaking .orb-core {
          animation: orbSpeak 0.9s ease-in-out infinite;
        }

        .assistant-orb.listening .orb-ring {
          animation-duration: 1.4s;
        }

        @keyframes orbIdle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }

        @keyframes orbSpeak {
          0%, 100% { transform: scale(0.96); }
          50% { transform: scale(1.12); }
        }

        @keyframes ringPulse {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.82;
          }
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .tool-card {
          aspect-ratio: 1 / 0.78;
          min-height: 145px;
          border-radius: 28px;
          border: 0;
          padding: 18px;
          text-align: left;
          color: #2d1d32;
          display: grid;
          align-content: end;
          gap: 8px;
          transition: 0.2s ease;
        }

        .tool-card:hover,
        .tool-card.selected {
          transform: translateY(-3px);
          box-shadow: 0 28px 70px rgba(143, 94, 255, 0.18);
        }

        .tool-card strong {
          font-size: 21px;
          color: #241929;
        }

        .tool-card small {
          color: #5f5266;
          line-height: 1.35;
          font-weight: 600;
        }

        .content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 18px;
          align-items: start;
        }

        .panel-card,
        .mini-card {
          border-radius: 30px;
          padding: 22px;
        }

        .side-column {
          display: grid;
          gap: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin: 16px 0;
        }

        label {
          display: grid;
          gap: 8px;
          color: #3f2f47;
          font-weight: 800;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid rgba(74, 48, 88, 0.18);
          background: rgba(255, 255, 255, 0.94);
          color: #241929;
          border-radius: 18px;
          padding: 13px 14px;
          outline: none;
          font-weight: 600;
        }

        input::placeholder,
        textarea::placeholder {
          color: #8b7a93;
        }

        textarea {
          resize: vertical;
        }

        .textarea {
          min-height: 150px;
          margin-top: 14px;
        }

        .result,
        .mini-result,
        .notice {
          white-space: pre-wrap;
          border: 1px solid rgba(74, 48, 88, 0.12);
          background: rgba(255, 255, 255, 0.88);
          border-radius: 22px;
          padding: 16px;
          color: #241929;
          line-height: 1.6;
          margin-top: 14px;
          overflow: auto;
          font-weight: 600;
        }

        .chat-list {
          height: 460px;
          overflow: auto;
          display: grid;
          gap: 12px;
          margin: 18px 0;
          padding-right: 4px;
        }

        .bubble {
          max-width: 86%;
          border-radius: 22px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 12px 30px rgba(99, 72, 111, 0.08);
          color: #241929;
        }

        .bubble.user {
          margin-left: auto;
          background: linear-gradient(135deg, #ffe4ee, #efeaff);
        }

        .bubble p {
          margin: 6px 0 0;
          white-space: pre-wrap;
          line-height: 1.55;
          color: #241929;
        }

        .typing-cursor::after {
          content: '';
          display: inline-block;
          width: 7px;
          height: 1em;
          margin-left: 4px;
          background: #7c4dff;
          vertical-align: -2px;
          animation: blink 0.8s infinite;
        }

        @keyframes blink {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }

        .chat-input {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 10px;
        }

        .image-preview {
          min-height: 260px;
          border-radius: 26px;
          display: grid;
          place-items: center;
          text-align: center;
          background:
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.85), transparent 18%),
            linear-gradient(135deg, #ffdff0, #e9e4ff, #dff7ff, #fff0c9);
          color: #5e4380;
          margin: 16px 0;
          overflow: hidden;
          box-shadow: inset 0 0 70px rgba(255, 255, 255, 0.44);
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .sparkle {
          font-size: 36px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 16px;
        }

        .metric-grid div {
          border-radius: 22px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.82);
          display: grid;
          gap: 5px;
        }

        .metric-grid strong {
          font-size: 24px;
          color: #6d40e8;
        }

        .metric-grid span {
          color: #5f5266;
          font-size: 13px;
          font-weight: 700;
        }

        .saved-list {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .saved-item {
          border-radius: 20px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(74, 48, 88, 0.1);
          display: grid;
          gap: 6px;
        }

        .saved-item span {
          color: #65546d;
          font-size: 13px;
        }

        .camera-frame {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          background: #f4eff8;
          border: 1px solid rgba(108, 82, 126, 0.1);
          display: grid;
          place-items: center;
          margin-top: 14px;
        }

        .ratio-story {
          aspect-ratio: 9 / 16;
          max-height: 760px;
        }

        .ratio-square {
          aspect-ratio: 1 / 1;
        }

        .ratio-four-five {
          aspect-ratio: 4 / 5;
        }

        .ratio-wide {
          aspect-ratio: 16 / 9;
        }

        .ratio-full {
          min-height: 560px;
        }

        .camera-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: #f4eff8;
        }

        .camera-placeholder {
          position: relative;
          z-index: 2;
          text-align: center;
          color: #5f5266;
        }

        .tele-overlay {
          position: absolute;
          left: 50%;
          bottom: 20px;
          transform: translateX(-50%);
          z-index: 4;
          width: min(92%, 740px);
          max-height: 42%;
          overflow: hidden;
          padding: 16px 20px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          text-align: center;
        }

        .tele-overlay p {
          margin: 0;
          font-size: clamp(20px, 3.4vw, 36px);
          line-height: 1.35;
          color: #241929;
          font-weight: 900;
        }

        .rec {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 5;
          color: #c81939;
          background: rgba(255, 255, 255, 0.84);
          border-radius: 999px;
          padding: 8px 12px;
          font-weight: 900;
        }

        .danger {
          border-color: rgba(255, 80, 80, 0.28);
          color: #9a1f35;
        }

        .recorded {
          width: 100%;
          margin-top: 12px;
          border-radius: 18px;
          background: #000;
        }

        .download {
          display: inline-flex;
          margin-top: 12px;
          color: #2d1d32;
          text-decoration: none;
          border-radius: 999px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #ffb8d2, #bba7ff, #a9e7ff);
          font-weight: 900;
        }

        @media (max-width: 1180px) {
          .hero,
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .tools-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 720px) {
          .page {
            padding: 12px;
          }

          .topbar,
          .hero,
          .panel-card,
          .mini-card {
            border-radius: 24px;
          }

          .top-actions,
          .hero-buttons,
          .toolbar,
          .voice-mode {
            width: 100%;
          }

          .tools-grid,
          .form-grid,
          .chat-input,
          .metric-grid {
            grid-template-columns: 1fr;
          }

          .hero {
            grid-template-columns: 1fr;
          }

          .hero h2 {
            font-size: 42px;
          }

          .assistant-orb {
            width: 280px;
            height: 280px;
          }
        }
      `}</style>
    </main>
  );
}

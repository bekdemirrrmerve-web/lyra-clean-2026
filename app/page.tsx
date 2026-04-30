'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type VoiceMode = 'off' | 'phone' | 'realistic';

type Panel =
  | 'pdf'
  | 'image'
  | 'social'
  | 'plan'
  | 'study'
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
  const [activePanel, setActivePanel] = useState<Panel>('social');

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'lyra',
      text:
        'Buradayım kankam. Bana ne yapmak istediğini yaz; ben sana içerik, plan, ders notu, analiz ya da çekim fikri gibi işe yarar bir çıktıya çevireyim.',
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [researchMode, setResearchMode] = useState(true);

  const [voiceMode, setVoiceMode] = useState<VoiceMode>('phone');
  const [speechRate, setSpeechRate] = useState(1.02);
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
  const [imageStyle, setImageStyle] = useState('Editorial');
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
    'Bugün size kısa ama gerçekten işe yarayan bir bilgiden bahsedeceğim...'
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
  const recordStartTimeRef = useRef(0);

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

  const cameraScale = cameraMode === 'wide' ? 0.78 : cameraMode === 'normal' ? 0.92 : 1.06;

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

  const tools: { key: Panel; title: string; desc: string; color: string }[] = [
    { key: 'pdf', title: 'PDF Özetle', desc: 'PDF yükle, özet modunu seç', color: 'pearl' },
    { key: 'image', title: 'Görsel Oluştur', desc: 'Prompttan soyut görsel üret', color: 'pink' },
    { key: 'social', title: 'İçerik Asistanı', desc: 'Hook, metin, caption, CTA', color: 'violet' },
    { key: 'plan', title: 'Günlük Plan', desc: 'Enerjine göre plan çıkar', color: 'gold' },
    { key: 'study', title: 'Ders Çalışma', desc: 'Not, test, konu anlatımı, PDF', color: 'blue' },
    { key: 'video', title: 'Video Çekim', desc: 'Kamera, oran, kayıt, paylaş', color: 'mint' },
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

    const remix = `${reply}

Farklılaştırılmış açı:
Bu sefer aynı konuyu “neden böyle oluyor?” sorusuyla aç. Daha merak uyandırır ve robotik tekrar gibi durmaz.`;

    lastRepliesRef.current = [remix, ...recent].slice(0, 8);
    return remix;
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

  function interruptSpeech(reason = 'Sustum kankam') {
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
        cleanText.length < 650
          ? [cleanText]
          : cleanText
              .split(/(?<=[.!?])\s+/)
              .map((chunk) => chunk.trim())
              .filter(Boolean)
              .reduce<string[]>((acc, sentence) => {
                const last = acc[acc.length - 1] || '';

                if ((last + ' ' + sentence).length < 520) {
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
        utterance.rate = speechRate;
        utterance.pitch = 1.02;
        utterance.volume = 1;

        const voice = getBestVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
          index += 1;
          setTimeout(speakNext, 40);
        };

        utterance.onerror = () => {
          index += 1;
          setTimeout(speakNext, 40);
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
      index += 3;

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
    }, 7);
  }

  async function askResearchApi(question: string) {
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) return null;

      const data = await response.json();

      if (typeof data?.answer === 'string' && data.answer.trim()) {
        return data.answer.trim();
      }

      return null;
    } catch {
      return null;
    }
  }

  function createHumanFallbackReply(userText: string) {
    const t = normalize(userText);

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

    if (includesAny(t, ['kamera', 'video', 'çekim', 'kayıt'])) {
      setActivePanel('video');
      return avoidRepeat(
        'Video alanını açıyorum kankam. Bu sürümde oranı 9:16, 4:5, 1:1 veya 16:9 seçebilirsin. iPhone’da çok yakın görünürse kamera modunu “Geniş” yap.'
      );
    }

    if (includesAny(t, ['moral', 'yorgun', 'bunaldım', 'stres', 'kötü'])) {
      return avoidRepeat(
        'Kankam önce bir nefes. Şu an senden dev performans beklemiyoruz. Bunu küçük bir şeye çevirelim: ya 15 dakikalık plan, ya 1 içerik fikri, ya da tek konu ders notu. Kontrol hissi böyle geri geliyor.'
      );
    }

    const angles = [
      'Bence burada asıl mesele ne istediğini netleştirip onu tek çıktıya çevirmek.',
      'Ben olsam bunu önce küçük parçalara ayırırdım; çünkü büyük görünce insanın eli gitmiyor.',
      'Bu konuya biraz stratejik bakalım: amaç ne, hedef kim, ilk adım ne?',
      'Bunu çok daha iyi hale getirmek için önce niyeti yakalayıp sonra uygulanabilir bir şeye dönüştürelim.',
    ];

    const formats = [
      'istersen bunu kısa plan',
      'istersen bunu içerik metni',
      'istersen bunu ders notu',
      'istersen bunu video akışı',
      'istersen bunu araştırma özeti',
    ];

    return avoidRepeat(`Duydum kankam: “${userText}”

${pick(angles)}

Ben bunu şöyle toparlardım:
1. Önce konunun ana amacını seç.
2. Sonra gereksiz detayları ayıkla.
3. En son bunu uygulanabilir tek çıktıya çevir.

Bana bir cümle daha verirsen ${pick(formats)} gibi hazırlayabilirim.`);
  }

  async function createLyraReply(userText: string) {
    if (researchMode) {
      const researched = await askResearchApi(userText);

      if (researched) {
        return avoidRepeat(
          `${researched}

Minik Lyra yorumu:
Ben bunu uygulamaya çevirecek olsam önce en işe yarar 2-3 maddeyi seçip aksiyon planına dökerdim.`
        );
      }
    }

    return createHumanFallbackReply(userText);
  }

  function createSmartContentIdea(topicRaw?: string) {
    const topic = (topicRaw || socialTopic || 'güncel bir konu').trim();

    const hooks = [
      `Bu ${topic} konusunda iyi sonuç almak istiyorsan önce şu detayı bilmen lazım.`,
      `${topic} hakkında çoğu kişinin atladığı şey aslında konu değil, anlatım sırası.`,
      `Bunu herkes anlatıyor ama ${topic} tarafında asıl farkı yaratan nokta başka.`,
      `${topic} sandığın kadar basit değil; doğru açıyla anlatınca çok daha ilgi çekici oluyor.`,
      `Ben olsam ${topic} konusuna direkt buradan başlardım.`,
      `${topic} için kaydedilecek mini rehber: önce neyi yanlış yaptığımızı görelim.`,
      `Bu konuda fikir değiştirecek bir ayrıntı söyleyeceğim.`,
      `İlk duyunca küçük gibi geliyor ama ${topic} tarafında sonucu değiştiren detay bu.`,
    ];

    const flows = [
      ['Problemi tek cümleyle göster', 'İzleyicinin kendini görmesini sağla', '3 maddelik çözüm ver', 'Mini örnek koy', 'Kaydet CTA'],
      ['Yanlış bilinen noktayı söyle', 'Neden yanlış olduğunu açıkla', 'Doğru yaklaşımı göster', 'Kime uygun değil belirt', 'Yorum CTA'],
      ['Kişisel gözlemle başla', 'Bilimsel/stratejik mantığı sadeleştir', 'Örnek senaryo kur', 'Kısa öneri ver', 'Seriye bağla'],
      ['Trend cümleyle gir', 'Beklentiyi tersine çevir', 'Asıl sebebi anlat', 'Uygulanabilir adım ver', 'Paylaş CTA'],
      ['Önce iddialı ama güvenli cümle', 'Hemen mantık ver', 'Küçük kontrol listesi yap', 'Örnek göster', 'Devam CTA'],
    ];

    const ctas = [
      'Bunu kaydet, sonra içerik çekerken/ürün seçerken işine yarar.',
      'Sen bunu daha önce böyle düşünmüş müydün?',
      'Devamında bunu örneklerle anlatayım mı?',
      'Yorumlara “devam” yaz, bunu seri yapayım.',
      'Bunu arkadaşına gönder; o da aynı hatayı yapıyor olabilir.',
      'Bir sonraki videoda hangi konuyu parçalayayım?',
    ];

    const flow = pick(flows);

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
- “Bunu çoğu kişi atlıyor”
- “Asıl mesele burada”
- “Kaydetmelik mini rehber”

Konuşma Metni:
“${topic} konusunda bence en büyük hata, herkesin aynı şeyi aynı şekilde anlatması. İzleyiciye önce ‘bu benim problemim’ dedirtmek gerekiyor. Sonra konuyu sadeleştirip tek bir uygulanabilir çözüm vermek lazım. Böyle olunca video sadece bilgi vermiyor, izleyicinin kafasında küçük bir karar değişikliği oluşturuyor.”

Caption:
${topic} konusunda küçük detaylar büyük fark yaratabilir. Kaydet, sonra lazım olur.

CTA:
${pick(ctas)}

Çekim Önerisi:
Açık arka plan, yüz yakın plan, ekranda 3 madde. İlk 2 saniyede net vaat ver, sonunda tek aksiyon iste.

Ekstra Viral Açı:
Konuyu “şunu yapma” diye sert anlatmak yerine “bunu böyle yaparsan daha mantıklı olur” diye kur. Daha güvenilir durur.`);
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

    const seed = base.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const palettes = [
      ['#fffafd', '#e9e4ff', '#dff7ff', '#fff0c9'],
      ['#ffe1ee', '#fff8fb', '#f2ddff', '#dff7ff'],
      ['#ffffff', '#f6eefc', '#e5f7ff', '#fff3d6'],
      ['#fff4fb', '#d9cbff', '#bceeff', '#fff1ba'],
      ['#f9fffe', '#dff9ef', '#e8eeff', '#fff4d0'],
    ];

    const palette = palettes[seed % palettes.length];

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.34, palette[1]);
    gradient.addColorStop(0.68, palette[2]);
    gradient.addColorStop(1, palette[3]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 64; i += 1) {
      const x = ((Math.sin(seed + i * 18.31) + 1) / 2) * width;
      const y = ((Math.cos(seed + i * 11.73) + 1) / 2) * height;
      const r = 24 + (((seed + i * 19) % 120));

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${0.28 + ((i % 9) / 30)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 36; i += 1) {
      const x = ((Math.sin(seed * 0.7 + i * 7.4) + 1) / 2) * width;
      const y = ((Math.cos(seed * 0.4 + i * 5.9) + 1) / 2) * height;
      const size = 6 + ((seed + i * 3) % 18);

      ctx.fillStyle = 'rgba(112, 66, 219, 0.24)';
      drawStar(ctx, x, y, size);
    }

    for (let i = 0; i < 8; i += 1) {
      const x = ((Math.sin(seed + i * 3.2) + 1) / 2) * width;
      const y = ((Math.cos(seed + i * 2.7) + 1) / 2) * height;
      const w = width * (0.16 + ((i % 3) * 0.05));
      const h = height * (0.06 + ((i % 2) * 0.03));

      ctx.fillStyle = `rgba(255,255,255,${0.16 + (i % 4) * 0.05})`;
      roundRect(ctx, x - w / 2, y - h / 2, w, h, 999);
      ctx.fill();
    }

    const frameGradient = ctx.createLinearGradient(width * 0.12, height * 0.2, width * 0.88, height * 0.8);
    frameGradient.addColorStop(0, 'rgba(255,255,255,0.48)');
    frameGradient.addColorStop(1, 'rgba(255,255,255,0.12)');

    ctx.strokeStyle = frameGradient;
    ctx.lineWidth = Math.max(8, width * 0.01);
    roundRect(ctx, width * 0.08, height * 0.08, width * 0.84, height * 0.84, width * 0.045);
    ctx.stroke();

    canvas.toBlob((blob) => {
      if (!blob) return;

      if (generatedImageUrl) URL.revokeObjectURL(generatedImageUrl);

      const url = URL.createObjectURL(blob);
      setGeneratedImageUrl(url);

      setImageResult(`Görsel oluşturuldu.

Not:
Bu sürüm yazıyı görselin içine basmaz. Yazdığın metin sadece renk, atmosfer ve kompozisyonu yönlendiren fikir olarak kullanılır. Gerçek fotogerçekçi AI görsel için sonra image API bağlanacak.

Kullanılan fikir:
${base}

Stil:
${imageStyle}

Oran:
${imageRatio}`);
    }, 'image/png');
  }

  function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.35, y - size * 0.35);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size * 0.35, y + size * 0.35);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.35, y + size * 0.35);
    ctx.lineTo(x - size, y);
    ctx.lineTo(x - size * 0.35, y - size * 0.35);
    ctx.closePath();
    ctx.fill();
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

  async function sendTextMessage(customText?: string) {
    const raw = customText ?? chatInput;
    const text = raw.trim();
    if (!text) return;

    interruptSpeech('Yeni mesajını aldım');
    unlockSpeech();

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');
    finalTranscriptRef.current = '';
    setIsTyping(true);

    const reply = await createLyraReply(text);

    setIsTyping(false);
    typeLyraReply(reply);
    speakWithPhoneVoice(reply);
  }

  function handleLiveUserText(text: string) {
    if (!text.trim()) return;

    interruptSpeech('Sözünü aldım');

    setMessages((prev) => [...prev, { role: 'user', text }]);

    createLyraReply(text).then((reply) => {
      setMessages((prev) => [...prev, { role: 'lyra', text: reply }]);

      speakWithPhoneVoice(reply, () => {
        if (liveOnRef.current) setTimeout(() => startLiveListening(), 350);
      });
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
      const elapsed = Date.now() - recordStartTimeRef.current;

      if (elapsed < 1200) {
        setCameraError('Kayıt çok kısa oldu kankam. En az 1-2 saniye bekle, sonra durdur.');
        return;
      }

      try {
        mediaRecorderRef.current?.requestData?.();
      } catch {}

      setTimeout(() => {
        mediaRecorderRef.current?.stop();
        setRecording(false);
      }, 250);

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

        if (blob.size < 1000) {
          setCameraError('Video kaydı boş görünüyor. Biraz daha uzun kayıt alıp tekrar dene.');
          return;
        }

        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
      };

      mediaRecorderRef.current = recorder;
      recordStartTimeRef.current = Date.now();
      recorder.start(1000);
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
            Bu sürüm tarayıcı içinde soyut görsel üretir. Yazdığın metni görselin içine yazmaz.
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
          <p className="muted">Konuya göre özgün hook, video metni, caption, CTA ve etkileşim yorumu üretir.</p>

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

          <div className="toolbar">
            <button className="primary" onClick={() => setSocialResult(createSocialAssistantReply())}>
              İçerik Üret
            </button>
            <button onClick={() => setSocialResult(createSmartContentIdea(socialTopic))}>
              Alternatif Fikir
            </button>
          </div>

          <pre className="result">{socialResult || 'Henüz içerik üretilmedi.'}</pre>

          <h3>Etkileşim Hesabı</h3>

          <div className="form-grid">
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
            <div><strong>%{engagementRate}</strong><span>ER</span></div>
            <div><strong>%{followerViewRate}</strong><span>Takipçiye Göre İzlenme</span></div>
            <div><strong>%{saveRate}</strong><span>Kaydetme</span></div>
            <div><strong>%{shareRate}</strong><span>Paylaşım</span></div>
            <div><strong>%{commentRate}</strong><span>Yorum</span></div>
          </div>

          <pre className="result">{getEngagementComment()}</pre>
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

    return null;
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

            <button
              className={researchMode ? 'pill active' : 'pill'}
              onClick={() => setResearchMode((prev) => !prev)}
            >
              {researchMode ? 'Araştırmalı Mod' : 'Yerel Mod'}
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
              <button onClick={() => openPanel('study')}>Ders Çalış</button>
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

            <label className="rate-control">
              Ses hızı: {speechRate.toFixed(2)}
              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.01"
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
              />
            </label>
          </div>
        </section>

        <section className="tools-grid">
          {tools.map((tool) => (
            <button
              key={tool.key}
              className={`tool-card glass selected-${tool.color} ${
                activePanel === tool.key ? 'selected' : ''
              }`}
              onClick={() => openPanel(tool.key)}
            >
              <strong>{tool.title}</strong>
              <small>{tool.desc}</small>
            </button>
          ))}
        </section>

        <section className="home-chat glass">
          <h2>Lyra’ya Direkt Sor</h2>
          <p className="muted">
            Buradan direkt yazışabilirsin. Araştırmalı mod açıksa `/api/research` bağlı olduğunda web araştırmalı cevap verir.
          </p>

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

        <section>{renderPanel()}</section>
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
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(255, 255, 255, 0.92);
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

        .rate-control {
          width: min(320px, 80vw);
          display: grid;
          gap: 8px;
          color: #4c3d54;
          font-weight: 800;
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
          aspect-ratio: 1 / 0.72;
          min-height: 145px;
          border-radius: 28px;
          border: 0;
          padding: 20px;
          text-align: left;
          color: #2d1d32;
          display: grid;
          align-content: end;
          gap: 8px;
          transition: 0.2s ease;
          overflow: hidden;
          position: relative;
        }

        .tool-card::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.7;
          pointer-events: none;
        }

        .selected-pearl::before {
          background: radial-gradient(circle at 20% 15%, #fff, transparent 30%), linear-gradient(135deg, #fff, #f6eeff);
        }

        .selected-pink::before {
          background: radial-gradient(circle at 20% 15%, #fff, transparent 30%), linear-gradient(135deg, #ffe1ef, #f0e7ff);
        }

        .selected-violet::before {
          background: radial-gradient(circle at 20% 15%, #fff, transparent 30%), linear-gradient(135deg, #eee7ff, #dff5ff);
        }

        .selected-gold::before {
          background: radial-gradient(circle at 20% 15%, #fff, transparent 30%), linear-gradient(135deg, #fff0c8, #fff);
        }

        .selected-blue::before {
          background: radial-gradient(circle at 20% 15%, #fff, transparent 30%), linear-gradient(135deg, #e0f4ff, #f3eaff);
        }

        .selected-mint::before {
          background: radial-gradient(circle at 20% 15%, #fff, transparent 30%), linear-gradient(135deg, #dbfff1, #e9f0ff);
        }

        .tool-card:hover,
        .tool-card.selected {
          transform: translateY(-3px);
          box-shadow: 0 28px 70px rgba(143, 94, 255, 0.18);
        }

        .tool-card strong,
        .tool-card small {
          position: relative;
          z-index: 1;
        }

        .tool-card strong {
          font-size: 21px;
          color: #241929;
        }

        .tool-card small {
          color: #5f5266;
          line-height: 1.35;
          font-weight: 700;
        }

        .home-chat,
        .panel-card {
          border-radius: 30px;
          padding: 22px;
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
          background: rgba(255, 255, 255, 0.9);
          border-radius: 22px;
          padding: 16px;
          color: #241929;
          line-height: 1.6;
          margin-top: 14px;
          overflow: auto;
          font-weight: 600;
        }

        .chat-list {
          max-height: 440px;
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
          background: rgba(255, 255, 255, 0.92);
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
          background: rgba(255, 255, 255, 0.84);
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
          background: rgba(255, 255, 255, 0.84);
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
          width: min(100%, 760px);
          margin-left: auto;
          margin-right: auto;
        }

        .ratio-story {
          aspect-ratio: 9 / 16;
          max-height: 760px;
        }

        .ratio-square {
          aspect-ratio: 1 / 1;
          max-height: 720px;
        }

        .ratio-four-five {
          aspect-ratio: 4 / 5;
          max-height: 760px;
        }

        .ratio-wide {
          aspect-ratio: 16 / 9;
          max-height: 520px;
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
          .hero {
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
          .home-chat {
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

          .hero h2 {
            font-size: 42px;
          }

          .assistant-orb {
            width: 280px;
            height: 280px;
          }

          .camera-frame {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Panel = 'pdf' | 'image' | 'social' | 'plan' | 'study' | 'video';
type VoiceMode = 'off' | 'phone' | 'realistic';

type Message = {
  role: 'user' | 'lyra';
  text: string;
  createdAt: number;
};

type MemoryItem = {
  id: number;
  topic: string;
  detail: string;
  createdAt: number;
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
        'Kankam hoş geldin. Buradan direkt benimle sohbet edebilirsin. İstersen içerik, ders, plan, analiz ya da günlük bir şey konuşalım.',
      createdAt: Date.now(),
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [researchMode, setResearchMode] = useState(true);
  const [memory, setMemory] = useState<MemoryItem[]>([]);

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
    'Bugün sana kısa ama işe yarayan bir bilgiden bahsedeceğim...'
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
    Number(likes || 0) + Number(comments || 0) + Number(saves || 0) + Number(shares || 0);

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
  const cameraFilter = beautyOn ? 'brightness(1.08) contrast(1.03) saturate(1.08)' : 'none';

  const videoAspectClass = useMemo(() => {
    if (videoRatio === '1:1') return 'ratio-square';
    if (videoRatio === '4:5') return 'ratio-four-five';
    if (videoRatio === '16:9') return 'ratio-wide';
    if (videoRatio === 'full') return 'ratio-full';
    return 'ratio-story';
  }, [videoRatio]);

  const tools: { key: Panel; title: string; desc: string; color: string }[] = [
    { key: 'pdf', title: 'PDF Özetle', desc: 'PDF yükle, özet modunu seç', color: 'pearl' },
    { key: 'image', title: 'Görsel Oluştur', desc: 'Prompttan görsel üret', color: 'pink' },
    { key: 'social', title: 'İçerik Asistanı', desc: 'Hook, metin, caption, CTA', color: 'violet' },
    { key: 'plan', title: 'Günlük Plan', desc: 'Enerjine göre plan çıkar', color: 'gold' },
    { key: 'study', title: 'Ders Çalışma', desc: 'Konu notu, test, PDF', color: 'blue' },
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
    const savedMessages = localStorage.getItem('sirius-chat-history');
    const savedMemory = localStorage.getItem('sirius-memory');
    const savedNotes = localStorage.getItem('sirius-study-notes');

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      } catch {}
    }

    if (savedMemory) {
      try {
        const parsed = JSON.parse(savedMemory);
        if (Array.isArray(parsed)) setMemory(parsed);
      } catch {}
    }

    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        if (Array.isArray(parsed)) setSavedStudyNotes(parsed);
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

  useEffect(() => {
    localStorage.setItem('sirius-chat-history', JSON.stringify(messages.slice(-80)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('sirius-memory', JSON.stringify(memory.slice(-60)));
  }, [memory]);

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

Bu arada bunu biraz daha insansı toparlarsam: burada önemli olan ne istediğini netleştirip onu daha uygulanabilir bir şeye çevirmek.`;
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

  function interruptSpeech(reason = 'Sustum') {
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
      setLiveStatus('Gerçekçi ses sonra bağlanır');
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
          setLiveStatus(liveOnRef.current ? 'Tekrar dinliyorum' : 'Hazır');
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
          setTimeout(speakNext, 30);
        };

        utterance.onerror = () => {
          index += 1;
          setTimeout(speakNext, 30);
        };

        synth.speak(utterance);
      };

      setTimeout(speakNext, 60);
    } catch {
      setAssistantSpeaking(false);
      assistantSpeakingRef.current = false;
      afterEnd?.();
    }
  }

  function typeLyraReply(reply: string) {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    setIsTyping(true);
    const msg: Message = { role: 'lyra', text: '', createdAt: Date.now() };

    setMessages((prev) => [...prev, msg]);

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
    }, 8);
  }

  function extractTopicFromUserText(userText: string) {
    const raw = userText.trim();
    const t = normalize(raw);

    if (includesAny(t, ['retinol', 'cilt', 'serum', 'gunes kremi', 'güneş kremi', 'kozmetik'])) {
      return 'kozmetik / cilt bakımı';
    }
    if (includesAny(t, ['dgs', 'matematik', 'ders', 'konu', 'test', 'paragraf'])) {
      return 'ders / çalışma';
    }
    if (includesAny(t, ['plan', 'gunluk', 'günlük', 'yapilacak', 'rutin'])) {
      return 'günlük plan';
    }
    if (includesAny(t, ['reels', 'tiktok', 'instagram', 'icerik', 'içerik', 'caption'])) {
      return 'sosyal medya içeriği';
    }
    if (includesAny(t, ['uygulama', 'github', 'vercel', 'kod', 'route', 'page.tsx'])) {
      return 'uygulama / kod';
    }
    return raw.length > 60 ? raw.slice(0, 60) + '...' : raw;
  }

  function saveMemoryFromUserText(userText: string) {
    const topic = extractTopicFromUserText(userText);
    const detail = userText.trim();

    if (!detail) return;

    const item: MemoryItem = {
      id: Date.now(),
      topic,
      detail,
      createdAt: Date.now(),
    };

    setMemory((prev) => {
      const next = [item, ...prev].slice(0, 60);
      const unique = next.filter(
        (x, index, arr) =>
          arr.findIndex(
            (y) => normalize(y.detail) === normalize(x.detail) || normalize(y.topic) === normalize(x.topic)
          ) === index
      );
      return unique.slice(0, 40);
    });
  }

  function buildMemoryReply() {
    if (!memory.length) {
      return avoidRepeat(
        'Şu an kayda alınmış belirgin bir hafıza yok kankam. Birkaç şey konuştukça burada önceki konuları sana toparlayabilirim.'
      );
    }

    const lastFive = memory.slice(0, 5);
    const text = lastFive
      .map((item, index) => `${index + 1}. ${item.topic} — ${item.detail}`)
      .join('\n');

    return avoidRepeat(`Hatırlıyorum kankam. Son konuştuğumuz şeylerden bazıları şunlar:

${text}

İstersen bunlardan birini kaldığı yerden devam ettireyim.`);
  }

  async function askResearchApi(question: string) {
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, memory }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (typeof data?.answer === 'string' && data.answer.trim()) return data.answer.trim();
      return null;
    } catch {
      return null;
    }
  }

  function createSmartContentIdea(topicRaw?: string) {
    const topic = (topicRaw || socialTopic || 'güncel bir konu').trim();

    const hooks = [
      `Bu ${topic} konusunda çoğu kişinin atladığı küçük ama kritik bir detay var.`,
      `${topic} anlatacaksan bence videoya buradan başlamak daha etkili olur.`,
      `${topic} için izleyiciyi içeride tutan şey konu değil, giriş şekli.`,
      `${topic} konusunda herkes aynı şeyi söylüyor ama ben başka yerden bakardım.`,
      `Eğer ${topic} içeriği çekeceksen ilk 3 saniye şunu söyle.`,
      `${topic} için kaydedilecek mini rehber yapalım.`,
    ];

    const flow = pick([
      ['Problemi net söyle', 'İzleyici kendini görsün', '3 maddelik çözüm ver', 'Kısa örnek koy', 'CTA ile bitir'],
      ['Yanlış bilinen şeyi söyle', 'Nedenini açıkla', 'Doğru yaklaşımı ver', 'Kısa örnek', 'Kaydet CTA'],
      ['Merak uyandıran cümle', 'Sorunu görünür yap', 'Mini çözüm', 'Sonuç', 'Yorum CTA'],
    ]);

    const cta = pick([
      'Bunu kaydet, sonra işine yarar.',
      'İstersen devamını seri yaparım.',
      'Yorumlara devam yaz, ikinci kısmı hazırlayayım.',
      'Bunu arkadaşına gönder; onun da işine yarayabilir.',
    ]);

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

Konuşma Metni:
“${topic} konusunda bence insanların en çok zorlandığı şey doğru bilgiden çok doğru anlatım biçimi. O yüzden önce problemi sade söylemek, sonra kısa bir çözüm vermek daha etkili oluyor. İzleyici kendini videoda görürse daha çok kalıyor, daha çok kaydediyor.”

Caption:
${topic} anlatırken bazen farkı bilgi değil, anlatım sırası yaratıyor.

CTA:
${cta}`);
  }

  function createSocialAssistantReply() {
    const topic = socialTopic.trim() || 'içerik üretimi';

    return avoidRepeat(`İçerik Asistanı

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

3 Hook:
1. ${pick([
      `${topic} hakkında çoğu kişi aynı şeyi anlatıyor ama asıl kritik nokta başka.`,
      `${topic} içeriğinde ilk 3 saniyeyi doğru kurarsan izlenme fark ediyor.`,
      `${topic} konusunu daha ilgi çekici anlatmanın yolu bence buradan geçiyor.`,
    ])}
2. ${pick([
      `Bunu duyanların yarısı fikrini değiştiriyor.`,
      `${topic} konusunda en çok atlanan detay şu.`,
      `Ben olsam ${topic} anlatırken böyle girerdim.`,
    ])}
3. ${pick([
      `Kaydedilecek kısa rehber: ${topic}`,
      `${topic} için hızlı ama etkili anlatım şekli`,
      `${topic} konusunda daha akıllı bir yaklaşım`,
    ])}

Video Metni:
“Bugün ${topic} hakkında herkesin aynı şekilde anlattığı ama bence farklı bir açıyla konuşulması gereken bir şeyden bahsedeceğim. Çünkü sorun çoğu zaman bilgi eksikliği değil, bilginin nasıl sunulduğu. İzleyici önce kendini görmeli, sonra sorunu net anlamalı, en sonda da küçük ama uygulanabilir bir çözüm almalı.”

CTA:
${pick([
      'Bunu kaydet.',
      'Devamı gelsin mi?',
      'İkinci kısmı ister misin?',
      'Yorumlara hangi konuyu istediğini yaz.',
    ])}`);
  }

  function createDailyPlan() {
    const hours = Number(dailyHours || 3);
    const tasks = dailyTasks.trim() || 'ders çalışma, içerik üretme, dinlenme';
    const priority = dailyPriority.trim() || 'en önemli işe başlamak';

    return `Günlük Plan

Bugünkü enerji:
${dailyEnergy}

Mod:
${dailyMood}

Öncelik:
${priority}

Yapılacaklar:
${tasks}

Plan:
1. İlk 10 dakika: ortamı toparla, su koy, tek hedef seç.
2. ${hours >= 2 ? '40 dakika' : '25 dakika'}: en önemli işe başla.
3. 10 dakika mola ver.
4. 25 dakika: ikinci küçük görevi yap.
5. 15 dakika: günün toparlaması.

Ben olsam bugün kendine aşırı yüklenmeden en görünür tek işe odaklanırdım.`;
  }

  function createStudyAssistantReply(topicFromChat?: string) {
    const topic = (topicFromChat || studyTopic || 'çalışmak istediğin konu').trim();
    const mode = studyMode;

    if (mode === 'Test hazırla') {
      return `${topic} - Mini Test

1. Bu konunun temel mantığı nedir?
A) Ezber
B) Kavramı anlamak
C) Sadece soru çözmek
D) Rastgele çalışmak

2. Çalışmaya başlarken ilk ne yapılmalı?
A) Verilenleri ayırmak
B) Boş bırakmak
C) Sadece şıklara bakmak
D) Konuyu atlamak

Cevaplar:
1-B
2-A`;
    }

    if (mode === 'Ezber kartı yap') {
      return `${topic} - Ezber Kartları

Kart 1
Soru: Bu konunun ana mantığı ne?
Cevap: Önce temel kavramı anlamak.

Kart 2
Soru: En sık yapılan hata ne?
Cevap: Tanımı bilmeden soru çözmeye geçmek.`;
    }

    if (mode === 'Program yap') {
      return `${topic} için kısa program

1. Gün: konu anlatımı + 10 kolay soru
2. Gün: orta seviye sorular
3. Gün: yanlış analizi
4. Gün: tekrar`;
    }

    if (mode === 'Not çıkar') {
      return `${topic} - Özet Not

1. Ana tanım
2. Alt kavramlar
3. Soru tipi
4. Sık hata
5. Çalışma tüyosu`;
    }

    if (mode === 'Yanlış analizi yap') {
      return `${topic} - Yanlış Analizi

[ ] Konu eksiği
[ ] Dikkat hatası
[ ] İşlem hatası
[ ] Süre yönetimi

Kendine sor:
- Burada neyi yanlış okudum?
- Doğru çözümde ilk adım neydi?`;
    }

    return `${topic} - Konu Anlatımı

1. Önce konunun ana mantığını öğren.
2. Sonra örnek üzerinden gör.
3. Ardından 10 soru çöz.
4. Yanlışları not et.

Mini özet:
Konu öğrenmek = tanım + örnek + soru + tekrar`;
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
      alert('PDF penceresi açılamadı.');
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
      const r = 24 + ((seed + i * 19) % 120);

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${0.28 + (i % 9) / 30})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      if (generatedImageUrl) URL.revokeObjectURL(generatedImageUrl);
      const url = URL.createObjectURL(blob);
      setGeneratedImageUrl(url);

      setImageResult(`Görsel oluşturuldu.

Kullanılan fikir:
${base}

Stil:
${imageStyle}

Oran:
${imageRatio}`);
    }, 'image/png');
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

Şu an seçme alanı hazır. İstersen sonra gerçek PDF okuma backend’i de bağlarız.`);
  }

  function getEngagementComment() {
    const er = Number(engagementRate);

    if (er >= 12) return 'Güçlü performans. İçerik izleyiciyi aksiyona sokmuş.';
    if (er >= 7) return 'İyi performans. Kaydetme ve paylaşım iyi.';
    if (er >= 3) return 'Orta performans. Hook ve CTA güçlenebilir.';
    return 'Düşük performans. İlk 3 saniye ve vaat kısmını güçlendirmek lazım.';
  }

  function buildFriendlyFallbackReply(userText: string) {
    const t = normalize(userText);

    if (
      includesAny(t, [
        'hatirliyor musun',
        'hatırlıyor musun',
        'daha once',
        'daha önce',
        'ne sormustum',
        'ne sormuştum',
        'onceki konu',
        'önceki konu',
      ])
    ) {
      return buildMemoryReply();
    }

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
        'Video alanını açıyorum. Buradan oran seçebilir, kayıt yapabilir ve paylaşabilirsin. iPhone’da uygulama gibi görünmesi için bu sayfa mobilde app kartlarıyla açılıyor.'
      );
    }

    if (includesAny(t, ['uygulama', 'github', 'vercel', 'kod', 'page.tsx', 'route'])) {
      return avoidRepeat(
        'Burada en mantıklı şey önce neyi değiştirmek istediğini tek cümlede netleştirmek. Sonra sana direkt “hangi dosyada neyi silip neyi yapıştıracağını” söylerim. Uygulama tarafında parça parça gitmek en güvenlisi.'
      );
    }

    if (includesAny(t, ['dizi', 'film', 'öner'])) {
      return avoidRepeat(
        'Kankam bu konuda sana düz liste değil, zevkine göre ayırarak öneri veririm. Mesela daha sürükleyici, daha duygusal, daha kült Türk dizileri diye ayırabiliriz. İstersen şimdi sana en iyi Türk dizilerini kategori kategori sayayım.'
      );
    }

    if (includesAny(t, ['bunaldim', 'bunaldım', 'stres', 'yorgun', 'moral'])) {
      return avoidRepeat(
        'Önce şunu söyleyeyim: şu an her şeyi çözmek zorunda değilsin. Bir tık durmuş olman başarısızlık değil. İstersen birlikte bunu küçültelim; sana ya mini plan yapayım ya da sadece kafanı rahatlatacak tek bir adım seçelim.'
      );
    }

    return avoidRepeat(`Duydum kankam: “${userText}”

Bence burada en mantıklı şey önce ne istediğini tek net çıktıya çevirmek. İstersen bunu sana:
- sohbet gibi konuşarak,
- liste halinde,
- içerik metni gibi,
- ders notu gibi
hazırlayabilirim.

Ne taraftan gidelim?`);
  }

  async function createLyraReply(userText: string) {
    const text = userText.trim();

    if (
      normalize(text).includes('hatırlıyor musun') ||
      normalize(text).includes('hatirliyor musun') ||
      normalize(text).includes('daha önce') ||
      normalize(text).includes('daha once') ||
      normalize(text).includes('ne sormuştum') ||
      normalize(text).includes('ne sormustum')
    ) {
      return buildMemoryReply();
    }

    if (researchMode) {
      const researched = await askResearchApi(text);
      if (researched) return avoidRepeat(researched);
    }

    return buildFriendlyFallbackReply(text);
  }

  async function sendTextMessage(customText?: string) {
    const raw = customText ?? chatInput;
    const text = raw.trim();
    if (!text) return;

    interruptSpeech('Yeni mesajını aldım');
    unlockSpeech();

    const userMsg: Message = { role: 'user', text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    saveMemoryFromUserText(text);

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

    const userMsg: Message = { role: 'user', text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    saveMemoryFromUserText(text);

    createLyraReply(text).then((reply) => {
      const msg: Message = { role: 'lyra', text: reply, createdAt: Date.now() };
      setMessages((prev) => [...prev, msg]);

      speakWithPhoneVoice(reply, () => {
        if (liveOnRef.current) setTimeout(() => startLiveListening(), 350);
      });
    });
  }

  function startDictation() {
    interruptSpeech('Seni dinliyorum');

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert('Bu tarayıcı sesle yazmayı desteklemiyor.');
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

        if (assistantSpeakingRef.current) interruptSpeech('Böldün, seni dinliyorum');

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i]?.[0]?.transcript || '';
          if (event.results[i].isFinal) finalPart += transcript + ' ';
          else interim += transcript;
        }

        if (finalPart.trim()) finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalPart}`.trim();

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
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert('Bu tarayıcı canlı konuşmayı desteklemiyor.');
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
          const looksLikeOwnVoice = normalizedHeard.length > 8 && spoken.includes(normalizedHeard.slice(0, 20));
          if (!looksLikeOwnVoice) interruptSpeech('Böldün, seni dinliyorum');
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
          setLiveStatus('Hazır');
        }
      };

      recognition.onend = () => {
        if (quickTimer) clearTimeout(quickTimer);

        liveListeningLockRef.current = false;
        setLiveListening(false);

        if (liveOnRef.current) setTimeout(() => startLiveListening(), 450);
        else setLiveStatus('Hazır');
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
      speakWithPhoneVoice('Buradayım. Konuş, seni dinliyorum.');
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
      setCameraError('Kamera açılamadı. iPhone’da Safari izinlerini kontrol et ve HTTPS linkten aç.');
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
      setCameraError('Önce kamerayı aç.');
      return;
    }

    if (recording) {
      const elapsed = Date.now() - recordStartTimeRef.current;

      if (elapsed < 1200) {
        setCameraError('Kayıt çok kısa oldu. Biraz daha uzun kayıt al.');
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
          setCameraError('Video kaydı boş görünüyor. Tekrar dene.');
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
        text: 'Sirius ile kaydedildi.',
      });
      return;
    }

    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `sirius-video.${extension}`;
    a.click();
  }

  function clearChat() {
    const first: Message = {
      role: 'lyra',
      text: 'Sohbeti temizledim. Yeni bir şeyle başlayabiliriz.',
      createdAt: Date.now(),
    };
    setMessages([first]);
  }

  function clearMemory() {
    setMemory([]);
    localStorage.removeItem('sirius-memory');
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
          <p className="muted">PDF yükle, özet modunu seç.</p>

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
              <input type="file" accept="application/pdf" onChange={(e) => handlePdfUpload(e.target.files?.[0])} />
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
          <p className="muted">Bu sürüm tarayıcı içinde görsel üretir.</p>

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
            placeholder="Nasıl bir görsel istiyorsun?"
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
          <p className="muted">Hook, video metni, caption ve CTA üretir.</p>

          <div className="form-grid">
            <label>
              Konu
              <input value={socialTopic} onChange={(e) => setSocialTopic(e.target.value)} placeholder="Örn: retinol" />
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
                <option>premium</option>
                <option>soft</option>
                <option>iddialı</option>
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
              <input type="file" accept="video/*" onChange={(e) => setVideoFileName(e.target.files?.[0]?.name || '')} />
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
          <p className="muted">Enerjine ve vaktine göre gerçekçi plan çıkarır.</p>

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
              <input value={dailyPriority} onChange={(e) => setDailyPriority(e.target.value)} />
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
          <p className="muted">Konu anlatımı, not, test, ezber kartı ve PDF.</p>

          <div className="form-grid">
            <label>
              Konu
              <input value={studyTopic} onChange={(e) => setStudyTopic(e.target.value)} placeholder="Örn: paragraf" />
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
                <p>Kamerayı açınca burada önizleme görünür.</p>
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
              <select value={teleprompterOn ? 'Açık' : 'Kapalı'} onChange={(e) => setTeleprompterOn(e.target.value === 'Açık')}>
                <option>Açık</option>
                <option>Kapalı</option>
              </select>
            </label>
          </div>

          <textarea className="textarea" value={teleText} onChange={(e) => setTeleText(e.target.value)} placeholder="Teleprompter metni..." />

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
              <p>Lyra ile konuş, üret, planla, hatırla.</p>
            </div>
          </div>

          <div className="top-actions">
            <button className={liveOn ? 'pill active' : 'pill'} onClick={toggleLiveConversation}>
              {liveOn ? 'Canlı Açık' : 'Canlı Konuş'}
            </button>

            <button className={isDictating ? 'pill active' : 'pill'} onClick={toggleDictation}>
              {isDictating ? 'Sesle Yazıyor' : 'Sesle Yaz'}
            </button>

            <button className="pill" onClick={() => interruptSpeech('Sustum')}>
              Sustur
            </button>

            <button className={researchMode ? 'pill active' : 'pill'} onClick={() => setResearchMode((prev) => !prev)}>
              {researchMode ? 'AI Mod Açık' : 'Yerel Mod'}
            </button>

            <div className="voice-mode">
              <button className={voiceMode === 'off' ? 'voice active' : 'voice'} onClick={() => setVoiceMode('off')}>
                Sessiz
              </button>
              <button
                className={voiceMode === 'phone' ? 'voice active' : 'voice'}
                onClick={() => {
                  setVoiceMode('phone');
                  unlockSpeech();
                }}
              >
                Telefon Sesi
              </button>
              <button className={voiceMode === 'realistic' ? 'voice active' : 'voice'} onClick={() => setVoiceMode('realistic')}>
                Gerçekçi Ses
              </button>
            </div>
          </div>
        </header>

        <section className="hero glass">
          <div className="hero-left">
            <div className="orb-wrap">
              <div className={`assistant-orb ${assistantSpeaking ? 'speaking' : liveListening ? 'listening' : 'idle'}`}>
                <div className="orb-ring ring-one" />
                <div className="orb-ring ring-two" />
                <div className="orb-ring ring-three" />
                <div className="orb-core">S</div>
              </div>

              <p className="orb-status">
                {assistantSpeaking ? 'Lyra konuşuyor...' : liveListening ? 'Seni dinliyorum...' : 'Hazır'}
              </p>

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

            <div className="chat-composer glass-soft">
              <div className="chat-composer-top">
                <strong>Lyra ile sohbet et</strong>
                <span>{liveStatus}</span>
              </div>

              <div className="chat-input-row">
                <input
                  value={chatInput}
                  onChange={(e) => {
                    if (assistantSpeakingRef.current) interruptSpeech('Yazmaya başladın, sustum');
                    setChatInput(e.target.value);
                    finalTranscriptRef.current = e.target.value;
                  }}
                  placeholder={isDictating ? 'Konuş, buraya yazıyorum...' : 'Bana normal mesaj yaz...'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendTextMessage();
                  }}
                />
                <button className="primary" onClick={() => sendTextMessage()}>
                  Gönder
                </button>
              </div>

              <div className="chat-mini-actions">
                <button onClick={toggleDictation}>{isDictating ? 'Sesli Yazmayı Durdur' : 'Sesle Yaz'}</button>
                <button onClick={clearChat}>Sohbeti Temizle</button>
                <button onClick={clearMemory}>Hafızayı Temizle</button>
              </div>

              <small className="muted">
                İpucu: “Daha önce ne konuşmuştuk?” ya da “Hatırlıyor musun?” yaz.
              </small>
            </div>
          </div>

          <div className="hero-right">
            <div className="chat-card glass-soft">
              <div className="chat-card-head">
                <strong>Sohbet</strong>
                <span>{messages.length - 1} mesaj</span>
              </div>

              <div className="chat-list">
                {messages.map((message, index) => (
                  <div key={`${message.createdAt}-${index}`} className={`bubble ${message.role}`}>
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
            </div>

            <div className="memory-card glass-soft">
              <div className="memory-head">
                <strong>Kısa Hafıza</strong>
                <span>{memory.length} kayıt</span>
              </div>

              <div className="memory-list">
                {memory.length === 0 ? (
                  <p className="muted">Henüz hafıza oluşmadı.</p>
                ) : (
                  memory.slice(0, 5).map((item) => (
                    <div key={item.id} className="memory-item">
                      <strong>{item.topic}</strong>
                      <span>{item.detail}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="tools-grid">
          {tools.map((tool) => (
            <button
              key={tool.key}
              className={`tool-card glass selected-${tool.color} ${activePanel === tool.key ? 'selected' : ''}`}
              onClick={() => openPanel(tool.key)}
            >
              <strong>{tool.title}</strong>
              <small>{tool.desc}</small>
            </button>
          ))}
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
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
          padding: 20px;
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
          max-width: 1480px;
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

        .glass-soft {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          box-shadow: 0 16px 44px rgba(95, 72, 118, 0.09);
        }

        .topbar {
          border-radius: 30px;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          position: sticky;
          top: 12px;
          z-index: 20;
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

        h1, h2, h3, p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 2px;
          font-size: 30px;
          letter-spacing: -0.04em;
          color: #241929;
        }

        h2, h3 {
          color: #241929;
        }

        .brand p, .muted {
          margin: 0;
          color: #5f5266;
          line-height: 1.55;
        }

        .top-actions,
        .toolbar,
        .chat-mini-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .pill,
        .voice,
        .toolbar button,
        .primary,
        .chat-mini-actions button,
        .tool-card {
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
          border-radius: 34px;
          padding: clamp(18px, 3vw, 30px);
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          gap: 22px;
          align-items: stretch;
        }

        .hero-left,
        .hero-right {
          display: grid;
          gap: 16px;
          min-height: 100%;
        }

        .orb-wrap {
          display: grid;
          place-items: center;
          text-align: center;
          gap: 12px;
          padding: 10px;
        }

        .assistant-orb {
          width: min(320px, 72vw);
          height: min(320px, 72vw);
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
          box-shadow: 0 0 45px rgba(255, 142, 203, 0.38), 0 0 75px rgba(143, 220, 255, 0.32);
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

        .ring-one { width: 60%; height: 60%; animation: ringPulse 3.4s ease-in-out infinite; }
        .ring-two { width: 78%; height: 78%; animation: ringPulse 4.2s ease-in-out infinite; }
        .ring-three { width: 96%; height: 96%; animation: ringPulse 5s ease-in-out infinite; }

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
          0%, 100% { transform: scale(0.9); opacity: 0.35; }
          50% { transform: scale(1.08); opacity: 0.82; }
        }

        .orb-status {
          color: #4c3d54;
          font-weight: 800;
          margin: 0;
        }

        .rate-control {
          width: min(320px, 80vw);
          display: grid;
          gap: 8px;
          color: #4c3d54;
          font-weight: 800;
        }

        .chat-composer,
        .chat-card,
        .memory-card,
        .panel-card {
          border-radius: 28px;
          padding: 18px;
        }

        .chat-composer-top,
        .chat-card-head,
        .memory-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          color: #4c3d54;
        }

        .chat-input-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          margin-bottom: 12px;
        }

        .chat-input-row input,
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

        .chat-list {
          max-height: 520px;
          overflow: auto;
          display: grid;
          gap: 12px;
          padding-right: 4px;
        }

        .bubble {
          max-width: 88%;
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

        .memory-list {
          display: grid;
          gap: 10px;
          max-height: 200px;
          overflow: auto;
        }

        .memory-item {
          display: grid;
          gap: 4px;
          background: rgba(255,255,255,0.85);
          border-radius: 18px;
          padding: 12px;
        }

        .memory-item strong {
          color: #3f2f47;
          font-size: 14px;
        }

        .memory-item span {
          color: #6a5a72;
          font-size: 13px;
          line-height: 1.45;
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

        .ratio-story { aspect-ratio: 9 / 16; max-height: 760px; }
        .ratio-square { aspect-ratio: 1 / 1; max-height: 720px; }
        .ratio-four-five { aspect-ratio: 4 / 5; max-height: 760px; }
        .ratio-wide { aspect-ratio: 16 / 9; max-height: 520px; }
        .ratio-full { min-height: 560px; }

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

        @media (max-width: 900px) {
          .tools-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 720px) {
          .page {
            padding: 12px;
            padding-bottom: calc(18px + env(safe-area-inset-bottom));
          }

          .topbar,
          .hero,
          .panel-card,
          .chat-composer,
          .chat-card,
          .memory-card {
            border-radius: 24px;
          }

          .tools-grid,
          .form-grid,
          .metric-grid,
          .chat-input-row {
            grid-template-columns: 1fr;
          }

          .top-actions,
          .toolbar,
          .chat-mini-actions,
          .voice-mode {
            width: 100%;
          }

          .assistant-orb {
            width: 250px;
            height: 250px;
          }

          .topbar {
            position: static;
          }

          .chat-card .chat-list {
            max-height: 360px;
          }

          .tool-card {
            min-height: 120px;
          }

          .brand h1 {
            font-size: 24px;
          }
        }

        @media (max-width: 480px) {
          .tools-grid {
            grid-template-columns: 1fr;
          }

          .bubble {
            max-width: 96%;
          }
        }
      `}</style>
    </main>
  );
}

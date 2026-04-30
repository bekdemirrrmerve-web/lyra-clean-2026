'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Message = {
  role: 'user' | 'lyra';
  text: string;
};

type ToolKey =
  | 'Teleprompter'
  | 'Video Çekim'
  | 'İçerik Fikri'
  | 'Etkileşim'
  | 'DGS Planı'
  | 'Kozmetik'
  | 'Notlar'
  | 'Görsel Prompt';

type VoiceMode = 'off' | 'phone' | 'realistic';

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function Page() {
  function speakWithPhoneVoice(text: string) {
    if (voiceMode === 'off') return;

    if (voiceMode === 'realistic') {
      setLiveStatus('Gerçekçi ses yakında');
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      const synth = window.speechSynthesis;
      const cleanText = cleanSpeechText(text)
        .replace(/[*_`#>]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .trim();

      if (!cleanText) return;

      synth.cancel();
      synth.resume();

      setAssistantSpeaking(true);
      assistantSpeakingRef.current = true;

      const chunks = cleanText
        .split(/(?<=[.!?])\s+/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .slice(0, 12);

      let index = 0;

      const speakNext = () => {
        if (index >= chunks.length) {
          setAssistantSpeaking(false);
          assistantSpeakingRef.current = false;
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.lang = 'tr-TR';
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        const voice = getBestVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
          index += 1;
          setTimeout(speakNext, 80);
        };

        utterance.onerror = () => {
          index += 1;
          setTimeout(speakNext, 80);
        };

        synth.speak(utterance);
      };

      setTimeout(speakNext, 120);
    } catch {
      setAssistantSpeaking(false);
      assistantSpeakingRef.current = false;
    }
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'lyra',
      text:
        'Buradayım kankam. Ana Sirius alanından canlı konuşabiliriz ya da aşağıdan mesajlaşabiliriz.',
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [isDictating, setIsDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState('Yazışma hazır');

  const [liveOn, setLiveOn] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Canlı konuşma hazır');
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('phone');

  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState('Lyra');
  const [selectedMood, setSelectedMood] = useState('Calm');

  const [teleText, setTeleText] = useState(
    'Merhaba kankalar, bugün size kısa ama gerçekten işe yarayan bir bilgiden bahsedeceğim. Hazırsanız başlayalım...'
  );

  const [ideaTopic, setIdeaTopic] = useState('kozmetik');
  const [ideaPlatform, setIdeaPlatform] = useState('TikTok');
  const [ideaResult, setIdeaResult] = useState('');

  const [noteText, setNoteText] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [visualResult, setVisualResult] = useState('');

  const [followers, setFollowers] = useState('11900');
  const [views, setViews] = useState('2100');
  const [likes, setLikes] = useState('185');
  const [comments, setComments] = useState('22');
  const [saves, setSaves] = useState('32');
  const [shares, setShares] = useState('18');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('');

  const [smoothness, setSmoothness] = useState(12);
  const [glow, setGlow] = useState(16);
  const [whiten, setWhiten] = useState(10);
  const [saturation, setSaturation] = useState(12);

  const liveRecognitionRef = useRef<any>(null);
  const dictationRecognitionRef = useRef<any>(null);

  const liveOnRef = useRef(false);
  const liveListeningLockRef = useRef(false);
  const assistantSpeakingRef = useRef(false);

  const dictationOnRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const totalEngagement =
    Number(likes || 0) +
    Number(comments || 0) +
    Number(saves || 0) +
    Number(shares || 0);

  const engagementRate = Number(views || 0)
    ? ((totalEngagement / Number(views || 1)) * 100).toFixed(2)
    : '0.00';

  const beautyFilter = useMemo(() => {
    const blur = smoothness / 50;
    const brightness = 1 + (glow + whiten) / 100;
    const contrast = 1 + whiten / 120;
    const saturate = 1 + saturation / 100;
    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px)`;
  }, [smoothness, glow, whiten, saturation]);

  const tools: { title: ToolKey; icon: string; desc: string }[] = [
    { title: 'Teleprompter', icon: '📝', desc: 'Metin yaz, çekime hazırla' },
    { title: 'Video Çekim', icon: '🎥', desc: 'Kamera, efekt, kayıt ve overlay' },
    { title: 'İçerik Fikri', icon: '💡', desc: 'Hook, akış, CTA, caption' },
    { title: 'Etkileşim', icon: '📈', desc: 'Oran ve performans yorumu' },
    { title: 'DGS Planı', icon: '📚', desc: 'Ders planı ve konu özeti' },
    { title: 'Kozmetik', icon: '🧪', desc: 'Kimyager gözüyle içerik fikri' },
    { title: 'Notlar', icon: '🗒️', desc: 'Not toparla ve listeye çevir' },
    { title: 'Görsel Prompt', icon: '✨', desc: 'Kapak ve görsel fikri üret' },
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

      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }

      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
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

  function includesAny(text: string, words: string[]) {
    return words.some((word) => text.includes(word));
  }

  function localLyraReply(userText: string) {
    const t = normalize(userText);

    if (!t) return 'Buradayım kankam, bir şey söyle ya da yaz.';

    if (includesAny(t, ['nap', 'napiyorsun', 'napiyosun', 'ne yapiyorsun'])) {
      return 'Seni bekliyorum kankam. Bir elimde plan, bir elimde içerik fikri, gözüm de kamerada. Bugün neyi birlikte çözüyoruz?';
    }

    if (includesAny(t, ['vay', 'oha', 'ciddi misin', 'inanmiyorum'])) {
      return 'Aaa dur, bu baya iyiymiş kankam! Şaşırdım ama güzel şaşırdım. Hadi bunu hemen toparlayalım.';
    }

    if (includesAny(t, ['komik', 'guldum', 'güldüm', 'haha', 'ahah'])) {
      return 'Ahahah tamam, buna ben de güldüm. Ama şaka maka buradan güzel bir içerik bile çıkar kankam.';
    }

    if (includesAny(t, ['oldu', 'başardım', 'basardim', 'tamamdır'])) {
      return 'Ayy tamam işte bu! Çok iyi oldu kankam. Şimdi bunu bozmayalım, bir sonraki en mantıklı adıma geçelim.';
    }

    if (
      includesAny(t, [
        'dgs',
        'temel kavram',
        'matematik',
        'ders',
        'sinav',
        'sınav',
        'calisma',
        'çalışma',
        'not',
        'ozet',
        'özet',
      ])
    ) {
      if (includesAny(t, ['temel kavram', 'not', 'ozet', 'özet'])) {
        return createDgsTemelKavramlar();
      }

      return createDgsPlan();
    }

    if (
      includesAny(t, [
        'icerik',
        'içerik',
        'reels',
        'tiktok',
        'instagram',
        'hook',
        'kanca',
        'caption',
        'video fikri',
      ])
    ) {
      return createContentIdea(userText);
    }

    if (includesAny(t, ['teleprompter', 'metin', 'script', 'konusma metni', 'konuşma metni'])) {
      return createTeleprompter();
    }

    if (includesAny(t, ['video', 'cek', 'çek', 'kamera', 'kayit', 'kayıt', 'çekim'])) {
      return createVideoPlan();
    }

    if (
      includesAny(t, [
        'kozmetik',
        'cilt',
        'krem',
        'serum',
        'inci',
        'formul',
        'formül',
        'retinol',
        'niacinamide',
      ])
    ) {
      return createKozmetikReply();
    }

    if (
      includesAny(t, [
        'moral',
        'motivasyon',
        'bunaldim',
        'bunaldım',
        'yorgun',
        'kotu',
        'kötü',
        'stres',
      ])
    ) {
      return createMoralReply();
    }

    if (includesAny(t, ['kombin', 'kiyafet', 'makyaj', 'sac', 'saç', 'stil'])) {
      return createKombinReply();
    }

    if (includesAny(t, ['plan', 'bugun ne yap', 'bugün ne yap', 'gunluk', 'günlük'])) {
      return `Bugün için mini plan:

1. Önce tek ana hedef seç.
2. 25 dakika odak çalışma yap.
3. 10 dakika içerik fikri çıkar.
4. 1 kısa video ya da not hazırla.
5. Akşam 5 dakika “bugün ne yaptım?” kontrolü yap.

Kankam bugün hedef her şeyi bitirmek değil; kontrol hissini geri almak.`;
    }

    return `Duydum kankam: “${userText}”

Bunu sana dört şekilde çevirebilirim:
1. kısa cevap
2. plan
3. içerik fikri
4. teleprompter metni

Ben olsam önce bunu küçük bir plana çevirirdim. Ne yapmak istiyorsun?`;
  }

  function createDgsTemelKavramlar() {
    return `Tamam kankam, DGS temel kavramlar için hızlı ama işe yarar özet geliyor:

1. Sayı kümeleri
Doğal sayılar: 0, 1, 2, 3...
Tam sayılar: negatifler, 0 ve pozitifler.
Rasyonel sayılar: kesirli yazılabilen sayılar.
İrrasyonel sayılar: kök 2, pi gibi kesirli yazılamayanlar.
Gerçek sayılar: rasyonel + irrasyonel tüm sayılar.

2. Tek - çift sayılar
Çift sayı: 2 ile tam bölünür.
Tek sayı: 2 ile tam bölünmez.
Kural:
Çift + çift = çift
Tek + tek = çift
Tek + çift = tek
Tek x tek = tek
İçinde bir tane çift çarpan varsa sonuç çifttir.

3. Pozitif - negatif
Aynı işaretli çarpım/bölüm pozitif.
Zıt işaretli çarpım/bölüm negatif.
Toplamada büyük olanın işareti baskın çıkar.

4. Ardışık sayılar
Ardışık tam sayılar: n, n+1, n+2
Ardışık çift sayılar: n, n+2, n+4
Ardışık tek sayılar: n, n+2, n+4

5. Basamak kavramı
abc üç basamaklı sayısı:
100a + 10b + c şeklinde yazılır.

6. Bölme mantığı
Bölünen = Bölen x Bölüm + Kalan
Kalan her zaman bölenden küçüktür.

Mini çalışma:
20 dakika bu özeti oku, sonra 15 temel kavram sorusu çöz. Panik yok kankam, bu iş gözümüzde büyüdüğü kadar ejderha değil.`;
  }

  function createDgsPlan() {
    return `Kankam sana net 1 saatlik DGS planı yazıyorum:

00:00 - 05:00
Telefonu uzaklaştır, suyu koy, sadece bugünün konusunu seç.

05:00 - 25:00
Matematik temel kavramlar konu tekrarı:
- sayı kümeleri
- tek/çift
- pozitif/negatif
- ardışık sayılar
- basamak kavramı

25:00 - 45:00
15 soru çöz. Hız yapma, doğru düşün.

45:00 - 55:00
5 paragraf sorusu çöz. Ana fikir bulmaya odaklan.

55:00 - 60:00
Yanlış analizi yap:
Konu eksiği mi?
Dikkat hatası mı?
İşlem hatası mı?

Bugünün hedefi mükemmel çalışma değil, çalışma düzenini tekrar başlatma.`;
  }

  function createContentIdea(text: string) {
    const topic = ideaTopic || text || 'kozmetik';

    return `${ideaPlatform} için içerik fikri:

Hook:
“Bunu herkes kullanıyor ama çoğu kişi neden işe yaradığını bilmiyor.”

Akış:
1. İlk 3 saniye: Ürünü/konuyu göster.
2. Problem: “Yanlış kullanınca etkisi azalabilir.”
3. Kimyager yorumu: İçerikteki mantığı sade anlat.
4. Mini çözüm: “Şöyle kullanırsan daha mantıklı olur.”
5. CTA: “Devamı gelsin mi?”

Caption:
${topic} konusunda çoğu kişinin kaçırdığı nokta bu olabilir. Kaydet, sonra lazım olur.`;
  }

  function createTeleprompter() {
    return `Bugün size çoğu kişinin fark etmeden yaptığı küçük ama önemli bir hatadan bahsedeceğim.

Bir ürünü sadece popüler diye kullanmak yetmez. İçeriğine, kullanım sıklığına ve hangi ürünlerle birlikte kullanıldığına bakmak gerekir.

Ben kimyager gözüyle baktığımda şunu görüyorum: Bazen ürün kötü değildir, kullanım şekli yanlıştır.

O yüzden cilt bakımında en pahalı ürün değil, en doğru rutin fark yaratır.

Devamında bu ürünlerin içeriklerini tek tek analiz etmemi ister misiniz?`;
  }

  function createVideoPlan() {
    return `Video çekim planı:

1. İlk 3 saniye:
“Bunu çoğu kişi yanlış yapıyor olabilir.”

2. Kadraj:
Telefon dikey 9:16, yüzün aydınlık, arka plan sade.

3. Akış:
- Yakın plan giriş
- Ürün/konu gösterimi
- 2 cümle bilimsel açıklama
- 1 cümle kişisel yorum
- CTA

4. CTA:
“Bunu sen de böyle mi kullanıyordun?”

Bence bunu tek çekimde değil, 3 kısa parça halinde çek. Daha dinamik olur.`;
  }

  function createKozmetikReply() {
    return `Kozmetik tarafında ben bunu şöyle ele alırdım:

Önce ürünün vaadine bak:
- Nem mi?
- Leke görünümü mü?
- Bariyer desteği mi?
- Akneye eğilimli cilt mi?
- Aydınlık görünüm mü?

Sonra içerik tarafı:
- Niacinamide: ton eşitleme ve bariyer desteği
- Panthenol: yatıştırma
- Hyaluronic acid: nem
- Seramid: bariyer
- Retinol/retinal: yaşlanma karşıtı görünüm
- AHA/BHA: pürüz ve gözenek görünümü

Sen bana ürün adını veya INCI listesini yazarsan onu daha net parçalarım kankam.`;
  }

  function createMoralReply() {
    return `Kankam önce bir nefes. Şu an her şeyin üst üste gelmiş gibi hissettirmesi çok normal.

Bugün kendinden dev performans bekleme. Sadece sistemi yeniden aç:
1. Küçük bir işi seç.
2. 10 dakika yap.
3. Bitince “tamam, geri döndüm” de.

Ben olsam bugün kendime kızmak yerine “küçük adımla toparlanıyorum” derdim.`;
  }

  function createKombinReply() {
    return `Bence üç seçenek var:

Soft fresh:
Krem pantolon, beyaz üst, pudra/bej hırka, nude makyaj.

Cool:
Siyah pantolon, oversize gömlek, toplu saç, ince eyeliner.

Feminen:
V yaka bluz, açık ton pantolon, zarif kolye, parlak dudak.

Kamera karşısında ben soft fresh seçerdim.`;
  }

  function getBestVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];

    return (
      voices.find((voice) => voice.lang?.toLowerCase() === 'tr-tr') ||
      voices.find((voice) => voice.lang?.toLowerCase().includes('tr')) ||
      voices.find((voice) => voice.name?.toLowerCase().includes('google')) ||
      voices.find((voice) => voice.name?.toLowerCase().includes('siri')) ||
      voices[0]
    );
  }

  function cleanSpeechText(text: string) {
    return text
      .replaceAll('✨', '')
      .replaceAll('🔥', '')
      .replaceAll('😂', '')
      .replaceAll('😭', '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function unlockSpeech() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const u = new SpeechSynthesisUtterance(' ');
      u.lang = 'tr-TR';
      u.volume = 0.01;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function speakLive(text: string, afterEnd?: () => void) {
    if (voiceMode === 'off') {
      setAssistantSpeaking(false);
      assistantSpeakingRef.current = false;
      setLiveStatus('Sessiz mod açık');
      afterEnd?.();
      return;
    }

    if (voiceMode === 'realistic') {
      setAssistantSpeaking(false);
      assistantSpeakingRef.current = false;
      setLiveStatus('Gerçekçi ses yakında');
      afterEnd?.();
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      afterEnd?.();
      return;
    }

    try {
      stopLiveListening();

      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      setAssistantSpeaking(true);
      assistantSpeakingRef.current = true;
      setLiveStatus('Lyra konuşuyor');

      const chunks = cleanSpeechText(text)
        .split(/(?<=[.!?])\s+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 12);

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
        utterance.rate = 1.1;
        utterance.pitch = 1.08;
        utterance.volume = 1;

        const voice = getBestVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
          index += 1;
          setTimeout(speakNext, 80);
        };

        utterance.onerror = () => {
          index += 1;
          setTimeout(speakNext, 80);
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    } catch {
      setAssistantSpeaking(false);
      assistantSpeakingRef.current = false;
      setLiveStatus('Sesli cevap takıldı');
      afterEnd?.();
    }
  }

  function typeLyraReply(reply: string) {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }

    setIsTyping(true);
    setMessages((prev) => [...prev, { role: 'lyra', text: '' }]);

    let index = 0;

    typingTimerRef.current = setInterval(() => {
      index += 1;

      setMessages((prev) => {
        const next = [...prev];
        const last = next.length - 1;

        if (last >= 0 && next[last].role === 'lyra') {
          next[last] = {
            ...next[last],
            text: reply.slice(0, index),
          };
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
    }, 14);
  }

  function sendTextMessage(customText?: string) {
    const raw = customText ?? chatInput;
    const text = raw.trim();
    if (!text) return;

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

    const reply = localLyraReply(text);

    setMessages((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'lyra', text: reply },
    ]);

    speakLive(reply, () => {
      if (liveOnRef.current) {
        setTimeout(() => startLiveListening(), 450);
      }
    });
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

  function startDictation() {
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

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i]?.[0]?.transcript || '';

          if (event.results[i].isFinal) {
            finalPart += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (finalPart.trim()) {
          finalTranscriptRef.current =
            `${finalTranscriptRef.current} ${finalPart}`.trim();
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

  function toggleDictation() {
    if (dictationOnRef.current) {
      stopDictation();
    } else {
      startDictation();
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

  function startLiveListening() {
    if (liveListeningLockRef.current) return;
    if (assistantSpeakingRef.current) return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('Bu tarayıcı canlı konuşmayı desteklemiyor kankam.');
      return;
    }

    try {
      stopDictation();
      window.speechSynthesis?.cancel();

      const recognition = new SpeechRecognitionCtor();

      recognition.lang = 'tr-TR';
      recognition.continuous = false;
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

          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        const heard = (finalText || interimText).trim();

        if (heard) {
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
          }, 650);
        }
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

        if (liveOnRef.current && !assistantSpeakingRef.current) {
          setTimeout(() => startLiveListening(), 550);
        } else if (!assistantSpeakingRef.current) {
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

  function toggleLiveConversation() {
    const next = !liveOnRef.current;

    liveOnRef.current = next;
    setLiveOn(next);

    if (next) {
      unlockSpeech();
      setLiveStatus('Canlı konuşma açılıyor');

      speakLive('Tamam kankam, buradayım. Konuş, seni dinliyorum.', () => {
        if (liveOnRef.current) {
          setTimeout(() => startLiveListening(), 400);
        }
      });
    } else {
      stopLiveListening();
      window.speechSynthesis?.cancel();
      setAssistantSpeaking(false);
      assistantSpeakingRef.current = false;
      setLiveStatus('Canlı konuşma kapalı');
    }
  }

  async function startCamera() {
    setCameraError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch {
      setCameraError(
        'Kamera açılamadı kankam. Tarayıcı izinlerini kontrol et ve uygulamayı Vercel HTTPS linkinden aç.'
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

      let mimeType = '';

      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm',
        });

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

  function generateIdea() {
    const result = createContentIdea(ideaTopic);
    setIdeaResult(result);
  }

  function generateTeleText() {
    setTeleText(createTeleprompter());
  }

  function createVisualPrompt() {
    const base = visualPrompt.trim() || 'Sirius AI premium sosyal medya kapağı';

    setVisualResult(
      `Premium, mistik, sıcak ışıklı, modern bir ${base}. Soft pembe, altın, kahve tonları. Şık UI kartları, yıldız sembolü, zarif tipografi, yüksek kaliteli sosyal medya kapağı.`
    );
  }

  function summarizeNote() {
    if (!noteText.trim()) {
      alert('Önce not yaz kankam.');
      return;
    }

    alert(
      `Not özeti:\n\n${noteText.slice(
        0,
        140
      )}...\n\nİlk yapılacak: bunu 3 küçük adıma böl.\nBenim fikrim: önce en kolay kısmı yap, sonra devamı gelir.`
    );
  }

  function openTool(tool: ToolKey) {
    setActiveTool(tool);

    if (tool !== 'Video Çekim') {
      stopCamera();
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar glass">
          <div className="brand">
            <div className="star">✦</div>
            <div>
              <h1>Sirius AI</h1>
              <p>
                Canlı: {liveStatus} · Yazışma: {dictationStatus}
              </p>
            </div>
          </div>

          <div className="top-actions">
            <button
              className={liveOn ? 'pill active' : 'pill'}
              onClick={toggleLiveConversation}
            >
              {liveOn ? '🔁 Canlı Konuşma Açık' : '🔁 Canlı Konuşmayı Başlat'}
            </button>

            <button
              className={isDictating ? 'pill active' : 'pill'}
              onClick={toggleDictation}
            >
              {isDictating ? '🎙️ Yazıyor...' : '🎙️ Sesle Yaz'}
            </button>

            <div className="voice-mode" aria-label="Lyra ses modu">
              <button
                className={voiceMode === 'off' ? 'voice-option active' : 'voice-option'}
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setVoiceMode('off');
                  setLiveStatus('Sessiz mod açık');
                }}
              >
                Sessiz
              </button>
              <button
                className={voiceMode === 'phone' ? 'voice-option active' : 'voice-option'}
                onClick={() => {
                  setVoiceMode('phone');
                  setLiveStatus('Telefon sesi aktif');
                  unlockSpeech();
                }}
              >
                Telefon Sesi
              </button>
              <button
                className={voiceMode === 'realistic' ? 'voice-option active coming' : 'voice-option coming'}
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setVoiceMode('realistic');
                  setLiveStatus('Gerçekçi ses yakında');
                }}
              >
                Gerçekçi Ses Yakında
              </button>
            </div>

            <div className="profile">M</div>
          </div>
        </header>

        <section className="hero-grid">
          <aside className="left-stack">
            <div className="side-card glass">
              <h3>Yazışma İçin Sesle Yaz</h3>
              <div className="wave">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p>
                {isDictating
                  ? 'Konuşuyorsun, yazışma alanına yazıyorum...'
                  : isTyping
                    ? 'Lyra cevap yazıyor...'
                    : 'Yazışma modu hazır.'}
              </p>
              <button className="round" onClick={toggleDictation}>
                🎙️
              </button>
            </div>

            <div className="side-card glass">
              <h3>Canlı Görüntülü Ara</h3>
              <p>Kamera + teleprompter moduna geç.</p>
              <button className="round" onClick={() => openTool('Video Çekim')}>
                📹
              </button>
            </div>

            <div className="side-card glass">
              <h3>Hadi kahve? ☕</h3>
              <p>Yumuşak mod, sakin sohbet, küçük plan.</p>
              <button
                className="soft-button"
                onClick={() => {
                  const reply =
                    'Kahve modu açıldı kankam. Bugün dramatik dağılma yok; küçük küçük toparlıyoruz. Ne yapıyoruz?';

                  typeLyraReply(reply);
                  speakWithPhoneVoice(reply);
                }}
              >
                Kahve Modu
              </button>
            </div>

            <div className="side-card glass">
              <h3>Karakter</h3>
              <div className="chips">
                {['Lyra', 'Niko Vibe', 'Soft', 'Enerjik'].map((item) => (
                  <button
                    key={item}
                    className={selectedAvatar === item ? 'chip selected' : 'chip'}
                    onClick={() => setSelectedAvatar(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="avatar-stage glass">
            <div className="stage-top">
              <span className="live-dot">● SIRIUS CANLI ALAN</span>
              <div>
                <button>⛶</button>
                <button>⋮</button>
              </div>
            </div>

            <div className="avatar-body">
              <div className="avatar-orb">
                <div className="face">
                  {assistantSpeaking ? '🗣️' : liveListening ? '👂' : '😊'}
                </div>
              </div>

              <div className="avatar-text">
                <h2>{selectedAvatar}</h2>
                <p>
                  Burada tek tuşla canlı konuşma var. Sen konuşursun, Lyra cevap
                  verir, sonra tekrar seni dinler.
                </p>

                <div className="live-status-box">
                  {assistantSpeaking
                    ? 'Lyra konuşuyor...'
                    : liveListening
                      ? 'Seni dinliyorum...'
                      : liveOn
                        ? 'Canlı konuşma açık.'
                        : 'Canlı konuşma hazır.'}
                </div>
              </div>
            </div>

            <div className="stage-controls">
              <button onClick={toggleLiveConversation}>
                {liveOn ? '🔁 Canlıyı Kapat' : '🔁 Canlı Konuş'}
              </button>
              <button onClick={() => openTool('Video Çekim')}>📷 Kamera</button>
              <button onClick={() => sendTextMessage('Bugün ne yapmalıyım?')}>
                ✨ Plan Yap
              </button>
              <button onClick={() => sendTextMessage('DGS temel kavramlar özet')}>
                📚 DGS Özet
              </button>
            </div>
          </section>

          <aside className="right-stack">
            <div className="side-card glass">
              <div className="theme-row">
                <span>Tema</span>
                <div className="chips">
                  {['Rose', 'Dark', 'Gold'].map((theme) => (
                    <button
                      key={theme}
                      className="chip"
                      onClick={() => setSelectedMood(theme)}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="side-card glass">
              <h3>Görünüm Özelleştirme</h3>

              <div className="custom-line">
                <span>Saç Rengi</span>
                <div className="dots">
                  <i className="d1" />
                  <i className="d2" />
                  <i className="d3" />
                  <i className="d4" />
                  <i className="d5" />
                </div>
              </div>

              <div className="custom-line">
                <span>Göz Rengi</span>
                <div className="dots">
                  <i className="e1" />
                  <i className="e2" />
                  <i className="e3" />
                  <i className="e4" />
                  <i className="e5" />
                </div>
              </div>

              <div className="mini-grid">
                <div>Dağınık Topuz</div>
                <div>Günlük Şık</div>
                <div>Soft Glow</div>
                <div>Kamera Modu</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section glass">
          <div className="section-head">
            <div>
              <h2>Ruh Hali & Tema Seçimi</h2>
              <p>Lyra’nın ekran havasını seç.</p>
            </div>
          </div>

          <div className="mood-grid">
            {[
              ['Calm', 'Sakin'],
              ['Energetic', 'Enerjik'],
              ['Elegant', 'Zarif'],
              ['Casual', 'Rahat'],
            ].map(([mood, label]) => (
              <button
                key={mood}
                className={selectedMood === mood ? 'mood selected' : 'mood'}
                onClick={() => setSelectedMood(mood)}
              >
                <strong>{mood}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="section glass">
          <div className="section-head">
            <div>
              <h2>Stüdyo Araçları</h2>
              <p>Video, içerik, DGS, not, görsel ve analiz araçları.</p>
            </div>
          </div>

          <div className="tools-grid">
            {tools.map((tool) => (
              <button
                key={tool.title}
                className="tool-card"
                onClick={() => openTool(tool.title)}
              >
                <span>{tool.icon}</span>
                <strong>{tool.title}</strong>
                <small>{tool.desc}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="content-grid">
          <div className="section glass chat-panel">
            <h2>Lyra Mesajlaşma Alanı</h2>

            <div className="chat-list">
              {messages.map((message, index) => (
                <div key={index} className={`bubble ${message.role}`}>
                  <strong>{message.role === 'user' ? 'Sen' : 'Lyra'}</strong>
                  <p
                    className={
                      message.role === 'lyra' &&
                      isTyping &&
                      index === messages.length - 1
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
                onChange={(event) => {
                  setChatInput(event.target.value);
                  finalTranscriptRef.current = event.target.value;
                }}
                placeholder={
                  isDictating
                    ? 'Konuş, buraya yazıyorum...'
                    : 'Lyra’ya yaz veya sesle yazdır...'
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendTextMessage();
                }}
              />
              <button onClick={() => sendTextMessage()}>Gönder</button>
              <button onClick={toggleDictation}>
                {isDictating ? 'Durdur' : 'Sesle Yaz'}
              </button>
            </div>
          </div>

          <div className="section glass">
            <h2>İçerik Fikri Alanı</h2>

            <div className="form-row">
              <select
                value={ideaPlatform}
                onChange={(event) => setIdeaPlatform(event.target.value)}
              >
                <option>TikTok</option>
                <option>Instagram Reels</option>
                <option>YouTube Shorts</option>
                <option>Story</option>
              </select>

              <input
                value={ideaTopic}
                onChange={(event) => setIdeaTopic(event.target.value)}
                placeholder="Konu yaz..."
              />
            </div>

            <div className="actions">
              <button onClick={generateIdea}>Fikir Üret</button>
              <button onClick={() => setTeleText(createTeleprompter())}>
                Teleprompter’a Aktar
              </button>
            </div>

            <pre className="result">
              {ideaResult || 'Henüz içerik fikri üretilmedi.'}
            </pre>
          </div>
        </section>

        <section className="section glass recent">
          <div className="section-head">
            <div>
              <h2>Son İçeriklerim</h2>
              <p>Fotoğraf, PDF, teleprompter, notlar, favoriler ve yeni ekleme alanı.</p>
            </div>
          </div>

          <div className="recent-grid">
            {[
              ['🏞️', 'Sabah Manzarası', 'PNG · 2.4 MB'],
              ['📸', 'Ürün Çekimi', 'JPG · 1.8 MB'],
              ['📄', 'Ruh Hali Günlüğü', 'PDF · 1.2 MB'],
              ['🎤', 'Teleprompter Metni', 'TXT · 356 B'],
              ['✅', 'Günün Planı', 'PDF · 428 KB'],
              ['🎵', 'Lo-fi Çalma Listem', 'MP3 · 5.2 MB'],
              ['🎥', 'Son Video Taslağı', 'WEBM'],
              ['➕', 'Yeni Ekle', ''],
            ].map(([icon, title, meta]) => (
              <div className="recent-card" key={title}>
                <span>{icon}</span>
                <strong>{title}</strong>
                <small>{meta}</small>
              </div>
            ))}
          </div>
        </section>

        <nav className="bottom-nav glass">
          {['Ana Sayfa', 'Stüdyo', 'Sirius', 'Sohbetler', 'Profil'].map((item) => (
            <button
              key={item}
              className={item === 'Sirius' ? 'nav-star' : ''}
              onClick={() => {
                if (item === 'Sirius') toggleLiveConversation();

                if (item === 'Stüdyo') {
                  document
                    .querySelector('.tools-grid')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }

                if (item === 'Sohbetler') {
                  document
                    .querySelector('.chat-panel')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {item === 'Ana Sayfa' && '🏠'}
              {item === 'Stüdyo' && '🎬'}
              {item === 'Sirius' && '✦'}
              {item === 'Sohbetler' && '💬'}
              {item === 'Profil' && '👤'}
              <span>{item}</span>
            </button>
          ))}
        </nav>

        {activeTool && (
          <div
            className="modal-backdrop"
            onClick={() => {
              setActiveTool(null);
              stopCamera();
            }}
          >
            <section
              className="modal glass"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <p>Stüdyo Modülü</p>
                  <h2>{activeTool}</h2>
                </div>

                <button
                  onClick={() => {
                    setActiveTool(null);
                    stopCamera();
                  }}
                >
                  ✕
                </button>
              </div>

              {activeTool === 'Video Çekim' && (
                <div className="modal-content">
                  <div className="camera-frame">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="camera-video"
                      style={{ filter: beautyFilter }}
                    />

                    {!cameraActive && (
                      <div className="camera-placeholder">
                        <strong>Canlı kamera alanı</strong>
                        <p>Kamerayı açınca burada önizleme görünecek.</p>
                      </div>
                    )}

                    {cameraActive && (
                      <>
                        <div className="beauty-glow" style={{ opacity: glow / 100 }} />
                        <div className="tele-overlay">
                          <p>{teleText}</p>
                        </div>
                      </>
                    )}

                    {recording && <span className="rec">● REC</span>}
                  </div>

                  {cameraError && <div className="notice danger">{cameraError}</div>}

                  <div className="actions">
                    <button onClick={startCamera}>Kamerayı Aç</button>
                    <button onClick={stopCamera}>Kapat</button>
                    <button onClick={toggleRecording}>
                      {recording ? 'Kaydı Durdur' : 'Kayıt Başlat'}
                    </button>
                    <button onClick={() => setTeleText(createTeleprompter())}>
                      Metin Üret
                    </button>
                  </div>

                  <div className="sliders">
                    <label>
                      Pürüzsüzleştirme
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={smoothness}
                        onChange={(event) => setSmoothness(Number(event.target.value))}
                      />
                    </label>

                    <label>
                      Aydınlatma
                      <input
                        type="range"
                        min="0"
                        max="35"
                        value={glow}
                        onChange={(event) => setGlow(Number(event.target.value))}
                      />
                    </label>

                    <label>
                      Beyazlatıcı Görünüm
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={whiten}
                        onChange={(event) => setWhiten(Number(event.target.value))}
                      />
                    </label>

                    <label>
                      Canlılık
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={saturation}
                        onChange={(event) => setSaturation(Number(event.target.value))}
                      />
                    </label>
                  </div>

                  <div className="notice">
                    Bu efektler ücretsiz tarayıcı filtresiyle çalışır. Hafif
                    pürüzsüzleştirme, ışık ve canlılık verir.
                  </div>

                  {recordedVideoUrl && (
                    <div className="notice">
                      <strong>Kaydedilen Video</strong>

                      <video
                        src={recordedVideoUrl}
                        controls
                        playsInline
                        className="recorded"
                      />

                      <a
                        href={recordedVideoUrl}
                        download="sirius-lyra-video.webm"
                        className="download"
                      >
                        Videoyu İndir
                      </a>
                    </div>
                  )}
                </div>
              )}

              {activeTool === 'Teleprompter' && (
                <div className="modal-content">
                  <textarea
                    value={teleText}
                    onChange={(event) => setTeleText(event.target.value)}
                    className="textarea"
                  />

                  <div className="tele-box">{teleText}</div>

                  <div className="actions">
                    <button onClick={generateTeleText}>Metin Üret</button>
                    <button onClick={() => navigator.clipboard.writeText(teleText)}>
                      Kopyala
                    </button>
                    <button onClick={() => openTool('Video Çekim')}>
                      Kameraya Geç
                    </button>
                  </div>
                </div>
              )}

              {activeTool === 'İçerik Fikri' && (
                <div className="modal-content">
                  <div className="form-row">
                    <select
                      value={ideaPlatform}
                      onChange={(event) => setIdeaPlatform(event.target.value)}
                    >
                      <option>TikTok</option>
                      <option>Instagram Reels</option>
                      <option>YouTube Shorts</option>
                      <option>Story</option>
                    </select>

                    <input
                      value={ideaTopic}
                      onChange={(event) => setIdeaTopic(event.target.value)}
                    />
                  </div>

                  <div className="actions">
                    <button onClick={generateIdea}>Fikir Üret</button>
                  </div>

                  <pre className="result">{ideaResult}</pre>
                </div>
              )}

              {activeTool === 'Etkileşim' && (
                <div className="modal-content">
                  <div className="stats-grid">
                    <label>
                      Takipçi
                      <input
                        value={followers}
                        onChange={(event) => setFollowers(event.target.value)}
                      />
                    </label>

                    <label>
                      Görüntülenme
                      <input
                        value={views}
                        onChange={(event) => setViews(event.target.value)}
                      />
                    </label>

                    <label>
                      Beğeni
                      <input
                        value={likes}
                        onChange={(event) => setLikes(event.target.value)}
                      />
                    </label>

                    <label>
                      Yorum
                      <input
                        value={comments}
                        onChange={(event) => setComments(event.target.value)}
                      />
                    </label>

                    <label>
                      Kaydetme
                      <input
                        value={saves}
                        onChange={(event) => setSaves(event.target.value)}
                      />
                    </label>

                    <label>
                      Paylaşım
                      <input
                        value={shares}
                        onChange={(event) => setShares(event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="notice">
                    <strong>Etkileşim oranı: %{engagementRate}</strong>
                    <p>
                      Toplam etkileşim: {totalEngagement}. Kaydetme ve paylaşım
                      artarsa içerik daha güçlü sinyal verir.
                    </p>
                  </div>
                </div>
              )}

              {activeTool === 'DGS Planı' && (
                <div className="modal-content">
                  <div className="notice">{createDgsPlan()}</div>
                  <div className="notice">{createDgsTemelKavramlar()}</div>
                </div>
              )}

              {activeTool === 'Kozmetik' && (
                <div className="modal-content">
                  <div className="notice">{createKozmetikReply()}</div>
                </div>
              )}

              {activeTool === 'Notlar' && (
                <div className="modal-content">
                  <textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    className="textarea"
                    placeholder="Notlarını yaz..."
                  />

                  <div className="actions">
                    <button onClick={summarizeNote}>Notu Toparla</button>
                    <button onClick={() => navigator.clipboard.writeText(noteText)}>
                      Kopyala
                    </button>
                  </div>
                </div>
              )}

              {activeTool === 'Görsel Prompt' && (
                <div className="modal-content">
                  <textarea
                    value={visualPrompt}
                    onChange={(event) => setVisualPrompt(event.target.value)}
                    className="textarea"
                    placeholder="Nasıl bir görsel istiyorsun?"
                  />

                  <div className="actions">
                    <button onClick={createVisualPrompt}>Prompt Üret</button>
                  </div>

                  <pre className="result">{visualResult}</pre>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background:
            radial-gradient(circle at 15% 10%, rgba(255, 198, 170, 0.16), transparent 28%),
            radial-gradient(circle at 80% 20%, rgba(160, 130, 255, 0.12), transparent 24%),
            linear-gradient(180deg, #100b14 0%, #17111d 100%);
          color: #fff8f0;
          font-family: Arial, Helvetica, sans-serif;
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

        .page {
          min-height: 100vh;
          padding: 28px;
        }

        .shell {
          max-width: 1500px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .glass {
          background: rgba(255, 255, 255, 0.065);
          border: 1px solid rgba(255, 220, 190, 0.16);
          backdrop-filter: blur(18px);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
        }

        .topbar {
          border-radius: 28px;
          padding: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .brand {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .star {
          font-size: 42px;
          color: #ffd2b0;
          filter: drop-shadow(0 0 16px rgba(255, 195, 160, 0.75));
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 4px;
          font-size: 34px;
        }

        .brand p,
        .section-head p {
          margin: 0;
          color: #ecd5c7;
        }

        .top-actions,
        .actions,
        .stage-controls,
        .chips {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .voice-mode {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
          padding: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 220, 190, 0.14);
        }

        .voice-option {
          border: 1px solid rgba(255, 220, 190, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #fff7ef;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 13px;
        }

        .voice-option.active {
          background: linear-gradient(
            135deg,
            rgba(255, 177, 188, 0.38),
            rgba(255, 214, 165, 0.22)
          );
          box-shadow: 0 0 18px rgba(255, 186, 214, 0.2);
        }

        .voice-option.coming {
          opacity: 0.78;
        }

        .pill,
        .chip,
        .actions button,
        .stage-controls button,
        .chat-input button,
        .soft-button,
        .round,
        .bottom-nav button,
        .modal-head button {
          border: 1px solid rgba(255, 220, 190, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: #fff7ef;
          border-radius: 999px;
          padding: 11px 15px;
        }

        .pill.active,
        .chip.selected,
        .actions button:hover,
        .stage-controls button:hover {
          background: linear-gradient(
            135deg,
            rgba(255, 177, 188, 0.35),
            rgba(255, 214, 165, 0.2)
          );
        }

        .profile {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #f0a6b6, #f5c8a2);
          color: #2a1720;
          font-weight: 800;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 260px 1fr 280px;
          gap: 18px;
        }

        .left-stack,
        .right-stack {
          display: grid;
          gap: 14px;
          align-content: start;
        }

        .side-card,
        .section,
        .avatar-stage {
          border-radius: 26px;
          padding: 18px;
        }

        .side-card h3 {
          margin-bottom: 8px;
        }

        .side-card p {
          color: #ecd5c7;
          line-height: 1.45;
        }

        .wave {
          display: flex;
          gap: 4px;
          align-items: center;
          height: 34px;
          margin: 8px 0;
        }

        .wave span {
          width: 4px;
          border-radius: 99px;
          background: #ffc38e;
          animation: wave 1.1s infinite ease-in-out;
        }

        .wave span:nth-child(1) {
          height: 10px;
        }

        .wave span:nth-child(2) {
          height: 18px;
          animation-delay: 0.1s;
        }

        .wave span:nth-child(3) {
          height: 28px;
          animation-delay: 0.2s;
        }

        .wave span:nth-child(4) {
          height: 16px;
          animation-delay: 0.3s;
        }

        .wave span:nth-child(5) {
          height: 24px;
          animation-delay: 0.4s;
        }

        .wave span:nth-child(6) {
          height: 12px;
          animation-delay: 0.5s;
        }

        @keyframes wave {
          0%,
          100% {
            transform: scaleY(0.7);
            opacity: 0.6;
          }

          50% {
            transform: scaleY(1.15);
            opacity: 1;
          }
        }

        .round {
          width: 70px;
          height: 70px;
          font-size: 26px;
          display: grid;
          place-items: center;
          margin-top: 10px;
          background: radial-gradient(
            circle,
            rgba(255, 178, 190, 0.45),
            rgba(255, 208, 170, 0.18)
          );
        }

        .avatar-stage {
          min-height: 620px;
          display: grid;
          grid-template-rows: auto 1fr auto;
          background:
            radial-gradient(circle at 50% 30%, rgba(255, 195, 160, 0.22), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035));
        }

        .stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stage-top button {
          background: rgba(0, 0, 0, 0.25);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          width: 40px;
          height: 40px;
        }

        .live-dot {
          color: #ffcbc2;
          font-size: 13px;
          font-weight: 700;
        }

        .avatar-body {
          display: grid;
          place-items: center;
          text-align: center;
          padding: 30px;
        }

        .avatar-orb {
          width: min(390px, 85vw);
          height: min(390px, 85vw);
          border-radius: 36px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.18), transparent 26%),
            linear-gradient(160deg, rgba(255, 198, 174, 0.24), rgba(119, 92, 148, 0.18));
          border: 1px solid rgba(255, 220, 190, 0.18);
          box-shadow:
            inset 0 0 70px rgba(255, 255, 255, 0.06),
            0 35px 80px rgba(0, 0, 0, 0.35);
        }

        .face {
          width: 130px;
          height: 130px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffc5b8, #f3d1aa);
          font-size: 70px;
        }

        .avatar-text h2 {
          margin: 18px 0 8px;
          font-size: 36px;
        }

        .avatar-text p {
          max-width: 560px;
          color: #f1dacf;
          line-height: 1.6;
        }

        .live-status-box {
          margin-top: 14px;
          padding: 12px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 220, 190, 0.16);
          color: #ffe4d4;
          display: inline-flex;
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: end;
          margin-bottom: 16px;
        }

        .mood-grid,
        .tools-grid,
        .recent-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .mood,
        .tool-card,
        .recent-card {
          min-height: 120px;
          text-align: left;
          border-radius: 22px;
          padding: 16px;
          border: 1px solid rgba(255, 220, 190, 0.14);
          background: rgba(255, 255, 255, 0.055);
          color: #fff7ef;
          display: grid;
          align-content: end;
          gap: 6px;
        }

        .mood.selected,
        .tool-card:hover {
          outline: 2px solid rgba(255, 195, 160, 0.35);
          background: linear-gradient(
            135deg,
            rgba(255, 177, 188, 0.2),
            rgba(255, 214, 165, 0.12)
          );
        }

        .tool-card span,
        .recent-card span {
          font-size: 30px;
        }

        .tool-card small,
        .recent-card small,
        .mood span {
          color: #e8cfc2;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .chat-list {
          height: 470px;
          overflow: auto;
          display: grid;
          gap: 12px;
          padding-right: 6px;
          margin-bottom: 12px;
        }

        .bubble {
          max-width: 84%;
          border-radius: 20px;
          padding: 14px 16px;
          border: 1px solid rgba(255, 220, 190, 0.15);
          background: rgba(255, 255, 255, 0.06);
        }

        .bubble.user {
          margin-left: auto;
          background: rgba(255, 188, 190, 0.16);
        }

        .bubble p {
          margin: 6px 0 0;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .typing-cursor::after {
          content: '';
          display: inline-block;
          width: 7px;
          height: 1em;
          margin-left: 3px;
          background: rgba(255, 245, 235, 0.8);
          vertical-align: -2px;
          animation: cursorBlink 0.8s infinite;
        }

        @keyframes cursorBlink {
          0%,
          45% {
            opacity: 1;
          }

          46%,
          100% {
            opacity: 0;
          }
        }

        .chat-input {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid rgba(255, 220, 190, 0.15);
          background: rgba(255, 255, 255, 0.06);
          color: #fff7ef;
          border-radius: 16px;
          padding: 12px 14px;
          outline: none;
        }

        select option {
          color: #111;
        }

        .form-row {
          display: grid;
          grid-template-columns: 190px 1fr;
          gap: 10px;
        }

        .result,
        .notice,
        .tele-box {
          white-space: pre-wrap;
          border: 1px solid rgba(255, 220, 190, 0.14);
          background: rgba(255, 255, 255, 0.055);
          border-radius: 18px;
          padding: 14px;
          color: #fff7ef;
          line-height: 1.55;
          margin-top: 14px;
        }

        .bottom-nav {
          position: sticky;
          bottom: 18px;
          z-index: 20;
          border-radius: 999px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          padding: 10px;
        }

        .bottom-nav button {
          display: grid;
          place-items: center;
          gap: 4px;
          border-radius: 999px;
          background: transparent;
          border: none;
        }

        .nav-star {
          background: radial-gradient(
            circle,
            rgba(255, 179, 204, 0.55),
            rgba(255, 209, 154, 0.22)
          ) !important;
          box-shadow: 0 0 28px rgba(255, 186, 214, 0.4);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          padding: 22px;
          display: grid;
          place-items: center;
          background: rgba(8, 5, 11, 0.72);
          backdrop-filter: blur(12px);
        }

        .modal {
          width: min(1080px, 96vw);
          max-height: 92vh;
          overflow: auto;
          border-radius: 28px;
          padding: 22px;
        }

        .modal-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
        }

        .modal-head p {
          margin: 0;
          color: #eacfc0;
        }

        .modal-head h2 {
          margin: 3px 0 0;
        }

        .modal-content {
          display: grid;
          gap: 14px;
        }

        .camera-frame {
          position: relative;
          min-height: 570px;
          border-radius: 24px;
          overflow: hidden;
          background: #07050b;
          border: 1px solid rgba(255, 220, 190, 0.14);
        }

        .camera-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .camera-placeholder {
          position: relative;
          z-index: 2;
          min-height: 570px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 20px;
        }

        .beauty-glow {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 0.2), transparent 32%),
            radial-gradient(circle at 50% 70%, rgba(255, 210, 190, 0.12), transparent 40%);
        }

        .tele-overlay {
          position: absolute;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          z-index: 3;
          width: min(90%, 760px);
          max-height: 42%;
          overflow: hidden;
          padding: 16px 20px;
          border-radius: 22px;
          background: rgba(10, 7, 15, 0.58);
          border: 1px solid rgba(255, 220, 190, 0.18);
          backdrop-filter: blur(10px);
          text-align: center;
        }

        .tele-overlay p {
          margin: 0;
          font-size: clamp(22px, 4vw, 40px);
          line-height: 1.35;
          color: #fff9f4;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
        }

        .rec {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 5;
          color: #ffb5b5;
          background: rgba(255, 60, 60, 0.22);
          border: 1px solid rgba(255, 80, 80, 0.35);
          border-radius: 999px;
          padding: 8px 12px;
          font-weight: 800;
        }

        .sliders,
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        label {
          display: grid;
          gap: 8px;
          color: #ead2c6;
        }

        .textarea {
          min-height: 220px;
          resize: vertical;
        }

        .danger {
          border-color: rgba(255, 90, 90, 0.35);
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
          color: #fff;
          text-decoration: none;
          border-radius: 999px;
          padding: 12px 16px;
          background: linear-gradient(
            135deg,
            rgba(255, 177, 188, 0.35),
            rgba(255, 214, 165, 0.2)
          );
        }

        .custom-line {
          display: grid;
          gap: 8px;
          margin: 14px 0;
        }

        .dots {
          display: flex;
          gap: 8px;
        }

        .dots i {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .d1 { background: #5c3524; }
        .d2 { background: #8e5535; }
        .d3 { background: #c78250; }
        .d4 { background: #d8c4a8; }
        .d5 { background: #2d2728; }
        .e1 { background: #83a8b8; }
        .e2 { background: #9b6b43; }
        .e3 { background: #879d7d; }
        .e4 { background: #c7c1b9; }
        .e5 { background: #39404e; }

        .mini-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 14px;
        }

        .mini-grid div {
          border-radius: 14px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 220, 190, 0.12);
          color: #ead2c6;
        }

        @media (max-width: 1180px) {
          .hero-grid,
          .content-grid {
            grid-template-columns: 1fr;
          }

          .right-stack,
          .left-stack {
            grid-template-columns: repeat(2, 1fr);
          }

          .mood-grid,
          .tools-grid,
          .recent-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 720px) {
          .page {
            padding: 12px;
          }

          .topbar,
          .section,
          .side-card,
          .avatar-stage {
            border-radius: 22px;
          }

          .right-stack,
          .left-stack,
          .mood-grid,
          .tools-grid,
          .recent-grid,
          .form-row,
          .chat-input,
          .sliders,
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .avatar-stage {
            min-height: auto;
          }

          .avatar-orb {
            height: 280px;
          }

          .camera-frame,
          .camera-placeholder {
            min-height: 430px;
          }

          .bottom-nav span {
            font-size: 11px;
          }
        }
      `}</style>
    </main>
  );
}

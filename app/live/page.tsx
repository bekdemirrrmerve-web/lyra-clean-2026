const handleIncomingData = async (data: any) => {
  try {
    // 1) Normal text JSON geldiyse
    if (typeof data === "string") {
      const trimmed = data.trim();

      if (trimmed.startsWith("{")) {
        const message = JSON.parse(trimmed);
        await handleLiveJsonMessage(message);
        return;
      }

      addLog("Metin veri geldi ama JSON değil, atlandı.");
      return;
    }

    // 2) ArrayBuffer geldiyse: önce JSON mu diye dene, değilse ses olarak çal
    if (data instanceof ArrayBuffer) {
      const decodedText = new TextDecoder("utf-8").decode(data).trim();

      if (decodedText.startsWith("{")) {
        const message = JSON.parse(decodedText);
        await handleLiveJsonMessage(message);
        return;
      }

      await playPcm24kFromArrayBuffer(data);
      return;
    }

    // 3) Blob geldiyse: önce text olarak JSON mu bak, değilse binary ses gibi çal
    if (data instanceof Blob) {
      const blobText = await data.text();
      const trimmed = blobText.trim();

      if (trimmed.startsWith("{")) {
        const message = JSON.parse(trimmed);
        await handleLiveJsonMessage(message);
        return;
      }

      const arrayBuffer = await data.arrayBuffer();
      await playPcm24kFromArrayBuffer(arrayBuffer);
      return;
    }

    addLog("Bilinmeyen veri tipi geldi, atlandı.");
  } catch (error: any) {
    addLog("Gelen mesaj işlenemedi: " + (error?.message || "hata"));
  }
};

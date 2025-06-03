> **English Summary**  
> This bot automatically joins the nearest scheduled Google Calendar meeting using Puppeteer-controlled Chrome. It detects the correct meeting based on the current time, navigates to Google Meet, and records audio into an `.mp3` file using FFmpeg.  
>  
> Features include: timezone-aware scheduling, persistent browser sessions, and optional virtual audio device setup per operating system.  
> See below for full documentation in Turkish.

# 🤖 Google Meet Bot

Bu proje, belirli bir saatte Google Takvim'deki en yakın toplantıya otomatik olarak katılan, toplantıyı kaydeden ve sesi MP3 formatında dışa aktaran bir otomasyon botudur. Puppeteer ile kontrol edilen bir Chrome tarayıcısı üzerinden çalışır.

## 🚀 Özellikler

- Google Takvim üzerinden bugünün toplantılarından en yakın saate sahip olanı bulur
- Google Meet bağlantısını alarak toplantıya otomatik olarak katılır
- Tarayıcıyı kullanıcı profiliyle birlikte açarak oturum gerektirmez
- Gelişmiş zaman işleme ve saat eşleme sistemi (İstanbul saat dilimi destekli)
- Otomatik tarayıcı başlatma ve Meet kodu ile giriş
- Kaydedilen sesi `.mp3` formatında dışa aktarma desteği (planlanıyor veya opsiyonel)

## 🛠️ Kurulum

```bash
git clone https://github.com/kullanici-adi/google-meet-bot.git
cd google-meet-bot
npm install
```

## 🧪 Kullanım

## 🔐 bot-profile nedir?

`bot-profile`, tarayıcının oturum bilgilerini (örneğin giriş yapılmış Google hesabı) saklamak için kullanılan özel bir kullanıcı profili klasörüdür. Böylece bot her çalıştırıldığında tekrar giriş yapmanıza gerek kalmaz.

Tarayıcıyı ilk kez aşağıdaki komutla başlattığınızda `bot-profile` klasörü otomatik olarak oluşturulur:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$(pwd)/bot-profile \
  ...
```

1. Chrome’u uzaktan kontrol için başlatın:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$(pwd)/bot-profile \
  --lang=tr-TR \
  --timezone=Europe/Istanbul
```

2. Ardından botu başlatın:

```bash
node record_meet.js
```

Bot bugünün toplantılarından saate en yakın olanı tespit eder ve otomatik olarak katılır.

## 📂 Klasör Yapısı

```
google-meet-bot/
├── record_meet.js      # Ana bot dosyası
├── bot-profile/        # Tarayıcı oturum verisi
├── recordings/         # Kayıtların MP3 çıktıları (opsiyonel)
└── README.md           # Açıklama dosyası
```

## 📌 Gereksinimler

- Node.js >= 18
- Google Chrome (remote debugging destekli)
- Puppeteer veya puppeteer-core (koda göre)

## 🔊 Ses Kaydı & Sanal Sürücü

Botun toplantı sesini kaydedebilmesi için işletim sistemine uygun bir sanal ses sürücüsü yüklenmelidir:

- **macOS**: [BlackHole](https://github.com/ExistentialAudio/BlackHole) veya [Loopback Audio]
- **Windows**: [VB-Audio Virtual Cable](https://vb-audio.com/Cable/)
- **Linux**: `pavucontrol` ile sanal kaynak yönlendirmesi yapılabilir.

## 🎙️ FFmpeg ile Ses Kaydı

`record_meet.js` dosyasında aşağıdaki FFmpeg komutu ile ses kaydı yapılır:

```js
const ffmpegProcess = spawn(ffmpegPath, [
  '-f', 'avfoundation',
  '-i', ':1',              // ses cihazı (macOS'te :1 genelde sistem sesi)
  '-acodec', 'libmp3lame',
  '-ab', '192k',
  filePath
]);
```

### Açıklama:

- `-f avfoundation`: macOS'te FFmpeg'in AVFoundation API'sini kullanarak ses/video yakalaması.
- `-i :1`: İkinci giriş kaynağı (genelde sistem sesi). `ffmpeg -f avfoundation -list_devices true -i ""` komutu ile cihaz listesi görülebilir.
- `-acodec libmp3lame`: MP3 formatında sıkıştırılmış ses kaydı.
- `-ab 192k`: 192kbps bitrate.
- `filePath`: MP3 dosyasının kaydedileceği yol.

Eğer Windows kullanıyorsanız `-f dshow` ve uygun ses cihazı adı ile değiştirmelisiniz.

## 🛡️ Uyarı

Bu bot kişisel kullanım içindir. Google Meet kullanım koşullarına ve toplantı gizliliğine dikkat edin. Rıza olmadan kayıt almak yasal sorunlara yol açabilir.

## 📄 Lisans

MIT Lisansı.

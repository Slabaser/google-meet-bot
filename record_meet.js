const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

let ffmpegProcess;

function getNextAvailableFilename(basePath, baseName, extension) {
  let counter = 1;
  let filename = `${baseName}${counter}.${extension}`;
  while (fs.existsSync(path.join(basePath, filename))) {
    counter++;
    filename = `${baseName}${counter}.${extension}`;
  }
  return path.join(basePath, filename);
}

async function getParticipantCount(page) {
  return await page.evaluate(() => {
    const countBox = document.querySelector('div.gFyGKf.BN1Lfc > div.uGOf1d');
    if (countBox && !isNaN(parseInt(countBox.textContent))) {
      return parseInt(countBox.textContent);
    }
    return 0;
  });
}

(async () => {
  const singletonPath = './bot-profile/SingletonLock';
  if (fs.existsSync(singletonPath)) fs.unlinkSync(singletonPath);

  // Tarayıcıya bağlanıyorux burda
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });


  // google calendara gidip sistem tarihine en yakın toplantı kutucuğunu bulup linke gdiyor
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  
  const calendarUrl = `https://calendar.google.com/calendar/u/0/r`;
  await page.goto(calendarUrl, { waitUntil: 'networkidle2' });

  await page.waitForSelector('div.XuJrye', { timeout: 30000 });
  const meetingDivs = await page.$$('div.XuJrye');

  // Toplantı kutucuğu tıklama ve link alma: saate en yakın toplantı seçimi
  if (meetingDivs.length > 0) {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    let closestDiv = null;
    let minDiff = Infinity;

    for (const div of meetingDivs) {
      const title = await div.evaluate(el => el.textContent);
      console.log('🎯 Kutucuk içeriği:', title);
      const match = title && title.match(/\b(\d{1,2})(?::(\d{2}))?(am|pm)?\s*ile\s*(\d{1,2})(?::(\d{2}))?(am|pm)?/i);
      if (match) {
        let hour = parseInt(match[1], 10);
        let minute = match[2] ? parseInt(match[2], 10) : 0;
        const suffix = match[3]?.toLowerCase();

        if (suffix === 'pm' && hour < 12) hour += 12;
        if (suffix === 'am' && hour === 12) hour = 0;

        const scheduled = new Date(now);
        scheduled.setHours(hour, minute, 0, 0);
        const diff = Math.abs(scheduled - now);
        if (diff < minDiff) {
          minDiff = diff;
          closestDiv = div;
        }
      }
    }

    if (closestDiv) {
      await closestDiv.click();
      console.log('📅 Saate en yakın toplantı kutucuğuna tıklandı.');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Popuptan Meet kodunu al ve doğrudan bağlantıya gider
      const meetCode = await page.evaluate(() => {
        const allLinks = Array.from(document.querySelectorAll('a[href*="https://meet.google.com"]'));
        if (allLinks.length > 0) {
          const url = allLinks[0].href;
          const match = url.match(/meet\.google\.com\/([a-z\-]+)/i);
          return match ? match[1] : null;
        }
        return null;
      });

      if (meetCode) {
        const meetUrl = `https://meet.google.com/${meetCode}`;
        console.log('📎 Toplantı koduyla giriş:', meetUrl);
        await page.goto(meetUrl, { waitUntil: 'networkidle2' });
      } else {
        console.log('❌ Toplantı kodu bulunamadı.');
        await browser.close();
        return;
      }
    } else {
      console.log('❌ Toplantı kutucuklarında geçerli saat bilgisi bulunamadı.');
      await browser.close();
      return;
    }
  } else {
    console.log('❌ Hiçbir toplantı kutucuğu bulunamadı.');
    await browser.close();
    return;
  }


  // Kamera ve mikrofonu kapat
  await page.keyboard.down('Meta'); await page.keyboard.press('d'); await page.keyboard.up('Meta');
  await page.keyboard.down('Meta'); await page.keyboard.press('e'); await page.keyboard.up('Meta');

  // katılma butonu
  await new Promise(r => setTimeout(r, 10000)); // bekle
  try {
    const joinBtn = await page.$('button.UywwFc-LgbsSe');
    if (joinBtn) {
      await joinBtn.click();
      console.log('🚪 Hemen katıl butonuna tıklandı.');

      // Toplantıya giriş doğrulaması
      await page.waitForSelector('div.gFyGKf.BN1Lfc', { timeout: 60000 });
      console.log('✅ Toplantıya tam olarak girildi.');
    } else {
      console.log('❌ Hemen katıl butonu bulunamadı.');
      await browser.close();
      return;
    }
  } catch (e) {
    console.log('❌ Hemen katıl butonuna tıklanamadı veya toplantıya giriş doğrulanamadı.');
    await browser.close();
    return;
  }

  // Output klasörü sesler buraya kaydedilir
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const filePath = getNextAvailableFilename(outputDir, 'meeting', 'mp3');

  // ffmpeg ile ses kaydını başlat (ben macos için blackhole kullanıyorum kendi işletim sisteminize göre harici ses sürücüsü kullanın)
  ffmpegProcess = spawn(ffmpegPath, [
    '-f', 'avfoundation',
    '-i', ':1',              // ses cihazı
    '-acodec', 'libmp3lame',
    '-ab', '192k',
    filePath
  ]);

  ffmpegProcess.stderr.on('data', data => {
    console.log(`[ffmpeg] ${data.toString()}`);
  });

  let meetingStarted = false;
  let idleCounter = 0;

  // Katılımcı sayısını her 5 saniyede kontrol ediyor. toplantıda kimse kalmazsa toplantının bittiğini varsayıp ses kaydını bitiriyor
  const intervalId = setInterval(async () => {
    try {
      const count = await getParticipantCount(page);
      console.log(`🔁 Anlık katılımcı sayısı: ${count}`);

      if (count > 1) {
        meetingStarted = true;
        idleCounter = 0;
        console.log(`👥 Toplantı başladı (${count} kişi).`);
      }

      if (meetingStarted && count <= 1) {
        idleCounter++;
        console.log(`Yetersiz katılım. Boş kontrol sayısı: ${idleCounter}`);
        if (idleCounter >= 3) { 
          console.log('⚠️ Sadece bot kaldı. Toplantı sona erdi.');
          clearInterval(intervalId);
          ffmpegProcess.kill('SIGINT');
          console.log('🎙️ MP3 kaydı tamamlandı.');
          await browser.close();
        }
      }
    } catch (err) {
      console.error('❌ Katılımcı sayısı alınırken hata:', err);
    }
  }, 5000);

  console.log('🎙️ Ses kaydı başladı...');
})();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./creds.json');

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Cliente de WhatsApp listo');
});

client.on('message', async msg => {
  const texto = msg.body.toLowerCase();
  const comando = texto.split(" ")[0];
  const placa = texto.split(" ").slice(1).join(" ").toUpperCase();

  if (comando === 'bateria' && placa) {
    const datos = await buscarEnSheets(placa);
    if (datos) {
      await msg.reply(`🔋 *Batería del GPS de ${datos.placa}:* ${datos.bateria}%\n📅 *Último reporte:* ${datos.fecha}`);
    } else {
      await msg.reply(`❌ No encontré información para la placa *${placa}*`);
    }
  } else {
    await msg.reply("👋 Hola, escribe: *bateria [placa]* para consultar el nivel de batería del GPS.");
  }
});

client.initialize();

async function buscarEnSheets(placa) {
  try {
    const doc = new GoogleSpreadsheet('1WbZA_spp4onv-JbleQAC-0TU9nKgtn60v1Odqxsgw'); // ID del documento
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (let row of rows) {
      if (row.placa.toUpperCase() === placa) {
        return {
          placa: row.placa,
          bateria: row.bateria,
          fecha: row.fecha
        };
      }
    }
    return null;
  } catch (err) {
    console.error("Error leyendo la hoja:", err);
    return null;
  }
}

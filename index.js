const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const axios = require("axios");
const app = express();
const port = process.env.PORT || 10000;

const creds = require("./creds.json");

const SHEET_ID = "1WbZA_spp4onv-JbIeQAC-0TU9nKgtn60v1Odqxsgw";
const SHEET_NAME = "Hoja 1";

app.use(bodyParser.json());

async function obtenerDatosDesdeSheet(placaBuscada) {
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:D`, // salta el encabezado
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return null;

  for (const fila of rows) {
    const [placa, imei, bateria, fecha] = fila;
    if (placa && placa.trim().toUpperCase() === placaBuscada.toUpperCase()) {
      return { placa, imei, bateria, fecha };
    }
  }

  return null;
}

app.post("/webhook", async (req, res) => {
  const data = req.body;

  if (!data || !data.message || !data.message.body) {
    return res.sendStatus(200);
  }

  const mensaje = data.message.body.trim().toLowerCase();
  const numero = data.message.from;

  let respuesta = "Hola 👋, escribe: bateria [placa] para consultar.";

  if (mensaje.startsWith("bateria ")) {
    const placa = mensaje.substring(8).trim();
    const datos = await obtenerDatosDesdeSheet(placa);
    if (datos) {
      respuesta = `🔋 Batería de ${datos.placa}: ${datos.bateria}%\n🕓 Último reporte: ${datos.fecha}`;
    } else {
      respuesta = `🚫 No encontré la placa "${placa}". Verifica que esté escrita correctamente.`;
    }
  }

  const ultraInstance = "instance111839"; // reemplaza si tienes otro
  const token = "r4wm825i3lqivpku"; // tu token demo

  try {
    await axios.post(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
      token,
      to: numero,
      body: respuesta,
    });
  } catch (err) {
    console.error("Error al enviar mensaje a UltraMsg:", err.response?.data || err.message);
  }

  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`✅ Servidor WhatsApp bot activo en http://localhost:${port}`);
});

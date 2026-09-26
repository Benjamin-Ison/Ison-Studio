
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración SMTP desde variables de entorno
const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const smtpPort = (process.env.SMTP_PORT || '465').trim();
const smtpUser = (process.env.SMTP_USER || '').trim();
const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
const mailTo = (process.env.MAIL_TO || '').trim();

if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !mailTo) {
  console.warn('[Ison Studio Backend] Advertencia: faltan variables de entorno SMTP en backend/.env.');
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: Number(smtpPort) || 465,
  secure: Number(smtpPort) === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

// Middleware de CORS accesible e inclusivo para desarrollo y producción
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://isonstudio.com',
      'https://www.isonstudio.com',
      'https://isonstudio.com.ar',
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500'
    ];
    // Permitir requests sin origin (como herramientas de testeo o llamadas server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'La política CORS de este sitio no permite acceso desde el origen especificado.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));

// Middleware para parsear JSON con límite de tamaño por seguridad
app.use(express.json({ limit: '20kb' }));

// Servir los archivos visuales del frontend (HTML, CSS, JS)
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));


// Manejador para JSONs malformados
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'El formato de los datos enviados no es válido.'
    });
  }
  next(err);
});

// Endpoint de verificación de estado (Health Check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ison-studio-backend',
    timestamp: new Date().toISOString()
  });
});

// Endpoint principal para envío de contactos
app.post('/api/contact', async (req, res) => {
  const { nombre = '', apellido = '', whatsapp = '', plan = '', mensaje = '' } = req.body || {};

  const cleanNombre = String(nombre).trim();
  const cleanApellido = String(apellido).trim();
  const cleanWhatsapp = String(whatsapp).trim();
  const cleanPlan = String(plan).trim();
  const cleanMensaje = String(mensaje).trim();

  // Validaciones del lado del servidor
  if (!cleanNombre || !cleanWhatsapp) {
    return res.status(400).json({
      success: false,
      message: 'Nombre y WhatsApp son obligatorios.'
    });
  }

  const phoneRegex = /^[0-9]+$/;
  if (!phoneRegex.test(cleanWhatsapp) || cleanWhatsapp.length < 7 || cleanWhatsapp.length > 20) {
    return res.status(400).json({
      success: false,
      message: 'Número de WhatsApp inválido. Debe contener solo números (entre 7 y 20 dígitos).'
    });
  }

  const selectedPlan = cleanPlan || 'No seleccionado';

  const htmlMessage = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#f4f6fb;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px rgba(44,62,80,0.12);">
        <div style="background:#1a2340;color:#ffffff;padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:20px;letter-spacing:0.03em;">NUEVO CONTACTO — ISON STUDIO</h1>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0;padding:24px;">
          <tbody>
            <tr style="background:#f7f9ff;"><td style="padding:12px 16px;font-weight:700;width:150px;color:#223254;">Nombre</td><td style="padding:12px 16px;color:#223254;">${cleanNombre}</td></tr>
            <tr><td style="padding:12px 16px;font-weight:700;color:#223254;">Apellido</td><td style="padding:12px 16px;color:#223254;">${cleanApellido || '-'}</td></tr>
            <tr style="background:#f7f9ff;"><td style="padding:12px 16px;font-weight:700;color:#223254;">WhatsApp</td><td style="padding:12px 16px;color:#223254;">${cleanWhatsapp}</td></tr>
            <tr><td style="padding:12px 16px;font-weight:700;color:#223254;">Plan</td><td style="padding:12px 16px;color:#223254;">${selectedPlan}</td></tr>
            <tr style="background:#f7f9ff;"><td style="padding:12px 16px;font-weight:700;color:#223254;">Mensaje</td><td style="padding:12px 16px;color:#223254;white-space:pre-wrap;">${cleanMensaje || '-'}</td></tr>
          </tbody>
        </table>
        <div style="padding:16px 24px 24px;color:#5d6a85;font-size:14px;line-height:1.5;">Este correo fue generado desde el formulario de contacto de Ison Studio.</div>
      </div>
    </div>
  `;

  const textMessage = `NUEVO CONTACTO — ISON STUDIO\n\nNombre: ${cleanNombre}\nApellido: ${cleanApellido || '-'}\nWhatsApp: ${cleanWhatsapp}\nPlan: ${selectedPlan}\nMensaje: ${cleanMensaje || '-'}`;

  try {
    await transporter.sendMail({
      from: smtpUser,
      to: mailTo,
      subject: `Nuevo contacto desde Ison Studio — ${cleanNombre} ${cleanApellido}`.trim(),
      text: textMessage,
      html: htmlMessage
    });

    return res.json({
      success: true,
      message: 'Formulario enviado correctamente. Te contactaremos pronto.'
    });
  } catch (error) {
    console.error('[Ison Studio Backend] Error enviando email:', error);
    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error al procesar el correo. Por favor, intentá nuevamente más tarde.'
    });
  }
});

// Manejo centralizado de errores 500
app.use((err, req, res, next) => {
  console.error('[Ison Studio Backend] Error interno no controlado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor.'
  });
});

app.listen(PORT, () => {
  console.log(`[Ison Studio Backend] Servidor activo en http://localhost:${PORT}`);
});

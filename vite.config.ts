import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error plain JS server helper
import { sendSms, smsConfigured, smsProvider } from './server/smsGateway.mjs';
// @ts-expect-error mjs server helper
import {
  sendGmailSmtp,
  buildAicsOtpEmailTemplate,
  buildAicsParentNoticeEmailTemplate,
} from './server/gmailSmtpMailer.mjs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'aics-live-gmail-smtp-api',
      configureServer(server) {
        server.middlewares.use('/api/send-otp', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const recipientEmail = String(payload.email || '').trim().toLowerCase();
              const code = String(payload.code || '').trim().toUpperCase();
              const locale = payload.locale === 'tl' ? 'tl' : 'en';

              if (!recipientEmail || !code || code.length !== 6) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Missing valid email or 6-character OTP code.',
                  })
                );
                return;
              }

              const tpl = buildAicsOtpEmailTemplate({
                code,
                recipientEmail,
                locale,
              });

              const smtpResult = await sendGmailSmtp({
                to: recipientEmail,
                ...tpl,
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(smtpResult));
            } catch (err: unknown) {
              const message =
                err instanceof Error ? err.message : 'Failed to send OTP via Gmail SMTP';
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: message }));
            }
          });
        });

        // SMS to parents (Semaphore). Honest: says not_configured when no API key is set.
        server.middlewares.use('/api/sms-status', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ configured: smsConfigured(), provider: smsProvider() }));
        });
        server.middlewares.use('/api/send-sms', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ ok: false, code: 'method', error: 'Method Not Allowed' }));
            return;
          }
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const result = await sendSms({ to: payload.to, message: payload.message });
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err: unknown) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, code: 'server', error: err instanceof Error ? err.message : 'Server error' }));
            }
          });
        });

        server.middlewares.use('/api/send-parent-notice', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const recipientEmail = String(payload.email || '').trim().toLowerCase();
              const parentName = String(payload.parentName || '').trim();
              const studentName = String(payload.studentName || '').trim();
              const gradeSection = String(payload.gradeSection || '').trim();
              const scheduleText = String(payload.scheduleText || '').trim();
              const customMessage = String(payload.message || '').trim();
              const locale = payload.locale === 'tl' ? 'tl' : 'en';

              if (!recipientEmail || !customMessage) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Missing parent email address or message text.',
                  })
                );
                return;
              }

              const tpl = buildAicsParentNoticeEmailTemplate({
                parentName,
                studentName,
                gradeSection,
                scheduleText,
                customMessage,
                locale,
              });

              const smtpResult = await sendGmailSmtp({
                to: recipientEmail,
                ...tpl,
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(smtpResult));
            } catch (err: unknown) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Failed to send Parent Notice via Gmail SMTP';
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: message }));
            }
          });
        });
      },
    },
  ],
  // Tauri: fixed port the desktop window loads, and never watch the Rust build folder
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  // Module workers (masterlist import runs in a Web Worker; WebView2/Tauri + modern browsers support this)
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
        },
      },
    },
  },
});

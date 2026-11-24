// ==============================================================================
// SUPABASE EDGE FUNCTION: solicitar-cotizacion
// Recibe, valida y envía solicitudes de cotización para CUBI Servicios usando Resend.
// No expone el correo de destino en el código cliente.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Función para sanitizar texto y prevenir inyecciones HTML en correos
function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ------------------------------------------------------------------------------
// PLANTILLA HTML PARA EL CORREO DEL ADMINISTRADOR
// ------------------------------------------------------------------------------
function buildAdminEmailHtml(data: {
  folio: string;
  nombre: string;
  telefono: string;
  correo?: string;
  tipo_inmueble: string;
  direccion: string;
  servicios: string[];
  nota?: string;
  fecha: string;
  businessName: string;
  tipo?: string;
  asunto?: string;
}) {
  const isContacto = data.tipo === "contacto";
  const cleanPhoneDigits = data.telefono.replace(/\D/g, "");
  const waUrl = isContacto
    ? `https://wa.me/52${cleanPhoneDigits}?text=Hola%20${encodeURIComponent(data.nombre)},%20te%20escribimos%20de%20${encodeURIComponent(data.businessName)}%20con%20respecto%20a%20tu%20mensaje%20de%20contacto%20folio%20${encodeURIComponent(data.folio)}.`
    : `https://wa.me/52${cleanPhoneDigits}?text=Hola%20${encodeURIComponent(data.nombre)},%20te%20escribimos%20de%20${encodeURIComponent(data.businessName)}%20con%20respecto%20a%20tu%20solicitud%20de%20cotizaci%C3%B3n%20folio%20${encodeURIComponent(data.folio)}.`;

  const servicesListHtml = data.servicios
    .map(
      (s) => `
        <li style="margin-bottom: 6px; color: #1e293b; font-weight: 600;">
          <span style="color: #1987C6; margin-right: 6px;">✔</span> ${escapeHtml(s)}
        </li>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>${isContacto ? "Nuevo Mensaje de Contacto" : "Nueva Cotización"} ${escapeHtml(data.folio)}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 24px 12px; }
        .card { background-color: #ffffff; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06); }
        .header { background: linear-gradient(135deg, #16304C 0%, #1987C6 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
        .header p { margin: 8px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 28px 24px; }
        .folio-pill { display: inline-block; background-color: #e0f2fe; color: #0284c7; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 800; letter-spacing: 0.05em; font-family: monospace; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; margin: 20px 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .data-table td { padding: 8px 0; border-bottom: 1px solid #f8fafc; font-size: 14px; }
        .data-table td.label { color: #64748b; width: 35%; font-weight: 500; }
        .data-table td.value { color: #0f172a; font-weight: 600; }
        .action-buttons { margin-top: 24px; text-align: center; }
        .btn-wa { display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 10px; margin-right: 8px; }
        .btn-tel { display: inline-block; background-color: #1987C6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 10px; }
        .notes-box { background-color: #f8fafc; border-left: 4px solid #1987C6; padding: 14px; border-radius: 8px; font-size: 13px; color: #334155; line-height: 1.5; margin-top: 8px; }
        .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${escapeHtml(data.businessName)}</h1>
          <p>${isContacto ? "Nuevo Mensaje de Contacto desde Sitio Web" : "Solicitud de Cotización Entrante desde Sitio Web"}</p>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 16px;">
            <span class="folio-pill">FOLIO: ${escapeHtml(data.folio)}</span>
          </div>

          <div class="section-title">Datos del Solicitante</div>
          <table class="data-table">
            <tr>
              <td class="label">Nombre:</td>
              <td class="value">${escapeHtml(data.nombre)}</td>
            </tr>
            <tr>
              <td class="label">Teléfono:</td>
              <td class="value"><a href="tel:${escapeHtml(data.telefono)}" style="color: #1987C6; text-decoration: none;">${escapeHtml(data.telefono)}</a></td>
            </tr>
            ${
              data.correo
                ? `<tr>
                    <td class="label">Correo:</td>
                    <td class="value"><a href="mailto:${escapeHtml(data.correo)}" style="color: #1987C6; text-decoration: none;">${escapeHtml(data.correo)}</a></td>
                  </tr>`
                : ""
            }
            <tr>
              <td class="label">Fecha y Hora:</td>
              <td class="value">${escapeHtml(data.fecha)}</td>
            </tr>
          </table>

          <div class="section-title">${isContacto ? "Asunto / Servicio de Interés" : "Servicios Requeridos"}</div>
          <ul style="padding-left: 20px; margin: 8px 0; font-size: 14px;">
            ${servicesListHtml}
          </ul>

          <div class="section-title">Inmueble y Ubicación</div>
          <table class="data-table">
            <tr>
              <td class="label">Tipo de Inmueble:</td>
              <td class="value">${escapeHtml(data.tipo_inmueble)}</td>
            </tr>
            <tr>
              <td class="label">Ubicación / Dirección:</td>
              <td class="value">${escapeHtml(data.direccion)}</td>
            </tr>
          </table>

          ${
            data.nota
              ? `<div class="section-title">${isContacto ? "Mensaje del Cliente" : "Notas / Detalles Adicionales"}</div>
                 <div class="notes-box">${escapeHtml(data.nota).replace(/\n/g, "<br>")}</div>`
              : ""
          }

          <div class="action-buttons">
            <a href="${waUrl}" target="_blank" class="btn-wa">💬 Responder por WhatsApp</a>
            <a href="tel:${escapeHtml(data.telefono)}" class="btn-tel">📞 Llamar al Cliente</a>
          </div>
        </div>

        <div class="footer">
          Enviado automáticamente por el portal web de ${escapeHtml(data.businessName)} · cubiservicios.lat
        </div>
      </div>
    </body>
    </html>
  `;
}

// ------------------------------------------------------------------------------
// PLANTILLA HTML PARA LA CONFIRMACIÓN AL CLIENTE (OPCIONAL)
// ------------------------------------------------------------------------------
function buildClientEmailHtml(data: {
  folio: string;
  nombre: string;
  servicios: string[];
  businessName: string;
}) {
  const servicesListHtml = data.servicios
    .map(
      (s) => `
        <li style="margin-bottom: 5px; color: #1e293b;">
          <strong style="color: #1987C6;">•</strong> ${s}
        </li>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .card { background-color: #ffffff; border-radius: 16px; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.04); }
        .header { background: linear-gradient(135deg, #16304C 0%, #1987C6 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; color: #334155; }
        .folio-box { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px; text-align: center; margin: 16px 0; }
        .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${data.businessName}</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Confirmación de Solicitud de Cotización</p>
        </div>
        <div class="content">
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p>Hemos recibido tus requerimientos de servicio correctamente. Nuestro equipo técnico revisará los detalles y te contactará a la brevedad con tu propuesta.</p>
          <div class="folio-box">
            <span style="font-size: 12px; color: #0284c7; font-weight: 600; text-transform: uppercase;">Tu Folio de Atención:</span>
            <div style="font-size: 20px; font-weight: 800; color: #0369a1; font-family: monospace; margin-top: 4px;">${data.folio}</div>
          </div>
          <p><strong>Servicios incluidos en tu solicitud:</strong></p>
          <ul style="padding-left: 20px; margin: 8px 0;">
            ${servicesListHtml}
          </ul>
          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            Si necesitas agregar algún detalle o tu solicitud es urgente, puedes comunicarte directamente con nosotros vía WhatsApp al <strong>924 104 0806</strong> indicando tu folio.
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} ${data.businessName} · Acayucan, Veracruz · cubiservicios.lat
        </div>
      </div>
    </body>
    </html>
  `;
}

// ------------------------------------------------------------------------------
// HANDLER PRINCIPAL DE LA EDGE FUNCTION
// ------------------------------------------------------------------------------
serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Método no permitido." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Cuerpo de solicitud JSON inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0. Trampa de honeypot anti-bot
    if (body.hp_check) {
      console.warn("Honeypot activado por bot automatizado. Descartando silenciosamente.");
      return new Response(
        JSON.stringify({ success: true, message: "Solicitud registrada con éxito.", data: { folio: "COT-OK" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0.1 Verificación de Cloudflare Turnstile (si se configuró CLOUDFLARE_TURNSTILE_SECRET_KEY en Supabase)
    const turnstileSecret = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY");
    const cfToken = body.cf_token;

    if (turnstileSecret && cfToken) {
      try {
        const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: turnstileSecret,
            response: cfToken,
            remoteip: req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "",
          }),
        });
        const verifyJson = await verifyRes.json();
        if (!verifyJson.success) {
          console.warn("Validación de Turnstile rechazada por Cloudflare:", verifyJson);
          return new Response(
            JSON.stringify({ success: false, error: "Validación de seguridad humana fallida. Por favor recarga e intenta de nuevo." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (cfErr: any) {
        console.error("Fallo al contactar servidor de Turnstile:", cfErr.message);
      }
    }

    const {
      servicios,
      tipo_inmueble,
      direccion,
      nombre,
      telefono,
      correo,
      nota,
      tipo,
      asunto,
      mensaje,
    } = body;

    const isContacto = tipo === "contacto";
    const errors: Record<string, string> = {};

    // 1. Validación de Servicios / Asunto
    let cleanServicios: string[] = Array.isArray(servicios)
      ? servicios.map((s) => String(s).trim()).filter(Boolean)
      : typeof servicios === "string" && servicios.trim()
      ? [servicios.trim()]
      : [];

    if (cleanServicios.length === 0) {
      if (isContacto) {
        cleanServicios = [typeof asunto === "string" && asunto.trim() ? asunto.trim() : "Contacto General desde Sitio Web"];
      } else {
        errors.servicios = "Debes seleccionar al menos un servicio.";
      }
    }

    // 2. Validación de Tipo de Inmueble
    let cleanInmueble = typeof tipo_inmueble === "string" ? tipo_inmueble.trim() : "";
    if (!cleanInmueble) {
      if (isContacto) {
        cleanInmueble = "Contacto / Consulta Web";
      } else {
        errors.tipo_inmueble = "El tipo de inmueble es obligatorio.";
      }
    }

    // 3. Validación de Dirección
    let cleanDireccion = typeof direccion === "string" ? direccion.trim() : "";
    if (!cleanDireccion) {
      if (isContacto) {
        cleanDireccion = "Acayucan y región / Sitio Web";
      } else {
        errors.direccion = "La dirección del servicio es obligatoria.";
      }
    }

    // 4. Validación de Nombre
    const cleanNombre = typeof nombre === "string" ? nombre.trim() : "";
    if (!cleanNombre || cleanNombre.length < 2) {
      errors.nombre = "El nombre completo es obligatorio (mínimo 2 caracteres).";
    }

    // 5. Validación de Teléfono (mínimo 10 dígitos)
    const cleanTelefono = typeof telefono === "string" ? telefono.trim() : "";
    const digitsOnly = cleanTelefono.replace(/\D/g, "");
    if (!cleanTelefono || digitsOnly.length < 10) {
      errors.telefono = "Ingresa un número de teléfono o WhatsApp válido de al menos 10 dígitos.";
    }

    // 6. Validación de Correo (opcional pero con formato válido)
    const cleanCorreo = typeof correo === "string" && correo.trim() ? correo.trim().toLowerCase() : null;
    if (cleanCorreo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanCorreo)) {
        errors.correo = "El formato de correo electrónico no es válido.";
      }
    }

    const rawNota = nota || mensaje || "";
    const cleanNota = typeof rawNota === "string" ? rawNota.trim().slice(0, 1500) : "";

    if (Object.keys(errors).length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Datos de formulario incompletos o inválidos.",
          details: errors,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Variables de configuración seguras (desde secrets de Supabase, NUNCA expuestas al cliente)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const recipientEmail =
      Deno.env.get("COTIZACIONES_RECIPIENT_EMAIL") ||
      Deno.env.get("NOTIFICATION_EMAIL");
    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "cotizaciones@cubiservicios.lat";
    const businessName = Deno.env.get("BUSINESS_NAME") || "CUBI Servicios";

    // Generación de Folio
    const now = new Date();
    const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    let folio = isContacto ? `MSJ-${datePrefix}-${randomSuffix}` : `COT-${datePrefix}-${randomSuffix}`;

    // Intento de guardado en base de datos si existe Supabase admin configurado
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: insertedRecord, error: dbErr } = await supabaseAdmin
          .from("solicitudes_cotizacion")
          .insert({
            servicios: cleanServicios,
            tipo_inmueble: cleanInmueble,
            direccion: cleanDireccion,
            nombre: cleanNombre,
            telefono: cleanTelefono,
            correo: cleanCorreo,
            nota: cleanNota || null,
            estado: "pendiente",
          })
          .select("id, folio")
          .maybeSingle();

        if (insertedRecord && insertedRecord.folio) {
          folio = insertedRecord.folio;
        } else if (dbErr) {
          console.warn("Tabla solicitudes_cotizacion no disponible o aviso de bd:", dbErr.message);
        }
      } catch (dbEx: any) {
        console.warn("No se pudo registrar en tabla solicitudes_cotizacion:", dbEx.message);
      }
    }

    // Fecha formateada para el correo
    const fechaFormateada = now.toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "full",
      timeStyle: "short",
    });

    // 7. Envío de correo al administrador vía Resend
    let emailAdminEnviado = false;
    let emailAdminError = null;

    if (!resendApiKey) {
      console.warn("AVISO: RESEND_API_KEY no está configurada en los secrets de Supabase.");
    } else if (!recipientEmail) {
      console.warn("AVISO: COTIZACIONES_RECIPIENT_EMAIL no está configurada en los secrets de Supabase.");
    } else {
      const adminHtml = buildAdminEmailHtml({
        folio,
        nombre: cleanNombre,
        telefono: cleanTelefono,
        correo: cleanCorreo || undefined,
        tipo_inmueble: cleanInmueble,
        direccion: cleanDireccion,
        servicios: cleanServicios,
        nota: cleanNota || undefined,
        fecha: fechaFormateada,
        businessName,
        tipo: isContacto ? "contacto" : "cotizacion",
        asunto: typeof asunto === "string" ? asunto : undefined,
      });

      try {
        const emailSubject = isContacto
          ? `Nuevo Mensaje de Contacto [${folio}] - ${cleanNombre}`
          : `Nueva Solicitud de Cotización [${folio}] - ${cleanNombre}`;

        const resAdmin = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${businessName} <${fromEmail}>`,
            to: [recipientEmail],
            reply_to: cleanCorreo || undefined,
            subject: emailSubject,
            html: adminHtml,
          }),
        });

        const resAdminJson = await resAdmin.json();
        if (resAdmin.ok) {
          emailAdminEnviado = true;
          console.log(`Correo de cotización enviado a ${recipientEmail} vía Resend. ID: ${resAdminJson.id}`);
        } else {
          emailAdminError = resAdminJson?.message || "Error al enviar correo con Resend";
          console.error("Error devuelto por Resend API:", resAdminJson);
        }
      } catch (err: any) {
        emailAdminError = err.message;
        console.error("Fallo al conectar con Resend API:", err);
      }
    }

    // 8. Envío opcional de correo de confirmación al cliente (si proporcionó correo)
    if (cleanCorreo && resendApiKey && emailAdminEnviado) {
      try {
        const clientHtml = buildClientEmailHtml({
          folio,
          nombre: cleanNombre,
          servicios: cleanServicios,
          businessName,
        });

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${businessName} <${fromEmail}>`,
            to: [cleanCorreo],
            reply_to: fromEmail,
            subject: `Recibimos tu solicitud de cotización [${folio}] - ${businessName}`,
            html: clientHtml,
          }),
        });
      } catch (clientMailErr: any) {
        console.warn("No se pudo enviar confirmación al cliente:", clientMailErr.message);
      }
    }

    // Respuesta exitosa al frontend
    return new Response(
      JSON.stringify({
        success: true,
        message: "Solicitud de cotización recibida con éxito.",
        data: {
          folio,
          nombre: cleanNombre,
          servicios: cleanServicios,
          email_enviado: emailAdminEnviado,
          email_error: emailAdminError,
          created_at: now.toISOString(),
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error no controlado en solicitar-cotizacion:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Ocurrió un error inesperado al procesar la cotización." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

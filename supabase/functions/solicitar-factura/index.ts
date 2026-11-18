// ==============================================================================
// SUPABASE EDGE FUNCTION: solicitar-factura
// Recibe, valida y almacena solicitudes de facturación públicas para Cotizapp Web
// Genera folio consecutivo en servidor y despacha confirmación por Resend.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Encabezados CORS universales
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ------------------------------------------------------------------------------
// CATÁLOGOS SAT CFDI 4.0
// ------------------------------------------------------------------------------
interface SatCatalogItem {
  descripcion: string;
  fisica: boolean;
  moral: boolean;
}

const REGIMENES_FISCALES: Record<string, SatCatalogItem> = {
  "601": { descripcion: "General de Ley Personas Morales", fisica: false, moral: true },
  "603": { descripcion: "Personas Morales con Fines no Lucrativos", fisica: false, moral: true },
  "605": { descripcion: "Sueldos y Salarios e Ingresos Asimilados a Salarios", fisica: true, moral: false },
  "606": { descripcion: "Arrendamiento", fisica: true, moral: false },
  "607": { descripcion: "Régimen de Enajenación o Adquisición de Bienes", fisica: true, moral: false },
  "608": { descripcion: "Demás ingresos", fisica: true, moral: false },
  "610": { descripcion: "Residentes en el Extranjero sin Establecimiento Permanente en México", fisica: true, moral: true },
  "611": { descripcion: "Ingresos por Dividendos (socios y accionistas)", fisica: true, moral: false },
  "612": { descripcion: "Personas Físicas con Actividades Empresariales y Profesionales", fisica: true, moral: false },
  "614": { descripcion: "Ingresos por intereses", fisica: true, moral: false },
  "615": { descripcion: "Régimen de los ingresos por obtención de premios", fisica: true, moral: false },
  "616": { descripcion: "Sin obligaciones fiscales", fisica: true, moral: false },
  "620": { descripcion: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos", fisica: false, moral: true },
  "621": { descripcion: "Incorporación Fiscal", fisica: true, moral: false },
  "622": { descripcion: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", fisica: true, moral: true },
  "623": { descripcion: "Opcional para Grupos de Sociedades", fisica: false, moral: true },
  "624": { descripcion: "Coordinados", fisica: false, moral: true },
  "625": { descripcion: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", fisica: true, moral: false },
  "626": { descripcion: "Régimen Simplificado de Confianza (RESICO)", fisica: true, moral: true },
};

const USOS_CFDI: Record<string, SatCatalogItem> = {
  "G01": { descripcion: "Adquisición de mercancías", fisica: true, moral: true },
  "G02": { descripcion: "Devoluciones, descuentos o bonificaciones", fisica: true, moral: true },
  "G03": { descripcion: "Gastos en general", fisica: true, moral: true },
  "I01": { descripcion: "Construcciones", fisica: true, moral: true },
  "I02": { descripcion: "Mobiliario y equipo de oficina por inversiones", fisica: true, moral: true },
  "I03": { descripcion: "Equipo de transporte", fisica: true, moral: true },
  "I04": { descripcion: "Equipo de cómputo y accesorios", fisica: true, moral: true },
  "I05": { descripcion: "Dados, troqueles, moldes, matrices y herramental", fisica: true, moral: true },
  "I06": { descripcion: "Comunicaciones telefónicas", fisica: true, moral: true },
  "I07": { descripcion: "Comunicaciones satelitales", fisica: true, moral: true },
  "I08": { descripcion: "Otra maquinaria y equipo", fisica: true, moral: true },
  "D01": { descripcion: "Honorarios médicos, dentales y gastos hospitalarios", fisica: true, moral: false },
  "D02": { descripcion: "Gastos médicos por incapacidad o discapacidad", fisica: true, moral: false },
  "D03": { descripcion: "Gastos funerales", fisica: true, moral: false },
  "D04": { descripcion: "Donativos", fisica: true, moral: false },
  "D05": { descripcion: "Intereses reales efectivamente pagados por créditos hipotecarios", fisica: true, moral: false },
  "D06": { descripcion: "Aportaciones voluntarias al SAR", fisica: true, moral: false },
  "D07": { descripcion: "Primas por seguros de gastos médicos", fisica: true, moral: false },
  "D08": { descripcion: "Gastos de transportación escolar obligatoria", fisica: true, moral: false },
  "D09": { descripcion: "Depósitos en cuentas personales especiales para el ahorro", fisica: true, moral: false },
  "D10": { descripcion: "Pagos por servicios educativos (colegiaturas)", fisica: true, moral: false },
  "S01": { descripcion: "Sin efectos fiscales", fisica: true, moral: true },
  "CP01": { descripcion: "Pagos", fisica: true, moral: true },
  "CN01": { descripcion: "Nómina", fisica: true, moral: false },
};

// ------------------------------------------------------------------------------
// ENVÍO DE EMAIL CON RESEND
// ------------------------------------------------------------------------------
async function sendConfirmationEmail(resendApiKey: string, solicitud: {
  folio: string;
  rfc: string;
  razon_social: string;
  correo: string;
  regimen_fiscal: string;
  uso_cfdi: string;
}) {
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "facturacion@cubiservicios.lat";
  const businessName = Deno.env.get("BUSINESS_NAME") || "CUBI Servicios";

  const regimenDesc = REGIMENES_FISCALES[solicitud.regimen_fiscal]?.descripcion || solicitud.regimen_fiscal;
  const usoDesc = USOS_CFDI[solicitud.uso_cfdi]?.descripcion || solicitud.uso_cfdi;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .card { background-color: #ffffff; border-radius: 16px; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 20px; border: 1px solid #bfdbfe; }
        .folio-box { background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        .folio-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .folio-number { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .data-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .data-table td.label { color: #64748b; width: 40%; font-weight: 500; }
        .data-table td.value { color: #0f172a; font-weight: 600; text-align: right; }
        .footer { background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${businessName}</h1>
          <p>Solicitud de Factura Recibida</p>
        </div>
        <div class="content">
          <span class="badge">ESTADO: PENDIENTE DE EMISIÓN</span>
          <div class="folio-box">
            <div class="folio-title">Folio de Solicitud</div>
            <div class="folio-number">${solicitud.folio}</div>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Hola <strong>${solicitud.razon_social}</strong>, hemos recibido tu solicitud de factura electrónica correctamente. Nuestro equipo administrativo la revisará y emitirá tu CFDI 4.0 a la brevedad.
          </p>
          <table class="data-table">
            <tr>
              <td class="label">RFC:</td>
              <td class="value">${solicitud.rfc}</td>
            </tr>
            <tr>
              <td class="label">Régimen Fiscal:</td>
              <td class="value">${solicitud.regimen_fiscal} - ${regimenDesc}</td>
            </tr>
            <tr>
              <td class="label">Uso de CFDI:</td>
              <td class="value">${solicitud.uso_cfdi} - ${usoDesc}</td>
            </tr>
          </table>
          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            Una vez timbrada la factura, recibirás los archivos XML y PDF en este correo electrónico.
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} ${businessName}. Este es un correo automático generado por Cotizapp Web.
        </div>
      </div>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${businessName} <${fromEmail}>`,
      to: [solicitud.correo],
      subject: `Acuse de Solicitud de Factura - ${solicitud.folio}`,
      html: htmlContent,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend API Error (${res.status}): ${errorText}`);
  }

  return await res.json();
}

// ------------------------------------------------------------------------------
// HANDLER PRINCIPAL
// ------------------------------------------------------------------------------
serve(async (req: Request) => {
  // Manejo de pre-flight CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Método no permitido. Utilice POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Cuerpo de solicitud JSON inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      rfc,
      razon_social,
      codigo_postal,
      regimen_fiscal,
      uso_cfdi,
      correo,
      observaciones,
    } = body;

    const errors: Record<string, string> = {};

    // 1. Validación de RFC Estricta (SAT CFDI 4.0)
    const cleanRfc = typeof rfc === "string" ? rfc.trim().toUpperCase() : "";
    if (!cleanRfc) {
      errors.rfc = "El RFC es obligatorio.";
    } else if (cleanRfc !== "XAXX010101000" && cleanRfc !== "XEXX010101000") {
      if (cleanRfc.length !== 12 && cleanRfc.length !== 13) {
        errors.rfc = `El RFC debe tener exactamente 12 caracteres (Persona Moral) o 13 (Persona Física). Se recibieron ${cleanRfc.length} caracteres.`;
      } else {
        const isMoral = cleanRfc.length === 12;
        const regex = isMoral
          ? /^[A-ZÑ&]{3}([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/
          : /^[A-ZÑ&]{4}([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/;
        const match = cleanRfc.match(regex);
        if (!match) {
          errors.rfc = "Estructura de RFC inválida. Debe contener letras iniciales válidas, fecha en formato AAMMDD (año, mes 01-12, día 01-31) y homoclave de 3 caracteres.";
        } else {
          const month = parseInt(match[2], 10);
          const day = parseInt(match[3], 10);
          if (month === 2 && day > 29) {
            errors.rfc = "Fecha inválida para febrero en el RFC.";
          } else if ([4, 6, 9, 11].includes(month) && day === 31) {
            errors.rfc = "El mes indicado en el RFC solo cuenta con 30 días.";
          }
        }
      }
    }

    const isPersonaMoral = cleanRfc.length === 12;
    const isPersonaFisica = cleanRfc.length === 13;

    // 2. Validación de Razón Social / Nombre
    const cleanRazonSocial = typeof razon_social === "string" ? razon_social.trim() : "";
    if (!cleanRazonSocial) {
      errors.razon_social = "El nombre o razón social es obligatorio.";
    } else if (cleanRazonSocial.length < 2 || cleanRazonSocial.length > 300) {
      errors.razon_social = "La razón social debe tener entre 2 y 300 caracteres.";
    }

    // 3. Validación de Código Postal
    const cleanCp = typeof codigo_postal === "string" ? codigo_postal.trim() : String(codigo_postal || "").trim();
    const cpRegex = /^[0-9]{5}$/;
    if (!cleanCp) {
      errors.codigo_postal = "El código postal fiscal es obligatorio.";
    } else if (!cpRegex.test(cleanCp)) {
      errors.codigo_postal = "El código postal debe contener exactamente 5 dígitos numéricos.";
    }

    // 4. Validación de Régimen Fiscal contra catálogo oficial
    const cleanRegimen = typeof regimen_fiscal === "string" ? regimen_fiscal.trim() : String(regimen_fiscal || "").trim();
    if (!cleanRegimen) {
      errors.regimen_fiscal = "La clave de régimen fiscal es obligatoria.";
    } else if (!REGIMENES_FISCALES[cleanRegimen]) {
      errors.regimen_fiscal = `El régimen fiscal '${cleanRegimen}' no es válido según el catálogo oficial SAT CFDI 4.0.`;
    } else {
      // Validar compatibilidad básica persona física vs persona moral
      const catalogInfo = REGIMENES_FISCALES[cleanRegimen];
      if (isPersonaMoral && !catalogInfo.moral) {
        errors.regimen_fiscal = `El régimen '${cleanRegimen}' es exclusivo para Personas Físicas.`;
      } else if (isPersonaFisica && !catalogInfo.fisica) {
        errors.regimen_fiscal = `El régimen '${cleanRegimen}' es exclusivo para Personas Morales.`;
      }
    }

    // 5. Validación de Uso de CFDI contra catálogo oficial
    const cleanUso = typeof uso_cfdi === "string" ? uso_cfdi.trim().toUpperCase() : "";
    if (!cleanUso) {
      errors.uso_cfdi = "La clave de uso de CFDI es obligatoria.";
    } else if (!USOS_CFDI[cleanUso]) {
      errors.uso_cfdi = `El uso de CFDI '${cleanUso}' no es válido según el catálogo oficial SAT CFDI 4.0.`;
    } else {
      const catalogInfo = USOS_CFDI[cleanUso];
      if (isPersonaMoral && !catalogInfo.moral) {
        errors.uso_cfdi = `El uso de CFDI '${cleanUso}' (deducción personal) solo aplica para Personas Físicas.`;
      }
    }

    // 6. Validación de Correo (opcional pero con formato correcto si se proporciona)
    const cleanCorreo = typeof correo === "string" ? correo.trim().toLowerCase() : null;
    if (cleanCorreo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanCorreo)) {
        errors.correo = "El formato de correo electrónico no es válido.";
      }
    }

    // 7. Observaciones (opcional)
    const cleanObservaciones = typeof observaciones === "string" ? observaciones.trim().slice(0, 1000) : null;

    // Si existen errores de validación, retornar 422 Unprocessable Entity
    if (Object.keys(errors).length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Datos de solicitud inválidos.",
          details: errors,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Inicializar cliente Supabase con Service Role Key (para inserción segura que respeta RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ success: false, error: "Error interno de configuración del servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 9. Guardar solicitud en la base de datos
    // Nota: El folio es asignado automáticamente por el trigger de Postgres trg_set_solicitud_factura_folio
    const { data: record, error: dbError } = await supabaseAdmin
      .from("solicitudes_factura")
      .insert({
        rfc: cleanRfc,
        razon_social: cleanRazonSocial,
        codigo_postal: cleanCp,
        regimen_fiscal: cleanRegimen,
        uso_cfdi: cleanUso,
        correo: cleanCorreo,
        observaciones: cleanObservaciones,
        estado: "pendiente",
        email_status: "pendiente",
      })
      .select("id, folio, rfc, razon_social, codigo_postal, regimen_fiscal, uso_cfdi, correo, observaciones, estado, email_status, created_at")
      .single();

    if (dbError) {
      console.error("Error al insertar solicitud en base de datos:", dbError);
      return new Response(
        JSON.stringify({ success: false, error: "No se pudo registrar la solicitud: " + dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Envío de notificación por correo si Resend está configurado y hay correo del solicitante
    let emailStatus = "pendiente";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey && cleanCorreo) {
      try {
        await sendConfirmationEmail(resendApiKey, {
          folio: record.folio,
          rfc: record.rfc,
          razon_social: record.razon_social,
          correo: cleanCorreo,
          regimen_fiscal: record.regimen_fiscal,
          uso_cfdi: record.uso_cfdi,
        });

        emailStatus = "enviado";

        // Actualizar estado de correo en la base de datos
        await supabaseAdmin
          .from("solicitudes_factura")
          .update({
            email_status: "enviado",
            email_sent_at: new Date().toISOString(),
          })
          .eq("id", record.id);

      } catch (mailErr: any) {
        console.error("Error al enviar correo vía Resend:", mailErr.message);
        emailStatus = "error";

        await supabaseAdmin
          .from("solicitudes_factura")
          .update({
            email_status: "error",
          })
          .eq("id", record.id);
      }
    }

    // 11. Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        message: "Solicitud de facturación registrada con éxito.",
        data: {
          id: record.id,
          folio: record.folio,
          rfc: record.rfc,
          razon_social: record.razon_social,
          estado: record.estado,
          email_status: emailStatus,
          created_at: record.created_at,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error no controlado en solicitar-factura:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Ocurrió un error inesperado al procesar la solicitud." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


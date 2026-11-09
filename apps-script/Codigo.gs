/**
 * ═══════════════════════════════════════════════════════════════════
 *  SILPLAN CONSULTING — Receptor de Horas Extras para Contabilidad
 *  CONSULTORA · Servicios de Ingeniería y Planificación · República Dominicana
 *  www.silplanconsulting.com · Av. República de Argentina #1, Plaza Belle Vue, Módulo 1A
 *
 *  Recibe los registros enviados por la app móvil, los guarda en la hoja
 *  "Horas Extras", archiva las firmas en Google Drive y envía un correo
 *  a Contabilidad. Instrucciones completas: INSTALACION.md
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── CONFIGURACIÓN ─────────────────────────────────────────────────
const CONTABILIDAD_EMAIL = 'contabilidad@silplanconsulting.com'; // varios: separar con comas
const APP_TOKEN          = 'silplan-2026-cambiar-esta-clave';     // igual que TOKEN en config.js
const ENVIAR_CORREO      = true;                                   // false = solo hoja de cálculo
const CARPETA_FIRMAS     = 'Silplan - Firmas Horas Extras';
const HOJA               = 'Horas Extras';

const COLUMNAS = [
  'ID', 'Recibido', 'Fecha', 'Brigada', 'Empleado', 'Cédula',
  'Auxiliar A', 'Cédula A', 'Auxiliar B', 'Cédula B',
  'Hora inicio', 'Hora fin', 'Horas', 'Obra / Proyecto', 'Tipo de trabajo',
  'Cliente', 'Provincia', 'Ciudad / Sector', 'Descripción',
  'Supervisor', 'Aprobado', 'Firma empleado', 'Firma supervisor', 'Origen', 'Estado contabilidad'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== APP_TOKEN) return json_({ ok: false, error: 'token' });

    const sh = hoja_();
    const ids = new Set(sh.getLastRow() > 1
      ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : []);

    const nuevos = [];
    const recibidos = [];
    (body.records || []).forEach(r => {
      const id = String(r.id);
      recibidos.push(id);
      if (ids.has(id)) return;                     // ya estaba (reintento): no duplicar
      ids.add(id);
      const firma = guardarFirma_(r.signature, id + '_empleado');
      const firmaSup = guardarFirma_(r.signatureSup, id + '_supervisor');
      sh.appendRow([
        id, new Date(), r.date, r.brigade || '', r.empName, r.empNum,
        r.auxAName || '', r.auxANum || '', r.auxBName || '', r.auxBNum || '',
        r.timeStart, r.timeEnd, Number(r.hours) || 0, r.workType, r.workSubtype || '',
        r.client || '', r.project || '', r.city || '', r.desc || '',
        r.supervisorName || '', r.approved ? 'Sí' : 'No', firma, firmaSup,
        r.source || 'Registro', 'Pendiente'
      ]);
      nuevos.push(r);
    });

    if (nuevos.length && ENVIAR_CORREO) enviarCorreo_(nuevos, sh);
    return json_({ ok: true, received: recibidos, nuevos: nuevos.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Permite comprobar desde el navegador que la URL funciona
function doGet() {
  return json_({ ok: true, servicio: 'Silplan Consulting — Horas Extras', hoja: HOJA });
}

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS])
      .setFontWeight('bold').setBackground('#0a1628').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('C:C').setNumberFormat('yyyy-mm-dd');
    sh.getRange('M:M').setNumberFormat('0.0');
  }
  return sh;
}

function guardarFirma_(dataUrl, nombre) {
  if (!dataUrl || String(dataUrl).indexOf('data:image') !== 0) return '';
  const m = String(dataUrl).match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return '';
  const it = DriveApp.getFoldersByName(CARPETA_FIRMAS);
  const carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FIRMAS);
  const ext = m[1].split('/')[1];
  const f = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre + '.' + ext));
  return f.getUrl();
}

function enviarCorreo_(regs, sh) {
  const total = regs.reduce((a, r) => a + (Number(r.hours) || 0), 0);
  const emp = regs[0].empName;
  const filas = regs.map(r => `
    <tr>
      <td style="padding:6px;border-bottom:1px solid #e0e6f0">${esc_(r.date)}</td>
      <td style="padding:6px;border-bottom:1px solid #e0e6f0">${esc_(r.empName)}<br><small style="color:#6b7a99">${esc_(r.empNum)}</small></td>
      <td style="padding:6px;border-bottom:1px solid #e0e6f0">${esc_(r.workType)}<br><small style="color:#6b7a99">${esc_(r.workSubtype || '')}</small></td>
      <td style="padding:6px;border-bottom:1px solid #e0e6f0">${esc_(r.city || '')}${r.city && r.project ? ', ' : ''}${esc_(r.project || '')}</td>
      <td style="padding:6px;border-bottom:1px solid #e0e6f0">${esc_(r.timeStart)}–${esc_(r.timeEnd)}</td>
      <td style="padding:6px;border-bottom:1px solid #e0e6f0;text-align:right;font-weight:bold">${(Number(r.hours) || 0).toFixed(1)}</td>
      <td style="padding:6px;border-bottom:1px solid #e0e6f0">${r.approved ? '✓ ' + esc_(r.supervisorName || '') : 'Pendiente'}</td>
    </tr>`).join('');
  const html = `
  <div style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:760px">
    <div style="border-bottom:4px solid #f0a500;padding:12px 0">
      <div style="font-size:10px;letter-spacing:2px;color:#6b7a99">CONSULTORA</div>
      <div style="font-size:20px;font-weight:900;color:#0a1628">SILPLAN CONSULTING</div>
      <div style="font-size:11px;color:#2a5298">Servicios de Ingeniería y Planificación · República Dominicana</div>
    </div>
    <h2 style="font-size:16px;color:#0a1628">Nuevo registro de horas extras</h2>
    <p style="font-size:13px">${esc_(emp)} registró <b>${regs.length}</b> día(s) · <b>${total.toFixed(1)} horas</b>.</p>
    <table style="border-collapse:collapse;width:100%;font-size:12px">
      <tr style="background:#0a1628;color:#fff">
        <th style="padding:6px;text-align:left">Fecha</th><th style="padding:6px;text-align:left">Empleado</th>
        <th style="padding:6px;text-align:left">Obra</th><th style="padding:6px;text-align:left">Ciudad / Provincia</th>
        <th style="padding:6px;text-align:left">Horario</th><th style="padding:6px;text-align:right">Horas</th>
        <th style="padding:6px;text-align:left">Aprobación</th>
      </tr>${filas}
    </table>
    <p style="font-size:12px;margin-top:14px"><a href="${sh.getParent().getUrl()}">Abrir hoja de Horas Extras</a></p>
    <div style="margin-top:18px;border-top:2px solid #0a1628;padding-top:8px;font-size:10px;color:#555;text-align:center">
      SILPLAN CONSULTING · Av. República de Argentina #1, Plaza Belle Vue, Módulo 1A · www.silplanconsulting.com
    </div>
  </div>`;
  MailApp.sendEmail({
    to: CONTABILIDAD_EMAIL,
    subject: `Horas extras — ${emp} — ${total.toFixed(1)} h (${regs.length} día/s)`,
    htmlBody: html,
    name: 'Silplan Consulting — Control de Horas'
  });
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

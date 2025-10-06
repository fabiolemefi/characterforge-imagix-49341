/**
 * Exports HTML content optimized for email clients (Gmail, Outlook, etc)
 * with inline CSS and compatibility fixes
 */
export const exportEmailHtml = (
  htmlContent: string,
  subject: string,
  previewText?: string
): string => {
  // Wrap content in email-safe HTML structure
  const fullHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--<![endif]-->
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-text-size-adjust: 100% !important;
      -ms-text-size-adjust: 100% !important;
      -webkit-font-smoothing: antialiased !important;
    }
    img {
      border: 0 !important;
      outline: none !important;
      -ms-interpolation-mode: bicubic;
    }
    a {
      text-decoration: none;
    }
    table {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    /* Prevent Gmail from converting phone numbers */
    .no-link a {
      color: inherit !important;
      text-decoration: none !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  ${previewText ? `
  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${escapeHtml(previewText)}
  </div>
  <!-- Spacer for Gmail -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  ` : ''}
  
  <!-- Main table wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <!-- Content table (max-width 600px) -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff;">
          <tr>
            <td>
              ${processHtmlForEmail(htmlContent)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return fullHtml;
};

/**
 * Process HTML content to be email-safe
 */
const processHtmlForEmail = (html: string): string => {
  let processed = html;

  // Replace div with table-based layout for better email client support
  // This is a simplified version - in production you might want more sophisticated parsing
  
  // Ensure images have proper attributes
  processed = processed.replace(
    /<img([^>]*?)>/gi,
    (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<img${attrs} style="display: block; max-width: 100%; height: auto;">`;
      }
      return match;
    }
  );

  // Add inline styles to links if missing
  processed = processed.replace(
    /<a([^>]*?)>/gi,
    (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<a${attrs} style="color: #0066cc; text-decoration: underline;">`;
      }
      return match;
    }
  );

  return processed;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Download HTML file
 */
export const downloadEmailHtml = (
  htmlContent: string,
  fileName: string,
  subject: string,
  previewText?: string
): void => {
  const fullHtml = exportEmailHtml(htmlContent, subject, previewText);
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

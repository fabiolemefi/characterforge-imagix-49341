import { useEffect, useRef } from 'react';

interface EmailPreviewProps {
  htmlContent: string;
  className?: string;
}

export const EmailPreview = ({ htmlContent, className = '' }: EmailPreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  font-family: Arial, sans-serif;
                  background-color: #f5f5f5;
                }
                table {
                  border-collapse: collapse;
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                }
              </style>
            </head>
            <body>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${htmlContent || '<p style="text-align: center; padding: 40px; color: #999;">Adicione blocos para visualizar seu email</p>'}
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [htmlContent]);

  return (
    <div className={`bg-muted rounded-lg overflow-hidden ${className}`}>
      <div className="bg-background border-b p-3 flex items-center justify-between">
        <span className="text-sm font-medium">Preview do Email</span>
        <span className="text-xs text-muted-foreground">600px de largura</span>
      </div>
      <iframe
        ref={iframeRef}
        title="Email Preview"
        className="w-full h-full border-0"
        style={{ minHeight: '600px' }}
      />
    </div>
  );
};

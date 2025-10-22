import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import Header from "@/components/Header";
import { PromoBar } from "@/components/PromoBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2, Copy, Download, Send } from "lucide-react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
interface ProcessedEmail {
  name: string;
  subject: string;
  preheader: string;
  html: string;
  images: {
    originalName: string;
    newName: string;
    blob: Blob;
  }[];
  uniqueSuffix: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}
const Efimail = () => {
  const [file, setFile] = useState<File | null>(null);
  const [addBranding, setAddBranding] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [emails, setEmails] = useState<ProcessedEmail[]>([]);
  const header = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 20px 0;">
          <h1 style="font-family: Arial, sans-serif; font-size: 24px; color: #333;">Efi bank</h1>
        </td>
      </tr>
    </table>
  `;
  const footer = `
    %%=ContentBlockById(33990435)=%%
    <a href="%%profile_center_url%%" style="display: none;">Gerenciar Preferências</a>
  `;
  const viewBrowser = `
<div class="bg preheaderlink header-section" style="background-color:#e5e5e5;"><!--[if mso | IE]>
    <table align="center" border="0" cellpadding="0" cellspacing="0" class="r-outlook -outlook pr-16-outlook pl-16-outlook -outlook" role="none" style="width:600px;" width="600"><tr><td style="line-height:0;font-size:0;mso-line-height-rule:exactly;">
    <![endif]-->
<div class="r  pr-16 pl-16" style="background:#f6f8fc;background-color:#f6f8fc;margin:0px auto;max-width:600px;">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="none" style="background:#f6f8fc;background-color:#f6f8fc;width:100%;">
	<tbody>
		<tr>
			<td style="border:none;direction:ltr;font-size:0;padding:16px 16px 16px 16px;text-align:left;"><!--[if mso | IE]>
    <table role="none" border="0" cellpadding="0" cellspacing="0"><tr><td class="c-outlook -outlook -outlook" style="vertical-align:middle;width:568px;">
    <![endif]-->
			<div class="xc568 ogf c" style="font-size:0;text-align:left;direction:ltr;display:inline-block;vertical-align:middle;width:100%;">
			<table border="0" cellpadding="0" cellspacing="0" role="none" style="border:none;vertical-align:middle;" width="100%">
				<tbody>
					<tr>
						<td align="center" class="v  s-8" style="font-size:0;word-break:break-word;">
						<div class="il"><!--[if mso | IE]>
    <table role="none" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td style="padding:0;padding-top:0;padding-left:0;padding-right:0;padding-bottom:0;" class="l-outlook -outlook -outlook">
    <![endif]-->
						<div class="preheadertextheader" style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Sabia que os dados cadastrais d&atilde;o agilidade na valida&ccedil;&atilde;o de transa&ccedil;&otilde;es?</div>
						<a class="l" href="%%view_email_url%%" style="display:inline-block;color:#000000;font-family:Arial,sans-serif;font-size:13px;font-weight:normal;line-height:0;text-decoration:none;text-transform:none;padding:0;padding-top:0;padding-left:0;padding-right:0;padding-bottom:0;" target="_blank"><span style="font-size:10px;font-family:Arial,sans-serif;font-weight:400;color:#586476;line-height:160%;text-decoration:underline;">Visualizar e-mail no browser</span></a> <!--[if mso | IE]>
    </td></tr></table>
    <![endif]--></div> 
						</td>
					</tr>
				</tbody>
			</table>
			</div>
			<!--[if mso | IE]>
    </td></tr></table>
    <![endif]--></td>
		</tr>
	</tbody>
</table>
</div>
</div>
`;
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  const extractSubjectAndPreheader = (html: string): {
    subject: string;
    preheader: string;
  } => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    let subject = '';
    let preheader = '';
    if (tables.length >= 3) {
      const thirdTable = tables[2];
      const rows = thirdTable.querySelectorAll('tr');
      if (rows.length >= 2) {
        subject = rows[1].textContent?.trim() || '';
      }
      if (rows.length >= 4) {
        preheader = rows[3].textContent?.trim() || '';
      }
    }
    return {
      subject,
      preheader
    };
  };
  const processZipFile = async () => {
    if (!file) return;
    setProcessing(true);
    setEmails([]);
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const processedEmails: ProcessedEmail[] = [];
      for (const [path, zipEntry] of Object.entries(zipContent.files)) {
        if (zipEntry.dir || !path.includes('/index.html')) continue;
        const folderName = path.split('/')[0];
        if (folderName === '_zips') continue;
        const uniqueSuffix = Math.floor(1000 + Math.random() * 9000).toString();
        let htmlContent = await zipEntry.async('string');

        // Substituir placeholder Pedro
        htmlContent = htmlContent.replace(/Pedro/g, '%%PrimeiroNome%%');

        // Extrair subject e preheader
        const {
          subject,
          preheader
        } = extractSubjectAndPreheader(htmlContent);

        // Remover tabelas desnecessárias (primeira 3 tabelas)
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const tables = doc.querySelectorAll('table');
        for (let i = 0; i < 3 && i < tables.length; i++) {
          tables[i].remove();
        }

        // Adicionar view-browser no início
        const bodyContent = doc.body.innerHTML;
        htmlContent = viewBrowser + bodyContent;

        // Adicionar header/footer se selecionado
        if (addBranding) {
          htmlContent = header + htmlContent + footer;
        }

        // Processar imagens
        const images: {
          originalName: string;
          newName: string;
          blob: Blob;
        }[] = [];
        const imgFolder = folderName + '/img/';
        for (const [imgPath, imgEntry] of Object.entries(zipContent.files)) {
          if (!imgPath.startsWith(imgFolder) || imgEntry.dir) continue;
          const imgName = imgPath.split('/').pop() || '';
          const blob = await imgEntry.async('blob');

          // Converter jpg para jpeg
          let newName = imgName.replace(/\.jpg$/i, '.jpeg');
          newName = newName.replace(/\.(png|jpeg|gif)$/i, `-${uniqueSuffix}.$1`);
          images.push({
            originalName: imgName,
            newName,
            blob
          });

          // Substituir no HTML
          const imgUrl = `https://image.comunicacao.sejaefi.com.br/lib/fe4111737764047d751573/m/1/${newName}`;
          htmlContent = htmlContent.replace(new RegExp(`img/${imgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), imgUrl);
        }
        processedEmails.push({
          name: folderName,
          subject,
          preheader,
          html: htmlContent,
          images,
          uniqueSuffix,
          status: 'pending'
        });
      }
      setEmails(processedEmails);
      toast({
        title: "Processamento concluído",
        description: `${processedEmails.length} email(s) processado(s) com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao processar zip:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar o arquivo zip.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  const sendToMarketingCloud = async (email: ProcessedEmail, index: number) => {
    setEmails(prev => prev.map((e, i) => i === index ? {
      ...e,
      status: 'uploading'
    } : e));
    
    toast({
      title: "Iniciando envio",
      description: `Enviando "${email.name}" para o Marketing Cloud...`
    });
    
    try {
      // Upload imagens primeiro
      console.log(`Iniciando upload de ${email.images.length} imagens...`);
      for (const img of email.images) {
        const base64 = await blobToBase64(img.blob);
        const extension = img.newName.split('.').pop()?.toLowerCase();
        let assetTypeId = 22; // jpeg
        if (extension === 'png') assetTypeId = 28;else if (extension === 'gif') assetTypeId = 23;
        const imagePayload = {
          assetType: {
            name: extension || 'jpeg',
            id: assetTypeId
          },
          name: img.newName,
          file: base64,
          category: {
            id: 93941
          },
          customerKey: img.newName,
          fileProperties: {
            fileName: img.newName,
            extension: extension || 'jpeg'
          }
        };
        console.log(`Enviando imagem: ${img.newName}`);
        console.log('Payload da imagem:', { 
          name: imagePayload.name, 
          assetType: imagePayload.assetType,
          fileSize: base64.length 
        });
        
        let data, error;
        try {
          const response = await supabase.functions.invoke('sfmc-upload-asset', {
            body: imagePayload
          });
          data = response.data;
          error = response.error;
          console.log('Resposta do upload de imagem:', { data, error });
        } catch (invokeError: any) {
          console.error('Erro ao invocar edge function:', invokeError);
          throw new Error(`Falha ao invocar edge function: ${invokeError.message}`);
        }
        
        if (error) {
          throw new Error(`Erro ao enviar imagem ${img.newName}: ${error.message}`);
        }
        
        // Verifica se a resposta é um erro do edge function
        if (typeof data === 'string') {
          const errorData = JSON.parse(data);
          if (!errorData.success && errorData.status !== 400) {
            throw new Error(`Erro ao enviar imagem ${img.newName}: ${errorData.error || errorData.message}`);
          }
        } else if (data && !data.success && data.status !== 400) {
          throw new Error(`Erro ao enviar imagem ${img.newName}: ${data.error || data.message}`);
        }
        
        console.log(`Imagem ${img.newName} enviada com sucesso`);
      }

      // Upload HTML
      console.log('Iniciando upload do HTML...');
      const htmlPayload = {
        assetType: {
          name: 'htmlemail',
          id: 208
        },
        name: email.name,
        category: {
          id: 93810
        },
        views: {
          html: {
            content: email.html
          },
          subjectline: {
            content: email.subject
          },
          preheader: {
            content: email.preheader
          }
        }
      };
      const {
        data: htmlData,
        error: htmlError
      } = await supabase.functions.invoke('sfmc-upload-asset', {
        body: htmlPayload
      });
      
      console.log('Resposta do upload de HTML:', { htmlData, htmlError });
      
      if (htmlError) {
        throw new Error(`Erro ao enviar HTML: ${htmlError.message}`);
      }
      
      // Verifica se a resposta é um erro do edge function
      if (typeof htmlData === 'string') {
        const errorData = JSON.parse(htmlData);
        if (!errorData.success) {
          throw new Error(`Erro ao enviar HTML: ${errorData.error || errorData.message}`);
        }
      } else if (htmlData && !htmlData.success) {
        throw new Error(`Erro ao enviar HTML: ${htmlData.error || htmlData.message}`);
      }
      
      console.log('HTML enviado com sucesso');
      setEmails(prev => prev.map((e, i) => i === index ? {
        ...e,
        status: 'completed'
      } : e));
      toast({
        title: "Sucesso",
        description: `Email "${email.name}" enviado para o Marketing Cloud.`
      });
    } catch (error: any) {
      console.error('Erro ao enviar para MC:', error);
      setEmails(prev => prev.map((e, i) => i === index ? {
        ...e,
        status: 'error'
      } : e));
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const copyHtml = (html: string, name: string) => {
    navigator.clipboard.writeText(html);
    toast({
      title: "Copiado",
      description: `HTML do email "${name}" copiado para a área de transferência.`
    });
  };
  const downloadHtml = (html: string, name: string) => {
    const blob = new Blob([html], {
      type: 'text/html'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PromoBar />
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Efimail</h1>
              <p className="text-muted-foreground my-[20px]">
                Processe e envie templates de email do Emailify para o Marketing Cloud
              </p>
            </div>

            {emails.length === 0 && <Card className="p-8 py-[49px] my-[40px]">
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="font-medium text-[00809d] text-[#008eaf]">Selecione um arquivo .zip</span>
                      <span className="text-muted-foreground"> ou arraste aqui</span>
                    </label>
                    <input id="file-upload" type="file" accept=".zip" onChange={handleFileChange} className="hidden" />
                    {file && <p className="mt-4 text-sm text-foreground">
                        Arquivo selecionado: <strong className="bg-gray-500 rounded-2xl">{file.name}</strong>
                      </p>}
                  </div>

                  <div className="flex items-center space-x-2 py-[22px]">
                    <Checkbox id="branding" checked={addBranding} onCheckedChange={checked => setAddBranding(checked as boolean)} />
                    <label htmlFor="branding" className="cursor-pointer text-base text-gray-300">
                      Adicionar cabeçalho e rodapé da Efí
                    </label>
                  </div>

                  <Button onClick={processZipFile} disabled={!file || processing} size="lg" className="w-full bg-cyan-600 hover:bg-cyan-500 bg-[00809dc]">
                    {processing ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </> : 'Continuar'}
                  </Button>
                </div>
              </Card>}

            {emails.length > 0 && <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Emails Processados</h2>
                  <Button variant="outline" onClick={() => setEmails([])}>
                    Novo Upload
                  </Button>
                </div>

                {emails.map((email, index) => <Card key={index} className="p-6">
                    <div className="flex gap-6">
                      <div className="w-32 h-32 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-4xl">📧</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="text-xl font-bold">{email.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          <strong>Assunto:</strong> {email.subject}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Pré-cabeçalho:</strong> {email.preheader}
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => sendToMarketingCloud(email, index)} disabled={email.status === 'uploading' || email.status === 'completed'}>
                            {email.status === 'uploading' ? <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                              </> : email.status === 'completed' ? 'Enviado ✓' : <>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar para Marketing Cloud
                              </>}
                          </Button>
                          <Button variant="outline" onClick={() => copyHtml(email.html, email.name)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar HTML
                          </Button>
                          <Button variant="outline" onClick={() => downloadHtml(email.html, email.name)}>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar HTML
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>)}
              </div>}
          </div>
        </main>
      </div>
    </div>;
};
export default Efimail;

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { receiptId } = JSON.parse(event.body || '{}');

    if (!receiptId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing receiptId' }),
      };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: receiptError?.message || 'Receipt not found',
        }),
      };
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('Receipts')
      .download(receipt.file_path);

    if (downloadError || !fileBlob) {
      await supabase
        .from('receipts')
        .update({
          send_error: downloadError?.message || 'Could not download receipt file',
        })
        .eq('id', receiptId);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: downloadError?.message || 'Could not download receipt file',
        }),
      };
    }

    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.QUICKBOOKS_RECEIPT_EMAIL,
      subject: 'Receipt',
text: receipt.memo || 'Receipt attached.',
attachments: [
  {
    filename: receipt.file_name || 'receipt.jpg',
    content: fileBuffer,
    contentType: 'image/jpeg',
  },
],
    });

    await supabase
      .from('receipts')
      .update({
        sent_to_email: process.env.QUICKBOOKS_RECEIPT_EMAIL,
        sent_at: new Date().toISOString(),
        send_error: null,
      })
      .eq('id', receiptId);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
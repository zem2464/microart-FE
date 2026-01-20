import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import QRCode from 'qrcode';
import { font } from '../fonts/Noto_Sans/NotoSans.base64.js';
import { boldFont } from '../fonts/Noto_Sans/NotoSans-bold.js';

const BRAND_COLORS = {
  primary: '#667eea',
  primaryDark: '#4c51bf',
  accent: '#f6f8ff',
  text: '#1f2a44',
};

const COMPANY_DETAILS = {
  name: 'The Image Care',
  contactName: 'Rohit Ramani',
  address:
    '204 MBC, Meridian Business Centre, Lajamni Chowk, opposite Opera Business Center, Shanti Niketan Society, Mota Varachha, Surat, Gujarat 394105',
  phone: '+91 9904530103',
  upiId: 'asmitaramani99@okhdfcbank',
  bank: {
    bankName: 'HDFC',
    accountName: 'ASHMITABEN RAMANI',
    accountNumber: '50100088829930',
    ifsc: 'HDFC0001684',
  },
};

// Build normalized client details with broad fallbacks so Bill To always renders
const buildClientDetails = (quoteData) => {
  const fallbackClient = quoteData?.project?.client || {};
  const client = quoteData?.client || fallbackClient;

  const name =
    client.companyName ||
    client.displayName ||
    client.name ||
    quoteData?.clientName ||
    `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
    `${fallbackClient.firstName || ''} ${fallbackClient.lastName || ''}`.trim() ||
    '—';

  const code =
    client.clientCode ||
    quoteData?.clientCode ||
    fallbackClient.clientCode ||
    quoteData?.project?.clientCode ||
    '—';

  const phone =
    client.phone ||
    client.mobile ||
    client.contactNoWork ||
    client.contactNoPersonal ||
    quoteData?.clientPhone ||
    fallbackClient.mobile ||
    fallbackClient.phone;

  const email = client.email || quoteData?.clientEmail || fallbackClient.email;
  const pan = client.panCard || fallbackClient.panCard;

  const address =
    client.address ||
    quoteData?.billingAddress ||
    fallbackClient.address ||
    quoteData?.project?.billingAddress;

  const city =
    client.city?.name ||
    quoteData?.billingCity ||
    fallbackClient.city?.name ||
    quoteData?.project?.client?.city?.name;

  const state =
    client.state?.name ||
    quoteData?.billingState ||
    fallbackClient.state?.name ||
    quoteData?.project?.client?.state?.name;

  const pincode =
    client.pincode ||
    quoteData?.billingPincode ||
    fallbackClient.pincode ||
    quoteData?.project?.client?.pincode;

  const addressLines = [];
  if (address) addressLines.push(address);
  const locality = [city, state].filter(Boolean).join(', ');
  if (locality) addressLines.push(locality);
  if (pincode) addressLines.push(`PIN: ${pincode}`);

  return { name, code, phone, email, pan, addressLines };
};

const sanitizeFileName = (value = '') =>
  value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Simple helper to fetch and inline a public asset
const loadImageAsDataURL = async (path) => {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error loading image', path, err);
    return null;
  }
};

// Generate UPI QR code dynamically; keep amount editable unless locked explicitly
const generateUPIQR = async (amount, lockAmount = false) => {
  const payable = Number.isFinite(Number(amount)) ? Math.max(Number(amount), 0) : 0;
  const formattedAmount = payable > 0 ? payable.toFixed(2) : null;

  const queryParts = [
    `pa=${COMPANY_DETAILS.upiId}`,
    `pn=${COMPANY_DETAILS.name.replace(/ /g, '%20')}`,
    'tn=Invoice',
  ];

  // Only lock the amount if explicitly requested; default keeps it editable in UPI apps
  if (lockAmount && formattedAmount) {
    queryParts.push(`am=${formattedAmount}`, 'cu=INR');
  }

  const upiString = `upi://pay?${queryParts.join('&')}`;
  try {
    return await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return null;
  }
};

export const generateQuotationPDF = async (quoteData) => {
  const logoPng = await loadImageAsDataURL(`${window.location.origin}/assets/icon.png`);
  const clientDetails = buildClientDetails(quoteData);
  const doc = new jsPDF();

  // Embed fonts for consistent currency and typography
  doc.addFileToVFS('NotoSans-Regular.ttf', font);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', boldFont);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 8;

  // Header
  if (logoPng) {
    const logoSize = 26;
    const logoX = (pageWidth - logoSize) / 2;
    doc.addImage(logoPng, 'PNG', logoX, yPos, logoSize, logoSize);
  }

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(BRAND_COLORS.primary);
  doc.text('QUOTATION', pageWidth / 2, yPos + 22, { align: 'center' });

  yPos += 26;

  // Company (left) and client (right)
  doc.setFontSize(11);
  doc.setTextColor(BRAND_COLORS.text);
  doc.text(COMPANY_DETAILS.name, 10, yPos);
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  const addressLines = doc.splitTextToSize(COMPANY_DETAILS.address, pageWidth / 2 - 14);
  let leftBlockY = yPos + 5;
  addressLines.forEach((line, idx) => {
    doc.text(line, 10, leftBlockY + idx * 5);
  });
  leftBlockY += addressLines.length * 5;
  doc.text(`Phone: ${COMPANY_DETAILS.phone}`, 10, leftBlockY + 5);
  doc.text(`Contact: ${COMPANY_DETAILS.contactName}`, 10, leftBlockY + 10);
  doc.text(`UPI: ${COMPANY_DETAILS.upiId}`, 10, leftBlockY + 15);

  const rightX = pageWidth / 2 + 10;
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(BRAND_COLORS.text);
  doc.text(clientDetails.name, rightX, yPos + 5);
  doc.text(`Client Code: ${clientDetails.code}`, rightX, yPos + 10);

  let clientLineY = yPos + 15;
  if (clientDetails.addressLines.length) {
    clientDetails.addressLines.forEach((line) => {
      doc.text(line, rightX, clientLineY);
      clientLineY += 5;
    });
  }
  if (clientDetails.pan) {
    doc.text(`PAN: ${clientDetails.pan}`, rightX, clientLineY);
    clientLineY += 5;
  }
  if (clientDetails.phone) {
    doc.text(`Phone: ${clientDetails.phone}`, rightX, clientLineY);
    clientLineY += 5;
  }
  if (clientDetails.email) {
    doc.text(`Email: ${clientDetails.email}`, rightX, clientLineY);
    clientLineY += 5;
  }

  const leftBlockHeight = leftBlockY + 20 - yPos;
  const rightBlockHeight = 35;
  yPos += Math.max(leftBlockHeight, rightBlockHeight);

  // Quote meta box - single row with project info
  const detailsBoxHeight = 10;
  const col1X = 10;
  const col2X = 60;
  const col3X = 110;
  const col4X = 140;
  const detailsY = yPos;

  // Labels
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(BRAND_COLORS.text);
  doc.text('Quote No.', col1X, detailsY + 2);
  doc.text('Date', col2X, detailsY + 2);
  doc.text('Valid Until', col3X, detailsY + 2);
  doc.text('Proj Code', col4X, detailsY + 2);
  doc.text('Proj Name', col4X + 28, detailsY + 2);

  // Values
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.primaryDark);
  doc.text(quoteData?.quoteNumber || 'N/A', col1X, detailsY + 7);
  doc.text(dayjs(quoteData?.quoteDate || new Date()).format('DD MMM YY'), col2X, detailsY + 7);
  doc.text(
    quoteData?.validUntil
      ? dayjs(quoteData.validUntil).format('DD MMM YY')
      : 'N/A',
    col3X,
    detailsY + 7
  );

  const projectCode = quoteData?.project?.projectCode || 'N/A';
  const projectName = quoteData?.project?.name || quoteData?.project?.description || 'N/A';
  doc.text(projectCode, col4X, detailsY + 7);
  
  doc.setFontSize(8);
  const projNameShort = projectName.length > 25 ? projectName.substring(0, 22) + '...' : projectName;
  doc.text(projNameShort, col4X + 28, detailsY + 7);

  yPos += detailsBoxHeight + 1;

  // Services table
  const tableData = (quoteData?.items || []).map((item, idx) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.rate || 0);
    const amount = Number(item.amount || qty * rate || 0);
    return [
      idx + 1,
      item.description || 'Service',
      qty,
      `₹${rate.toFixed(2)}`,
      `₹${amount.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      font: 'NotoSans',
      cellPadding: 2
    },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      font: 'NotoSans',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 10, right: 10 },
  });

  yPos = doc.lastAutoTable.finalY + 5;

  // Totals
  const totals = [];
  const subtotal = Number(quoteData?.subtotal || 0);
  const discountAmount = Number(quoteData?.discountAmount || 0);
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const taxAmount = Number(quoteData?.taxAmount || 0);
  const totalAmount = Number(quoteData?.totalAmount || subtotal - discountAmount + taxAmount || 0);

  // Generate QR only after we know the payable amount
  const qrPayableAmount = Math.max(totalAmount, 0);
  const upiQRCode = await generateUPIQR(qrPayableAmount, false);

  totals.push(['Subtotal:', `₹${subtotal.toFixed(2)}`]);
  if (discountAmount > 0) {
    totals.push(['Discount:', `-₹${discountAmount.toFixed(2)}`]);
  }
  totals.push(['Grand Total:', `₹${totalAmount.toFixed(2)}`]);

  autoTable(doc, {
    startY: yPos,
    body: totals,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      font: 'NotoSans',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'right', cellWidth: 35, fontStyle: 'normal' },
      1: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    margin: { left: pageWidth - 78 },
    didParseCell: (data) => {
      if (data.row.index === totals.length - 1) {
        data.cell.styles.fontSize = 10;
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Payment info
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.text);
  doc.text('Payment Details:', 10, yPos);

  let paymentY = yPos + 5;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(BRAND_COLORS.text);
  const paymentLines = [
    `Bank: ${COMPANY_DETAILS.bank.bankName}`,
    `A/C Name: ${COMPANY_DETAILS.bank.accountName}`,
    `A/C No: ${COMPANY_DETAILS.bank.accountNumber}`,
    `IFSC: ${COMPANY_DETAILS.bank.ifsc}`,
    `UPI: ${COMPANY_DETAILS.upiId}`,
  ];
  paymentLines.forEach((line) => {
    doc.text(line, 10, paymentY);
    paymentY += 5;
  });

  // Add QR code if generated successfully
  if (upiQRCode) {
    const qrSize = 40;
    const qrX = pageWidth - qrSize - 20;
    doc.addImage(upiQRCode, 'PNG', qrX, yPos, qrSize, qrSize);
    doc.setFontSize(7);
    const amountLabel = qrPayableAmount > 0
      ? `Scan to pay ₹${qrPayableAmount.toFixed(2)}`
      : 'Scan to pay';
    doc.text(amountLabel, qrX + qrSize / 2, yPos + qrSize + 5, { align: 'center' });
    paymentY = Math.max(paymentY, yPos + qrSize + 10);
  }

  yPos = paymentY + 3;

  // Amount in words
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'italic');
  doc.setTextColor(BRAND_COLORS.text);
  const amountInWords = numberToWords(totalAmount);
  doc.text(`Amount in Words: ${amountInWords} Rupees Only`, 10, yPos);
  yPos += 8;

  // Notes
  if (yPos > pageHeight - 65) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.text);
  doc.text('Notes:', 10, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(BRAND_COLORS.text);
  const notes = quoteData?.notes || 'This quotation is generated on request and is subject to change upon project updates.';
  const notesLines = doc.splitTextToSize(notes, pageWidth - 20);
  doc.text(notesLines, 10, yPos);

  // Footer
  const footerY = pageHeight - 30;
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.text);
  doc.text(`For ${COMPANY_DETAILS.name}`, pageWidth - 50, footerY);
  doc.line(pageWidth - 65, footerY + 15, pageWidth - 15, footerY + 15);
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.text('Authorized Signatory', pageWidth - 50, footerY + 22);

  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text('This is a system generated quotation.', pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(
    `Generated on: ${dayjs().format('DD MMM YYYY, HH:mm')}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  const fileProjectCode = quoteData?.project?.projectCode || 'Project';
  const fileProjectName = quoteData?.project?.name || quoteData?.project?.description || 'Quotation';
  const totalLabel = Number.isFinite(totalAmount) ? Math.round(totalAmount) : '0';
  const fileName = `${sanitizeFileName(fileProjectCode)} ${sanitizeFileName(fileProjectName)} ₹${totalLabel}`;
  doc.save(`${fileName}.pdf`);
};

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (Number.isNaN(num) || num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;

  let words = '';

  if (crore > 0) {
    words += convertTwoDigit(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigit(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigit(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += ones[hundred] + ' Hundred ';
  }
  if (num > 0) {
    words += convertTwoDigit(num);
  }

  return words.trim();

  function convertTwoDigit(n) {
    if (n < 10) return ones[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
  }
};

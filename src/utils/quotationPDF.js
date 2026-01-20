import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import QRCode from 'qrcode';
import { font } from '../fonts/Noto_Sans/NotoSans.base64.js';
import { boldFont } from '../fonts/Noto_Sans/NotoSans-bold.js';

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

const sanitizeFileName = (value = '') =>
  value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Generate UPI QR code dynamically
const generateUPIQR = async () => {
  const upiString = `upi://pay?pa=${COMPANY_DETAILS.upiId}&pn=${COMPANY_DETAILS.name.replace(/ /g, '%20')}&tn=Invoice`;
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
  // Generate QR code
  const upiQRCode = await generateUPIQR();
  
  const doc = new jsPDF();

  // Embed fonts for consistent currency and typography
  doc.addFileToVFS('NotoSans-Regular.ttf', font);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', boldFont);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text('QUOTATION', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Company (left) and client (right)
  doc.setFontSize(11);
  doc.text(COMPANY_DETAILS.name, 15, yPos);
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  const addressLines = doc.splitTextToSize(COMPANY_DETAILS.address, pageWidth / 2 - 20);
  let leftBlockY = yPos + 5;
  addressLines.forEach((line, idx) => {
    doc.text(line, 15, leftBlockY + idx * 5);
  });
  leftBlockY += addressLines.length * 5;
  doc.text(`Phone: ${COMPANY_DETAILS.phone}`, 15, leftBlockY + 5);
  doc.text(`Contact: ${COMPANY_DETAILS.contactName}`, 15, leftBlockY + 10);
  doc.text(`UPI: ${COMPANY_DETAILS.upiId}`, 15, leftBlockY + 15);

  const rightX = pageWidth / 2 + 10;
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text('Quote For:', rightX, yPos);

  doc.setFont('NotoSans', 'normal');
  const clientName = quoteData?.client?.companyName ||
    `${quoteData?.client?.firstName || ''} ${quoteData?.client?.lastName || ''}`.trim() ||
    quoteData?.client?.displayName || 'N/A';
  doc.text(clientName, rightX, yPos + 5);
  doc.text(`Client Code: ${quoteData?.client?.clientCode || 'N/A'}`, rightX, yPos + 10);
  if (quoteData?.client?.mobile) {
    doc.text(`Phone: ${quoteData.client.mobile}`, rightX, yPos + 15);
  }
  if (quoteData?.client?.email) {
    doc.text(`Email: ${quoteData.client.email}`, rightX, yPos + 20);
  }

  const leftBlockHeight = leftBlockY + 20 - yPos;
  const rightBlockHeight = 35;
  yPos += Math.max(leftBlockHeight, rightBlockHeight);

  // Quote meta box
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.rect(15, yPos, pageWidth - 30, 20);
  const col2X = pageWidth / 3;
  const col3X = (pageWidth / 3) * 2;
  doc.line(col2X, yPos, col2X, yPos + 20);
  doc.line(col3X, yPos, col3X, yPos + 20);

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Quote Number', 20, yPos + 7);
  doc.text('Quote Date', col2X + 5, yPos + 7);
  doc.text('Valid Until', col3X + 5, yPos + 7);

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
  doc.text(quoteData?.quoteNumber || 'N/A', 20, yPos + 14);
  doc.text(dayjs(quoteData?.quoteDate || new Date()).format('DD MMM YYYY'), col2X + 5, yPos + 14);
  doc.text(
    quoteData?.validUntil
      ? dayjs(quoteData.validUntil).format('DD MMM YYYY')
      : 'N/A',
    col3X + 5,
    yPos + 14
  );

  yPos += 25;

  // Project details
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(80);
  const projectLine = `Project Code: ${quoteData?.project?.projectCode || 'N/A'} | ${quoteData?.project?.name || quoteData?.project?.description || ''}`;
  doc.text(projectLine, 15, yPos);
  yPos += 8;

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
      fontSize: 9,
      font: 'NotoSans',
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontSize: 10,
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
    margin: { left: 15, right: 15 },
  });

  yPos = doc.lastAutoTable.finalY + 5;

  // Totals
  const totals = [];
  const subtotal = Number(quoteData?.subtotal || 0);
  const discountAmount = Number(quoteData?.discountAmount || 0);
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const taxAmount = Number(quoteData?.taxAmount || 0);
  const totalAmount = Number(quoteData?.totalAmount || subtotal - discountAmount + taxAmount || 0);

  totals.push(['Subtotal:', `₹${subtotal.toFixed(2)}`]);
  if (discountAmount > 0) {
    totals.push(['Discount:', `-₹${discountAmount.toFixed(2)}`]);
  }
  const taxLabel = quoteData?.taxRate ? `Tax (${quoteData.taxRate}%)` : 'Tax';
  totals.push([`${taxLabel}:`, `₹${taxAmount.toFixed(2)}`]);
  totals.push(['Grand Total:', `₹${totalAmount.toFixed(2)}`]);

  autoTable(doc, {
    startY: yPos,
    body: totals,
    theme: 'plain',
    styles: {
      fontSize: 9,
      font: 'NotoSans',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'right', cellWidth: 35, fontStyle: 'normal' },
      1: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    margin: { left: pageWidth - 85 },
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
  doc.setTextColor(40);
  doc.text('Payment Details:', 15, yPos);

  let paymentY = yPos + 5;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(80);
  const paymentLines = [
    `Bank: ${COMPANY_DETAILS.bank.bankName}`,
    `A/C Name: ${COMPANY_DETAILS.bank.accountName}`,
    `A/C No: ${COMPANY_DETAILS.bank.accountNumber}`,
    `IFSC: ${COMPANY_DETAILS.bank.ifsc}`,
    `UPI: ${COMPANY_DETAILS.upiId}`,
  ];
  paymentLines.forEach((line) => {
    doc.text(line, 15, paymentY);
    paymentY += 5;
  });

  // Add QR code if generated successfully
  if (upiQRCode) {
    const qrSize = 40;
    const qrX = pageWidth - qrSize - 20;
    doc.addImage(upiQRCode, 'PNG', qrX, yPos, qrSize, qrSize);
    doc.setFontSize(7);
    doc.text('Scan to pay', qrX + qrSize / 2, yPos + qrSize + 5, { align: 'center' });
    paymentY = Math.max(paymentY, yPos + qrSize + 10);
  }

  yPos = paymentY + 3;

  // Amount in words
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'italic');
  doc.setTextColor(80);
  const amountInWords = numberToWords(totalAmount);
  doc.text(`Amount in Words: ${amountInWords} Rupees Only`, 15, yPos);
  yPos += 8;

  // Notes
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
  doc.text('Notes:', 15, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(80);
  const notes = quoteData?.notes || 'This quotation is generated on request and is subject to change upon project updates.';
  const notesLines = doc.splitTextToSize(notes, pageWidth - 30);
  doc.text(notesLines, 15, yPos);

  // Footer
  const footerY = pageHeight - 30;
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
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

  const projectCode = quoteData?.project?.projectCode || 'Project';
  const projectName = quoteData?.project?.name || quoteData?.project?.description || 'Quotation';
  const totalLabel = Number.isFinite(totalAmount) ? Math.round(totalAmount) : '0';
  const fileName = `${sanitizeFileName(projectCode)} ${sanitizeFileName(projectName)} ₹${totalLabel}`;
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

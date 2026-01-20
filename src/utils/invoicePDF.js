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

export const generateInvoicePDF = async (invoiceData) => {
  // Generate QR code
  const upiQRCode = await generateUPIQR();
  
  const doc = new jsPDF();

  // Add Noto Sans fonts for proper rupee symbol rendering
  doc.addFileToVFS('NotoSans-Regular.ttf', font);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', boldFont);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 20;

  // ===== HEADER - TAX INVOICE =====
  doc.setFontSize(18);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
  doc.text('TAX INVOICE', pageWidth / 2, yPos, { align: 'center' });

  yPos += 10;

  // ===== COMPANY AND CLIENT INFO =====
  // Left side - Company details
  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
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

  // Right side - Bill To
  const rightX = pageWidth / 2 + 10;
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text('Bill To:', rightX, yPos);

  doc.setFont('NotoSans', 'normal');
  const clientName = invoiceData.client?.companyName ||
    `${invoiceData.client?.firstName || ''} ${invoiceData.client?.lastName || ''}`.trim() ||
    invoiceData.client?.displayName || 'N/A';
  doc.text(clientName, rightX, yPos + 5);
  doc.text(`Client Code: ${invoiceData.client?.clientCode || 'N/A'}`, rightX, yPos + 10);

  if (invoiceData.client?.mobile) {
    doc.text(`Phone: ${invoiceData.client.mobile}`, rightX, yPos + 15);
  }
  if (invoiceData.client?.email) {
    doc.text(`Email: ${invoiceData.client.email}`, rightX, yPos + 20);
  }

  const leftBlockHeight = leftBlockY + 20 - yPos;
  const rightBlockHeight = 35;
  yPos += Math.max(leftBlockHeight, rightBlockHeight);

  // ===== INVOICE DETAILS BOX =====
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.rect(15, yPos, pageWidth - 30, 20);

  // Draw vertical dividers
  const col1X = 15;
  const col2X = pageWidth / 3;
  const col3X = (pageWidth / 3) * 2;

  doc.line(col2X, yPos, col2X, yPos + 20);
  doc.line(col3X, yPos, col3X, yPos + 20);

  doc.setFontSize(8);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(100);
  doc.text('Invoice Number', col1X + 5, yPos + 7);
  doc.text('Invoice Date', col2X + 5, yPos + 7);
  doc.text('Due Date', col3X + 5, yPos + 7);

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
  doc.text(invoiceData.invoiceNumber, col1X + 5, yPos + 14);
  doc.text(dayjs(invoiceData.invoiceDate).format('DD MMM YYYY'), col2X + 5, yPos + 14);
  doc.text(dayjs(invoiceData.dueDate).format('DD MMM YYYY'), col3X + 5, yPos + 14);

  yPos += 25;

  // Project details line
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(80);
  doc.text(`Project Code: ${invoiceData.project?.projectCode || 'N/A'} | ${invoiceData.project?.name || invoiceData.project?.description || ''}`, 15, yPos);

  yPos += 8;

  // ===== SERVICE DETAILS TABLE =====
  const tableData = [];
  if (invoiceData.project?.projectGradings?.length > 0) {
    invoiceData.project.projectGradings.forEach((grading, index) => {
      const quantity = grading.imageQuantity || 0;
      const rate = (grading.customRate !== undefined && grading.customRate !== null)
        ? grading.customRate
        : (grading.grading?.defaultRate ?? 0);
      const amount = quantity * rate;

      tableData.push([
        index + 1,
        grading.grading?.name + " (" + grading.grading?.shortCode + ")" || 'Service',
        quantity,
        `₹${rate.toFixed(2)}`,
        `₹${amount.toFixed(2)}`
      ]);
    });
  } else {
    tableData.push([
      1,
      invoiceData.project?.name || 'Photo Editing Services',
      invoiceData.imageQuantityInvoiced || 0,
      `₹${(invoiceData.ratePerImage || 0).toFixed(2)}`,
      `₹${(invoiceData.subtotalAmount || 0).toFixed(2)}`
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      font: 'NotoSans',
      cellPadding: 3
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      font: 'NotoSans',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35 }
    },
    margin: { left: 15, right: 15 }
  });

  yPos = doc.lastAutoTable.finalY + 5;

  // ===== TOTALS SECTION =====
  const totalsBoxX = pageWidth - 85;
  const totalsBoxWidth = 70;

  // Draw totals box
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);

  const totalsData = [
    ['Subtotal:', `₹${(invoiceData.subtotalAmount || 0).toFixed(2)}`],
  ];

  if (invoiceData.discountAmount && invoiceData.discountAmount > 0) {
    totalsData.push(['Discount:', `-₹${invoiceData.discountAmount.toFixed(2)}`]);
  }

  totalsData.push(['Tax (GST):', `₹${(invoiceData.taxAmount || 0).toFixed(2)}`]);
  totalsData.push(['Total Amount:', `₹${(invoiceData.totalAmount || 0).toFixed(2)}`]);
  totalsData.push(['Paid Amount:', `₹${(invoiceData.paidAmount || 0).toFixed(2)}`]);
  totalsData.push(['Balance Due:', `₹${(invoiceData.balanceAmount || 0).toFixed(2)}`]);

  autoTable(doc, {
    startY: yPos,
    body: totalsData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      font: 'NotoSans',
      cellPadding: 2
    },
    columnStyles: {
      0: { halign: 'right', cellWidth: 35, fontStyle: 'normal' },
      1: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
    },
    margin: { left: totalsBoxX },
    didParseCell: function (data) {
      // Get the row content to identify which row we're in
      const cellContent = data.cell.text ? data.cell.text[0] : '';
      
      // Highlight total and balance rows
      if (cellContent.includes('Total Amount:') || cellContent.includes('Balance Due:')) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
      }
      
      // Color code paid and balance
      if (cellContent.includes('Balance Due:')) {
        data.cell.styles.textColor = [220, 53, 69]; // Red
      }
      if (cellContent.includes('Paid Amount:')) {
        data.cell.styles.textColor = [82, 196, 26]; // Green
      }
    }
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // ===== PAYMENT INSTRUCTIONS =====
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
  doc.text('Payment Instructions:', 15, yPos);

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

  // ===== AMOUNT IN WORDS =====
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'italic');
  doc.setTextColor(80);
  const amountInWords = numberToWords(invoiceData.totalAmount || 0);
  doc.text(`Amount in Words: ${amountInWords} Rupees Only`, 15, yPos);

  yPos += 8;

  // ===== PAYMENTS RECEIVED (if allocations exist) =====
  if (invoiceData.allocations && invoiceData.allocations.length > 0) {
    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(40);
    doc.text('Payments Received:', 15, yPos);

    yPos += 5;

    const paymentData = invoiceData.allocations.map((allocation, index) => [
      index + 1,
      allocation.payment?.paymentNumber || 'N/A',
      dayjs(allocation.payment?.paymentDate).format('DD MMM YYYY'),
      allocation.payment?.paymentType?.name || 'N/A',
      `₹${allocation.allocatedAmount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Payment No.', 'Date', 'Method', 'Amount']],
      body: paymentData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        font: 'NotoSans',
        cellPadding: 2
      },
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        font: 'NotoSans'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'left', cellWidth: 40 },
        4: { halign: 'right', cellWidth: 25 }
      },
      margin: { left: 15, right: 15 }
    });

    yPos = doc.lastAutoTable.finalY + 8;
  }

  // ===== TERMS & CONDITIONS =====
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
  doc.text('Terms & Conditions:', 15, yPos);

  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(80);

  const terms = [
    '• Payment is due within the specified due date.',
    '• Late payments may incur additional charges.',
    '• All disputes are subject to local jurisdiction.',
    '• Goods once sold will not be taken back or exchanged.'
  ];

  terms.forEach(term => {
    doc.text(term, 15, yPos);
    yPos += 5;
  });

  // ===== FOOTER =====
  yPos = pageHeight - 35;

  // Signature section
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
  doc.text(`For ${COMPANY_DETAILS.name}`, pageWidth - 50, yPos);

  yPos += 15;
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 65, yPos, pageWidth - 15, yPos);

  yPos += 5;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.text('Authorized Signatory', pageWidth - 50, yPos);

  // Bottom footer
  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text(
    'This is a computer generated invoice and does not require a signature.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  doc.text(
    `Generated on: ${dayjs().format('DD MMM YYYY, HH:mm')}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  // Save PDF
  const projectCode = invoiceData.project?.projectCode || invoiceData.invoiceNumber || 'Invoice';
  const projectName = invoiceData.project?.name || invoiceData.project?.description || 'Invoice';
  const totalValue = Math.round(Number(invoiceData.totalAmount || 0));
  const totalLabel = Number.isFinite(totalValue) ? totalValue : '0';
  const fileName = `${sanitizeFileName(projectCode)} ${sanitizeFileName(projectName)} ₹${totalLabel}`;
  doc.save(`${fileName}.pdf`);
};

// Helper function to convert number to words (Indian system)
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

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

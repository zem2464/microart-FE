import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import QRCode from 'qrcode';
import { font } from '../fonts/Noto_Sans/NotoSans.base64.js';
import { boldFont } from '../fonts/Noto_Sans/NotoSans-bold.js';

const BRAND_COLORS = {
  primary: '#667eea', // matches logo background
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
const buildClientDetails = (invoiceData) => {
  const fallbackClient = invoiceData.project?.client || {};
  const client = invoiceData.client || fallbackClient;

  const name =
    client.companyName ||
    client.displayName ||
    client.name ||
    invoiceData.clientName ||
    `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
    `${fallbackClient.firstName || ''} ${fallbackClient.lastName || ''}`.trim() ||
    '—';

  const code =
    client.clientCode ||
    invoiceData.clientCode ||
    fallbackClient.clientCode ||
    invoiceData.project?.clientCode ||
    '—';

  const phone =
    client.phone ||
    client.mobile ||
    client.contactNoWork ||
    client.contactNoPersonal ||
    invoiceData.clientPhone ||
    fallbackClient.mobile ||
    fallbackClient.phone;

  const email = client.email || invoiceData.clientEmail || fallbackClient.email;
  const pan = client.panCard || fallbackClient.panCard;

  const address =
    client.address ||
    invoiceData.billingAddress ||
    fallbackClient.address ||
    invoiceData.project?.billingAddress;

  const city =
    client.city?.name ||
    invoiceData.billingCity ||
    fallbackClient.city?.name ||
    invoiceData.project?.client?.city?.name;

  const state =
    client.state?.name ||
    invoiceData.billingState ||
    fallbackClient.state?.name ||
    invoiceData.project?.client?.state?.name;

  const pincode =
    client.pincode ||
    invoiceData.billingPincode ||
    fallbackClient.pincode ||
    invoiceData.project?.client?.pincode;

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
      margin: 0.3,
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
  const payableAmount = Number.isFinite(Number(invoiceData.balanceAmount))
    ? Number(invoiceData.balanceAmount)
    : Number(invoiceData.totalAmount || 0);
  const upiQRCode = await generateUPIQR(payableAmount, false);
  const logoPng = await loadImageAsDataURL(`${window.location.origin}/assets/icon.png`);
  const clientDetails = buildClientDetails(invoiceData);

  const doc = new jsPDF();

  // Add Noto Sans fonts for proper rupee symbol rendering
  doc.addFileToVFS('NotoSans-Regular.ttf', font);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', boldFont);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 8;

  // ===== HEADER - TAX INVOICE =====
  if (logoPng) {
    const logoSize = 26;
    const logoX = (pageWidth - logoSize) / 2;
    doc.addImage(logoPng, 'PNG', logoX, yPos, logoSize, logoSize);
  }

  doc.setFontSize(12);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.primary);
  doc.text('INVOICE', pageWidth / 2, yPos + 22, { align: 'center' });

  yPos += 26;

  // ===== COMPANY AND CLIENT INFO =====
  // Left side - Company details
  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
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

  // Right side - Bill To
  const rightX = pageWidth / 2 + 10;
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text('Bill To:', rightX, yPos);

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

  const leftBlockHeight = leftBlockY + 16 - yPos;
  const rightBlockHeight = 32;
  yPos += Math.max(leftBlockHeight, rightBlockHeight);

  // ===== INVOICE DETAILS BOX =====
  // Single row: Invoice No., Invoice Date, Due Date, Project Code, Project Name
  const detailsBoxHeight = 10;
  const col1X = 10;
  const col2X = 60;
  const col3X = 110;
  const col4X = 140;
  const detailsY = yPos;

  // Labels
  doc.setFontSize(7);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.text);
  doc.text('Invoice No.', col1X, detailsY + 2);
  doc.text('Date', col2X, detailsY + 2);
  doc.text('Due Date', col3X, detailsY + 2);
  doc.text('Proj Code', col4X, detailsY + 2);
  doc.text('Proj Name', col4X + 28, detailsY + 2);

  // Values
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.primaryDark);
  doc.text(invoiceData.invoiceNumber, col1X, detailsY + 7);
  doc.text(dayjs(invoiceData.invoiceDate).format('DD MMM YY'), col2X, detailsY + 7);
  doc.text(dayjs(invoiceData.dueDate).format('DD MMM YY'), col3X, detailsY + 7);
  
  const projectCode = invoiceData.project?.projectCode || 'N/A';
  const projectName = invoiceData.project?.name || invoiceData.project?.description || 'N/A';
  doc.text(projectCode, col4X, detailsY + 7);
  
  doc.setFontSize(8);
  const projNameShort = projectName.length > 25 ? projectName.substring(0, 22) + '...' : projectName;
  doc.text(projNameShort, col4X + 28, detailsY + 7);

  yPos += detailsBoxHeight + 1;

  // ===== SERVICE DETAILS TABLE =====

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
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35 }
    },
    margin: { left: 10, right: 10 }
  });

  yPos = doc.lastAutoTable.finalY + 4;

  // ===== TOTALS SECTION =====
  const totalsBoxX = pageWidth - 76;

  const totalsBoxWidth = 68;

  // Draw totals box
  doc.setDrawColor(BRAND_COLORS.primary);
  doc.setLineWidth(0.5);

  const totalsData = [
    ['Subtotal:', `₹${(invoiceData.subtotalAmount || 0).toFixed(2)}`],
  ];

  if (invoiceData.discountAmount && invoiceData.discountAmount > 0) {
    totalsData.push(['Discount:', `-₹${invoiceData.discountAmount.toFixed(2)}`]);
  }

  totalsData.push(['Total Amount:', `₹${(invoiceData.totalAmount || 0).toFixed(2)}`]);
  totalsData.push(['Paid Amount:', `₹${(invoiceData.paidAmount || 0).toFixed(2)}`]);
  totalsData.push(['Balance Due:', `₹${(invoiceData.balanceAmount || 0).toFixed(2)}`]);

  autoTable(doc, {
    startY: yPos,
    body: totalsData,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
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

  yPos = doc.lastAutoTable.finalY + 6;

  // ===== PAYMENT INSTRUCTIONS =====
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.text);
  doc.text('Payment Instructions:', 10, yPos);

  let paymentY = yPos + 4;
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
    paymentY += 4;
  });

  // Add QR code if generated successfully
  if (upiQRCode) {
    const qrSize = 40;
    const qrX = pageWidth - qrSize - 20;
    doc.addImage(upiQRCode, 'PNG', qrX, yPos, qrSize, qrSize);
    doc.setFontSize(7);
    const amountLabel = Number.isFinite(payableAmount) && payableAmount > 0
      ? `Scan to pay ₹${payableAmount.toFixed(2)}`
      : 'Scan to pay';
    doc.text(amountLabel, qrX + qrSize / 2, yPos + qrSize + 5, { align: 'center' });
    paymentY = Math.max(paymentY, yPos + qrSize + 10);
  }

  yPos = paymentY + 2;

  // ===== AMOUNT IN WORDS =====
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'italic');
  doc.setTextColor(BRAND_COLORS.text);
  const amountInWords = numberToWords(invoiceData.totalAmount || 0);
  doc.text(`Amount in Words: ${amountInWords} Rupees Only`, 10, yPos);

  yPos += 7;

  // ===== PAYMENTS RECEIVED (if allocations exist) =====
  if (invoiceData.allocations && invoiceData.allocations.length > 0) {
    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(BRAND_COLORS.text);
    doc.text('Payments Received:', 10, yPos);

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
      margin: { left: 10, right: 10 }
    });

    yPos = doc.lastAutoTable.finalY + 6;
  }

  // ===== TERMS & CONDITIONS =====
  if (yPos > pageHeight - 55) {
    doc.addPage();
    yPos = 18;
  }

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(40);
  doc.text('Terms & Conditions:', 10, yPos);

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
    doc.text(term, 10, yPos);
    yPos += 5;
  });

  // ===== FOOTER =====
  yPos = pageHeight - 35;

  // Signature section
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(BRAND_COLORS.text);
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
  const fileProjectCode = invoiceData.project?.projectCode || invoiceData.invoiceNumber || 'Invoice';
  const fileProjectName = invoiceData.project?.name || invoiceData.project?.description || 'Invoice';
  const totalValue = Math.round(Number(invoiceData.totalAmount || 0));
  const totalLabel = Number.isFinite(totalValue) ? totalValue : '0';
  const fileName = `${sanitizeFileName(fileProjectCode)} ${sanitizeFileName(fileProjectName)} ₹${totalLabel}`;
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

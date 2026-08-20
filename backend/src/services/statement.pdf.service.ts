import {PDFDocument,StandardFonts,rgb,} from 'pdf-lib';
import { StatementData } from '../types/statements.types';

export const generateStatementPdf = async (
  statement: StatementData,
): Promise<Buffer> => {
  const {
    account,
    from,
    to,
    openingBalance,
    closingBalance,
    transactions: statementTransactions,
  } = statement;

  const pdfDoc = await PDFDocument.create();

  pdfDoc.setTitle(
    `Account Statement - ${account.accountNumber}`,
  );

  pdfDoc.setAuthor('Arth Virtual Banking');

  pdfDoc.setSubject('Bank Account Statement');

  const regularFont = await pdfDoc.embedFont(
    StandardFonts.Helvetica,
  );

  const boldFont = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold,
  );

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;

  let page = pdfDoc.addPage([
    pageWidth,
    pageHeight,
  ]);

  let y = pageHeight - margin;

  const drawText = (
    text: string,
    x: number,
    yPosition: number,
    options: {
      size?: number;
      bold?: boolean;
    } = {},
  ) => {
    page.drawText(text, {
      x,
      y: yPosition,
      size: options.size ?? 10,
      font: options.bold ? boldFont : regularFont,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  const formatMoney = (amount: number) => {
    return `INR ${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  // Header

  drawText(
    'ARTH VIRTUAL BANKING',
    margin,
    y,
    {
      size: 18,
      bold: true,
    },
  );

  y -= 25;

  drawText(
    'ACCOUNT STATEMENT',
    margin,
    y,
    {
      size: 12,
      bold: true,
    },
  );

  y -= 35;

  // Customer and account details

  drawText(
    `Account Holder: ${account.firstName} ${account.lastName}`,
    margin,
    y,
  );

  y -= 16;

  drawText(
    `Account Number: ${account.accountNumber}`,
    margin,
    y,
  );

  y -= 16;

  drawText(
    `Account Type: ${account.accountType}`,
    margin,
    y,
  );

  y -= 16;

  drawText(
    `Currency: ${account.currency}`,
    margin,
    y,
  );

  y -= 16;

  drawText(
    `Statement Period: ${from} to ${to}`,
    margin,
    y,
  );

  y -= 30;

  // Balance summary

  drawText(
    `Opening Balance: ${formatMoney(openingBalance)}`,
    margin,
    y,
    {
      bold: true,
    },
  );

  y -= 18;

  drawText(
    `Closing Balance: ${formatMoney(closingBalance)}`,
    margin,
    y,
    {
      bold: true,
    },
  );

  y -= 30;

  const columns = {
    date: 40,
    reference: 100,
    description: 210,
    debit: 355,
    credit: 425,
    balance: 495,
  };

  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: pageWidth - margin * 2,
      height: 22,
      color: rgb(0.92, 0.94, 0.97),
    });

    drawText('Date', columns.date, y, {
      size: 8,
      bold: true,
    });

    drawText('Reference', columns.reference, y, {
      size: 8,
      bold: true,
    });

    drawText('Description', columns.description, y, {
      size: 8,
      bold: true,
    });

    drawText('Debit', columns.debit, y, {
      size: 8,
      bold: true,
    });

    drawText('Credit', columns.credit, y, {
      size: 8,
      bold: true,
    });

    drawText('Balance', columns.balance, y, {
      size: 8,
      bold: true,
    });

    y -= 25;
  };

  drawTableHeader();

  // Transactions

  for (const transaction of statementTransactions) {
    if (y < 55) {
      page = pdfDoc.addPage([
        pageWidth,
        pageHeight,
      ]);

      y = pageHeight - margin;

      drawText(
        'ARTH VIRTUAL BANKING - ACCOUNT STATEMENT',
        margin,
        y,
        {
          size: 12,
          bold: true,
        },
      );

      y -= 30;

      drawTableHeader();
    }

    drawText(
      formatDate(transaction.createdAt),
      columns.date,
      y,
      { size: 7 },
    );

    drawText(
      transaction.referenceNumber.slice(0, 16),
      columns.reference,
      y,
      { size: 7 },
    );

    drawText(
      transaction.description.slice(0, 25),
      columns.description,
      y,
      { size: 7 },
    );

    drawText(
      transaction.debit > 0
        ? transaction.debit.toFixed(2)
        : '-',
      columns.debit,
      y,
      { size: 7 },
    );

    drawText(
      transaction.credit > 0
        ? transaction.credit.toFixed(2)
        : '-',
      columns.credit,
      y,
      { size: 7 },
    );

    drawText(
      transaction.balance.toFixed(2),
      columns.balance,
      y,
      { size: 7 },
    );

    y -= 18;
  }

  // Closing section

  if (y < 80) {
    page = pdfDoc.addPage([
      pageWidth,
      pageHeight,
    ]);

    y = pageHeight - margin;
  }

  y -= 15;

  page.drawLine({
    start: {
      x: margin,
      y,
    },
    end: {
      x: pageWidth - margin,
      y,
    },
    thickness: 1,
    color: rgb(0.75, 0.75, 0.75),
  });

  y -= 25;

  drawText(
    `Closing Balance: ${formatMoney(closingBalance)}`,
    margin,
    y,
    {
      size: 11,
      bold: true,
    },
  );

  y -= 25;

  drawText(
    'This is a computer-generated statement and does not require a signature.',
    margin,
    y,
    {
      size: 7,
    },
  );

  const pdfBytes = await pdfDoc.save();

  return Buffer.from(pdfBytes);
};
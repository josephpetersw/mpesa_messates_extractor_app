export type ParsedMpesaData = {
  parsed_name: string;
  parsed_number: string;
  transaction_type: 'Sent' | 'Received' | 'Failed' | 'Other';
  amount: number;
};

export function parseMpesaMessage(body: string): ParsedMpesaData {
  let parsed_name = 'Unknown';
  let parsed_number = 'Unknown';
  let transaction_type: 'Sent' | 'Received' | 'Failed' | 'Other' = 'Other';
  let amount = 0;

  try {
    // Check for Sent
    // Example: ... Ksh1,000.00 sent to John Doe 0712345678 on ...
    // Example: ... Ksh1,000.00 paid to M-KOPA ... (Paybill)
    const sentRegex = /Ksh([\d,.]+)\s+(?:sent|paid)\s+to\s+(.+?)(?:\s+(\+?\d{7,}))?\s+on/i;
    const sentMatch = body.match(sentRegex);

    if (sentMatch) {
      amount = parseFloat(sentMatch[1].replace(/,/g, ''));
      parsed_name = sentMatch[2].trim();
      parsed_number = sentMatch[3] ? sentMatch[3].trim() : 'N/A';
      transaction_type = 'Sent';
      return { parsed_name, parsed_number, transaction_type, amount };
    }

    // Check for Received
    // Format 1: ... You have received Ksh500.00 from Jane Doe 0723456789 on ...
    // Format 2: ... Ksh15.00 received from Rehema Example 25400000000. Account Number ...
    const receivedRegex = /(?:received\s+Ksh|Ksh)([\d,.]+)\s+(?:received\s+)?from\s+(.+?)(?:\s+(\+?\d{7,}))?(?:\s+on|\.)/i;
    const receivedMatch = body.match(receivedRegex);

    if (receivedMatch) {
      amount = parseFloat(receivedMatch[1].replace(/,/g, ''));
      parsed_name = receivedMatch[2].trim();
      parsed_number = receivedMatch[3] ? receivedMatch[3].trim() : 'N/A';
      transaction_type = 'Received';
      return { parsed_name, parsed_number, transaction_type, amount };
    }

    // Withdrawal
    // Example: ... Withdraw Ksh500.00 from 123456 - Agent Name on ...
    const withdrawRegex = /Withdraw\s+Ksh([\d,.]+)\s+from\s+(\+?\d+)\s+-\s+(.+?)\s+on/i;
    const withdrawMatch = body.match(withdrawRegex);

    if (withdrawMatch) {
      amount = parseFloat(withdrawMatch[1].replace(/,/g, ''));
      parsed_number = withdrawMatch[2].trim(); // Agent number
      parsed_name = withdrawMatch[3].trim(); // Agent Name
      transaction_type = 'Sent'; // Treat withdrawal as outflow/sent
      return { parsed_name, parsed_number, transaction_type, amount };
    }

    // Failed
    // Example: Transaction failed, M-PESA cannot complete payment of Ksh120.00 to ONETAP TECHNOLOGIES . Please try again shortly.
    // Example: Failed, you have entered the wrong PIN.
    const failedRegex = /Failed|Transaction failed/i;
    if (failedRegex.test(body)) {
      transaction_type = 'Failed';
      const failedAmountMatch = body.match(/Ksh([\d,.]+)/i);
      if (failedAmountMatch) {
        amount = parseFloat(failedAmountMatch[1].replace(/,/g, ''));
      }
      const failedToMatch = body.match(/to\s+(.+?)\s+\./i) || body.match(/to\s+(.+?)\s+Please/i);
      if (failedToMatch) {
        parsed_name = failedToMatch[1].trim();
      } else {
        parsed_name = 'N/A';
      }
      parsed_number = 'N/A';
      return { parsed_name, parsed_number, transaction_type, amount };
    }

  } catch (error) {
    console.warn("Failed to parse message", body, error);
  }

  return { parsed_name, parsed_number, transaction_type, amount };
}

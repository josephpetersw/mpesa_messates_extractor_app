export type ParsedMpesaData = {
  parsed_name: string;
  parsed_number: string;
  transaction_type: 'Sent' | 'Received' | 'Other';
  amount: number;
};

export function parseMpesaMessage(body: string): ParsedMpesaData {
  let parsed_name = 'Unknown';
  let parsed_number = 'Unknown';
  let transaction_type: 'Sent' | 'Received' | 'Other' = 'Other';
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
    // Format 2: ... Ksh15.00 received from REHEMA AWINO 254725086093. Account Number ...
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

  } catch (error) {
    console.warn("Failed to parse message", body, error);
  }

  return { parsed_name, parsed_number, transaction_type, amount };
}

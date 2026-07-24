import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MpesaDbMessage } from '../database/queries';

export async function exportToCsv(messages: MpesaDbMessage[]) {
  const header = 'ID,Name,Number,Type,Amount,Date,Source\n';
  const rows = messages.map(msg => {
    const name = msg.parsed_name ? msg.parsed_name.toUpperCase() : '';
    let number = msg.parsed_number ? msg.parsed_number.trim() : '';
    if (number.startsWith('0')) number = '+254' + number.substring(1);
    else if (number.startsWith('254')) number = '+' + number;
    else if (number && !number.startsWith('+')) number = '+254' + number;
    return `"${msg.sms_id}","${name}","${number}","${msg.transaction_type}","${msg.amount}","${new Date(msg.date).toLocaleString()}","${msg.source}"`;
  }).join('\n');
  
  const csvContent = header + rows;
  const file = new File(Paths.cache, `mpesa_export_${Date.now()}.csv`);
  file.create(); // ensure it exists or create it
  file.write(csvContent);
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export MPESA Messages CSV',
      UTI: 'public.comma-separated-values-text'
    });
  }
}

export async function exportToTxt(messages: MpesaDbMessage[]) {
  const txtContent = messages.map(msg => {
    const name = msg.parsed_name ? msg.parsed_name.toUpperCase() : '';
    let number = msg.parsed_number ? msg.parsed_number.trim() : '';
    if (number.startsWith('0')) number = '+254' + number.substring(1);
    else if (number.startsWith('254')) number = '+' + number;
    else if (number && !number.startsWith('+')) number = '+254' + number;
    return `Date: ${new Date(msg.date).toLocaleString()}\nType: ${msg.transaction_type}\nAmount: Ksh ${msg.amount}\nName: ${name}\nNumber: ${number}\nSource: ${msg.source}\nOriginal SMS:\n${msg.original_body}\n-------------------------\n`;
  }).join('\n');
  
  const file = new File(Paths.cache, `mpesa_export_${Date.now()}.txt`);
  file.create();
  file.write(txtContent);
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      dialogTitle: 'Export MPESA Messages TXT',
      UTI: 'public.plain-text'
    });
  }
}

export async function exportToGoogleContactsCsv(messages: MpesaDbMessage[]) {
  // Use Map to ensure unique numbers
  const uniqueContacts = new Map<string, string>(); // number -> name
  
  messages.forEach(msg => {
    let number = msg.parsed_number ? msg.parsed_number.trim() : '';
    if (!number || number === 'N/A' || number === 'Unknown') return; // Skip empty or invalid numbers
    
    // Strict whitelist: must be a valid Kenyan mobile number
    // Allows formats: 07XX, 01XX, 2547XX, 2541XX, +2547XX, +2541XX
    const isMobileRegex = /^(?:\+254|254|0)?([17]\d{8})$/;
    const match = number.match(isMobileRegex);
    if (!match) return; // Skip account numbers and non-mobile numbers
    
    // Normalize to +254 format using the 9-digit core number captured by the regex
    number = '+254' + match[1];
    
    const name = msg.parsed_name ? msg.parsed_name.toUpperCase() : 'UNKNOWN';
    
    // Filter out common business/bank keywords in the name
    const businessKeywords = ['BANK', 'PLC', 'LTD', 'LIMITED', 'FOR ACCOUNT', 'ACCOUNT', 'ACC', 'PAYBILL', 'TILL', 'C2B', 'B2C'];
    const isBusiness = businessKeywords.some(keyword => name.includes(keyword));
    if (isBusiness) return;
    

    
    // Only set if we don't have it, or if current is UNKNOWN and new one is not
    if (!uniqueContacts.has(number) || (name !== 'UNKNOWN' && uniqueContacts.get(number) === 'UNKNOWN')) {
      uniqueContacts.set(number, name);
    }
  });

  const header = 'Name,Phone\n';
  const rows = Array.from(uniqueContacts.entries()).map(([num, name]) => {
    return `"${name}","${num}"`;
  }).join('\n');
  
  const csvContent = header + rows;
  const file = new File(Paths.cache, `google_contacts_${Date.now()}.csv`);
  file.create();
  file.write(csvContent);
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Google Contacts CSV',
      UTI: 'public.comma-separated-values-text'
    });
  }
}

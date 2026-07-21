import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MpesaDbMessage } from '../database/queries';

export async function exportToCsv(messages: MpesaDbMessage[]) {
  const header = 'ID,Name,Number,Type,Amount,Date,Source\n';
  const rows = messages.map(msg => 
    `"${msg.sms_id}","${msg.parsed_name}","${msg.parsed_number}","${msg.transaction_type}","${msg.amount}","${new Date(msg.date).toLocaleString()}","${msg.source}"`
  ).join('\n');
  
  const csvContent = header + rows;
  const fileUri = `${FileSystem.cacheDirectory}mpesa_export_${Date.now()}.csv`;
  
  await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export MPESA Messages CSV',
      UTI: 'public.comma-separated-values-text'
    });
  }
}

export async function exportToTxt(messages: MpesaDbMessage[]) {
  const txtContent = messages.map(msg => 
    `Date: ${new Date(msg.date).toLocaleString()}\nType: ${msg.transaction_type}\nAmount: Ksh ${msg.amount}\nName: ${msg.parsed_name}\nNumber: ${msg.parsed_number}\nSource: ${msg.source}\nOriginal SMS:\n${msg.original_body}\n-------------------------\n`
  ).join('\n');
  
  const fileUri = `${FileSystem.cacheDirectory}mpesa_export_${Date.now()}.txt`;
  
  await FileSystem.writeAsStringAsync(fileUri, txtContent, { encoding: FileSystem.EncodingType.UTF8 });
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: 'Export MPESA Messages TXT',
      UTI: 'public.plain-text'
    });
  }
}

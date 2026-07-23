import { NativeModule, requireNativeModule } from 'expo';

export type MpesaMessage = {
  id: string;
  address: string;
  date: number;
  body: string;
  type: number;
  source: string;
};

declare class SmsExtractorModule extends NativeModule {
  getMpesaMessages(fromDateMs: number, toDateMs: number): Promise<MpesaMessage[]>;
}
export default requireNativeModule<SmsExtractorModule>('SmsExtractor');

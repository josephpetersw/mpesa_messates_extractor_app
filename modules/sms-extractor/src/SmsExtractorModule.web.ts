import { registerWebModule, NativeModule } from 'expo';

// SmsExtractorModule is not available on the web platform.
class SmsExtractorModule extends NativeModule<{}> {}

export default registerWebModule(SmsExtractorModule, 'SmsExtractorModule');

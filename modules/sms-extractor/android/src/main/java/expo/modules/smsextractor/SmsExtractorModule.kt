package expo.modules.smsextractor

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsExtractorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsExtractor")

    AsyncFunction("getMpesaMessages") { ->
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      
      val mpesaMessages = mutableListOf<Map<String, Any>>()
      val projection = arrayOf("_id", "address", "date", "body", "type")
      
      // Try Phone SMS
      val phoneUri = Uri.parse("content://sms/")
      try {
        context.contentResolver.query(
            phoneUri,
            projection,
            "address = ?", // filter by MPESA
            arrayOf("MPESA"),
            "date DESC"
        )?.use { cursor ->
            val idIndex = cursor.getColumnIndex("_id")
            val addressIndex = cursor.getColumnIndex("address")
            val dateIndex = cursor.getColumnIndex("date")
            val bodyIndex = cursor.getColumnIndex("body")
            val typeIndex = cursor.getColumnIndex("type")
            
            while (cursor.moveToNext()) {
                val map = mutableMapOf<String, Any>()
                map["id"] = cursor.getString(idIndex) ?: ""
                map["address"] = cursor.getString(addressIndex) ?: ""
                map["date"] = cursor.getLong(dateIndex)
                map["body"] = cursor.getString(bodyIndex) ?: ""
                map["type"] = cursor.getInt(typeIndex) // 1 is received, 2 is sent
                map["source"] = "Phone"
                mpesaMessages.add(map)
            }
        }
      } catch (e: Exception) {
          // Handle exception
      }

      // Try SIM SMS
      val simUri = Uri.parse("content://sms/icc")
      try {
        context.contentResolver.query(
            simUri,
            projection,
            "address = ?",
            arrayOf("MPESA"),
            "date DESC"
        )?.use { cursor ->
            val idIndex = cursor.getColumnIndex("_id")
            val addressIndex = cursor.getColumnIndex("address")
            val dateIndex = cursor.getColumnIndex("date")
            val bodyIndex = cursor.getColumnIndex("body")
            val typeIndex = cursor.getColumnIndex("type")
            
            while (cursor.moveToNext()) {
                val map = mutableMapOf<String, Any>()
                map["id"] = cursor.getString(idIndex) ?: ""
                map["address"] = cursor.getString(addressIndex) ?: ""
                map["date"] = cursor.getLong(dateIndex)
                map["body"] = cursor.getString(bodyIndex) ?: ""
                map["type"] = cursor.getInt(typeIndex)
                map["source"] = "SIM"
                mpesaMessages.add(map)
            }
        }
      } catch (e: Exception) {
          // SIM extraction failed or unsupported. Fallback to phone
      }
      
      return@AsyncFunction mpesaMessages
    }
  }
}

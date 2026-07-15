# Configuración Ruleta Nexo Premium en Android Studio (Actualización Nivel Nativo)

Para que el sistema funcione al 100% como una app nativa en tu APK (incluyendo subida de archivos, descarga de leads offline y reproducción automática de video), sigue estos pasos exactos:

## 1. Permisos Modernos (AndroidManifest.xml)
Actualizado para soportar Android 13+ (API 33+) y versiones anteriores.

```xml
<uses-permission android:name="android.permission.INTERNET" />
<!-- Permisos legados para Android 12 o inferior -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<!-- Permisos granulares para Android 13+ (Imágenes y Videos publicitarios) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

## 2. Configuración Core del WebView (MainActivity.java)
Habilita el DOM Storage, y **desactiva el bloqueo de Autoplay** para los Video Ads.

```java
WebView myWebView = findViewById(R.id.webview);
WebSettings webSettings = myWebView.getSettings();

webSettings.setJavaScriptEnabled(true);
webSettings.setDomStorageEnabled(true); // CRÍTICO para LocalStorage y IndexedDB
webSettings.setAllowFileAccess(true);
webSettings.setAllowContentAccess(true);

// CRÍTICO para que los videos publicitarios se reproduzcan automáticamente
webSettings.setMediaPlaybackRequiresUserGesture(false); 
```

## 3. Soporte para Subir Imágenes y Videos (WebChromeClient)
Para que los `<input type="file">` funcionen y abran la galería de Android para la personalización de la app.

```java
// Variable global en tu MainActivity
private ValueCallback<Uri[]> mFilePathCallback;
private final static int FILECHOOSER_RESULTCODE = 1;

// Asignar el WebChromeClient al WebView
myWebView.setWebChromeClient(new WebChromeClient() {
    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
        if (mFilePathCallback != null) {
            mFilePathCallback.onReceiveValue(null);
        }
        mFilePathCallback = filePathCallback;

        Intent intent = fileChooserParams.createIntent();
        try {
            startActivityForResult(intent, FILECHOOSER_RESULTCODE);
        } catch (ActivityNotFoundException e) {
            mFilePathCallback = null;
            return false;
        }
        return true;
    }
});
```

*Nota: Debes sobrescribir `onActivityResult` en tu `MainActivity` para procesar el archivo seleccionado.*
```java
@Override
protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode == FILECHOOSER_RESULTCODE) {
        if (mFilePathCallback == null) return;
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        mFilePathCallback.onReceiveValue(result);
        mFilePathCallback = null;
    }
    super.onActivityResult(requestCode, resultCode, data);
}
```

## 4. Soporte para Descargas Offline (Blobs & Base64)
Como el archivo CSV y las capturas PNG se generan "al vuelo" offline (`blob:`), el `DownloadManager` nativo de Android fallará si no se intercepta. Se debe extraer el archivo mediante un puente JavascriptInterface.

**A. Inyectar Interfaz JS:**
```java
myWebView.addJavascriptInterface(new Object() {
    @JavascriptInterface
    public void saveBase64(String base64, String mimeType, String filename) {
        try {
            String pureBase64Encoded = base64.substring(base64.indexOf(",") + 1);
            byte[] decodedBytes = android.util.Base64.decode(pureBase64Encoded, android.util.Base64.DEFAULT);
            
            java.io.File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            java.io.File file = new java.io.File(path, filename);
            java.io.FileOutputStream os = new java.io.FileOutputStream(file);
            os.write(decodedBytes);
            os.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}, "AndroidDownloader");
```

**B. Interceptar y procesar Blobs en el Listener:**
```java
myWebView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
    if (url.startsWith("blob:")) {
        String filename = "NEXO_Export_" + System.currentTimeMillis() + (mimetype.contains("png") ? ".png" : ".csv");
        myWebView.evaluateJavascript(
            "javascript: var xhr = new XMLHttpRequest();" +
            "xhr.open('GET', '" + url + "', true);" +
            "xhr.responseType = 'blob';" +
            "xhr.onload = function(e) {" +
            "    if (this.status == 200) {" +
            "        var reader = new FileReader();" +
            "        reader.readAsDataURL(this.response);" +
            "        reader.onloadend = function() {" +
            "            AndroidDownloader.saveBase64(reader.result, '" + mimetype + "', '" + filename + "');" +
            "        }" +
            "    }" +
            "};" +
            "xhr.send();", null);
        Toast.makeText(getApplicationContext(), "Archivo procesado y guardado en Descargas", Toast.LENGTH_LONG).show();
    }
});
```

---
**Ruleta Nexo Premium - 100% Native Architecture Ready**
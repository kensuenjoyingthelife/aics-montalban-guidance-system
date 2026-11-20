package com.aics.kalangba;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Privacy (confidential reports): no screenshots / screen recording, and the
        // recent-apps preview shows a blank card instead of the report or chat.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);

        // Ultra-Smooth 60FPS Native Hardware Acceleration & Cache Tuning
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Force Native GPU Hardware Layer
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                
                // Disable overscroll bounce glow for buttery smooth physics
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            }
        } catch (Exception e) {
            // fallback gracefully
        }
    }
}

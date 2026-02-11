/**
 * JUCE WebBrowserComponent JavaScript bridge.
 * Based on the official JUCE framework WebBrowserComponent JS API.
 *
 * Provides:
 * - getNativeFunction(name) — call C++ native functions
 * - getSliderState(name) — bind to JUCE parameter sliders
 * - getBackendResourceAddress(path) — get resource URLs
 */

(function () {
  if (window.__JUCE__) return;

  // Check if we're running inside a JUCE WebBrowserComponent
  const isJuceEnv =
    typeof window.__juce__platform__ !== "undefined" ||
    window.location.protocol === "juce:" ||
    window.location.hostname === "juce.backend";

  if (!isJuceEnv) return;

  const pendingCallbacks = new Map();
  let callbackId = 0;

  function sendToBackend(message) {
    if (window.chrome && window.chrome.webview) {
      // WebView2 (Windows)
      window.chrome.webview.postMessage(JSON.stringify(message));
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.juce) {
      // WebKit (macOS)
      window.webkit.messageHandlers.juce.postMessage(JSON.stringify(message));
    }
  }

  function getNativeFunction(name) {
    return function (...args) {
      return new Promise((resolve) => {
        const id = ++callbackId;
        pendingCallbacks.set(id, resolve);
        sendToBackend({
          type: "nativeFunction",
          name: name,
          args: args,
          callbackId: id,
        });
      });
    };
  }

  // Slider state management for parameter binding
  const sliderStates = new Map();

  function getSliderState(name) {
    if (sliderStates.has(name)) return sliderStates.get(name);

    let currentValue = 0;
    const listeners = new Set();

    const state = {
      getValue() {
        return currentValue;
      },
      setValue(v) {
        currentValue = v;
        sendToBackend({
          type: "sliderValueChanged",
          name: name,
          value: v,
        });
      },
      addListener(cb) {
        listeners.add(cb);
      },
      removeListener(cb) {
        listeners.delete(cb);
      },
      _update(v) {
        currentValue = v;
        listeners.forEach((cb) => cb());
      },
    };

    sliderStates.set(name, state);
    return state;
  }

  function getBackendResourceAddress(path) {
    // Platform-dependent URL scheme
    if (window.location.protocol === "juce:") {
      return `juce://juce.backend/${path}`;
    }
    return `https://juce.backend/${path}`;
  }

  // Handle messages from C++ backend
  function handleBackendMessage(event) {
    let data;
    try {
      data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }

    if (data.type === "nativeFunctionResult" && data.callbackId) {
      const resolve = pendingCallbacks.get(data.callbackId);
      if (resolve) {
        pendingCallbacks.delete(data.callbackId);
        resolve(data.result);
      }
    } else if (data.type === "sliderValueUpdate") {
      const state = sliderStates.get(data.name);
      if (state) state._update(data.value);
    }
  }

  // Listen for messages from backend
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.addEventListener("message", handleBackendMessage);
  }
  window.addEventListener("message", handleBackendMessage);

  window.__JUCE__ = {
    getNativeFunction,
    getSliderState,
    getBackendResourceAddress,
  };
})();

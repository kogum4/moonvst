#include "PluginEditor.h"
#include "UIBinaryData.h"
#include <fstream>
#include <cstring>
#if JUCE_WINDOWS && JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING
 #include <WebView2.h>
 #include <wrl.h>
#endif

namespace
{
void logUi (const char* msg)
{
    const auto path = juce::File::getSpecialLocation (juce::File::tempDirectory)
                          .getChildFile ("webvst_ui.log")
                          .getFullPathName();
    std::ofstream ofs (path.toRawUTF8(), std::ios::app);
    ofs << msg << "\n";
}

void logUi (const juce::String& msg)
{
    logUi (msg.toRawUTF8());
}

juce::String normaliseResourcePath (juce::String path)
{
    path = path.replaceCharacter ('\\', '/').trim();
    while (path.startsWithChar ('/'))
        path = path.substring (1);

    return path.isEmpty() ? "index.html" : path;
}

juce::String getPathBasename (const juce::String& path)
{
    return path.fromLastOccurrenceOf ("/", false, false);
}

juce::String getMimeTypeForPath (const juce::String& path)
{
    const auto ext = path.fromLastOccurrenceOf (".", false, false).toLowerCase();

    if (ext == "html" || ext == "htm")  return "text/html";
    if (ext == "js")                     return "text/javascript";
    if (ext == "css")                    return "text/css";
    if (ext == "json" || ext == "map")   return "application/json";
    if (ext == "wasm")                   return "application/wasm";
    if (ext == "svg")                    return "image/svg+xml";
    if (ext == "png")                    return "image/png";
    if (ext == "jpg" || ext == "jpeg")   return "image/jpeg";
    if (ext == "ico")                    return "image/x-icon";
    if (ext == "woff2")                  return "font/woff2";
    if (ext == "txt")                    return "text/plain";
    return "application/octet-stream";
}

#if JUCE_WINDOWS && JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING
void logWebView2ProbeResult()
{
    HRESULT hr = CreateCoreWebView2EnvironmentWithOptions (
        nullptr,
        nullptr,
        nullptr,
        Microsoft::WRL::Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler> (
            [] (HRESULT, ICoreWebView2Environment*) -> HRESULT { return S_OK; }).Get());

    logUi ("webview:probe_hr=0x" + juce::String::toHexString ((juce::int64) (unsigned long) hr));
}
#endif

class LoggingWebBrowserComponent : public juce::WebBrowserComponent
{
public:
    using juce::WebBrowserComponent::WebBrowserComponent;

    bool pageAboutToLoad (const juce::String& newURL) override
    {
        logUi ("webview:aboutToLoad " + newURL);
        return true;
    }

    void pageFinishedLoading (const juce::String& url) override
    {
        logUi ("webview:finished " + url);
    }

    bool pageLoadHadNetworkError (const juce::String& errorInfo) override
    {
        logUi ("webview:networkError " + errorInfo);
        return true;
    }
};
}

PluginEditor::PluginEditor (PluginProcessor& p)
    : AudioProcessorEditor (p), processorRef (p)
{
    logUi ("PluginEditor::ctor " __DATE__ " " __TIME__);
#if JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING
    logUi ("webview:build_macro static_linking");
#if JUCE_WINDOWS
    logWebView2ProbeResult();
#endif
#elif JUCE_USE_WIN_WEBVIEW2
    logUi ("webview:build_macro dynamic_loader");
#else
    logUi ("webview:build_macro disabled");
#endif
    setSize (600, 400);
    fallbackLabel.setText ("Loading UI...", juce::dontSendNotification);
    fallbackLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (fallbackLabel);
#if WEBVST_DISABLE_WEBVIEW
    fallbackLabel.setText ("WebView disabled (Windows stability mode)", juce::dontSendNotification);
#else
    if (setupWebView())
        fallbackLabel.setVisible (false);
    else
        fallbackLabel.setText ("UI load failed. Check WebView2 runtime.", juce::dontSendNotification);
#endif
}

PluginEditor::~PluginEditor() = default;

bool PluginEditor::setupWebView()
{
    logUi ("setupWebView:begin");
#if WEBVST_DISABLE_WEBVIEW
    logUi ("setupWebView:disabled");
    return false;
#else
    juce::WebBrowserComponent::Options options;
    const auto webView2Options = juce::WebBrowserComponent::Options::WinWebView2 {}
        .withUserDataFolder (juce::File::getSpecialLocation (juce::File::tempDirectory));

    // Register native functions for generic parameter API
    auto opts = options
        .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
        .withWinWebView2Options (webView2Options)
        .withNativeIntegrationEnabled()
        .withResourceProvider ([this] (const auto& url)
        {
            logUi ("resource:req " + url);
            return getUIResource (url);
        })
        .withNativeFunction ("getParamCount", [this] (auto& /*args*/, auto complete)
        {
            complete (juce::var (processorRef.getWasmParamCount()));
        })
        .withNativeFunction ("getParamInfo", [this] (auto& args, auto complete)
        {
            if (args.size() < 1)
            {
                complete (juce::var());
                return;
            }

            int index = (int) args[0];
            if (index < 0 || index >= processorRef.getWasmParamCount())
            {
                complete (juce::var());
                return;
            }

            const auto& name = processorRef.getWasmParamName (index);
            float minVal = 0.0f;
            float maxVal = 1.0f;
            float defVal = 0.0f;

            if (auto* param = processorRef.getAPVTS().getParameter (name))
            {
                defVal = param->convertFrom0to1 (param->getDefaultValue());
                if (auto* floatParam = dynamic_cast<juce::AudioParameterFloat*> (param))
                {
                    minVal = floatParam->range.start;
                    maxVal = floatParam->range.end;
                }
            }

            auto* obj = new juce::DynamicObject();
            obj->setProperty ("name", juce::String (name));
            obj->setProperty ("min", (double) minVal);
            obj->setProperty ("max", (double) maxVal);
            obj->setProperty ("defaultValue", (double) defVal);
            obj->setProperty ("index", index);

            complete (juce::var (obj));
        })
        .withNativeFunction ("setParam", [this] (auto& args, auto complete)
        {
            if (args.size() >= 2)
            {
                int index = (int) args[0];
                float value = (float) (double) args[1];

                if (index >= 0 && index < processorRef.getWasmParamCount())
                {
                    auto& name = processorRef.getWasmParamName (index);
                    if (auto* param = processorRef.getAPVTS().getParameter (name))
                    {
                        param->setValueNotifyingHost (
                            param->convertTo0to1 (value));
                    }
                }
            }
            complete (juce::var());
        })
        .withNativeFunction ("getParam", [this] (auto& args, auto complete)
        {
            if (args.size() >= 1)
            {
                int index = (int) args[0];
                if (index >= 0 && index < processorRef.getWasmParamCount())
                {
                    auto& name = processorRef.getWasmParamName (index);
                    float value = *processorRef.getAPVTS().getRawParameterValue (name);
                    complete (juce::var ((double) value));
                    return;
                }
            }
            complete (juce::var (0.0));
        });

    // Create WebSliderRelay and bind each relay to the corresponding parameter.
    int paramCount = processorRef.getWasmParamCount();
    for (int i = 0; i < paramCount; ++i)
    {
        auto relayName = juce::String ("param_") + juce::String (i);
        auto relay = std::make_unique<juce::WebSliderRelay> (relayName);
        opts = opts.withOptionsFrom (*relay);

        auto paramName = processorRef.getWasmParamName (i);
        if (auto* param = processorRef.getAPVTS().getParameter (paramName))
            sliderAttachments.push_back (std::make_unique<juce::WebSliderParameterAttachment> (*param, *relay));

        sliderRelays.push_back (std::move (relay));
    }

    const auto backendSupported = juce::WebBrowserComponent::areOptionsSupported (opts);
    logUi (backendSupported ? "webview:options_supported" : "webview:options_not_supported");

    if (! backendSupported)
    {
        logUi ("setupWebView:abort_no_webview2");
        return false;
    }

    webView = std::make_unique<LoggingWebBrowserComponent> (opts);
    addAndMakeVisible (*webView);
    webView->setBounds (getLocalBounds());
    logUi ("setupWebView:webview_created");

#if JUCE_DEBUG
    // Debug mode: connect to Vite dev server
    webView->goToURL ("http://localhost:5173");
#else
    webView->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());
    logUi ("setupWebView:goToURL_resource_root");
#endif

    juce::Timer::callAfterDelay (1500, [browser = webView.get()]
    {
        if (browser == nullptr)
            return;

        browser->evaluateJavascript (
            "(() => {"
            "  const id='webvst-diagnostic-badge';"
            "  if (document.getElementById(id)) return 'badge_exists';"
            "  const d = document.createElement('div');"
            "  d.id = id;"
            "  d.textContent = 'WebView JS alive';"
            "  d.style.position='fixed';"
            "  d.style.top='8px';"
            "  d.style.left='8px';"
            "  d.style.zIndex='99999';"
            "  d.style.background='#b00020';"
            "  d.style.color='#fff';"
            "  d.style.padding='4px 8px';"
            "  d.style.font='12px sans-serif';"
            "  document.body.appendChild(d);"
            "  return 'badge_added';"
            "})();",
            [] (auto result)
            {
                if (const auto* value = result.getResult())
                    logUi ("webview:eval " + value->toString());
                else
                    logUi ("webview:eval_error");
            });
    });

    logUi ("setupWebView:end");
    return webView != nullptr;
#endif
}

std::optional<juce::WebBrowserComponent::Resource> PluginEditor::getUIResource (const juce::String& url) const
{
    const auto path = normaliseResourcePath (url);
    const auto requestBasename = getPathBasename (path);
    const auto mimeType = getMimeTypeForPath (path);

    for (int i = 0; i < UIBinaryData::namedResourceListSize; ++i)
    {
        const auto* resourceName = UIBinaryData::namedResourceList[i];
        const auto* originalName = UIBinaryData::getNamedResourceOriginalFilename (resourceName);
        const auto originalPath = normaliseResourcePath (originalName != nullptr ? juce::String (originalName) : "");
        const auto originalBasename = getPathBasename (originalPath);

        if (path != originalPath && requestBasename != originalBasename)
            continue;

        int size = 0;
        if (const auto* data = UIBinaryData::getNamedResource (resourceName, size); data != nullptr && size > 0)
        {
            std::vector<std::byte> bytes ((size_t) size);
            std::memcpy (bytes.data(), data, (size_t) size);

            logUi ("resource:hit " + path + " <- " + originalPath);
            return juce::WebBrowserComponent::Resource { std::move (bytes), mimeType };
        }
    }

    logUi ("resource:miss " + path);
    return std::nullopt;
}

void PluginEditor::resized()
{
    if (webView != nullptr)
        webView->setBounds (getLocalBounds());
    else
        fallbackLabel.setBounds (getLocalBounds());
}

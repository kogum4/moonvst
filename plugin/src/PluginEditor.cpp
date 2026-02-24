#include "PluginEditor.h"
#include "UIBinaryData.h"
#include <cstring>

namespace
{
#ifndef MOONVST_PRODUCT_NAME
#define MOONVST_PRODUCT_NAME "template"
#endif

struct DefaultEditorSize
{
    int width;
    int height;
};

DefaultEditorSize getDefaultEditorSize()
{
    if (std::strcmp (MOONVST_PRODUCT_NAME, "showcase") == 0)
        return { 1280, 820 };

    return { 600, 400 };
}

juce::String normaliseResourcePath (juce::String path)
{
    // Remove query/hash from resource requests (e.g. "index.js?v=123").
    if (const auto hashPos = path.indexOfChar ('#'); hashPos >= 0)
        path = path.substring (0, hashPos);
    if (const auto queryPos = path.indexOfChar ('?'); queryPos >= 0)
        path = path.substring (0, queryPos);

    path = path.replaceCharacter ('\\', '/').trim();
    while (path.startsWithChar ('/'))
        path = path.substring (1);

    return path.isEmpty() ? "index.html" : path;
}

juce::File getWebViewUserDataFolder()
{
    auto folder = juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
                      .getChildFile ("MoonVST")
                      .getChildFile ("WebView2")
                      .getChildFile (MOONVST_PRODUCT_NAME);

    folder.createDirectory();
    return folder;
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
}

PluginEditor::PluginEditor (PluginProcessor& p)
    : AudioProcessorEditor (p), processorRef (p)
{
    const auto size = getDefaultEditorSize();
    setSize (size.width, size.height);
    fallbackLabel.setText ("Loading UI...", juce::dontSendNotification);
    fallbackLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (fallbackLabel);
#if MOONVST_DISABLE_WEBVIEW
    fallbackLabel.setText ("WebView disabled (Windows stability mode)", juce::dontSendNotification);
#else
    if (setupWebView())
        fallbackLabel.setVisible (false);
    else
        fallbackLabel.setText ("UI load failed. Check WebView2 runtime.", juce::dontSendNotification);
#endif
}

PluginEditor::~PluginEditor()
{
    // Tear down browser-side callbacks while this object is still alive.
    webView.reset();
    sliderAttachments.clear();
    sliderRelays.clear();
}

bool PluginEditor::setupWebView()
{
#if MOONVST_DISABLE_WEBVIEW
    return false;
#else
    juce::WebBrowserComponent::Options options;
    const auto webView2Options = juce::WebBrowserComponent::Options::WinWebView2 {}
        .withUserDataFolder (getWebViewUserDataFolder());
    juce::Component::SafePointer<PluginEditor> safeThis (this);

    // Register native functions for generic parameter API
    auto opts = options
        .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
        .withWinWebView2Options (webView2Options)
        .withNativeIntegrationEnabled()
        .withResourceProvider ([safeThis] (const auto& url)
        {
            if (auto* self = safeThis.getComponent())
                return self->getUIResource (url);
            return std::optional<juce::WebBrowserComponent::Resource> {};
        })
        .withNativeFunction ("getParamCount", [safeThis] (auto& /*args*/, auto complete)
        {
            if (auto* self = safeThis.getComponent())
                complete (juce::var (self->processorRef.getWasmParamCount()));
            else
                complete (juce::var (0));
        })
        .withNativeFunction ("getParamInfo", [safeThis] (auto& args, auto complete)
        {
            auto* self = safeThis.getComponent();
            if (self == nullptr)
            {
                complete (juce::var());
                return;
            }

            if (args.size() < 1)
            {
                complete (juce::var());
                return;
            }

            int index = (int) args[0];
            if (index < 0 || index >= self->processorRef.getWasmParamCount())
            {
                complete (juce::var());
                return;
            }

            const auto& name = self->processorRef.getWasmParamName (index);
            float minVal = 0.0f;
            float maxVal = 1.0f;
            float defVal = 0.0f;

            if (auto* param = self->processorRef.getAPVTS().getParameter (name))
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
        .withNativeFunction ("setParam", [safeThis] (auto& args, auto complete)
        {
            auto* self = safeThis.getComponent();
            if (self == nullptr)
            {
                complete (juce::var());
                return;
            }

            if (args.size() >= 2)
            {
                int index = (int) args[0];
                float value = (float) (double) args[1];

                if (index >= 0 && index < self->processorRef.getWasmParamCount())
                {
                    auto& name = self->processorRef.getWasmParamName (index);
                    if (auto* param = self->processorRef.getAPVTS().getParameter (name))
                    {
                        param->setValueNotifyingHost (
                            param->convertTo0to1 (value));
                    }
                }
            }
            complete (juce::var());
        })
        .withNativeFunction ("getParam", [safeThis] (auto& args, auto complete)
        {
            auto* self = safeThis.getComponent();
            if (self == nullptr)
            {
                complete (juce::var (0.0));
                return;
            }

            if (args.size() >= 1)
            {
                int index = (int) args[0];
                if (index >= 0 && index < self->processorRef.getWasmParamCount())
                {
                    auto& name = self->processorRef.getWasmParamName (index);
                    float value = *self->processorRef.getAPVTS().getRawParameterValue (name);
                    complete (juce::var ((double) value));
                    return;
                }
            }
            complete (juce::var (0.0));
        })
        .withNativeFunction ("getLevel", [safeThis] (auto& /*args*/, auto complete)
        {
            if (auto* self = safeThis.getComponent())
                complete (juce::var ((double) self->processorRef.getOutputLevel()));
            else
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

    if (! backendSupported)
        return false;

    webView = std::make_unique<juce::WebBrowserComponent> (opts);
    addAndMakeVisible (*webView);
    webView->setBounds (getLocalBounds());

#if JUCE_DEBUG
    // Debug mode: connect to Vite dev server
    webView->goToURL ("http://localhost:5173");
#else
    webView->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());
#endif
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
            return juce::WebBrowserComponent::Resource { std::move (bytes), mimeType };
        }
    }
    return std::nullopt;
}

void PluginEditor::resized()
{
    if (webView != nullptr)
        webView->setBounds (getLocalBounds());
    else
        fallbackLabel.setBounds (getLocalBounds());
}

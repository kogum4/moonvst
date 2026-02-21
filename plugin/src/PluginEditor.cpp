#include "PluginEditor.h"
#include "UIBinaryData.h"
#include <cstring>
#include <vector>

namespace
{
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

bool parseRuntimeGraphConfigFromVar (const juce::var& value, PluginProcessor::RuntimeGraphConfig& out)
{
    auto* root = value.getDynamicObject();
    if (root == nullptr)
        return false;

    const auto nodesVar = root->getProperty ("nodes");
    const auto edgesVar = root->getProperty ("edges");
    auto* nodes = nodesVar.getArray();
    auto* edges = edgesVar.getArray();
    if (nodes == nullptr || edges == nullptr)
        return false;

    out.schemaVersion = (int) root->getProperty ("schemaVersion");
    out.hasOutputPath = (int) root->getProperty ("hasOutputPath");
    out.nodes.clear();
    out.edges.clear();
    out.nodes.reserve ((size_t) nodes->size());
    out.edges.reserve ((size_t) edges->size());

    for (const auto& nodeVar : *nodes)
    {
        auto* node = nodeVar.getDynamicObject();
        if (node == nullptr)
            continue;
        PluginProcessor::RuntimeGraphNode parsedNode;
        parsedNode.effectType = (int) node->getProperty ("effectType");
        parsedNode.bypass = (int) node->getProperty ("bypass");
        parsedNode.p1 = (float) (double) node->getProperty ("p1");
        parsedNode.p2 = (float) (double) node->getProperty ("p2");
        parsedNode.p3 = (float) (double) node->getProperty ("p3");
        parsedNode.p4 = (float) (double) node->getProperty ("p4");
        out.nodes.push_back (parsedNode);
    }

    for (const auto& edgeVar : *edges)
    {
        auto* edge = edgeVar.getDynamicObject();
        if (edge == nullptr)
            continue;
        PluginProcessor::RuntimeGraphEdge parsedEdge;
        parsedEdge.fromIndex = (int) edge->getProperty ("fromIndex");
        parsedEdge.toIndex = (int) edge->getProperty ("toIndex");
        out.edges.push_back (parsedEdge);
    }

    return true;
}
}

PluginEditor::PluginEditor (PluginProcessor& p)
    : AudioProcessorEditor (p), processorRef (p)
{
    setSize (600, 400);
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

PluginEditor::~PluginEditor() = default;

bool PluginEditor::setupWebView()
{
#if MOONVST_DISABLE_WEBVIEW
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
        })
        .withNativeFunction ("getLevel", [this] (auto& /*args*/, auto complete)
        {
            complete (juce::var ((double) processorRef.getOutputLevel()));
        })
        .withNativeFunction ("applyRuntimeGraph", [this] (auto& args, auto complete)
        {
            if (args.size() >= 1)
            {
                PluginProcessor::RuntimeGraphConfig config;
                if (parseRuntimeGraphConfigFromVar (args[0], config))
                    processorRef.queueRuntimeGraphApply (std::move (config));
            }
            complete (juce::var());
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

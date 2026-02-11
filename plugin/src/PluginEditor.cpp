#include "PluginEditor.h"
#include "UIBinaryData.h"

PluginEditor::PluginEditor (PluginProcessor& p)
    : AudioProcessorEditor (p), processorRef (p)
{
    setSize (600, 400);
    setupWebView();
}

PluginEditor::~PluginEditor() = default;

void PluginEditor::setupWebView()
{
    juce::WebBrowserComponent::Options options;

    // Register native functions for generic parameter API
    auto opts = options
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
            auto& dsp = processorRef.getWasmDSP();

            auto* obj = new juce::DynamicObject();
            obj->setProperty ("name", juce::String (dsp.getParamName (index)));
            obj->setProperty ("min", (double) dsp.getParamMin (index));
            obj->setProperty ("max", (double) dsp.getParamMax (index));
            obj->setProperty ("defaultValue", (double) dsp.getParamDefault (index));
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
                    if (auto* param = processorRef.apvts.getParameter (name))
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
                    float value = *processorRef.apvts.getRawParameterValue (name);
                    complete (juce::var ((double) value));
                    return;
                }
            }
            complete (juce::var (0.0));
        });

    // Create WebSliderRelay for each parameter
    int paramCount = processorRef.getWasmParamCount();
    for (int i = 0; i < paramCount; ++i)
    {
        auto name = processorRef.getWasmParamName (i);
        auto relay = std::make_unique<juce::WebSliderRelay> (
            *processorRef.apvts.getParameter (name));
        opts = opts.withOptionsFrom (
            juce::WebBrowserComponent::Options().withWebSliderRelayToAdd (*relay));
        sliderRelays.push_back (std::move (relay));
    }

    webView = std::make_unique<juce::WebBrowserComponent> (opts);
    addAndMakeVisible (*webView);

#if JUCE_DEBUG
    // Debug mode: connect to Vite dev server
    webView->goToURL ("http://localhost:5173");
#else
    // Release mode: load embedded UI HTML
    for (int i = 0; i < UIBinaryData::namedResourceListSize; ++i)
    {
        int size = 0;
        auto* data = UIBinaryData::getNamedResource (UIBinaryData::namedResourceList[i], size);
        if (data != nullptr && size > 0)
        {
            juce::String html (data, (size_t) size);
            webView->goToURL ("data:text/html;charset=utf-8," + juce::URL::addEscapeChars (html, true));
            break;
        }
    }
#endif
}

void PluginEditor::resized()
{
    if (webView != nullptr)
        webView->setBounds (getLocalBounds());
}

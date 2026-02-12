#pragma once

#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"
#include <vector>
#include <memory>

class PluginEditor : public juce::AudioProcessorEditor
{
public:
    explicit PluginEditor (PluginProcessor&);
    ~PluginEditor() override;

    void resized() override;

private:
    PluginProcessor& processorRef;

    std::unique_ptr<juce::WebBrowserComponent> webView;

    // Dynamic WebSliderRelay storage for generic parameter bridging
    std::vector<std::unique_ptr<juce::WebSliderRelay>> sliderRelays;
    std::vector<std::unique_ptr<juce::WebSliderParameterAttachment>> sliderAttachments;

    void setupWebView();
    void registerNativeFunctions();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PluginEditor)
};

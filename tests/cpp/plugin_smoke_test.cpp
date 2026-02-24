#include <cmath>
#include <cstdio>
#include <memory>

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include "PluginProcessor.h"

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter();

int main()
{
    printf("=== Plugin Smoke Test ===\n");

    juce::ScopedJuceInitialiser_GUI juceInit;

    auto plugin = std::unique_ptr<juce::AudioProcessor>(createPluginFilter());
    if (plugin == nullptr)
    {
        printf("FAIL: createPluginFilter returned null\n");
        return 1;
    }
    printf("PASS: Plugin instance created\n");

    plugin->setPlayConfigDetails(2, 2, 48000.0, 64);
    plugin->prepareToPlay(48000.0, 64);

    juce::AudioBuffer<float> buffer(2, 64);
    buffer.clear();
    buffer.applyGain(0, 64, 0.25f);
    juce::MidiBuffer midi;
    plugin->processBlock(buffer, midi);

    const float firstSample = buffer.getSample(0, 0);
    if (!std::isfinite(firstSample))
    {
        printf("FAIL: processBlock produced non-finite sample\n");
        return 1;
    }
    printf("PASS: processBlock executed\n");

    auto* editor = plugin->createEditor();
    if (editor == nullptr)
    {
        printf("FAIL: createEditor returned null\n");
        return 1;
    }

    const auto editorBounds = editor->getBounds();
    if (editorBounds.getWidth() <= 0 || editorBounds.getHeight() <= 0)
    {
        printf("FAIL: editor has invalid bounds (%d, %d)\n",
               editorBounds.getWidth(),
               editorBounds.getHeight());
        delete editor;
        return 1;
    }
    printf("PASS: Editor created (%d x %d)\n",
           editorBounds.getWidth(),
           editorBounds.getHeight());

    delete editor;
    plugin->releaseResources();

    auto* typed = dynamic_cast<PluginProcessor*>(plugin.get());
    if (typed == nullptr)
    {
        printf("FAIL: PluginProcessor cast failed\n");
        return 1;
    }

    const juce::String testUiState = R"({"version":1,"graphPayload":"{}","lastPresetName":"Smoke"})";
    typed->setUiStateJson(testUiState);

    juce::MemoryBlock stateBlock;
    plugin->getStateInformation(stateBlock);

    auto pluginReloaded = std::unique_ptr<juce::AudioProcessor>(createPluginFilter());
    auto* typedReloaded = dynamic_cast<PluginProcessor*>(pluginReloaded.get());
    if (typedReloaded == nullptr)
    {
        printf("FAIL: Reloaded PluginProcessor cast failed\n");
        return 1;
    }
    pluginReloaded->setStateInformation(stateBlock.getData(), (int)stateBlock.getSize());
    if (typedReloaded->getUiStateJson() != testUiState)
    {
        printf("FAIL: UI state did not roundtrip in plugin state\n");
        return 1;
    }
    printf("PASS: UI state roundtrip in plugin state\n");

    printf("=== All smoke checks passed ===\n");
    return 0;
}

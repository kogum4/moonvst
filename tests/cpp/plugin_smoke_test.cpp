#include <cmath>
#include <cstring>
#include <cstdio>
#include <memory>

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter();

#ifndef MOONVST_PRODUCT_NAME
#define MOONVST_PRODUCT_NAME "template"
#endif

namespace
{
struct ExpectedEditorSize
{
    int width;
    int height;
};

ExpectedEditorSize getExpectedEditorSize()
{
    if (std::strcmp (MOONVST_PRODUCT_NAME, "showcase") == 0)
        return { 1280, 820 };

    return { 600, 400 };
}
}

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

    const auto expectedSize = getExpectedEditorSize();
    if (editorBounds.getWidth() != expectedSize.width || editorBounds.getHeight() != expectedSize.height)
    {
        printf("FAIL: editor size mismatch for product '%s' (expected %d x %d, got %d x %d)\n",
               MOONVST_PRODUCT_NAME,
               expectedSize.width,
               expectedSize.height,
               editorBounds.getWidth(),
               editorBounds.getHeight());
        delete editor;
        return 1;
    }
    printf("PASS: Editor size matches product default (%d x %d)\n",
           expectedSize.width,
           expectedSize.height);

    delete editor;
    plugin->releaseResources();

    printf("=== All smoke checks passed ===\n");
    return 0;
}

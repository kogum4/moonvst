#include <cmath>
#include <cstdio>
#include <memory>
#include <thread>
#include <atomic>
#include <chrono>

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

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

    // Regression: keep a worker thread (with thread-local WAMR env) alive
    // while the plugin is destroyed, then let the worker exit.
    std::atomic<bool> workerReady { false };
    std::atomic<bool> workerCanExit { false };
    auto* pluginRaw = plugin.get();
    std::thread worker ([&]()
    {
        juce::AudioBuffer<float> workerBuffer (2, 64);
        workerBuffer.clear();
        juce::MidiBuffer workerMidi;
        pluginRaw->processBlock (workerBuffer, workerMidi);
        workerReady.store (true);

        while (! workerCanExit.load())
            std::this_thread::sleep_for (std::chrono::milliseconds (1));
    });

    while (! workerReady.load())
        std::this_thread::sleep_for (std::chrono::milliseconds (1));

    plugin.reset();
    workerCanExit.store (true);
    worker.join();

    printf("=== All smoke checks passed ===\n");
    return 0;
}

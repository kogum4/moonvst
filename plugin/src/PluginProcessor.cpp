#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <chrono>

PluginProcessor::PluginProcessor()
    : AudioProcessor (BusesProperties()
                          .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                          .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      apvts (*this, nullptr, "Parameters", createParameterLayout())
{
}

PluginProcessor::~PluginProcessor()
{
    wasmDSP_.shutdown();
}

juce::AudioProcessorValueTreeState::ParameterLayout PluginProcessor::createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;
    wasmReady_ = wasmDSP_.initialize();

    if (wasmReady_)
    {
        const int wasmParamCount = wasmDSP_.getParamCount();
        if (wasmParamCount > 0)
        {
            paramCount_ = wasmParamCount;
            paramNames_.clear();
            paramNames_.reserve ((size_t) paramCount_);

            for (int i = 0; i < paramCount_; ++i)
            {
                auto name = wasmDSP_.getParamName (i);
                if (name.empty())
                    name = "param_" + std::to_string (i);

                auto minVal = wasmDSP_.getParamMin (i);
                auto maxVal = wasmDSP_.getParamMax (i);
                auto defVal = wasmDSP_.getParamDefault (i);

                if (maxVal <= minVal)
                    maxVal = minVal + 1.0f;
                defVal = juce::jlimit (minVal, maxVal, defVal);

                paramNames_.push_back (name);

                layout.add (std::make_unique<juce::AudioParameterFloat> (
                    juce::ParameterID { name, 1 },
                    name,
                    juce::NormalisableRange<float> (minVal, maxVal),
                    defVal));
            }
        }
    }

    if (paramNames_.empty())
    {
        paramCount_ = 1;
        paramNames_ = { "gain" };
        layout.add (std::make_unique<juce::AudioParameterFloat> (
            juce::ParameterID { "gain", 1 },
            "gain",
            juce::NormalisableRange<float> (0.0f, 1.0f),
            0.5f));
    }

    return layout;
}

void PluginProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    if (! wasmReady_)
        wasmReady_ = wasmDSP_.initialize();

    sampleRateHz_.store (sampleRate);
    blockSizeSamples_.store (samplesPerBlock);
    wasmDSP_.prepare (sampleRate, samplesPerBlock);
}

void PluginProcessor::releaseResources()
{
}

void PluginProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;
    const auto blockStart = std::chrono::high_resolution_clock::now();

    if (wasmReady_)
    {
        for (int i = 0; i < paramCount_; ++i)
        {
            if (const auto* raw = apvts.getRawParameterValue (paramNames_[(size_t) i]))
                wasmDSP_.setParam (i, *raw);
        }

        wasmDSP_.processBlock (buffer);
    }

    float peak = 0.0f;
    const int numSamples = buffer.getNumSamples();
    const int numChannels = buffer.getNumChannels();
    for (int ch = 0; ch < numChannels; ++ch)
        peak = juce::jmax (peak, buffer.getMagnitude (ch, 0, numSamples));
    outputLevel_.store (juce::jlimit (0.0f, 1.0f, peak));

    const auto blockEnd = std::chrono::high_resolution_clock::now();
    const double processSec = std::chrono::duration<double> (blockEnd - blockStart).count();
    const double sampleRate = sampleRateHz_.load();
    const double blockDurationSec = sampleRate > 0.0 ? static_cast<double> (numSamples) / sampleRate : 0.0;
    if (blockDurationSec > 0.0)
    {
        const auto prevCpuLoad = static_cast<double> (cpuLoad_.load());
        const auto rawCpuLoad = juce::jlimit (0.0, 1.0, processSec / blockDurationSec);
        const auto smoothed = static_cast<float> (prevCpuLoad * 0.85 + rawCpuLoad * 0.15);
        cpuLoad_.store (juce::jlimit (0.0f, 1.0f, smoothed));
    }
}

double PluginProcessor::getLatencyMs() const
{
    const auto sampleRate = sampleRateHz_.load();
    if (sampleRate <= 0.0)
        return 0.0;

    const auto samplesPerBlock = blockSizeSamples_.load();
    const auto totalLatencySamples = getLatencySamples() + samplesPerBlock;
    const auto latencyMs = (static_cast<double> (totalLatencySamples) / sampleRate) * 1000.0;
    return juce::jmax (0.0, latencyMs);
}

juce::AudioProcessorEditor* PluginProcessor::createEditor()
{
    return new PluginEditor (*this);
}

void PluginProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    {
        const juce::ScopedLock lock (uiStateLock_);
        state.setProperty ("uiStateJson", uiStateJson_, nullptr);
    }
    std::unique_ptr<juce::XmlElement> xml (state.createXml());
    copyXmlToBinary (*xml, destData);
}

void PluginProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xml (getXmlFromBinary (data, sizeInBytes));
    if (xml != nullptr && xml->hasTagName (apvts.state.getType()))
    {
        apvts.replaceState (juce::ValueTree::fromXml (*xml));
        const juce::ScopedLock lock (uiStateLock_);
        uiStateJson_ = apvts.state.getProperty ("uiStateJson").toString();
    }
}

void PluginProcessor::setUiStateJson(const juce::String& stateJson)
{
    const juce::ScopedLock lock (uiStateLock_);
    uiStateJson_ = stateJson;
}

juce::String PluginProcessor::getUiStateJson() const
{
    const juce::ScopedLock lock (uiStateLock_);
    return uiStateJson_;
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new PluginProcessor();
}

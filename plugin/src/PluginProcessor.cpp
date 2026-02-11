#include "PluginProcessor.h"
#include "PluginEditor.h"

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

    // Initialize WASM DSP and dynamically create parameters
    if (wasmDSP_.initialize())
    {
        paramCount_ = wasmDSP_.getParamCount();
        paramNames_.resize ((size_t) paramCount_);

        for (int i = 0; i < paramCount_; ++i)
        {
            auto name = wasmDSP_.getParamName (i);
            auto minVal = wasmDSP_.getParamMin (i);
            auto maxVal = wasmDSP_.getParamMax (i);
            auto defVal = wasmDSP_.getParamDefault (i);

            paramNames_[(size_t) i] = name;

            layout.add (std::make_unique<juce::AudioParameterFloat> (
                juce::ParameterID { name, 1 },
                name,
                juce::NormalisableRange<float> (minVal, maxVal),
                defVal));
        }
    }

    return layout;
}

void PluginProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    wasmDSP_.prepare (sampleRate, samplesPerBlock);
}

void PluginProcessor::releaseResources()
{
}

void PluginProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    // Sync all parameters from APVTS to WASM
    for (int i = 0; i < paramCount_; ++i)
    {
        float val = *apvts.getRawParameterValue (paramNames_[(size_t) i]);
        wasmDSP_.setParam (i, val);
    }

    wasmDSP_.processBlock (buffer);
}

juce::AudioProcessorEditor* PluginProcessor::createEditor()
{
    return new PluginEditor (*this);
}

void PluginProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml (state.createXml());
    copyXmlToBinary (*xml, destData);
}

void PluginProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xml (getXmlFromBinary (data, sizeInBytes));
    if (xml != nullptr && xml->hasTagName (apvts.state.getType()))
        apvts.replaceState (juce::ValueTree::fromXml (*xml));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new PluginProcessor();
}

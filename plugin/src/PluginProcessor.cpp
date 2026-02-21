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

    wasmDSP_.prepare (sampleRate, samplesPerBlock);
}

void PluginProcessor::releaseResources()
{
}

void PluginProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    if (wasmReady_)
    {
        if (pendingRuntimeGraphApply_.exchange (false))
        {
            RuntimeGraphConfig graphConfig;
            {
                const std::lock_guard<std::mutex> lock (pendingRuntimeGraphMutex_);
                graphConfig = pendingRuntimeGraph_;
            }

            wasmDSP_.clearRuntimeGraph();
            for (size_t i = 0; i < graphConfig.nodes.size(); ++i)
            {
                const auto& node = graphConfig.nodes[i];
                wasmDSP_.setRuntimeNode ((int) i, node.effectType, node.bypass, node.p1, node.p2, node.p3, node.p4);
            }
            for (size_t i = 0; i < graphConfig.edges.size(); ++i)
            {
                const auto& edge = graphConfig.edges[i];
                wasmDSP_.setRuntimeEdge ((int) i, edge.fromIndex, edge.toIndex);
            }
            wasmDSP_.applyGraphContract (graphConfig.schemaVersion, (int) graphConfig.nodes.size(), (int) graphConfig.edges.size());
            wasmDSP_.applyGraphRuntimeMode (graphConfig.hasOutputPath, 0);
        }

        if (pendingGraphApply_.exchange (false))
        {
            wasmDSP_.applyGraphContract (pendingGraphSchemaVersion_.load(),
                                         pendingGraphNodeCount_.load(),
                                         pendingGraphEdgeCount_.load());
            wasmDSP_.applyGraphRuntimeMode (pendingGraphHasOutputPath_.load(),
                                            pendingGraphEffectType_.load());
        }

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

void PluginProcessor::queueGraphContractApply (int schemaVersion, int nodeCount, int edgeCount)
{
    pendingGraphSchemaVersion_.store (schemaVersion);
    pendingGraphNodeCount_.store (nodeCount);
    pendingGraphEdgeCount_.store (edgeCount);
    pendingGraphApply_.store (true);
}

void PluginProcessor::queueGraphRuntimeModeApply (int hasOutputPath, int effectType)
{
    pendingGraphHasOutputPath_.store (hasOutputPath);
    pendingGraphEffectType_.store (effectType);
    pendingGraphApply_.store (true);
}

void PluginProcessor::queueRuntimeGraphApply (RuntimeGraphConfig config)
{
    {
        const std::lock_guard<std::mutex> lock (pendingRuntimeGraphMutex_);
        pendingRuntimeGraph_ = std::move (config);
    }
    pendingRuntimeGraphApply_.store (true);
}

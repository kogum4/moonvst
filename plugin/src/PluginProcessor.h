#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "moonvst/WasmDSP.h"
#include <vector>
#include <string>
#include <atomic>

class PluginProcessor : public juce::AudioProcessor
{
public:
    PluginProcessor();
    ~PluginProcessor() override;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    WasmDSP& getWasmDSP() { return wasmDSP_; }
    int getWasmParamCount() const { return paramCount_; }
    const std::string& getWasmParamName (int index) const { return paramNames_[index]; }
    juce::AudioProcessorValueTreeState& getAPVTS() { return apvts; }
    const juce::AudioProcessorValueTreeState& getAPVTS() const { return apvts; }
    float getOutputLevel() const { return outputLevel_.load(); }
    void setUiStateJson(const juce::String& stateJson);
    juce::String getUiStateJson() const;

private:
    WasmDSP wasmDSP_;
    bool wasmReady_ = false;
    int paramCount_ = 0;
    std::vector<std::string> paramNames_;
    juce::AudioProcessorValueTreeState apvts;
    std::atomic<float> outputLevel_ { 0.0f };
    juce::String uiStateJson_;
    mutable juce::CriticalSection uiStateLock_;

    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PluginProcessor)
};

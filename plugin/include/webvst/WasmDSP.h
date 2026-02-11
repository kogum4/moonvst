#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <string>
#include <atomic>
#include "wasm_export.h"

class WasmDSP
{
public:
    WasmDSP();
    ~WasmDSP();

    bool initialize();
    void shutdown();
    void prepare (double sampleRate, int samplesPerBlock);
    void processBlock (juce::AudioBuffer<float>& buffer);

    // Generic parameter API
    int getParamCount();
    std::string getParamName (int index);
    float getParamDefault (int index);
    float getParamMin (int index);
    float getParamMax (int index);
    void setParam (int index, float value);
    float getParam (int index);

private:
    // WAMR runtime handles
    wasm_module_t module_ = nullptr;
    wasm_module_inst_t moduleInst_ = nullptr;
    wasm_exec_env_t execEnv_ = nullptr;

    // Generic function pointers (looked up by name)
    wasm_function_inst_t fn_init_ = nullptr;
    wasm_function_inst_t fn_process_block_ = nullptr;
    wasm_function_inst_t fn_get_param_count_ = nullptr;
    wasm_function_inst_t fn_get_param_name_ = nullptr;
    wasm_function_inst_t fn_get_param_name_len_ = nullptr;
    wasm_function_inst_t fn_get_param_default_ = nullptr;
    wasm_function_inst_t fn_get_param_min_ = nullptr;
    wasm_function_inst_t fn_get_param_max_ = nullptr;
    wasm_function_inst_t fn_set_param_ = nullptr;
    wasm_function_inst_t fn_get_param_ = nullptr;

    // Memory layout offsets (must match dsp/src/utils/constants.mbt)
    static constexpr int INPUT_LEFT_OFFSET  = 0x10000;
    static constexpr int INPUT_RIGHT_OFFSET = 0x20000;
    static constexpr int OUTPUT_LEFT_OFFSET = 0x30000;
    static constexpr int OUTPUT_RIGHT_OFFSET = 0x40000;

    std::atomic<bool> initialized_ { false };
    int cachedParamCount_ = 0;

    bool lookupFunctions();
};

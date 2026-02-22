#include "moonvst/WasmDSP.h"
#include "BinaryData.h"
#include <cstring>

#if MOONVST_DISABLE_WASM_DSP

WasmDSP::WasmDSP() = default;
WasmDSP::~WasmDSP() = default;

bool WasmDSP::initialize() { return false; }
void WasmDSP::shutdown() {}
void WasmDSP::prepare (double, int) {}
void WasmDSP::processBlock (juce::AudioBuffer<float>&) {}
int WasmDSP::getParamCount() { return 0; }
std::string WasmDSP::getParamName (int) { return ""; }
float WasmDSP::getParamDefault (int) { return 0.0f; }
float WasmDSP::getParamMin (int) { return 0.0f; }
float WasmDSP::getParamMax (int) { return 1.0f; }
void WasmDSP::setParam (int, float) {}
float WasmDSP::getParam (int) { return 0.0f; }
bool WasmDSP::lookupFunctions() { return false; }

#else

namespace
{
struct ThreadEnvGuard
{
    ThreadEnvGuard()
    {
        initialized = wasm_runtime_init_thread_env();
    }

    ~ThreadEnvGuard()
    {
        if (initialized)
            wasm_runtime_destroy_thread_env();
    }

    bool initialized = false;
};

bool ensureThreadEnv()
{
    thread_local ThreadEnvGuard threadEnvGuard;
    return threadEnvGuard.initialized;
}

bool callVoid (wasm_exec_env_t execEnv, wasm_function_inst_t fn, wasm_val_t* args, uint32_t numArgs)
{
    return wasm_runtime_call_wasm_a (execEnv, fn, 0, nullptr, numArgs, args);
}

bool callI32 (wasm_exec_env_t execEnv, wasm_function_inst_t fn,
              wasm_val_t* args, uint32_t numArgs, int32_t& out)
{
    wasm_val_t result[1];
    result[0].kind = WASM_I32;
    if (! wasm_runtime_call_wasm_a (execEnv, fn, 1, result, numArgs, args))
        return false;
    out = result[0].of.i32;
    return true;
}

bool callF32 (wasm_exec_env_t execEnv, wasm_function_inst_t fn,
              wasm_val_t* args, uint32_t numArgs, float& out)
{
    wasm_val_t result[1];
    result[0].kind = WASM_F32;
    if (! wasm_runtime_call_wasm_a (execEnv, fn, 1, result, numArgs, args))
        return false;
    out = result[0].of.f32;
    return true;
}
}

WasmDSP::WasmDSP() = default;

WasmDSP::~WasmDSP()
{
    shutdown();
}

bool WasmDSP::initialize()
{
    if (initialized_.load())
        return true;

#if MOONVST_DISABLE_WASM_DSP
    return false;
#endif

    // Initialize WAMR runtime
    RuntimeInitArgs initArgs;
    std::memset (&initArgs, 0, sizeof (initArgs));
    initArgs.mem_alloc_type = Alloc_With_System_Allocator;

    if (! wasm_runtime_full_init (&initArgs))
        return false;
    runtimeInitialized_.store (true);

    // Load AOT binary from embedded resource
    // BinaryData contains the .aot file compiled from MoonBit WASM
    const char* aotData = nullptr;
    int aotSize = 0;

    // Look for the AOT binary in BinaryData
    for (int i = 0; i < BinaryData::namedResourceListSize; ++i)
    {
        int size = 0;
        const char* data = BinaryData::getNamedResource (BinaryData::namedResourceList[i], size);
        if (data != nullptr && size > 0)
        {
            aotData = data;
            aotSize = size;
            break;
        }
    }

    if (aotData == nullptr || aotSize == 0)
        return false;

    // Load AOT module
    char errorBuf[128];
    module_ = wasm_runtime_load ((uint8_t*) aotData, (uint32_t) aotSize,
                                  errorBuf, sizeof (errorBuf));
    if (module_ == nullptr)
        return false;

    // Instantiate module (256KB stack, 1MB heap)
    moduleInst_ = wasm_runtime_instantiate (module_, 256 * 1024, 1024 * 1024,
                                             errorBuf, sizeof (errorBuf));
    if (moduleInst_ == nullptr)
    {
        wasm_runtime_unload (module_);
        module_ = nullptr;
        return false;
    }

    // Create execution environment
    execEnv_ = wasm_runtime_create_exec_env (moduleInst_, 64 * 1024);
    if (execEnv_ == nullptr)
    {
        wasm_runtime_deinstantiate (moduleInst_);
        moduleInst_ = nullptr;
        wasm_runtime_unload (module_);
        module_ = nullptr;
        return false;
    }

    // Lookup all generic functions
    if (! lookupFunctions())
    {
        shutdown();
        return false;
    }

    // Call init()
    if (fn_init_ != nullptr)
    {
        if (! callVoid (execEnv_, fn_init_, nullptr, 0))
        {
            shutdown();
            return false;
        }
    }

    // Cache parameter count
    cachedParamCount_ = getParamCount();

    initialized_.store (true);
    return true;
}

void WasmDSP::shutdown()
{
    initialized_.store (false);

    if (execEnv_ != nullptr)
    {
        wasm_runtime_destroy_exec_env (execEnv_);
        execEnv_ = nullptr;
    }

    if (moduleInst_ != nullptr)
    {
        wasm_runtime_deinstantiate (moduleInst_);
        moduleInst_ = nullptr;
    }

    if (module_ != nullptr)
    {
        wasm_runtime_unload (module_);
        module_ = nullptr;
    }

    if (runtimeInitialized_.exchange (false))
        wasm_runtime_destroy();
}

bool WasmDSP::lookupFunctions()
{
    fn_init_               = wasm_runtime_lookup_function (moduleInst_, "init");
    if (fn_init_ == nullptr)
        fn_init_ = wasm_runtime_lookup_function (moduleInst_, "dsp_init");
    fn_process_block_      = wasm_runtime_lookup_function (moduleInst_, "process_block");
    fn_get_param_count_    = wasm_runtime_lookup_function (moduleInst_, "get_param_count");
    fn_get_param_name_     = wasm_runtime_lookup_function (moduleInst_, "get_param_name");
    fn_get_param_name_len_ = wasm_runtime_lookup_function (moduleInst_, "get_param_name_len");
    fn_get_param_default_  = wasm_runtime_lookup_function (moduleInst_, "get_param_default");
    fn_get_param_min_      = wasm_runtime_lookup_function (moduleInst_, "get_param_min");
    fn_get_param_max_      = wasm_runtime_lookup_function (moduleInst_, "get_param_max");
    fn_set_param_          = wasm_runtime_lookup_function (moduleInst_, "set_param");
    fn_get_param_          = wasm_runtime_lookup_function (moduleInst_, "get_param");

    // process_block and get_param_count are required at minimum
    return fn_process_block_ != nullptr && fn_get_param_count_ != nullptr;
}

void WasmDSP::prepare (double /*sampleRate*/, int /*samplesPerBlock*/)
{
    // Reserved for future use (e.g., passing sample rate to WASM)
}

void WasmDSP::processBlock (juce::AudioBuffer<float>& buffer)
{
    if (! initialized_.load())
        return;

    if (! ensureThreadEnv())
        return;

    const int numSamples = buffer.getNumSamples();
    const int numChannels = buffer.getNumChannels();

    // Copy input to WASM linear memory
    if (auto* wasmMemory = (uint8_t*) wasm_runtime_addr_app_to_native (moduleInst_, 0))
    {
        if (numChannels >= 1)
            std::memcpy (wasmMemory + INPUT_LEFT_OFFSET,
                         buffer.getReadPointer (0),
                         (size_t) numSamples * sizeof (float));

        if (numChannels >= 2)
            std::memcpy (wasmMemory + INPUT_RIGHT_OFFSET,
                         buffer.getReadPointer (1),
                         (size_t) numSamples * sizeof (float));

        // Call process_block(numSamples)
        wasm_val_t args[1];
        args[0].kind = WASM_I32;
        args[0].of.i32 = numSamples;
        if (! callVoid (execEnv_, fn_process_block_, args, 1))
            return;

        // Copy output from WASM linear memory
        if (numChannels >= 1)
            std::memcpy (buffer.getWritePointer (0),
                         wasmMemory + OUTPUT_LEFT_OFFSET,
                         (size_t) numSamples * sizeof (float));

        if (numChannels >= 2)
            std::memcpy (buffer.getWritePointer (1),
                         wasmMemory + OUTPUT_RIGHT_OFFSET,
                         (size_t) numSamples * sizeof (float));
    }
}

int WasmDSP::getParamCount()
{
    if (fn_get_param_count_ == nullptr)
        return 0;
    if (! ensureThreadEnv())
        return 0;

    int32_t count = 0;
    if (callI32 (execEnv_, fn_get_param_count_, nullptr, 0, count))
        return juce::jmax (0, (int) count);
    return 0;
}

std::string WasmDSP::getParamName (int index)
{
    if (fn_get_param_name_ == nullptr || fn_get_param_name_len_ == nullptr)
        return "";
    if (! ensureThreadEnv())
        return "";

    // Get name length
    wasm_val_t lenArgs[1];
    lenArgs[0].kind = WASM_I32;
    lenArgs[0].of.i32 = index;
    int32_t nameLen = 0;
    if (! callI32 (execEnv_, fn_get_param_name_len_, lenArgs, 1, nameLen))
        return "";

    // Get name pointer
    wasm_val_t ptrArgs[1];
    ptrArgs[0].kind = WASM_I32;
    ptrArgs[0].of.i32 = index;
    int32_t wasmPtr = 0;
    if (! callI32 (execEnv_, fn_get_param_name_, ptrArgs, 1, wasmPtr))
        return "";

    if (wasmPtr == 0 || nameLen <= 0 || nameLen > 256)
        return "";

    // Convert WASM address to native pointer
    if (! wasm_runtime_validate_app_addr (moduleInst_, (uint32_t) wasmPtr, (uint32_t) nameLen))
        return "";

    auto* nativePtr = (const char*) wasm_runtime_addr_app_to_native (moduleInst_, (uint32_t) wasmPtr);
    if (nativePtr == nullptr)
        return "";

    return std::string (nativePtr, (size_t) nameLen);
}

float WasmDSP::getParamDefault (int index)
{
    if (fn_get_param_default_ == nullptr)
        return 0.0f;
    if (! ensureThreadEnv())
        return 0.0f;

    wasm_val_t args[1];
    args[0].kind = WASM_I32;
    args[0].of.i32 = index;

    float result = 0.0f;
    if (callF32 (execEnv_, fn_get_param_default_, args, 1, result))
        return result;
    return 0.0f;
}

float WasmDSP::getParamMin (int index)
{
    if (fn_get_param_min_ == nullptr)
        return 0.0f;
    if (! ensureThreadEnv())
        return 0.0f;

    wasm_val_t args[1];
    args[0].kind = WASM_I32;
    args[0].of.i32 = index;

    float result = 0.0f;
    if (callF32 (execEnv_, fn_get_param_min_, args, 1, result))
        return result;
    return 0.0f;
}

float WasmDSP::getParamMax (int index)
{
    if (fn_get_param_max_ == nullptr)
        return 1.0f;
    if (! ensureThreadEnv())
        return 1.0f;

    wasm_val_t args[1];
    args[0].kind = WASM_I32;
    args[0].of.i32 = index;

    float result = 1.0f;
    if (callF32 (execEnv_, fn_get_param_max_, args, 1, result))
        return result;
    return 1.0f;
}

void WasmDSP::setParam (int index, float value)
{
    if (fn_set_param_ == nullptr)
        return;
    if (! ensureThreadEnv())
        return;

    wasm_val_t args[2];
    args[0].kind = WASM_I32;
    args[0].of.i32 = index;
    args[1].kind = WASM_F32;
    args[1].of.f32 = value;
    callVoid (execEnv_, fn_set_param_, args, 2);
}

float WasmDSP::getParam (int index)
{
    if (fn_get_param_ == nullptr)
        return 0.0f;
    if (! ensureThreadEnv())
        return 0.0f;

    wasm_val_t args[1];
    args[0].kind = WASM_I32;
    args[0].of.i32 = index;

    float result = 0.0f;
    if (callF32 (execEnv_, fn_get_param_, args, 1, result))
        return result;
    return 0.0f;
}

#endif

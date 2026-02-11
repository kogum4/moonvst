#include "webvst/WasmDSP.h"
#include "BinaryData.h"
#include <cstring>

WasmDSP::WasmDSP() = default;

WasmDSP::~WasmDSP()
{
    shutdown();
}

bool WasmDSP::initialize()
{
    if (initialized_.load())
        return true;

    // Initialize WAMR runtime
    RuntimeInitArgs initArgs;
    std::memset (&initArgs, 0, sizeof (initArgs));
    initArgs.mem_alloc_type = Alloc_With_System_Allocator;

    if (! wasm_runtime_full_init (&initArgs))
        return false;

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
        wasm_runtime_call_wasm (execEnv_, fn_init_, 0, nullptr);
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

    wasm_runtime_destroy();
}

bool WasmDSP::lookupFunctions()
{
    fn_init_               = wasm_runtime_lookup_function (moduleInst_, "init");
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
        uint32_t args[1] = { (uint32_t) numSamples };
        wasm_runtime_call_wasm (execEnv_, fn_process_block_, 1, args);

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

    uint32_t result[1] = { 0 };
    if (wasm_runtime_call_wasm (execEnv_, fn_get_param_count_, 0, result))
        return (int) result[0];

    return 0;
}

std::string WasmDSP::getParamName (int index)
{
    if (fn_get_param_name_ == nullptr || fn_get_param_name_len_ == nullptr)
        return "";

    // Get name length
    uint32_t lenArgs[1] = { (uint32_t) index };
    uint32_t lenResult[1] = { 0 };
    if (! wasm_runtime_call_wasm (execEnv_, fn_get_param_name_len_, 1, lenArgs))
        return "";
    lenResult[0] = lenArgs[0]; // result is returned in args array

    // Get name pointer
    uint32_t ptrArgs[1] = { (uint32_t) index };
    if (! wasm_runtime_call_wasm (execEnv_, fn_get_param_name_, 1, ptrArgs))
        return "";

    uint32_t wasmPtr = ptrArgs[0];
    int nameLen = (int) lenResult[0];

    if (wasmPtr == 0 || nameLen <= 0)
        return "";

    // Convert WASM address to native pointer
    auto* nativePtr = (const char*) wasm_runtime_addr_app_to_native (moduleInst_, wasmPtr);
    if (nativePtr == nullptr)
        return "";

    return std::string (nativePtr, (size_t) nameLen);
}

float WasmDSP::getParamDefault (int index)
{
    if (fn_get_param_default_ == nullptr)
        return 0.0f;

    uint32_t args[1] = { (uint32_t) index };
    if (wasm_runtime_call_wasm (execEnv_, fn_get_param_default_, 1, args))
    {
        float result;
        std::memcpy (&result, args, sizeof (float));
        return result;
    }
    return 0.0f;
}

float WasmDSP::getParamMin (int index)
{
    if (fn_get_param_min_ == nullptr)
        return 0.0f;

    uint32_t args[1] = { (uint32_t) index };
    if (wasm_runtime_call_wasm (execEnv_, fn_get_param_min_, 1, args))
    {
        float result;
        std::memcpy (&result, args, sizeof (float));
        return result;
    }
    return 0.0f;
}

float WasmDSP::getParamMax (int index)
{
    if (fn_get_param_max_ == nullptr)
        return 1.0f;

    uint32_t args[1] = { (uint32_t) index };
    if (wasm_runtime_call_wasm (execEnv_, fn_get_param_max_, 1, args))
    {
        float result;
        std::memcpy (&result, args, sizeof (float));
        return result;
    }
    return 1.0f;
}

void WasmDSP::setParam (int index, float value)
{
    if (fn_set_param_ == nullptr)
        return;

    uint32_t args[2];
    args[0] = (uint32_t) index;
    std::memcpy (&args[1], &value, sizeof (float));
    wasm_runtime_call_wasm (execEnv_, fn_set_param_, 2, args);
}

float WasmDSP::getParam (int index)
{
    if (fn_get_param_ == nullptr)
        return 0.0f;

    uint32_t args[1] = { (uint32_t) index };
    if (wasm_runtime_call_wasm (execEnv_, fn_get_param_, 1, args))
    {
        float result;
        std::memcpy (&result, args, sizeof (float));
        return result;
    }
    return 0.0f;
}

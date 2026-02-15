#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <cassert>
#include "wasm_export.h"

// Minimal test for WASM DSP integration
// Tests: init, parameter get/set, process_block

static bool load_file(const char* path, uint8_t** buf, uint32_t* size)
{
    FILE* f = fopen(path, "rb");
    if (!f) return false;

    fseek(f, 0, SEEK_END);
    *size = (uint32_t)ftell(f);
    fseek(f, 0, SEEK_SET);

    *buf = (uint8_t*)malloc(*size);
    if (fread(*buf, 1, *size, f) != *size)
    {
        free(*buf);
        fclose(f);
        return false;
    }
    fclose(f);
    return true;
}

int main()
{
    printf("=== WasmDSP Integration Test ===\n");

    // 1. Initialize WAMR runtime
    RuntimeInitArgs initArgs;
    memset(&initArgs, 0, sizeof(initArgs));
    initArgs.mem_alloc_type = Alloc_With_System_Allocator;

    if (!wasm_runtime_full_init(&initArgs))
    {
        printf("FAIL: wasm_runtime_full_init\n");
        return 1;
    }
    printf("PASS: WAMR runtime initialized\n");

    // 2. Load AOT binary
    uint8_t* aotBuf = nullptr;
    uint32_t aotSize = 0;
    if (!load_file("moonvst_dsp.aot", &aotBuf, &aotSize))
    {
        printf("SKIP: moonvst_dsp.aot not found (run build:dsp first)\n");
        wasm_runtime_destroy();
        return 0;
    }
    printf("PASS: AOT binary loaded (%u bytes)\n", aotSize);

    // 3. Load module
    char errorBuf[128];
    wasm_module_t module = wasm_runtime_load(aotBuf, aotSize, errorBuf, sizeof(errorBuf));
    if (!module)
    {
        printf("FAIL: wasm_runtime_load: %s\n", errorBuf);
        free(aotBuf);
        wasm_runtime_destroy();
        return 1;
    }
    printf("PASS: Module loaded\n");

    // 4. Instantiate
    wasm_module_inst_t inst = wasm_runtime_instantiate(module, 256 * 1024, 1024 * 1024,
                                                        errorBuf, sizeof(errorBuf));
    if (!inst)
    {
        printf("FAIL: wasm_runtime_instantiate: %s\n", errorBuf);
        wasm_runtime_unload(module);
        free(aotBuf);
        wasm_runtime_destroy();
        return 1;
    }
    printf("PASS: Module instantiated\n");

    wasm_exec_env_t execEnv = wasm_runtime_create_exec_env(inst, 64 * 1024);
    assert(execEnv);

    // 5. Lookup functions
    auto fn_init = wasm_runtime_lookup_function(inst, "init");
    auto fn_get_param_count = wasm_runtime_lookup_function(inst, "get_param_count");
    auto fn_set_param = wasm_runtime_lookup_function(inst, "set_param");
    auto fn_get_param = wasm_runtime_lookup_function(inst, "get_param");
    auto fn_process_block = wasm_runtime_lookup_function(inst, "process_block");

    assert(fn_init);
    assert(fn_get_param_count);
    assert(fn_set_param);
    assert(fn_get_param);
    assert(fn_process_block);
    printf("PASS: All functions found\n");

    // 6. Call init
    wasm_runtime_call_wasm(execEnv, fn_init, 0, nullptr);
    printf("PASS: init() called\n");

    // 7. Test get_param_count
    uint32_t countArgs[1] = { 0 };
    wasm_runtime_call_wasm(execEnv, fn_get_param_count, 0, countArgs);
    int paramCount = (int)countArgs[0];
    printf("PASS: get_param_count() = %d\n", paramCount);
    assert(paramCount >= 1);

    // 8. Test set_param / get_param
    float testValue = 0.75f;
    uint32_t setArgs[2];
    setArgs[0] = 0; // index
    memcpy(&setArgs[1], &testValue, sizeof(float));
    wasm_runtime_call_wasm(execEnv, fn_set_param, 2, setArgs);

    uint32_t getArgs[1] = { 0 }; // index
    wasm_runtime_call_wasm(execEnv, fn_get_param, 1, getArgs);
    float gotValue;
    memcpy(&gotValue, getArgs, sizeof(float));
    printf("PASS: set_param(0, 0.75) -> get_param(0) = %.2f\n", gotValue);
    assert(fabsf(gotValue - 0.75f) < 0.001f);

    // 9. Test process_block
    constexpr int NUM_SAMPLES = 4;
    constexpr int INPUT_LEFT_OFFSET = 0x10000;
    constexpr int OUTPUT_LEFT_OFFSET = 0x30000;

    uint8_t* wasmMem = (uint8_t*)wasm_runtime_addr_app_to_native(inst, 0);
    assert(wasmMem);

    // Write test input (all 1.0)
    float inputSample = 1.0f;
    for (int i = 0; i < NUM_SAMPLES; i++)
        memcpy(wasmMem + INPUT_LEFT_OFFSET + i * 4, &inputSample, sizeof(float));

    // Process
    uint32_t processArgs[1] = { NUM_SAMPLES };
    wasm_runtime_call_wasm(execEnv, fn_process_block, 1, processArgs);

    // Check output (should be input * gain = 1.0 * 0.75 = 0.75)
    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        float outSample;
        memcpy(&outSample, wasmMem + OUTPUT_LEFT_OFFSET + i * 4, sizeof(float));
        assert(fabsf(outSample - 0.75f) < 0.001f);
    }
    printf("PASS: process_block output = input * gain (%.2f)\n", 0.75f);

    // Cleanup
    wasm_runtime_destroy_exec_env(execEnv);
    wasm_runtime_deinstantiate(inst);
    wasm_runtime_unload(module);
    free(aotBuf);
    wasm_runtime_destroy();

    printf("=== All tests passed ===\n");
    return 0;
}

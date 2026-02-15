enable_testing()

if(NOT DEFINED WAMR_ROOT)
    set(WAMR_ROOT ${CMAKE_SOURCE_DIR}/libs/wamr)
endif()

add_executable(wasm_dsp_test wasm_dsp_test.cpp)

target_include_directories(wasm_dsp_test PRIVATE
    ${CMAKE_SOURCE_DIR}/plugin/include
    ${WAMR_ROOT}/core/iwasm/include
)

# Use the same WAMR lib as the plugin
if(APPLE)
    set(WAMR_TEST_LIB ${WAMR_ROOT}/product-mini/platforms/darwin/build/libiwasm.a)
elseif(WIN32)
    set(WAMR_TEST_LIB ${WAMR_ROOT}/product-mini/platforms/windows/build/Release/libiwasm.lib)
else()
    set(WAMR_TEST_LIB ${WAMR_ROOT}/product-mini/platforms/linux/build/libiwasm.a)
endif()

target_link_libraries(wasm_dsp_test PRIVATE
    ${WAMR_TEST_LIB}
    juce::juce_audio_basics
)

if(NOT WIN32)
    target_link_libraries(wasm_dsp_test PRIVATE pthread m dl)
endif()

if(WIN32)
    target_compile_definitions(wasm_dsp_test PRIVATE WASM_RUNTIME_API_EXTERN=)
endif()

# Copy AOT binary for testing
add_custom_command(TARGET wasm_dsp_test POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        ${CMAKE_SOURCE_DIR}/plugin/resources/moonvst_dsp.aot
        $<TARGET_FILE_DIR:wasm_dsp_test>/moonvst_dsp.aot
)

add_test(NAME WasmDSPTest COMMAND wasm_dsp_test)

add_executable(plugin_smoke_test plugin_smoke_test.cpp)

target_include_directories(plugin_smoke_test PRIVATE
    ${CMAKE_SOURCE_DIR}/plugin/src
    ${CMAKE_SOURCE_DIR}/libs/juce/modules
)

target_link_libraries(plugin_smoke_test PRIVATE
    MoonVST
)

add_test(NAME PluginSmokeTest COMMAND plugin_smoke_test)

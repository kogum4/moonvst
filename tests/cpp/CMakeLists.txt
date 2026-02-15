enable_testing()

add_executable(wasm_dsp_test wasm_dsp_test.cpp)

target_include_directories(wasm_dsp_test PRIVATE
    ${CMAKE_SOURCE_DIR}/plugin/include
    ${WAMR_ROOT}/core/iwasm/include
)

# Use the same WAMR lib as the plugin
if(APPLE)
    set(WAMR_TEST_LIB ${WAMR_ROOT}/product-mini/platforms/darwin/build/libiwasm.a)
elseif(WIN32)
    set(WAMR_TEST_LIB ${WAMR_ROOT}/product-mini/platforms/windows/build/Release/iwasm.lib)
else()
    set(WAMR_TEST_LIB ${WAMR_ROOT}/product-mini/platforms/linux/build/libiwasm.a)
endif()

target_link_libraries(wasm_dsp_test PRIVATE
    ${WAMR_TEST_LIB}
)

if(NOT WIN32)
    target_link_libraries(wasm_dsp_test PRIVATE pthread m dl)
endif()

target_sources(wasm_dsp_test PRIVATE
    ${CMAKE_SOURCE_DIR}/plugin/src/WasmDSP.cpp
)

# Copy AOT binary for testing
add_custom_command(TARGET wasm_dsp_test POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        ${CMAKE_SOURCE_DIR}/plugin/resources/moonvst_dsp.aot
        $<TARGET_FILE_DIR:wasm_dsp_test>/moonvst_dsp.aot
)

add_test(NAME WasmDSPTest COMMAND wasm_dsp_test)

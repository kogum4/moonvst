set(WAMR_ROOT ${CMAKE_SOURCE_DIR}/libs/wamr)

# Platform-specific WAMR library paths
if(APPLE)
    set(WAMR_BUILD_DIR ${WAMR_ROOT}/product-mini/platforms/darwin/build)
    set(WAMR_LIB ${WAMR_BUILD_DIR}/libiwasm.a)
elseif(WIN32)
    set(WAMR_BUILD_DIR ${WAMR_ROOT}/product-mini/platforms/windows/build)
    # Use static runtime library. iwasm.lib is an import lib for iwasm.exe.
    set(WAMR_LIB ${WAMR_BUILD_DIR}/Release/libiwasm.lib)
else()
    set(WAMR_BUILD_DIR ${WAMR_ROOT}/product-mini/platforms/linux/build)
    set(WAMR_LIB ${WAMR_BUILD_DIR}/libiwasm.a)
endif()

if(NOT EXISTS "${WAMR_LIB}")
    message(FATAL_ERROR
        "WAMR runtime library not found: ${WAMR_LIB}\n"
        "Run scripts/setup-windows.ps1 (Windows) or scripts/setup-macos.sh (macOS) first.")
endif()

# WAMR include directories
set(WAMR_INCLUDE_DIRS
    ${WAMR_ROOT}/core/iwasm/include
)

# Plugin formats (AU only on macOS)
set(PLUGIN_FORMATS VST3 Standalone)
if(APPLE)
    list(APPEND PLUGIN_FORMATS AU)
endif()

juce_add_plugin(WebVST
    COMPANY_NAME "WebVST"
    PLUGIN_MANUFACTURER_CODE Wvst
    PLUGIN_CODE Wvs1
    FORMATS ${PLUGIN_FORMATS}
    PRODUCT_NAME "WebVST"
    NEEDS_WEB_BROWSER TRUE
    NEEDS_WEBVIEW2 TRUE
)

# AOT binary data
file(GLOB AOT_RESOURCES "${CMAKE_CURRENT_SOURCE_DIR}/resources/*.aot")
if(AOT_RESOURCES)
    juce_add_binary_data(WebVSTBinaryData
        HEADER_NAME "BinaryData.h"
        NAMESPACE BinaryData
        SOURCES ${AOT_RESOURCES}
    )
else()
    # Create placeholder for initial build
    file(WRITE "${CMAKE_CURRENT_SOURCE_DIR}/resources/.gitkeep" "")
    juce_add_binary_data(WebVSTBinaryData
        HEADER_NAME "BinaryData.h"
        NAMESPACE BinaryData
        SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/resources/.gitkeep"
    )
endif()

# UI binary data (built frontend assets)
file(GLOB_RECURSE UI_RESOURCES CONFIGURE_DEPENDS
    "${CMAKE_SOURCE_DIR}/ui/dist/*"
)
list(FILTER UI_RESOURCES EXCLUDE REGEX "/\\.gitkeep$")
if(UI_RESOURCES)
    juce_add_binary_data(WebVSTUIBinaryData
        HEADER_NAME "UIBinaryData.h"
        NAMESPACE UIBinaryData
        SOURCES ${UI_RESOURCES}
    )
else()
    file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/placeholder_ui.html"
         "<!DOCTYPE html><html><body><p>UI not built yet. Run npm run build:ui</p></body></html>")
    juce_add_binary_data(WebVSTUIBinaryData
        HEADER_NAME "UIBinaryData.h"
        NAMESPACE UIBinaryData
        SOURCES "${CMAKE_CURRENT_BINARY_DIR}/placeholder_ui.html"
    )
endif()

target_sources(WebVST PRIVATE
    src/WasmDSP.cpp
    src/PluginProcessor.cpp
    src/PluginEditor.cpp
)

target_include_directories(WebVST PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${WAMR_INCLUDE_DIRS}
)

target_compile_definitions(WebVST PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

if(WIN32)
    target_compile_definitions(WebVST PRIVATE
        JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
        WASM_RUNTIME_API_EXTERN=
        WEBVST_DISABLE_WASM_DSP=1
    )
endif()

target_link_libraries(WebVST PRIVATE
    WebVSTBinaryData
    WebVSTUIBinaryData
    juce::juce_audio_utils
    juce::juce_gui_extra
)

if(NOT WIN32)
    target_link_libraries(WebVST PRIVATE ${WAMR_LIB})
endif()

if(NOT WIN32)
    target_link_libraries(WebVST PRIVATE pthread m dl)
endif()

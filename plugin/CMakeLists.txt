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

# Optional Unity native plugin format (off by default)
option(MOONVST_ENABLE_UNITY "Build Unity native plugin output" OFF)
set(MOONVST_PRODUCT "template" CACHE STRING "Active moonvst product name")

if(NOT MOONVST_PRODUCT MATCHES "^[a-z0-9][a-z0-9-]*$")
    message(FATAL_ERROR "Invalid MOONVST_PRODUCT: ${MOONVST_PRODUCT}")
endif()

string(TOLOWER "${MOONVST_PRODUCT}" MOONVST_PRODUCT_SAFE)
string(REPLACE "-" "_" MOONVST_PRODUCT_TARGET_SUFFIX "${MOONVST_PRODUCT_SAFE}")
set(MOONVST_PLUGIN_TARGET "MoonVST_${MOONVST_PRODUCT_TARGET_SUFFIX}")
set(MOONVST_PLUGIN_NAME "${MOONVST_PRODUCT_SAFE}")
string(MD5 MOONVST_PRODUCT_HASH "${MOONVST_PRODUCT_SAFE}")
string(SUBSTRING "${MOONVST_PRODUCT_HASH}" 0 4 MOONVST_PLUGIN_CODE)
string(TOUPPER "${MOONVST_PLUGIN_CODE}" MOONVST_PLUGIN_CODE)
message(STATUS "Configuring product '${MOONVST_PRODUCT_SAFE}' as plugin '${MOONVST_PLUGIN_NAME}' (code ${MOONVST_PLUGIN_CODE})")

# Plugin formats (AU only on macOS)
set(PLUGIN_FORMATS VST3 Standalone)
if(MOONVST_ENABLE_UNITY)
    list(APPEND PLUGIN_FORMATS Unity)
endif()
if(APPLE)
    list(APPEND PLUGIN_FORMATS AU)
endif()

juce_add_plugin(${MOONVST_PLUGIN_TARGET}
    COMPANY_NAME "MoonVST"
    PLUGIN_MANUFACTURER_CODE Wvst
    PLUGIN_CODE ${MOONVST_PLUGIN_CODE}
    FORMATS ${PLUGIN_FORMATS}
    PRODUCT_NAME "${MOONVST_PLUGIN_NAME}"
    BUNDLE_ID "dev.moonvst.${MOONVST_PRODUCT_SAFE}"
    NEEDS_WEB_BROWSER TRUE
    NEEDS_WEBVIEW2 TRUE
)

# AOT binary data
file(GLOB AOT_RESOURCES "${CMAKE_CURRENT_SOURCE_DIR}/resources/*.aot")
if(AOT_RESOURCES)
    juce_add_binary_data(MoonVSTBinaryData
        HEADER_NAME "BinaryData.h"
        NAMESPACE BinaryData
        SOURCES ${AOT_RESOURCES}
    )
else()
    # Create placeholder for initial build
    file(WRITE "${CMAKE_CURRENT_SOURCE_DIR}/resources/.gitkeep" "")
    juce_add_binary_data(MoonVSTBinaryData
        HEADER_NAME "BinaryData.h"
        NAMESPACE BinaryData
        SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/resources/.gitkeep"
    )
endif()

# UI binary data (built frontend assets)
file(GLOB_RECURSE UI_RESOURCES CONFIGURE_DEPENDS
    "${CMAKE_SOURCE_DIR}/packages/ui-core/dist/*"
)
list(FILTER UI_RESOURCES EXCLUDE REGEX "/\\.gitkeep$")
if(UI_RESOURCES)
    juce_add_binary_data(MoonVSTUIBinaryData
        HEADER_NAME "UIBinaryData.h"
        NAMESPACE UIBinaryData
        SOURCES ${UI_RESOURCES}
    )
else()
    file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/placeholder_ui.html"
         "<!DOCTYPE html><html><body><p>UI not built yet. Run npm run build:ui</p></body></html>")
    juce_add_binary_data(MoonVSTUIBinaryData
        HEADER_NAME "UIBinaryData.h"
        NAMESPACE UIBinaryData
        SOURCES "${CMAKE_CURRENT_BINARY_DIR}/placeholder_ui.html"
    )
endif()

target_sources(${MOONVST_PLUGIN_TARGET} PRIVATE
    src/WasmDSP.cpp
    src/PluginProcessor.cpp
    src/PluginEditor.cpp
)

target_include_directories(${MOONVST_PLUGIN_TARGET} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${WAMR_INCLUDE_DIRS}
)

target_compile_definitions(${MOONVST_PLUGIN_TARGET} PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

if(WIN32)
    target_compile_definitions(${MOONVST_PLUGIN_TARGET} PRIVATE
        JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
        WASM_RUNTIME_API_EXTERN=
    )
endif()

target_link_libraries(${MOONVST_PLUGIN_TARGET} PRIVATE
    ${WAMR_LIB}
    MoonVSTBinaryData
    MoonVSTUIBinaryData
    juce::juce_audio_utils
    juce::juce_gui_extra
)

if(NOT WIN32)
    target_link_libraries(${MOONVST_PLUGIN_TARGET} PRIVATE pthread m dl)
endif()

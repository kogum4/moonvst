cmake_minimum_required(VERSION 3.22)
project(WebVSTBoilerplate VERSION 0.1.0)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_subdirectory(libs/juce)
add_subdirectory(plugin)

option(BUILD_TESTS "Build tests" OFF)
if(BUILD_TESTS)
    add_subdirectory(tests/cpp)
endif()
